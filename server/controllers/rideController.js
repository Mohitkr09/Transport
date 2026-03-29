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
SOCKET HELPER
====================================================== */
const emitToUser = (userId, event, payload) => {
  if (!global.io) return;
  global.io.to(userId.toString()).emit(event, payload);
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
    }).select("_id name");
  }

  if (drivers.length === 0) {
    drivers = await Driver.find({
      isApproved: true,
      isOnline: true,
      isAvailable: true,
      "vehicle.type": vehicleType
    }).select("_id name");
  }

  return drivers;
};

/* ======================================================
CREATE RIDE
====================================================== */
exports.createRide = async (req, res) => {
  try {
    const { pickupLocation, dropLocation, vehicleType, distance } = req.body;

    const fare = calculateFare(vehicleType, distance || 5);

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

    const drivers = await getNearbyDrivers({
      lat: pickupLocation.lat,
      lng: pickupLocation.lng,
      vehicleType
    });

    console.log("Drivers found:", drivers.length);

    drivers.forEach(driver => {
      global.io.to(driver._id.toString()).emit("newRideRequest", {
        rideId: ride._id,
        pickup: pickupLocation.address,
        destination: dropLocation.address,
        fare
      });
    });

    emitToUser(req.user._id, "rideSearching", {
      rideId: ride._id
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
GET NEARBY RIDES
====================================================== */
exports.getNearbyRides = async (req, res) => {
  try {
    const driver = await Driver.findById(req.user.id);

    let rides = [];

    if (driver?.location?.coordinates?.length) {
      rides = await Ride.find({
        status: "searching_driver",
        driver: null,
        vehicleType: driver.vehicle.type,
        rejectedDrivers: { $ne: req.user.id },

        "pickupLocation.location": {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: driver.location.coordinates
            },
            $maxDistance: 50000
          }
        }
      });
    }

    if (rides.length === 0) {
      rides = await Ride.find({
        status: "searching_driver",
        driver: null,
        vehicleType: driver.vehicle.type,
        rejectedDrivers: { $ne: req.user.id }
      });
    }

    res.json({ success: true, rides });

  } catch {
    res.status(500).json({ success: false });
  }
};

/* ======================================================
ACCEPT RIDE (🔥 REAL-TIME FIX)
====================================================== */
exports.acceptRide = async (req, res) => {
  try {

    const ride = await Ride.findOneAndUpdate(
      { _id: req.params.id, status: "searching_driver", driver: null },
      {
        status: "accepted",
        driver: req.user.id,
        acceptedAt: new Date()
      },
      { new: true }
    ).populate("driver", "name");

    if (!ride) {
      return res.status(400).json({ success: false });
    }

    await Driver.findByIdAndUpdate(req.user.id, {
      isAvailable: false,
      currentRide: ride._id
    });

    /* 🔥 REAL-TIME EVENT */
    emitToUser(ride.user, "rideAccepted", {
      rideId: ride._id,
      driver: ride.driver
    });

    res.json({ success: true, ride });

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

    emitToUser(ride.user, "rideStarted", {
      rideId: ride._id
    });

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
      currentRide: null
    });

    emitToUser(ride.user, "rideCompleted", {
      rideId: ride._id
    });

    res.json({ success: true });

  } catch {
    res.status(500).json({ success: false });
  }
};