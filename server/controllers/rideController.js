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

const emitToRide = (rideId, event, payload) => {
  if (!global.io) return;
  global.io.to(rideId.toString()).emit(event, payload);
};

/* ======================================================
CREATE RIDE
====================================================== */
exports.createRide = async (req, res) => {
  try {
    const { pickupLocation, dropLocation, vehicleType, distance } = req.body;

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

    /* 🔥 NOTIFY DRIVERS */
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
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ======================================================
GET RIDE
====================================================== */
exports.getRideById = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate("driver", "name phone");

    if (!ride) {
      return res.status(404).json({ success: false });
    }

    res.json({ success: true, ride });

  } catch {
    res.status(500).json({ success: false });
  }
};

/* ======================================================
ACCEPT RIDE (🔥 REAL-TIME FIX)
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

    /* ASSIGN DRIVER */
    ride.driver = req.user._id;
    ride.status = "accepted";

    await ride.save();

    await Driver.findByIdAndUpdate(req.user._id, {
      isAvailable: false,
      currentRide: ride._id
    });

    /* 🔥 EMIT TO USER + TRACKING PAGE */
    emitToRide(ride._id, "rideAccepted", {
      rideId: ride._id,
      driver: {
        name: req.user.name,
        phone: req.user.phone
      }
    });

    emitToUser(ride.user, "rideAccepted", {
      rideId: ride._id,
      driver: {
        name: req.user.name,
        phone: req.user.phone
      }
    });

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
DRIVER LOCATION UPDATE (🔥 VERY IMPORTANT)
====================================================== */
exports.updateDriverLocation = async (req, res) => {
  try {
    const { lat, lng, rideId } = req.body;

    if (!lat || !lng || !rideId) {
      return res.status(400).json({ success: false });
    }

    /* SAVE LOCATION */
    await Ride.findByIdAndUpdate(rideId, {
      driverLocation: {
        type: "Point",
        coordinates: [lng, lat]
      }
    });

    /* 🔥 EMIT REAL-TIME LOCATION */
    emitToRide(rideId, "driverMoved", {
      lat,
      lng
    });

    res.json({ success: true });

  } catch (err) {
    console.error(err);
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
    await ride.save();

    emitToRide(ride._id, "rideStarted", ride);

    res.json({ success: true });

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
    await ride.save();

    await Driver.findByIdAndUpdate(ride.driver, {
      isAvailable: true,
      currentRide: null
    });

    emitToRide(ride._id, "rideCompleted", ride);

    res.json({ success: true });

  } catch {
    res.status(500).json({ success: false });
  }
};

/* =====================================================
REJECT RIDE
====================================================== */
exports.rejectRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    ride.rejectedDrivers.push(req.user._id);
    await ride.save();

    res.json({ success: true });

  } catch {
    res.status(500).json({ success: false });
  }
};