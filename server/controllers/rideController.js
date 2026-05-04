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

    const ride = await Ride.create({
      user: req.user._id,
      pickupLocation: {
        address: pickupLocation.address,
        location: { type: "Point", coordinates: pickupLocation.coordinates },
      },
      dropLocation: {
        address: dropLocation.address,
        location: { type: "Point", coordinates: dropLocation.coordinates },
      },
      vehicleType,
      distanceKm: distance || 5,
      fare: calculateFare(vehicleType, distance || 5),
      status: "searching",
      rejectedDrivers: [],
    });

    /* 🔥 SOCKET */
    const io = req.app.get("io");
    const onlineDrivers = req.app.get("onlineDrivers") || {};

    try {
      const [lng, lat] = pickupLocation.coordinates;
      const drivers = await Driver.getNearbyDrivers(lat, lng, vehicleType);

      drivers.forEach((driver) => {
        const socketId = onlineDrivers[driver._id.toString()];
        if (socketId) {
          io.to(socketId).emit("newRideRequest", ride);
        }
      });
    } catch {}

    res.status(201).json({ success: true, ride });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};

/* ======================================================
📄 GET RIDE (🔥 FIXED)
====================================================== */
exports.getRideById = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate("user", "name phone")   // ✅ FIX
      .populate("driver", "name phone");

    if (!ride) return res.status(404).json({ success: false });

    res.json({ success: true, ride });
  } catch {
    res.status(500).json({ success: false });
  }
};

/* ======================================================
✅ ACCEPT RIDE (🔥 FULLY FIXED)
====================================================== */
exports.acceptRide = async (req, res) => {
  try {
    const driverId = req.user._id;

    let ride = await Ride.findOne({
      _id: req.params.id,
      status: "searching",
      rejectedDrivers: { $ne: driverId },
    });

    if (!ride) {
      return res.status(400).json({ success: false });
    }

    ride.status = "accepted";
    ride.driver = driverId;
    await ride.save();

    /* 🔥 REFETCH POPULATED */
    ride = await Ride.findById(ride._id)
      .populate("user", "name phone")   // ✅ FIX
      .populate("driver", "name phone");

    /* DRIVER BUSY */
    await Driver.findByIdAndUpdate(driverId, {
      isAvailable: false,
      currentRide: ride._id,
    });

    /* 🔥 SOCKET */
    const io = req.app.get("io");
    const onlineUsers = req.app.get("onlineUsers") || {};

    const userSocket = onlineUsers[ride.user._id.toString()];
    if (userSocket) {
      io.to(userSocket).emit("rideAccepted", ride);
    }

    res.json({ success: true, ride });
  } catch {
    res.status(500).json({ success: false });
  }
};

/* ======================================================
🚦 START RIDE
====================================================== */
exports.startRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride || ride.status !== "accepted") {
      return res.status(400).json({ success: false });
    }

    ride.status = "ongoing";
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

    if (!ride || ride.status !== "ongoing") {
      return res.status(400).json({ success: false });
    }

    ride.status = "completed";
    await ride.save();

    await Driver.findByIdAndUpdate(ride.driver, {
      isAvailable: true,
      currentRide: null,
    });

    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false });
  }
};

/* ======================================================
❌ CANCEL RIDE (🔥 FIXED)
====================================================== */
exports.cancelRide = async (req, res) => {
  try {
    let ride = await Ride.findById(req.params.id);

    if (!ride) return res.status(404).json({ success: false });

    ride.status = "cancelled";
    await ride.save();

    /* 🔥 REFETCH POPULATED */
    ride = await Ride.findById(ride._id)
      .populate("user", "name phone")
      .populate("driver", "name phone");

    if (ride.driver) {
      await Driver.findByIdAndUpdate(ride.driver._id, {
        isAvailable: true,
        currentRide: null,
      });
    }

    const io = req.app.get("io");
    const onlineUsers = req.app.get("onlineUsers") || {};
    const onlineDrivers = req.app.get("onlineDrivers") || {};

    if (onlineUsers[ride.user._id]) {
      io.to(onlineUsers[ride.user._id]).emit("rideCancelled", ride);
    }

    if (ride.driver && onlineDrivers[ride.driver._id]) {
      io.to(onlineDrivers[ride.driver._id]).emit("rideCancelled", ride);
    }

    res.json({ success: true, ride });
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