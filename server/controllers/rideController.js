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
CREATE RIDE (🔥 IMPROVED DRIVER MATCHING)
====================================================== */
exports.createRide = async (req, res) => {
  try {
    const { pickupLocation, dropLocation, vehicleType, distance } = req.body;

    if (!pickupLocation?.lat || !pickupLocation?.lng) {
      return res.status(400).json({ success: false, message: "Invalid pickup" });
    }

    const fare = calculateFare(vehicleType, distance || 5);

    const ride = await Ride.create({
      user: req.user._id,

      pickupLocation: {
        address: pickupLocation.address,
        location: {
          type: "Point",
          coordinates: [Number(pickupLocation.lng), Number(pickupLocation.lat)]
        }
      },

      dropLocation: {
        address: dropLocation.address,
        location: {
          type: "Point",
          coordinates: [Number(dropLocation.lng), Number(dropLocation.lat)]
        }
      },

      vehicleType,
      distanceKm: distance || 5,
      fare,
      status: "searching_driver",
      rejectedDrivers: []
    });

    /* 🔥 FIND NEAREST DRIVERS */
    const drivers = await Driver.find({
      isOnline: true,
      isAvailable: true,
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [
              Number(pickupLocation.lng),
              Number(pickupLocation.lat)
            ]
          },
          $maxDistance: 5000
        }
      }
    });

    /* 🔥 SEND RIDE TO DRIVERS */
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

    if (!ride) return res.status(404).json({ success: false });

    res.json({ success: true, ride });

  } catch (err) {
    res.status(500).json({ success: false });
  }
};

/* ======================================================
GET NEARBY RIDES (🔥 FIXED 500 ERROR)
====================================================== */
exports.getNearbyRides = async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: "lat & lng required"
      });
    }

    const rides = await Ride.find({
      status: "searching_driver",
      pickupLocation: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)] // ✅ FIX
          },
          $maxDistance: 5000
        }
      }
    });

    res.json({ success: true, rides });

  } catch (err) {
    console.error("❌ Nearby rides error:", err.message);
    res.status(500).json({ success: false });
  }
};

/* ======================================================
ACCEPT RIDE
====================================================== */
exports.acceptRide = async (req, res) => {
  try {
    const ride = await Ride.findOne({
      _id: req.params.id,
      status: "searching_driver"
    });

    if (!ride) {
      return res.status(400).json({ success: false, message: "Taken" });
    }

    ride.driver = req.user._id;
    ride.status = "accepted";
    await ride.save();

    await Driver.findByIdAndUpdate(req.user._id, {
      isAvailable: false,
      currentRide: ride._id
    });

    /* 🔥 EMIT */
    emitToRide(ride._id, "rideAccepted", ride);
    emitToUser(ride.user, "rideAccepted", ride);

    /* REMOVE FROM OTHER DRIVERS */
    global.io.emit("rideTaken", ride._id);

    res.json({ success: true, ride });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};

/* ======================================================
REJECT RIDE (🔥 IMPROVED)
====================================================== */
exports.rejectRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride) return res.status(404).json({ success: false });

    /* ADD TO REJECTED */
    if (!ride.rejectedDrivers.includes(req.user._id)) {
      ride.rejectedDrivers.push(req.user._id);
      await ride.save();
    }

    res.json({ success: true });

  } catch {
    res.status(500).json({ success: false });
  }
};

/* ======================================================
DRIVER LOCATION UPDATE
====================================================== */
exports.updateDriverLocation = async (req, res) => {
  try {
    const { lat, lng, rideId } = req.body;

    if (!lat || !lng || !rideId) {
      return res.status(400).json({ success: false });
    }

    await Ride.findByIdAndUpdate(rideId, {
      driverLocation: {
        type: "Point",
        coordinates: [lng, lat]
      }
    });

    emitToRide(rideId, "driverMoved", { lat, lng });

    res.json({ success: true });

  } catch (err) {
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