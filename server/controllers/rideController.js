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
🚗 CREATE RIDE + EMIT TO DRIVERS
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
      status: "searching"
    });

    /* 🔥 FIND NEARBY DRIVERS */
    const pickupCoords = pickupLocation.location.coordinates;

    const drivers = await Driver.find({
      isOnline: true,
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: pickupCoords
          },
          $maxDistance: 5000
        }
      }
    });

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
    console.error("❌ createRide:", err);
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
    console.error("❌ getRideById:", err);
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

  } catch (err) {
    console.error("❌ getUserRides:", err);
    res.status(500).json({ success: false });
  }
};

/* ======================================================
💳 USER PAYMENTS
====================================================== */
exports.getUserPayments = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;

    const rides = await Ride.find({ user: userId });

    const payments = rides.map((r) => ({
      rideId: r._id,
      amount: r.fare ?? 0,
      date: r.createdAt ?? new Date(),
      status: r.paymentStatus || "paid"
    }));

    res.json({ success: true, payments });

  } catch (err) {
    console.error("❌ Payment API ERROR:", err);
    res.status(500).json({ success: false });
  }
};

/* ======================================================
✅ ACCEPT RIDE
====================================================== */
exports.acceptRide = async (req, res) => {
  try {
    const ride = await Ride.findOneAndUpdate(
      { _id: req.params.id, status: "searching" },
      {
        status: "accepted",
        driver: req.user._id,
        acceptedAt: new Date()
      },
      { new: true }
    ).populate("user");

    if (!ride) {
      return res.status(400).json({
        success: false,
        message: "Ride already taken"
      });
    }

    const io = req.app.get("io");
    const onlineUsers = req.app.get("onlineUsers") || {};

    const userSocket = onlineUsers[ride.user._id.toString()];
    if (userSocket) {
      io.to(userSocket).emit("rideAccepted", ride);
    }

    res.json({ success: true, ride });

  } catch (err) {
    console.error("❌ acceptRide:", err);
    res.status(500).json({ success: false });
  }
};

/* ======================================================
❌ REJECT RIDE (🔥 FIXED)
====================================================== */
exports.rejectRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride) {
      return res.status(404).json({ success: false, message: "Ride not found" });
    }

    if (ride.status !== "searching") {
      return res.status(400).json({
        success: false,
        message: "Cannot reject this ride"
      });
    }

    // Optional: mark rejected OR keep searching
    ride.status = "searching"; // keep available for others
    await ride.save();

    res.json({ success: true, message: "Ride rejected" });

  } catch (err) {
    console.error("❌ rejectRide:", err);
    res.status(500).json({ success: false });
  }
};

/* ======================================================
🚦 START / COMPLETE / CANCEL / RATE
====================================================== */
exports.startRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ success: false });

    ride.status = "ongoing";
    await ride.save();

    res.json({ success: true });

  } catch {
    res.status(500).json({ success: false });
  }
};

exports.completeRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ success: false });

    ride.status = "completed";
    await ride.save();

    res.json({ success: true });

  } catch {
    res.status(500).json({ success: false });
  }
};

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