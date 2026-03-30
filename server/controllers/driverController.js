const Driver = require("../models/Driver");
const Ride = require("../models/Ride");
const jwt = require("jsonwebtoken");

/* =========================================================
TOKEN
========================================================= */
const generateToken = (id) =>
  jwt.sign({ id, role: "driver" }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

const send = (res, success, data = {}, code = 200) =>
  res.status(code).json({ success, ...data });

/* =========================================================
🔥 SAFE USER ID (CRITICAL FIX)
========================================================= */
const getUserId = (req) => req.user?.id || req.user?._id;

/* =========================================================
SOCKET HELPERS
========================================================= */
const emitToUser = (userId, event, payload) => {
  if (!global.io) return;
  global.io.to(userId.toString()).emit(event, payload);
};

/* =========================================================
LOGIN
========================================================= */
exports.loginDriver = async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return send(res, false, { message: "Email & password required" }, 400);
    }

    email = email.toLowerCase().trim();

    const driver = await Driver.findOne({ email }).select("+password");

    if (!driver || !(await driver.matchPassword(password))) {
      return send(res, false, { message: "Invalid credentials" }, 401);
    }

    if (!driver.isApproved) {
      return send(res, false, { message: "Not approved" }, 403);
    }

    driver.isOnline = true;
    driver.isAvailable = true;

    await driver.save();

    return send(res, true, {
      token: generateToken(driver._id),
      user: {
        id: driver._id,
        name: driver.name,
        email: driver.email,
        role: "driver",
      },
    });
  } catch (err) {
    return send(res, false, { message: err.message }, 500);
  }
};

/* =========================================================
PROFILE (🔥 FIXED)
========================================================= */
exports.getDriverProfile = async (req, res) => {
  try {
    const userId = getUserId(req);

    console.log("🔍 DRIVER PROFILE ID:", userId);

    const driver = await Driver.findById(userId).select("-password");

    if (!driver) {
      return send(res, false, { message: "Driver not found" }, 404);
    }

    return send(res, true, { driver });
  } catch (err) {
    console.error("❌ PROFILE ERROR:", err.message);
    return send(res, false, { message: err.message }, 500);
  }
};

/* =========================================================
ONLINE / OFFLINE
========================================================= */
exports.updateDriverStatus = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { isOnline } = req.body;

    const driver = await Driver.findById(userId);

    if (!driver) {
      return send(res, false, { message: "Driver not found" }, 404);
    }

    driver.isOnline = isOnline;
    driver.isAvailable = isOnline;

    if (!isOnline) {
      driver.currentRide = null;
    }

    await driver.save();

    return send(res, true, {
      message: `Driver is now ${isOnline ? "Online" : "Offline"}`,
      isOnline,
    });
  } catch (err) {
    return send(res, false, { message: err.message }, 500);
  }
};

/* =========================================================
LOCATION
========================================================= */
exports.updateDriverLocation = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { lat, lng } = req.body;

    const driver = await Driver.findById(userId);

    if (!driver) {
      return send(res, false, { message: "Driver not found" }, 404);
    }

    driver.location = {
      type: "Point",
      coordinates: [lng, lat],
    };

    await driver.save();

    return send(res, true, { message: "Location updated" });
  } catch (err) {
    return send(res, false, { message: err.message }, 500);
  }
};

/* =========================================================
GET NEARBY RIDES
========================================================= */
exports.getNearbyRides = async (req, res) => {
  try {
    const userId = getUserId(req);

    const driver = await Driver.findById(userId);

    if (!driver || !driver.isOnline) {
      return send(res, false, { message: "Driver offline" }, 400);
    }

    let rides = [];

    if (driver.location?.coordinates?.length) {
      const [lng, lat] = driver.location.coordinates;

      rides = await Ride.find({
        status: "searching_driver",
        driver: null,
        rejectedDrivers: { $ne: driver._id },
        "pickupLocation.location": {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [lng, lat],
            },
            $maxDistance: 10000,
          },
        },
      }).limit(10);
    }

    if (rides.length === 0) {
      rides = await Ride.find({
        status: "searching_driver",
        driver: null,
        rejectedDrivers: { $ne: driver._id },
      }).limit(10);
    }

    return send(res, true, { rides });
  } catch (err) {
    return send(res, false, { message: err.message }, 500);
  }
};

/* =========================================================
ACCEPT RIDE
========================================================= */
exports.acceptRide = async (req, res) => {
  try {
    const userId = getUserId(req);

    const driver = await Driver.findById(userId);

    if (!driver || !driver.isAvailable) {
      return send(res, false, { message: "Driver not available" }, 400);
    }

    const ride = await Ride.findOneAndUpdate(
      {
        _id: req.params.id,
        status: "searching_driver",
        driver: null,
      },
      {
        driver: driver._id,
        status: "accepted",
        acceptedAt: new Date(),
      },
      { new: true }
    ).populate("driver", "name");

    if (!ride) {
      return send(res, false, { message: "Ride already taken" }, 400);
    }

    driver.isAvailable = false;
    driver.currentRide = ride._id;
    await driver.save();

    emitToUser(ride.user, "rideAccepted", ride);

    /* REMOVE FROM OTHER DRIVERS */
    const drivers = await Driver.find({ isOnline: true });

    drivers.forEach((d) => {
      if (d.socketId) {
        global.io.to(d.socketId).emit("rideTaken", ride._id);
      }
    });

    return send(res, true, { ride });
  } catch (err) {
    return send(res, false, { message: err.message }, 500);
  }
};

/* =========================================================
REJECT RIDE
========================================================= */
exports.rejectRide = async (req, res) => {
  try {
    const userId = getUserId(req);

    const ride = await Ride.findById(req.params.id);

    if (!ride) {
      return send(res, false, { message: "Ride not found" }, 404);
    }

    if (!ride.rejectedDrivers.includes(userId)) {
      ride.rejectedDrivers.push(userId);
      await ride.save();
    }

    return send(res, true, { message: "Ride rejected" });
  } catch (err) {
    return send(res, false, { message: err.message }, 500);
  }
};

/* =========================================================
START RIDE
========================================================= */
exports.startRide = async (req, res) => {
  try {
    const userId = getUserId(req);

    const ride = await Ride.findById(req.params.id);

    if (!ride || String(ride.driver) !== userId) {
      return send(res, false, { message: "Unauthorized" }, 403);
    }

    ride.status = "ongoing";
    ride.startedAt = new Date();
    await ride.save();

    emitToUser(ride.user, "rideStarted", ride);

    return send(res, true, { ride });
  } catch (err) {
    return send(res, false, { message: err.message }, 500);
  }
};

/* =========================================================
COMPLETE RIDE
========================================================= */
exports.completeRide = async (req, res) => {
  try {
    const userId = getUserId(req);

    const ride = await Ride.findById(req.params.id);

    if (!ride || String(ride.driver) !== userId) {
      return send(res, false, { message: "Unauthorized" }, 403);
    }

    ride.status = "completed";
    ride.completedAt = new Date();
    await ride.save();

    const driver = await Driver.findById(userId);
    driver.isAvailable = true;
    driver.currentRide = null;
    await driver.save();

    emitToUser(ride.user, "rideCompleted", ride);

    return send(res, true, { message: "Ride completed" });
  } catch (err) {
    return send(res, false, { message: err.message }, 500);
  }
};