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

const emitToDriver = (socketId, event, payload) => {
  if (!global.io || !socketId) return;
  global.io.to(socketId).emit(event, payload);
};

const emitToRide = (rideId, event, payload) => {
  if (!global.io) return;
  global.io.to(rideId.toString()).emit(event, payload);
};

/* ======================================================
CREATE RIDE (🔥 FIXED + REALTIME)
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

      /* 🔥 FIXED STATUS */
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

    console.log(`🚗 Found ${drivers.length} drivers`);

    /* 🔥 SEND TO DRIVERS */
    drivers.forEach((driver) => {
      emitToDriver(driver.socketId, "newRideRequest", ride);
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

  } catch {
    res.status(500).json({ success: false });
  }
};

/* ======================================================
GET NEARBY RIDES (🔥 FIXED)
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
      "pickupLocation.location": {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: 5000
        }
      }
    });

    res.json({ success: true, rides });

  } catch (err) {
    console.error("❌ Nearby rides error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ======================================================
ACCEPT RIDE (🔥 RACE CONDITION SAFE)
====================================================== */
exports.acceptRide = async (req, res) => {
  try {
    const ride = await Ride.findOneAndUpdate(
      {
        _id: req.params.id,
        status: "searching_driver"
      },
      {
        status: "accepted",
        driver: req.user._id
      },
      { new: true }
    );

    if (!ride) {
      return res.status(400).json({
        success: false,
        message: "Ride already taken"
      });
    }

    await Driver.findByIdAndUpdate(req.user._id, {
      isAvailable: false,
      currentRide: ride._id
    });

    /* 🔥 EMIT */
    emitToRide(ride._id, "rideAccepted", ride);
    emitToUser(ride.user, "rideAccepted", ride);

    global.io.emit("rideTaken", ride._id);

    res.json({ success: true, ride });

  } catch (err) {
    console.error("❌ acceptRide:", err.message);
    res.status(500).json({ success: false });
  }
};

/* ======================================================
REJECT RIDE
====================================================== */
exports.rejectRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride) return res.status(404).json({ success: false });

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