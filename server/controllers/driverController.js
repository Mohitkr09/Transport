const Driver = require("../models/Driver");
const Ride = require("../models/Ride");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

/* =========================================================
HELPERS
========================================================= */

const generateToken = (id) =>
  jwt.sign({ id, role: "driver" }, process.env.JWT_SECRET, {
    expiresIn: "7d"
  });

const send = (res, success, data = {}, code = 200) =>
  res.status(code).json({ success, ...data });

/* =========================================================
DRIVER LOGIN
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

    const isMatch = await bcrypt.compare(password, driver.password);

    if (!isMatch) {
      return send(res, false, { message: "Invalid email or password" }, 401);
    }

    if (!driver.isApproved) {
      return send(res, false, { message: "Driver not approved yet" }, 403);
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
        role: "driver"
      }
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return send(res, false, { message: "Login failed" }, 500);
  }
};

/* =========================================================
GET DRIVER PROFILE
========================================================= */

exports.getDriverProfile = async (req, res) => {
  try {
    const driver = await Driver.findById(req.user.id).select("-password");

    if (!driver) {
      return send(res, false, { message: "Driver not found" }, 404);
    }

    return send(res, true, { driver });

  } catch (err) {
    return send(res, false, { message: "Failed to fetch profile" }, 500);
  }
};

/* =========================================================
UPDATE LOCATION
========================================================= */

exports.updateDriverLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;

    if (!lat || !lng) {
      return send(res, false, { message: "lat & lng required" }, 400);
    }

    const driver = await Driver.findById(req.user.id);

    driver.location = {
      type: "Point",
      coordinates: [Number(lng), Number(lat)]
    };

    driver.lastLocationUpdate = new Date();

    await driver.save();

    return send(res, true, { message: "Location updated" });

  } catch (err) {
    return send(res, false, { message: "Location update failed" }, 500);
  }
};

/* =========================================================
UPDATE ONLINE STATUS
========================================================= */

exports.updateDriverStatus = async (req, res) => {
  try {
    const { isOnline } = req.body;

    const driver = await Driver.findById(req.user.id);

    driver.isOnline = isOnline;
    driver.isAvailable = isOnline;

    await driver.save();

    return send(res, true, { driver });

  } catch (err) {
    return send(res, false, { message: "Status update failed" }, 500);
  }
};

/* =========================================================
GET NEARBY RIDES
========================================================= */

exports.getNearbyRides = async (req, res) => {
  try {
    const driver = await Driver.findById(req.user.id);

    if (!driver?.location || !driver.isOnline) {
      return send(res, false, { message: "Driver offline or no location" }, 400);
    }

    const rides = await Ride.find({
      status: "searching_driver",
      pickupLocation: {
        $near: {
          $geometry: driver.location,
          $maxDistance: 5000
        }
      }
    });

    return send(res, true, { rides });

  } catch (err) {
    return send(res, false, { message: "Failed to fetch rides" }, 500);
  }
};

/* =========================================================
ACCEPT RIDE
========================================================= */

exports.acceptRide = async (req, res) => {
  try {
    const driver = await Driver.findById(req.user.id);

    if (!driver.isAvailable) {
      return send(res, false, { message: "Driver not available" }, 400);
    }

    const ride = await Ride.findById(req.params.id);

    if (!ride || ride.status !== "searching_driver") {
      return send(res, false, { message: "Ride not available" }, 400);
    }

    ride.driver = driver._id;
    ride.status = "accepted";

    driver.isAvailable = false;

    await ride.save();
    await driver.save();

    return send(res, true, { ride });

  } catch (err) {
    return send(res, false, { message: "Accept failed" }, 500);
  }
};

/* =========================================================
REJECT RIDE
========================================================= */

exports.rejectRide = async (req, res) => {
  try {
    return send(res, true, { message: "Ride rejected" });
  } catch (err) {
    return send(res, false, { message: "Reject failed" }, 500);
  }
};

/* =========================================================
START RIDE
========================================================= */

exports.startRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride || ride.status !== "accepted") {
      return send(res, false, { message: "Invalid ride" }, 400);
    }

    ride.status = "ongoing";

    await ride.save();

    return send(res, true, { ride });

  } catch (err) {
    return send(res, false, { message: "Start failed" }, 500);
  }
};

/* =========================================================
COMPLETE RIDE
========================================================= */

exports.completeRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride || ride.status !== "ongoing") {
      return send(res, false, { message: "Invalid ride" }, 400);
    }

    ride.status = "completed";

    const driver = await Driver.findById(req.user.id);
    driver.isAvailable = true;

    await ride.save();
    await driver.save();

    return send(res, true, { message: "Ride completed" });

  } catch (err) {
    return send(res, false, { message: "Complete failed" }, 500);
  }
};