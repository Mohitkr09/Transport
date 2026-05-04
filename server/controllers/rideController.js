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
🚗 CREATE RIDE (🔥 FULL FIX)
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

    console.log("🚀 New Ride Created:", ride._id);

    /* 🔥 SOCKET */
    const io = req.app.get("io");
    const onlineDrivers = req.app.get("onlineDrivers") || {};

    let drivers = [];

    try {
      const [lng, lat] = pickupLocation.coordinates;

      drivers = await Driver.getNearbyDrivers(lat, lng, vehicleType);
      console.log("📍 Nearby drivers:", drivers.length);

    } catch (err) {
      console.log("⚠️ Nearby driver error:", err.message);
    }

    /* 🔥 FALLBACK (VERY IMPORTANT) */
    if (!drivers || drivers.length === 0) {
      console.log("⚠️ No nearby drivers → sending to ALL online drivers");

      drivers = await Driver.find({
        isOnline: true,
        isAvailable: true,
        vehicleType,
      });
    }

    /* 🔥 EMIT TO DRIVERS */
    drivers.forEach((driver) => {
      const socketId = onlineDrivers[driver._id.toString()];

      if (socketId) {
        io.to(socketId).emit("newRideRequest", ride);
        console.log("📡 Sent ride to driver:", driver._id);
      } else {
        console.log("❌ Driver not connected:", driver._id);
      }
    });

    res.status(201).json({ success: true, ride });

  } catch (err) {
    console.error("🔥 Create Ride Error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ======================================================
📄 GET RIDE
====================================================== */
exports.getRideById = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate("user", "name phone")
      .populate("driver", "name phone");

    if (!ride) return res.status(404).json({ success: false });

    res.json({ success: true, ride });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ======================================================
✅ ACCEPT RIDE
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
      return res.status(400).json({ success: false, message: "Ride already taken" });
    }

    ride.status = "accepted";
    ride.driver = driverId;
    ride.acceptedAt = new Date(); // 🔥 IMPORTANT
    await ride.save();

    ride = await Ride.findById(ride._id)
      .populate("user", "name phone")
      .populate("driver", "name phone");

    await Driver.findByIdAndUpdate(driverId, {
      isAvailable: false,
      currentRide: ride._id,
    });

    const io = req.app.get("io");
    const onlineUsers = req.app.get("onlineUsers") || {};

    const userSocket = onlineUsers[ride.user._id.toString()];
    if (userSocket) {
      io.to(userSocket).emit("rideAccepted", ride);
    }

    console.log("✅ Ride accepted:", ride._id);

    res.json({ success: true, ride });

  } catch (err) {
    console.error("🔥 Accept Error:", err.message);
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
    ride.completedAt = new Date(); // 🔥 IMPORTANT
    await ride.save();

    await Driver.findByIdAndUpdate(ride.driver, {
      isAvailable: true,
      currentRide: null,
    });

    console.log("🏁 Ride completed:", ride._id);

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ success: false });
  }
};

/* ======================================================
❌ CANCEL RIDE
====================================================== */
exports.cancelRide = async (req, res) => {
  try {
    let ride = await Ride.findById(req.params.id);

    if (!ride) return res.status(404).json({ success: false });

    ride.status = "cancelled";
    await ride.save();

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

    console.log("❌ Ride cancelled:", ride._id);

    res.json({ success: true, ride });

  } catch (err) {
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