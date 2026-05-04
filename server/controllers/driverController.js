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

const getUserId = (req) => req.user?._id || req.user?.id;

/* =========================================================
SOCKET HELPER
========================================================= */
const emitToUser = (req, userId, event, payload) => {
  const io = req.app.get("io");
  const onlineUsers = req.app.get("onlineUsers") || {};

  const socketId = onlineUsers[userId.toString()];
  if (socketId) {
    io.to(socketId).emit(event, payload);
  }
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
    password = password.trim();

    const driver = await Driver.findOne({ email }).select("+password");

    if (!driver) {
      return send(res, false, { message: "Invalid credentials" }, 401);
    }

    /* 🔥 FIX: USE BCRYPT */
    const isMatch = await bcrypt.compare(password, driver.password);

    if (!isMatch) {
      return send(res, false, { message: "Invalid credentials" }, 401);
    }

    if (!driver.isApproved) {
      return send(res, false, { message: "Not approved" }, 403);
    }

    driver.isOnline = true;
    driver.isAvailable = true;
    driver.lastLogin = new Date();
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
    console.error("DRIVER LOGIN ERROR:", err);
    return send(res, false, { message: err.message }, 500);
  }
};

/* =========================================================
PROFILE
========================================================= */
exports.getDriverProfile = async (req, res) => {
  try {
    const driver = await Driver.findById(getUserId(req)).select("-password");

    if (!driver) {
      return send(res, false, { message: "Driver not found" }, 404);
    }

    return send(res, true, { driver });

  } catch (err) {
    return send(res, false, { message: err.message }, 500);
  }
};

/* =========================================================
ONLINE / OFFLINE
========================================================= */
exports.updateDriverStatus = async (req, res) => {
  try {
    const driver = await Driver.findById(getUserId(req));

    if (!driver) {
      return send(res, false, { message: "Driver not found" }, 404);
    }

    driver.isOnline = req.body.isOnline;
    await driver.save();

    return send(res, true, {
      message: `Driver is now ${driver.isOnline ? "Online" : "Offline"}`,
      driver,
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
    const { lat, lng } = req.body;

    const driver = await Driver.findById(getUserId(req));
    if (!driver) return send(res, false, { message: "Driver not found" }, 404);

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
    const driver = await Driver.findById(getUserId(req));

    if (!driver || !driver.isOnline) {
      return send(res, false, { message: "Driver offline" }, 400);
    }

    const vehicleType = driver.vehicleType || driver.vehicle?.type;

    const rides = await Ride.find({
      status: "searching",
      driver: null,
      vehicleType,
      rejectedDrivers: { $ne: driver._id },
    })
      .sort({ createdAt: -1 })
      .limit(10);

    return send(res, true, { rides });

  } catch (err) {
    return send(res, false, { message: err.message }, 500);
  }
};

/* =========================================================
ACCEPT RIDE (🔥 FIXED)
========================================================= */
exports.acceptRide = async (req, res) => {
  try {
    const driver = await Driver.findById(getUserId(req));

    if (!driver || !driver.isAvailable || driver.currentRide) {
      return send(res, false, { message: "Driver not available" }, 400);
    }

    let ride = await Ride.findOne({
      _id: req.params.id,
      status: "searching",
      rejectedDrivers: { $ne: driver._id },
    });

    if (!ride) {
      return send(res, false, { message: "Ride already taken" }, 400);
    }

    ride.driver = driver._id;
    ride.status = "accepted";
    ride.acceptedAt = new Date();
    await ride.save();

    driver.isAvailable = false;
    driver.currentRide = ride._id;
    await driver.save();

    /* 🔥 POPULATE USER */
    ride = await Ride.findById(ride._id)
      .populate("user", "name phone")
      .populate("driver", "name");

    emitToUser(req, ride.user._id, "rideAccepted", ride);

    return send(res, true, { ride });

  } catch (err) {
    return send(res, false, { message: err.message }, 500);
  }
};

/* =========================================================
REJECT RIDE (TRACK MISSED)
========================================================= */
exports.rejectRide = async (req, res) => {
  try {
    const driverId = getUserId(req);

    const ride = await Ride.findById(req.params.id);

    if (!ride) {
      return send(res, false, { message: "Ride not found" }, 404);
    }

    if (!ride.rejectedDrivers.includes(driverId)) {
      ride.rejectedDrivers.push(driverId);
      await ride.save();
    }

    return send(res, true, { message: "Ride rejected" });

  } catch (err) {
    return send(res, false, { message: err.message }, 500);
  }
};

/* =========================================================
COMPLETE RIDE
========================================================= */
exports.completeRide = async (req, res) => {
  try {
    const driverId = getUserId(req);

    const ride = await Ride.findById(req.params.id);

    if (!ride || String(ride.driver) !== String(driverId)) {
      return send(res, false, { message: "Unauthorized" }, 403);
    }

    ride.status = "completed";
    ride.completedAt = new Date();
    await ride.save();

    const driver = await Driver.findById(driverId);
    driver.isAvailable = true;
    driver.currentRide = null;
    await driver.save();

    emitToUser(req, ride.user, "rideCompleted", ride);

    return send(res, true, { message: "Ride completed" });

  } catch (err) {
    return send(res, false, { message: err.message }, 500);
  }
};

/* =========================================================
📊 DRIVER STATS (🔥 NEW)
========================================================= */
exports.getDriverStats = async (req, res) => {
  try {
    const driverId = getUserId(req);
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const accepted = await Ride.countDocuments({
      driver: driverId,
      status: { $in: ["accepted", "ongoing", "completed"] },
      acceptedAt: { $gte: last24h },
    });

    const completed = await Ride.countDocuments({
      driver: driverId,
      status: "completed",
      completedAt: { $gte: last24h },
    });

    const missed = await Ride.countDocuments({
      rejectedDrivers: driverId,
      createdAt: { $gte: last24h },
    });

    const newRides = await Ride.countDocuments({
      status: "searching",
      createdAt: { $gte: last24h },
    });

    return send(res, true, {
      stats: {
        new: newRides,
        accepted,
        completed,
        missed,
      },
    });

  } catch (err) {
    return send(res, false, { message: err.message }, 500);
  }
};