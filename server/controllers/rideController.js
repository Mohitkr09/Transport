const Ride = require("../models/Ride");
const Driver = require("../models/Driver");

/* ======================================================
💰 FARE
====================================================== */
const calculateFare = (vehicleType, distanceKm = 5) => {
  const rates = { bike: 10, auto: 15, car: 20 };
  return Math.round(distanceKm * (rates[vehicleType] || 20));
};

/* ======================================================
🚗 CREATE RIDE
====================================================== */
exports.createRide = async (req, res) => {
  try {
    const { pickupLocation, dropLocation, vehicleType, distance } = req.body;

    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!pickupLocation?.location || !dropLocation?.location) {
      return res.status(400).json({
        success: false,
        message: "Pickup & Drop coordinates required"
      });
    }

    const ride = await Ride.create({
      user: req.user._id,
      pickupLocation,
      dropLocation,
      vehicleType,
      distanceKm: distance || 5,
      fare: calculateFare(vehicleType, distance || 5),
      status: "searching",
      rejectedDrivers: []
    });

    /* 🔥 FIND NEAREST DRIVERS */
    const pickupCoords = pickupLocation.location.coordinates;

    const drivers = await Driver.getNearbyDrivers(
      pickupCoords[1],
      pickupCoords[0],
      vehicleType
    );

    /* 🔥 SOCKET EMIT */
    const io = req.app.get("io");
    const onlineDrivers = req.app.get("onlineDrivers") || {};

    drivers.forEach((driver) => {
      const socketId = onlineDrivers[driver._id.toString()];
      if (socketId) {
        io.to(socketId).emit("newRideRequest", ride);
      }
    });

    res.status(201).json({ success: true, ride });

  } catch (err) {
    console.error("❌ createRide:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ======================================================
📄 GET SINGLE RIDE
====================================================== */
exports.getRideById = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate("driver", "name phone")
      .populate("user", "name");

    if (!ride) {
      return res.status(404).json({ success: false, message: "Ride not found" });
    }

    res.json({ success: true, ride });

  } catch (err) {
    res.status(500).json({ success: false });
  }
};

/* ======================================================
📜 USER RIDES
====================================================== */
exports.getUserRides = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;

    const rides = await Ride.find({ user: userId })
      .sort({ createdAt: -1 });

    res.json({ success: true, rides });

  } catch {
    res.status(500).json({ success: false });
  }
};

/* ======================================================
💳 PAYMENTS
====================================================== */
exports.getUserPayments = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;

    const rides = await Ride.find({ user: userId });

    const payments = rides.map((r) => ({
      rideId: r._id,
      amount: r.fare || 0,
      date: r.createdAt,
      status: r.paymentStatus || "paid"
    }));

    res.json({ success: true, payments });

  } catch {
    res.status(500).json({ success: false });
  }
};

/* ======================================================
✅ ACCEPT RIDE
====================================================== */
exports.acceptRide = async (req, res) => {
  try {
    const driverId = req.user._id;

    const ride = await Ride.findOne({
      _id: req.params.id,
      status: "searching",
      rejectedDrivers: { $ne: driverId }
    });

    if (!ride) {
      return res.status(400).json({
        success: false,
        message: "Ride already taken or rejected"
      });
    }

    ride.status = "accepted";
    ride.driver = driverId;
    ride.acceptedAt = new Date();
    await ride.save();

    /* 🔥 UPDATE DRIVER */
    await Driver.findByIdAndUpdate(driverId, {
      isAvailable: false,
      currentRide: ride._id
    });

    /* 🔥 NOTIFY USER */
    const io = req.app.get("io");
    const onlineUsers = req.app.get("onlineUsers") || {};

    const userSocket = onlineUsers[ride.user.toString()];
    if (userSocket) {
      io.to(userSocket).emit("rideAccepted", ride);
    }

    res.json({ success: true, ride });

  } catch (err) {
    console.error("❌ acceptRide:", err.message);
    res.status(500).json({ success: false });
  }
};

/* ======================================================
❌ REJECT RIDE
====================================================== */
exports.rejectRide = async (req, res) => {
  try {
    const driverId = req.user._id;

    const ride = await Ride.findById(req.params.id);

    if (!ride) {
      return res.status(404).json({ success: false });
    }

    if (!ride.rejectedDrivers.includes(driverId)) {
      ride.rejectedDrivers.push(driverId);
      await ride.save();
    }

    res.json({ success: true });

  } catch (err) {
    console.error("❌ rejectRide:", err.message);
    res.status(500).json({ success: false });
  }
};

/* ======================================================
🚦 START RIDE
====================================================== */
exports.startRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride) return res.status(404).json({ success: false });

    ride.status = "ongoing";
    ride.startedAt = new Date();
    await ride.save();

    res.json({ success: true });

  } catch {
    res.status(500).json({ success: false });
  }
};

/* ======================================================
🏁 COMPLETE RIDE
====================================================== */
exports.completeRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride) return res.status(404).json({ success: false });

    ride.status = "completed";
    ride.completedAt = new Date();
    await ride.save();

    /* 🔥 FREE DRIVER */
    await Driver.findByIdAndUpdate(ride.driver, {
      isAvailable: true,
      currentRide: null
    });

    res.json({ success: true });

  } catch {
    res.status(500).json({ success: false });
  }
};

/* ======================================================
❌ CANCEL RIDE
====================================================== */
exports.cancelRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride) return res.status(404).json({ success: false });

    ride.status = "cancelled";
    await ride.save();

    res.json({ success: true });

  } catch {
    res.status(500).json({ success: false });
  }
};

/* ======================================================
⭐ RATE RIDE
====================================================== */
exports.rateRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride) return res.status(404).json({ success: false });

    ride.rating = req.body.rating;
    await ride.save();

    res.json({ success: true });

  } catch {
    res.status(500).json({ success: false });
  }
};