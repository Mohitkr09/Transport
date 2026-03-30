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
CREATE RIDE (🔥 FIXED CORE ISSUE)
====================================================== */
exports.createRide = async (req, res) => {
  try {
    const { pickupLocation, dropLocation, vehicleType, distance } = req.body;

    /* ================= VALIDATION ================= */
    if (
      !pickupLocation?.lat ||
      !pickupLocation?.lng ||
      !dropLocation?.lat ||
      !dropLocation?.lng
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid location data"
      });
    }

    const fare = calculateFare(vehicleType, distance || 5);

    /* ================= MODEL-COMPATIBLE FORMAT ================= */
    const ride = await Ride.create({
      user: req.user._id,

      pickupLocation: {
        address: pickupLocation.address,
        location: {
          type: "Point",
          coordinates: [
            Number(pickupLocation.lng),
            Number(pickupLocation.lat)
          ]
        }
      },

      dropLocation: {
        address: dropLocation.address,
        location: {
          type: "Point",
          coordinates: [
            Number(dropLocation.lng),
            Number(dropLocation.lat)
          ]
        }
      },

      vehicleType,
      distanceKm: distance || 5,
      fare,

      status: "searching_driver",
      requestedAt: new Date(),
      rejectedDrivers: []
    });

    /* ================= SEND TO DRIVERS ================= */
    const drivers = await Driver.find({
      isOnline: true,
      isAvailable: true
    });

    console.log("🚗 Drivers found:", drivers.length);

    drivers.forEach(driver => {
      if (driver.socketId) {
        global.io.to(driver.socketId).emit("newRideRequest", ride);
      }
    });

    res.status(201).json({ success: true, ride });

  } catch (err) {
    console.error("❌ createRide:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ======================================================
GET NEARBY RIDES
====================================================== */
exports.getNearbyRides = async (req, res) => {
  try {
    const rides = await Ride.find({
      status: "searching_driver",
      driver: null,
      rejectedDrivers: { $ne: req.user.id }
    })
      .sort({ createdAt: -1 })
      .limit(10);

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
ACCEPT RIDE (SAFE + MODEL METHOD)
====================================================== */
exports.acceptRide = async (req, res) => {
  try {
    const ride = await Ride.findOne({
      _id: req.params.id,
      status: "searching_driver",
      driver: null
    });

    if (!ride) {
      return res.status(400).json({ success: false, message: "Taken" });
    }

    await ride.assignDriver(req.user.id);
    await ride.acceptRide();

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

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};

/* ======================================================
REJECT RIDE
====================================================== */
exports.rejectRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    await ride.rejectDriver(req.user.id);

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

    await ride.startRide();

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

    await ride.completeRide();

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

    await ride.cancelRide("user", "Cancelled by user");

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