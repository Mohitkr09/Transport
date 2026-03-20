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

    const isMatch = await driver.matchPassword(password);

    if (!isMatch) {
      return send(res, false, { message: "Invalid email or password" }, 401);
    }

    if (!driver.isApproved) {
      return send(res, false, { message: "Driver not approved yet" }, 403);
    }

    driver.goOnline();
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

  } catch {
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

    driver.updateLocation(lat, lng);

    await driver.save();

    return send(res, true, { message: "Location updated" });

  } catch {
    return send(res, false, { message: "Location update failed" }, 500);
  }
};

/* =========================================================
GET NEARBY RIDES
========================================================= */

exports.getNearbyRides = async (req, res) => {
  try {
    const driver = await Driver.findById(req.user.id);

    if (!driver?.location?.coordinates || !driver.isOnline) {
      return send(res, false, { message: "Driver offline or no location" }, 400);
    }

    const [lng, lat] = driver.location.coordinates;

    const rides = await Ride.find({
      status: "searching_driver",
      rejectedDrivers: { $ne: driver._id },
      "pickupLocation.location": {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat]
          },
          $maxDistance: 5000
        }
      }
    }).limit(10);

    return send(res, true, { rides });

  } catch (err) {
    console.error(err);
    return send(res, false, { message: "Failed to fetch rides" }, 500);
  }
};

/* =========================================================
ACCEPT RIDE (SAFE)
========================================================= */

exports.acceptRide = async (req, res) => {
  try {
    const driver = await Driver.findById(req.user.id);

    if (!driver.isAvailable) {
      return send(res, false, { message: "Driver not available" }, 400);
    }

    const ride = await Ride.findOneAndUpdate(
      {
        _id: req.params.id,
        status: "searching_driver"
      },
      {
        driver: driver._id,
        status: "accepted",
        acceptedAt: new Date()
      },
      { new: true }
    );

    if (!ride) {
      return send(res, false, { message: "Ride already taken" }, 400);
    }

    driver.markBusy(ride._id);
    await driver.save();

    return send(res, true, { ride });

  } catch (err) {
    console.error(err);
    return send(res, false, { message: "Accept failed" }, 500);
  }
};

/* =========================================================
REJECT RIDE
========================================================= */

exports.rejectRide = async (req, res) => {
  try {
    const driverId = req.user.id;

    const ride = await Ride.findById(req.params.id);

    if (!ride) {
      return send(res, false, { message: "Ride not found" }, 404);
    }

    await ride.rejectDriver(driverId);

    return send(res, true, { message: "Ride rejected" });

  } catch {
    return send(res, false, { message: "Reject failed" }, 500);
  }
};

/* =========================================================
START RIDE
========================================================= */

exports.startRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride || String(ride.driver) !== req.user.id) {
      return send(res, false, { message: "Unauthorized" }, 403);
    }

    await ride.startRide(req.body.otp);

    return send(res, true, { ride });

  } catch (err) {
    return send(res, false, { message: err.message }, 400);
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

    await ride.completeRide();

    const driver = await Driver.findById(req.user.id);
    driver.markAvailable();
    await driver.save();

    return send(res, true, { message: "Ride completed" });

  } catch (err) {
    return send(res, false, { message: err.message }, 400);
  }
};