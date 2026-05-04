const Driver = require("../models/Driver");
const Ride = require("../models/Ride");

/* ================= HELPERS ================= */
const send = (res, success, data = {}, code = 200) =>
  res.status(code).json({ success, ...data });

const getUserId = (req) => req.user?._id || req.user?.id;

/* ================= SOCKET ================= */
const emitToUser = (req, userId, event, payload) => {
  const io = req.app.get("io");
  const onlineUsers = req.app.get("onlineUsers") || {};

  const socketId = onlineUsers[userId.toString()];
  if (socketId) {
    io.to(socketId).emit(event, payload);
  }
};

/* ================= PROFILE ================= */
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

/* ================= STATUS ================= */
exports.updateDriverStatus = async (req, res) => {
  try {
    const driver = await Driver.findById(getUserId(req));

    if (!driver) {
      return send(res, false, { message: "Driver not found" }, 404);
    }

    driver.isOnline = req.body.isOnline;
    if (!driver.isOnline) driver.isAvailable = false;

    await driver.save();

    return send(res, true, {
      message: `Driver is now ${driver.isOnline ? "Online" : "Offline"}`,
      driver,
    });

  } catch (err) {
    return send(res, false, { message: err.message }, 500);
  }
};

/* ================= LOCATION ================= */
exports.updateDriverLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;

    const driver = await Driver.findById(getUserId(req));
    if (!driver) return send(res, false, { message: "Driver not found" }, 404);

    driver.location = {
      type: "Point",
      coordinates: [Number(lng), Number(lat)],
    };

    driver.lastLocationUpdate = new Date();
    await driver.save();

    return send(res, true, { message: "Location updated" });

  } catch (err) {
    return send(res, false, { message: err.message }, 500);
  }
};

/* ================= NEARBY RIDES ================= */
exports.getNearbyRides = async (req, res) => {
  try {
    const driver = await Driver.findById(getUserId(req));

    if (!driver || !driver.isOnline) {
      return send(res, false, { message: "Driver offline" }, 400);
    }

    const rides = await Ride.find({
      status: "searching",
      driver: null,
      rejectedDrivers: { $ne: driver._id },
    })
      .sort({ createdAt: -1 })
      .limit(10);

    return send(res, true, { rides });

  } catch (err) {
    return send(res, false, { message: err.message }, 500);
  }
};

/* ================= ACCEPT RIDE ================= */
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

    ride = await Ride.findById(ride._id)
      .populate("user", "name phone")
      .populate("driver", "name");

    emitToUser(req, ride.user._id, "rideAccepted", ride);

    return send(res, true, { ride });

  } catch (err) {
    return send(res, false, { message: err.message }, 500);
  }
};

/* ================= REJECT RIDE ================= */
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

/* ================= COMPLETE RIDE ================= */
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