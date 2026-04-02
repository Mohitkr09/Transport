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
SOCKET HELPERS (ROOM BASED ✅)
====================================================== */
const emitToUser = (userId, event, payload) => {
  if (!global.io) return;
  global.io.to(userId.toString()).emit(event, payload);
};

const emitToDriver = (driverId, event, payload) => {
  if (!global.io) return;
  global.io.to(driverId.toString()).emit(event, payload);
};

const emitToRide = (rideId, event, payload) => {
  if (!global.io) return;
  global.io.to(rideId.toString()).emit(event, payload);
};

/* ======================================================
CREATE RIDE (🔥 FIXED)
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
      status: "searching", // 🔥 FIXED
      rejectedDrivers: []
    });

    console.log("🚗 Ride created:", ride._id);

    /* FIND NEARBY DRIVERS */
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
          $maxDistance: 5000 // 5km
        }
      }
    });

    console.log("👨‍✈️ Drivers found:", drivers.length);

    /* 🔥 SEND RIDE TO EACH DRIVER */
    drivers.forEach((driver) => {
      emitToDriver(driver._id, "newRideRequest", ride);
    });

    /* 🔥 OPTIONAL: BROADCAST TO ALL DRIVERS */
    global.io.to("drivers").emit("newRideRequest", ride);

    res.status(201).json({ success: true, ride });

  } catch (err) {
    console.error(err);
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
ACCEPT RIDE (🔥 FIXED)
====================================================== */
exports.acceptRide = async (req, res) => {
  try {
    const ride = await Ride.findOneAndUpdate(
      { _id: req.params.id, status: "searching" }, // 🔥 FIXED
      {
        status: "accepted",
        driver: req.user._id
      },
      { new: true }
    ).populate("driver", "name phone");

    if (!ride) {
      return res.status(400).json({
        success: false,
        message: "Ride already taken"
      });
    }

    /* UPDATE DRIVER */
    await Driver.findByIdAndUpdate(req.user._id, {
      isAvailable: false,
      currentRide: ride._id
    });

    const payload = {
      rideId: ride._id,
      status: "accepted",
      driver: ride.driver
    };

    /* 🔥 SOCKET EVENTS */
    emitToRide(ride._id, "rideAccepted", payload);
    emitToUser(ride.user, "rideAccepted", payload);

    /* REMOVE FROM OTHER DRIVERS */
    global.io.to("drivers").emit("rideTaken", ride._id);

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

    if (!ride) return res.status(404).json({ success: false });

    if (!ride.rejectedDrivers.includes(req.user._id)) {
      ride.rejectedDrivers.push(req.user._id);
      await ride.save();
    }

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

    if (!ride) return res.status(404).json({ success: false });

    ride.status = "ongoing";
    await ride.save();

    emitToRide(ride._id, "rideStarted", {
      rideId: ride._id,
      status: "ongoing"
    });

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ success: false });
  }
};


/* ======================================================
COMPLETE RIDE
====================================================== */
exports.completeRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride) return res.status(404).json({ success: false });

    ride.status = "completed";
    await ride.save();

    await Driver.findByIdAndUpdate(ride.driver, {
      isAvailable: true,
      currentRide: null
    });

    emitToRide(ride._id, "rideCompleted", {
      rideId: ride._id,
      status: "completed"
    });

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ success: false });
  }
};