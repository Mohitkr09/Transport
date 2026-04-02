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

const emitToDriver = (driverId, event, payload) => {
  if (!global.io) return;
  global.io.to(driverId.toString()).emit(event, payload);
};

const emitToRide = (rideId, event, payload) => {
  if (!global.io) return;
  global.io.to(rideId.toString()).emit(event, payload);
};

/* ======================================================
🔥 SMART DISPATCH FUNCTION (CORE LOGIC)
====================================================== */
const dispatchRideToDrivers = async (rideId, drivers, index = 0) => {
  if (!drivers.length || index >= drivers.length) {
    console.log("❌ No drivers accepted");

    await Ride.findByIdAndUpdate(rideId, {
      status: "no_driver"
    });

    return;
  }

  const driver = drivers[index];

  console.log("📡 Sending ride to driver:", driver._id);

  emitToDriver(driver._id, "newRideRequest", {
    rideId,
    ...driver.toObject()
  });

  // ⏳ 10 second timeout
  setTimeout(async () => {
    const ride = await Ride.findById(rideId);

    if (!ride || ride.status !== "searching") return;

    console.log("⏭️ Timeout → next driver");

    dispatchRideToDrivers(rideId, drivers, index + 1);

  }, 10000);
};

/* ======================================================
CREATE RIDE (🔥 SMART DISPATCH)
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
      status: "searching",
      rejectedDrivers: []
    });

    console.log("🚗 Ride created:", ride._id);

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

    console.log("👨‍✈️ Drivers found:", drivers.length);

    /* 🔥 START DISPATCH */
    dispatchRideToDrivers(ride._id, drivers);

    res.status(201).json({ success: true, ride });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
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
ACCEPT RIDE (🔥 STOPS DISPATCH)
====================================================== */
exports.acceptRide = async (req, res) => {
  try {
    const ride = await Ride.findOneAndUpdate(
      { _id: req.params.id, status: "searching" },
      {
        status: "accepted",
        driver: req.user._id,
        acceptedAt: new Date()
      },
      { new: true }
    ).populate("driver", "name phone");

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

    const payload = {
      rideId: ride._id,
      status: "accepted",
      driver: ride.driver
    };

    emitToRide(ride._id, "rideAccepted", payload);
    emitToUser(ride.user, "rideAccepted", payload);

    console.log("✅ Ride accepted:", ride._id);

    res.json({ success: true, ride });

  } catch (err) {
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

    if (!ride) return res.status(404).json({ success: false });

    ride.status = "ongoing";
    ride.startedAt = new Date();
    await ride.save();

    emitToRide(ride._id, "rideStarted", {
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

    if (!ride) return res.status(404).json({ success: false });

    ride.status = "completed";
    ride.completedAt = new Date();
    await ride.save();

    await Driver.findByIdAndUpdate(ride.driver, {
      isAvailable: true,
      currentRide: null
    });

    emitToRide(ride._id, "rideCompleted", {
      rideId: ride._id
    });

    res.json({ success: true });

  } catch {
    res.status(500).json({ success: false });
  }
};