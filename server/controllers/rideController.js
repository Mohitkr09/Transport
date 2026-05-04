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

    if (!req.user?._id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!pickupLocation?.coordinates || !dropLocation?.coordinates) {
      return res.status(400).json({
        success: false,
        message: "Pickup & Drop coordinates required",
      });
    }

    const formattedPickup = {
      address: pickupLocation.address || "",
      location: {
        type: "Point",
        coordinates: pickupLocation.coordinates,
      },
    };

    const formattedDrop = {
      address: dropLocation.address || "",
      location: {
        type: "Point",
        coordinates: dropLocation.coordinates,
      },
    };

    const ride = await Ride.create({
      user: req.user._id,
      pickupLocation: formattedPickup,
      dropLocation: formattedDrop,
      vehicleType,
      distanceKm: distance || 5,
      fare: calculateFare(vehicleType, distance || 5),
      status: "searching",
      rejectedDrivers: [],
    });

    /* 🔥 FIND DRIVERS */
    let drivers = [];
    try {
      const [lng, lat] = pickupLocation.coordinates;
      drivers = await Driver.getNearbyDrivers(lat, lng, vehicleType);
    } catch (err) {
      console.warn("Driver search failed:", err.message);
    }

    /* 🔥 SOCKET EMIT */
    try {
      const io = req.app.get("io");
      const onlineDrivers = req.app.get("onlineDrivers") || {};

      drivers.forEach((driver) => {
        const socketId = onlineDrivers[driver._id.toString()];
        if (socketId) {
          io.to(socketId).emit("newRideRequest", ride);
        }
      });
    } catch (err) {
      console.warn("Socket error:", err.message);
    }

    res.status(201).json({ success: true, ride });
  } catch (err) {
    console.error("createRide error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ======================================================
📄 GET RIDE
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
      rejectedDrivers: { $ne: driverId },
    });

    if (!ride) {
      return res.status(400).json({
        success: false,
        message: "Ride already taken",
      });
    }

    ride.status = "accepted";
    ride.driver = driverId;
    ride.acceptedAt = new Date();
    await ride.save();

    await Driver.findByIdAndUpdate(driverId, {
      isAvailable: false,
      currentRide: ride._id,
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
    console.error("acceptRide:", err);
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

    if (ride.status !== "accepted") {
      return res.status(400).json({ message: "Ride not accepted yet" });
    }

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

    if (ride.status !== "ongoing") {
      return res.status(400).json({ message: "Ride not ongoing" });
    }

    ride.status = "completed";
    ride.completedAt = new Date();
    ride.paymentStatus = "paid";
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
❌ CANCEL RIDE (🔥 FULLY FIXED)
====================================================== */
exports.cancelRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride) {
      return res.status(404).json({ success: false, message: "Ride not found" });
    }

    /* 🔒 PREVENT INVALID CANCEL */
    if (["completed", "cancelled"].includes(ride.status)) {
      return res.status(400).json({
        success: false,
        message: "Ride cannot be cancelled",
      });
    }

    /* 👤 WHO CANCELLED */
    let cancelledBy = "user";
    if (req.user?.role === "driver") cancelledBy = "driver";

    /* 💰 CANCELLATION CHARGE */
    let cancellationCharge = 0;
    if (["accepted", "ongoing"].includes(ride.status)) {
      cancellationCharge = Math.min(ride.fare * 0.1, 50);
    }

    ride.status = "cancelled";
    ride.cancelledAt = new Date();
    ride.cancelledBy = cancelledBy;
    ride.cancellationReason = req.body.reason || "";
    ride.cancellationCharge = cancellationCharge;

    await ride.save();

    /* 🔥 FREE DRIVER */
    if (ride.driver) {
      await Driver.findByIdAndUpdate(ride.driver, {
        isAvailable: true,
        currentRide: null,
      });
    }

    /* 🔥 SOCKET NOTIFY */
    const io = req.app.get("io");
    const onlineUsers = req.app.get("onlineUsers") || {};
    const onlineDrivers = req.app.get("onlineDrivers") || {};

    if (ride.user && onlineUsers[ride.user.toString()]) {
      io.to(onlineUsers[ride.user.toString()]).emit("rideCancelled", ride);
    }

    if (ride.driver && onlineDrivers[ride.driver.toString()]) {
      io.to(onlineDrivers[ride.driver.toString()]).emit("rideCancelled", ride);
    }

    res.json({
      success: true,
      message: "Ride cancelled successfully",
      ride,
    });
  } catch (err) {
    console.error("cancelRide:", err);
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