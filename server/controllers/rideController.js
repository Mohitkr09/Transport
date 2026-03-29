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
🔥 GET DRIVERS (FIXED WITH FALLBACK)
====================================================== */
const getNearbyDrivers = async ({ lat, lng, vehicleType }) => {

  let drivers = [];

  // ✅ TRY WITH LOCATION (50 KM)
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
          $maxDistance: 50000 // 🔥 50 KM
        }
      }
    }).select("_id name");
  }

  // 🔥 FALLBACK (IMPORTANT)
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
🔥 CREATE RIDE (FIXED)
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

      // 🔥 FIXED STATUS
      status: "searching_driver",

      requestedAt: new Date(),
      rejectedDrivers: []
    });

    /* 🔥 FIND DRIVERS */
    const drivers = await getNearbyDrivers({
      lat: pickupLocation.lat,
      lng: pickupLocation.lng,
      vehicleType
    });

    console.log("Drivers found:", drivers.length);

    /* 🔥 SEND TO DRIVERS */
    drivers.forEach(driver => {
      global.io.to(driver._id.toString()).emit("newRideRequest", {
        _id: ride._id,
        pickup: pickupLocation.address,
        destination: dropLocation.address,
        fare
      });
    });

    notify(req.user._id, {
      title: "Ride Requested",
      message: "Searching for drivers..."
    });

    res.status(201).json({
      success: true,
      ride,
      driversFound: drivers.length
    });

  } catch (err) {
    console.error("CREATE RIDE ERROR:", err);

    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

/* ======================================================
🔥 GET NEARBY RIDES (FIXED)
====================================================== */
exports.getNearbyRides = async (req, res) => {
  try {
    const driver = await Driver.findById(req.user.id);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found"
      });
    }

    let rides = [];

    // ✅ TRY WITH LOCATION
    if (driver.location?.coordinates?.length) {
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

    // 🔥 FALLBACK
    if (rides.length === 0) {
      rides = await Ride.find({
        status: "searching_driver",
        driver: null,
        vehicleType: driver.vehicle.type,
        rejectedDrivers: { $ne: req.user.id }
      });
    }

    res.json({
      success: true,
      rides
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};

/* ======================================================
ACCEPT RIDE
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
      return res.status(400).json({
        success: false,
        message: "Ride already taken"
      });
    }

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

    if (ride.driver.toString() !== req.user.id) {
      return res.status(403).json({ success: false });
    }

    ride.status = "ongoing";
    ride.startedAt = new Date();

    await ride.save();

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