const Ride = require("../models/Ride");
const Driver = require("../models/Driver");

/* ======================================================
💰 FARE
====================================================== */
const calculateFare = (vehicleType, distanceKm = 5) => {
  const rates = { bike: 10, auto: 15, car: 20 };
  return Math.round(distanceKm * (rates[vehicleType] || 20));
};

/* ======================================================
📡 SOCKET HELPERS
====================================================== */
const emitToUser = (userId, event, payload) => {
  global.io?.to(userId.toString()).emit(event, payload);
};

const emitToDriver = (driverId, event, payload) => {
  global.io?.to(driverId.toString()).emit(event, payload);
};

const emitToRide = (rideId, event, payload) => {
  global.io?.to(rideId.toString()).emit(event, payload);
};

/* ======================================================
🔥 SMART DISPATCH (IMPROVED)
====================================================== */
const dispatchRide = async (rideId, drivers, index = 0) => {

  const ride = await Ride.findById(rideId).populate("user", "name");

  if (!ride || ride.status !== "searching") return;

  if (!drivers.length || index >= drivers.length) {
    console.log("❌ No drivers available");

    await ride.markNoDriver();

    emitToUser(ride.user._id, "noDriverFound", {
      rideId: ride._id
    });

    return;
  }

  const driver = drivers[index];

  console.log("📡 Sending ride to:", driver._id);

  // ✅ SEND FULL DATA
  emitToDriver(driver._id, "newRideRequest", ride);

  // ⏳ TIMEOUT → NEXT DRIVER
  setTimeout(async () => {
    const updatedRide = await Ride.findById(rideId);

    if (!updatedRide || updatedRide.status !== "searching") return;

    console.log("⏭️ Trying next driver");

    dispatchRide(rideId, drivers, index + 1);

  }, 10000);
};

/* ======================================================
🚗 CREATE RIDE
====================================================== */
exports.createRide = async (req, res) => {
  try {
    const { pickupLocation, dropLocation, vehicleType, distance } = req.body;

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
      fare: calculateFare(vehicleType, distance || 5)
    });

    console.log("🚗 Ride created:", ride._id);

    /* 🔥 FIND DRIVERS (LESS STRICT → FIXED) */
    const drivers = await Driver.find({
      isOnline: true,
      isAvailable: true,
      vehicleType: vehicleType
    });

    console.log("👨‍✈️ Drivers found:", drivers.length);

    // ❗ fallback if none found
    if (drivers.length === 0) {
      console.log("⚠️ No drivers found, sending to all");

      const allDrivers = await Driver.find({
        isOnline: true,
        isAvailable: true
      });

      dispatchRide(ride._id, allDrivers);

    } else {
      dispatchRide(ride._id, drivers);
    }

    res.status(201).json({ success: true, ride });

  } catch (err) {
    console.error("🔥 CREATE RIDE ERROR:", err.message);

    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

/* ======================================================
📄 GET RIDE
====================================================== */
exports.getRideById = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate("driver", "name phone")
      .populate("user", "name");

    if (!ride) return res.status(404).json({ success: false });

    res.json({ success: true, ride });

  } catch {
    res.status(500).json({ success: false });
  }
};

/* ======================================================
✅ ACCEPT RIDE
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
    )
      .populate("driver", "name phone")
      .populate("user", "name");

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

    emitToRide(ride._id, "rideAccepted", ride);
    emitToUser(ride.user._id, "rideAccepted", ride);

    console.log("✅ Ride accepted:", ride._id);

    res.json({ success: true, ride });

  } catch {
    res.status(500).json({ success: false });
  }
};

/* ======================================================
❌ REJECT
====================================================== */
exports.rejectRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride) return res.status(404).json({ success: false });

    ride.rejectedDrivers.push(req.user._id);
    await ride.save();

    res.json({ success: true });

  } catch {
    res.status(500).json({ success: false });
  }
};

/* ======================================================
🚦 START
====================================================== */
exports.startRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    ride.status = "ongoing";
    ride.startedAt = new Date();

    await ride.save();

    emitToRide(ride._id, "rideStarted", ride);

    res.json({ success: true });

  } catch {
    res.status(500).json({ success: false });
  }
};

/* ======================================================
🏁 COMPLETE
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

    emitToRide(ride._id, "rideCompleted", ride);

    res.json({ success: true });

  } catch {
    res.status(500).json({ success: false });
  }
};

/* ======================================================
📍 DRIVER LOCATION
====================================================== */
exports.updateDriverLocation = async (req, res) => {
  try {
    const { lat, lng, rideId } = req.body;

    const ride = await Ride.findById(rideId);

    if (!ride) return res.json({ success: true });

    await ride.updateDriverLocation(lat, lng);

    emitToUser(ride.user, "driverMoved", {
      lat,
      lng,
      rideId
    });

    res.json({ success: true });

  } catch {
    res.status(500).json({ success: false });
  }
};