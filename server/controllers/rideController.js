const Ride = require("../models/Ride");
const Driver = require("../models/Driver");

/* ======================================================
FARE CALCULATOR
====================================================== */
const calculateFare = (vehicleType, distanceKm = 5) => {
  const rates = { bike: 10, auto: 15, car: 20 };
  return Math.round(distanceKm * (rates[vehicleType] || 20));
};

/* ======================================================
SOCKET HELPERS
====================================================== */
const emitToUser = (userId, event, payload) => {
  if (!global.io) return;
  global.io.to(userId.toString()).emit(event, payload);
};

/* ======================================================
CREATE RIDE
====================================================== */
exports.createRide = async (req, res) => {
  try {
    const { pickupLocation, dropLocation, vehicleType, distance } = req.body;

    if (!pickupLocation || !dropLocation || !vehicleType) {
      return res.status(400).json({ success: false });
    }

    const fare = calculateFare(vehicleType, distance || 5);

    const ride = await Ride.create({
      user: req.user._id,
      pickupLocation,
      dropLocation,
      vehicleType,
      distanceKm: distance || 5,
      fare,
      status: "searching_driver",
      rejectedDrivers: []
    });

    /* 🔥 SEND TO DRIVERS */
    const drivers = await Driver.find({
      isOnline: true,
      isAvailable: true
    });

    drivers.forEach(driver => {
      if (driver.socketId) {
        global.io.to(driver.socketId).emit("newRideRequest", ride);
      }
    });

    res.status(201).json({ success: true, ride });

  } catch (err) {
    console.error("❌ createRide:", err.message);
    res.status(500).json({ success: false });
  }
};

/* ======================================================
🔥 GET NEARBY RIDES (FIX FOR YOUR ERROR)
====================================================== */
exports.getNearbyRides = async (req, res) => {
  try {
    const rides = await Ride.find({
      status: "searching_driver",
      driver: null,
      rejectedDrivers: { $ne: req.user.id }
    }).limit(10);

    res.json({ success: true, rides });

  } catch (err) {
    console.error("❌ nearby:", err.message);
    res.status(500).json({ success: false });
  }
};

/* ======================================================
GET USER RIDES
====================================================== */
exports.getUserRides = async (req, res) => {
  try {
    const rides = await Ride.find({ user: req.user.id })
      .sort({ createdAt: -1 });

    res.json({ success: true, rides });

  } catch {
    res.status(500).json({ success: false });
  }
};

/* ======================================================
GET SINGLE RIDE
====================================================== */
exports.getRideById = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride) {
      return res.status(404).json({ success: false });
    }

    res.json({ success: true, ride });

  } catch {
    res.status(500).json({ success: false });
  }
};

/* ======================================================
ACCEPT RIDE (SAFE)
====================================================== */
exports.acceptRide = async (req, res) => {
  try {
    const ride = await Ride.findOneAndUpdate(
      {
        _id: req.params.id,
        status: "searching_driver",
        driver: null
      },
      {
        status: "accepted",
        driver: req.user.id,
        acceptedAt: new Date()
      },
      { new: true }
    );

    if (!ride) {
      return res.status(400).json({ success: false, message: "Taken" });
    }

    await Driver.findByIdAndUpdate(req.user.id, {
      isAvailable: false,
      currentRide: ride._id
    });

    emitToUser(ride.user, "rideAccepted", ride);

    /* REMOVE FROM OTHER DRIVERS */
    const drivers = await Driver.find({ isOnline: true });

    drivers.forEach(d => {
      if (d.socketId) {
        global.io.to(d.socketId).emit("rideTaken", ride._id);
      }
    });

    res.json({ success: true, ride });

  } catch {
    res.status(500).json({ success: false });
  }
};

/* ======================================================
REJECT RIDE
====================================================== */
exports.rejectRide = async (req, res) => {
  try {
    await Ride.findByIdAndUpdate(req.params.id, {
      $addToSet: { rejectedDrivers: req.user.id }
    });

    res.json({ success: true });

  } catch {
    res.status(500).json({ success: false });
  }
};

/* ======================================================
START RIDE
====================================================== */
exports.startRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    ride.status = "ongoing";
    ride.startedAt = new Date();

    await ride.save();

    emitToUser(ride.user, "rideStarted", ride);

    res.json({ success: true, ride });

  } catch {
    res.status(500).json({ success: false });
  }
};

/* ======================================================
COMPLETE RIDE
====================================================== */
exports.completeRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    ride.status = "completed";
    ride.completedAt = new Date();

    await ride.save();

    await Driver.findByIdAndUpdate(ride.driver, {
      isAvailable: true,
      currentRide: null
    });

    emitToUser(ride.user, "rideCompleted", ride);

    res.json({ success: true });

  } catch {
    res.status(500).json({ success: false });
  }
};

/* ======================================================
CANCEL RIDE
====================================================== */
exports.cancelRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    ride.status = "cancelled";

    await ride.save();

    res.json({ success: true });

  } catch {
    res.status(500).json({ success: false });
  }
};

/* ======================================================
RATE RIDE
====================================================== */
exports.rateRide = async (req, res) => {
  try {
    const { rating } = req.body;

    const ride = await Ride.findById(req.params.id);

    ride.rating = rating;

    await ride.save();

    res.json({ success: true });

  } catch {
    res.status(500).json({ success: false });
  }
};