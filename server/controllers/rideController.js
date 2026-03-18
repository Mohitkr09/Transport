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
SOCKET NOTIFICATION
====================================================== */

const notify = (userId, payload) => {
  if (!global.io || !userId) return;

  global.io.to(userId.toString()).emit("notification", {
    id: Date.now(),
    ...payload,
    time: new Date()
  });
};

/* ======================================================
GET NEARBY DRIVERS
====================================================== */

const getNearbyDrivers = async ({ lat, lng, vehicleType }) => {
  return Driver.find({
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
        $maxDistance: 8000
      }
    }
  }).select("_id name socketId");
};

/* ======================================================
CREATE RIDE (UPDATED)
====================================================== */

exports.createRide = async (req, res) => {
  try {

    const { pickupLocation, dropLocation, vehicleType, distance } = req.body;

    const fare = calculateFare(vehicleType, distance || 5);

    /* ✅ CREATE AS PENDING (NOT ASSIGNED) */

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

      status: "pending", // 🔥 IMPORTANT
      requestedAt: new Date()
    });

    /* ======================================================
    SEND TO ALL NEARBY DRIVERS
    ====================================================== */

    const drivers = await getNearbyDrivers({
      lat: pickupLocation.lat,
      lng: pickupLocation.lng,
      vehicleType
    });

    drivers.forEach(driver => {
      if (driver.socketId) {
        global.io.to(driver.socketId).emit("newRideRequest", {
          rideId: ride._id,
          pickup: pickupLocation.address,
          drop: dropLocation.address,
          fare
        });
      }
    });

    notify(req.user._id, {
      title: "Ride Requested",
      message: "Searching for drivers..."
    });

    res.status(201).json({
      success: true,
      ride
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};

/* ======================================================
GET NEARBY RIDES (FOR DASHBOARD)
====================================================== */

exports.getNearbyRides = async (req, res) => {
  try {

    const driver = await Driver.findById(req.user.id);

    const rides = await Ride.find({
      status: "pending",
      vehicleType: driver.vehicle.type,

      "pickupLocation.location": {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: driver.location.coordinates
          },
          $maxDistance: 8000
        }
      }
    });

    res.json({
      success: true,
      rides
    });

  } catch (err) {
    res.status(500).json({ success: false });
  }
};

/* ======================================================
ACCEPT RIDE (UPDATED)
====================================================== */

exports.acceptRide = async (req, res) => {
  try {

    const ride = await Ride.findById(req.params.id);

    if (!ride || ride.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Ride already taken"
      });
    }

    /* ✅ ASSIGN DRIVER */

    ride.status = "accepted";
    ride.driver = req.user.id;
    ride.acceptedAt = new Date();

    await ride.save();

    /* ✅ UPDATE DRIVER */

    await Driver.findByIdAndUpdate(req.user.id, {
      isAvailable: false,
      currentRide: ride._id
    });

    notify(ride.user, {
      title: "Driver Assigned",
      message: "Driver accepted your ride"
    });

    res.json({
      success: true,
      ride
    });

  } catch (err) {
    res.status(500).json({ success: false });
  }
};

/* ======================================================
REJECT RIDE
====================================================== */

exports.rejectRide = async (req, res) => {
  try {
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
    ride.completedAt = new Date();

    await ride.save();

    await Driver.findByIdAndUpdate(ride.driver, {
      isAvailable: true,
      currentRide: null,
      $inc: { totalRides: 1 }
    });

    notify(ride.user, {
      title: "Ride Completed",
      message: "Thank you for riding!"
    });

    res.json({
      success: true,
      ride
    });

  } catch {
    res.status(500).json({ success: false });
  }
};