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

const emitToDriver = async (driverId, event, payload) => {
  const driver = await Driver.findById(driverId);
  if (driver?.socketId) {
    global.io.to(driver.socketId).emit(event, payload);
  }
};

/* ======================================================
GET DRIVERS
====================================================== */
const getNearbyDrivers = async ({ lat, lng, vehicleType }) => {
  let drivers = [];

  if (lat && lng) {
    drivers = await Driver.find({
      isApproved: true,
      isOnline: true,
      isAvailable: true,
      "vehicle.type": vehicleType,
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [Number(lng), Number(lat)]
          },
          $maxDistance: 50000
        }
      }
    });
  }

  if (drivers.length === 0) {
    drivers = await Driver.find({
      isApproved: true,
      isOnline: true,
      isAvailable: true,
      "vehicle.type": vehicleType
    });
  }

  return drivers;
};

/* ======================================================
CREATE RIDE (🔥 FIXED REAL-TIME)
====================================================== */
exports.createRide = async (req, res) => {
  try {
    const { pickupLocation, dropLocation, vehicleType, distance } = req.body;

    /* ================= VALIDATION ================= */
    if (!pickupLocation || !dropLocation || !vehicleType) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    /* ================= FARE ================= */
    const fare = calculateFare(vehicleType, distance || 5);

    /* ================= CREATE RIDE ================= */
    const ride = await Ride.create({
      user: req.user._id,

      pickupLocation: {
        address: pickupLocation.address,
        location: {
          type: "Point",
          coordinates: [pickupLocation.lng, pickupLocation.lat]
        }
      },

      dropLocation: {
        address: dropLocation.address,
        location: {
          type: "Point",
          coordinates: [dropLocation.lng, dropLocation.lat]
        }
      },

      vehicleType,
      distanceKm: distance || 5,
      fare,

      status: "searching_driver",
      requestedAt: new Date(),
      rejectedDrivers: []
    });

    /* ================= FIND DRIVERS ================= */
    let drivers = await getNearbyDrivers({
      lat: pickupLocation.lat,
      lng: pickupLocation.lng,
      vehicleType
    });

    console.log("🚗 Nearby drivers:", drivers.length);

    /* 🔥 FALLBACK (IMPORTANT) */
    if (!drivers.length) {
      drivers = await Driver.find({
        isOnline: true,
        isAvailable: true,
        "vehicle.type": vehicleType
      });
    }

    /* ================= REAL-TIME EMIT ================= */
    if (global.io && drivers.length > 0) {

      const ridePayload = {
        _id: ride._id,
        pickupLocation: ride.pickupLocation,
        dropLocation: ride.dropLocation,
        fare: ride.fare,
        vehicleType: ride.vehicleType,
        status: ride.status
      };

      drivers.forEach((driver) => {
        if (driver.socketId) {
          global.io.to(driver.socketId).emit("newRideRequest", ridePayload);
        }
      });

      console.log("📡 Ride sent to drivers");
    }

    /* ================= NOTIFY USER ================= */
    emitToUser(req.user._id, "rideSearching", {
      rideId: ride._id
    });

    /* ================= RESPONSE ================= */
    res.status(201).json({
      success: true,
      ride
    });

  } catch (err) {
    console.error("❌ createRide error:", err.message);

    res.status(500).json({
      success: false,
      message: "Failed to create ride"
    });
  }
};
/* ======================================================
ACCEPT RIDE (🔥 RACE SAFE)
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
    ).populate("driver", "name");

    if (!ride) {
      return res.status(400).json({ success: false, message: "Already taken" });
    }

    await Driver.findByIdAndUpdate(req.user.id, {
      isAvailable: false,
      currentRide: ride._id
    });

    /* 🔥 NOTIFY USER */
    emitToUser(ride.user, "rideAccepted", ride);

    /* 🔥 REMOVE FROM OTHER DRIVERS */
    const drivers = await Driver.find({ isOnline: true });

    drivers.forEach(d => {
      if (d.socketId) {
        global.io.to(d.socketId).emit("rideTaken", ride._id);
      }
    });

    res.json({ success: true, ride });

  } catch (err) {
    res.status(500).json({ success: false });
  }
};

/* ======================================================
REJECT RIDE (🔥 IMPROVED)
====================================================== */
exports.rejectRide = async (req, res) => {
  try {
    const ride = await Ride.findByIdAndUpdate(
      req.params.id,
      {
        $addToSet: { rejectedDrivers: req.user.id }
      },
      { new: true }
    );

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