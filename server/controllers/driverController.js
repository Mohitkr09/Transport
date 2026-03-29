const Driver = require("../models/Driver");
const Ride = require("../models/Ride");
const jwt = require("jsonwebtoken");

/* =========================================================
HELPERS
========================================================= */

const generateToken = (id) =>
  jwt.sign({ id, role: "driver" }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

const send = (res, success, data = {}, code = 200) =>
  res.status(code).json({ success, ...data });

/* =========================================================
DRIVER LOGIN (AUTO ONLINE)
========================================================= */

exports.loginDriver = async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return send(res, false, { message: "Email and password required" }, 400);
    }

    email = email.toLowerCase().trim();

    const driver = await Driver.findOne({ email }).select("+password");

    if (!driver) {
      return send(res, false, { message: "Invalid email or password" }, 401);
    }

    const isMatch = await driver.matchPassword(password);

    if (!isMatch) {
      return send(res, false, { message: "Invalid email or password" }, 401);
    }

    if (!driver.isApproved) {
      return send(res, false, { message: "Driver not approved yet" }, 403);
    }

    // ✅ FORCE ONLINE + AVAILABLE (IMPORTANT FIX)
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
    console.error("LOGIN ERROR:", err);
    return send(res, false, { message: err.message }, 500);
  }
};

/* =========================================================
UPDATE DRIVER LOCATION
========================================================= */

exports.updateDriverLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;

    if (lat === undefined || lng === undefined) {
      return send(res, false, { message: "lat & lng required" }, 400);
    }

    const driver = await Driver.findById(req.user.id);

    if (!driver) {
      return send(res, false, { message: "Driver not found" }, 404);
    }

    // ✅ FIXED GEO FORMAT
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
GET AVAILABLE DRIVERS (FOR USER BOOKING 🔥)
========================================================= */

exports.getAvailableDrivers = async (req, res) => {
  try {
    const { lat, lng, vehicleType } = req.body;

    if (!lat || !lng) {
      return send(res, false, { message: "Location required" }, 400);
    }

    // ✅ DEBUG LOG
    console.log("Searching drivers near:", lat, lng);

    const drivers = await Driver.find({
      isApproved: true,
      isOnline: true,
      isAvailable: true,
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat],
          },
          $maxDistance: 10000, // ✅ increased to 10km
        },
      },
      ...(vehicleType && { vehicleType }),
    });

    console.log("Found drivers:", drivers.length);

    return send(res, true, { drivers });
  } catch (err) {
    console.error(err);
    return send(res, false, { message: err.message }, 500);
  }
};

/* =========================================================
ACCEPT RIDE
========================================================= */

exports.acceptRide = async (req, res) => {
  try {
    const driver = await Driver.findById(req.user.id);

    // ✅ STRICT CHECK
    if (!driver || !driver.isOnline || !driver.isAvailable) {
      return send(res, false, { message: "Driver not available" }, 400);
    }

    const ride = await Ride.findOneAndUpdate(
      {
        _id: req.params.id,
        status: "searching_driver",
      },
      {
        driver: driver._id,
        status: "accepted",
        acceptedAt: new Date(),
      },
      { new: true }
    );

    if (!ride) {
      return send(res, false, { message: "Ride already taken" }, 400);
    }

    // ✅ MARK DRIVER BUSY
    driver.isAvailable = false;
    driver.currentRide = ride._id;

    await driver.save();

    return send(res, true, { ride });
  } catch (err) {
    console.error(err);
    return send(res, false, { message: err.message }, 500);
  }
};

/* =========================================================
COMPLETE RIDE
========================================================= */

exports.completeRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride || String(ride.driver) !== req.user.id) {
      return send(res, false, { message: "Unauthorized" }, 403);
    }

    if (ride.status !== "ongoing") {
      return send(res, false, { message: "Ride not ongoing" }, 400);
    }

    await ride.completeRide();

    // ✅ MAKE DRIVER AVAILABLE AGAIN
    const driver = await Driver.findById(req.user.id);
    driver.isAvailable = true;
    driver.currentRide = null;

    await driver.save();

    return send(res, true, { message: "Ride completed" });
  } catch (err) {
    return send(res, false, { message: err.message }, 400);
  }
};