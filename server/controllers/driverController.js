const Driver = require("../models/Driver");
const Ride = require("../models/Ride");
const jwt = require("jsonwebtoken");


const generateToken = (id) =>
  jwt.sign({ id, role: "driver" }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

const send = (res, success, data = {}, code = 200) =>
  res.status(code).json({ success, ...data });

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

    // 🔥 FORCE ONLINE
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
PROFILE
========================================================= */

exports.getDriverProfile = async (req, res) => {
  try {
    const driver = await Driver.findById(req.user.id).select("-password");

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
    const { isOnline } = req.body;

    const driver = await Driver.findById(req.user.id);

    if (!driver) {
      return send(res, false, { message: "Driver not found" }, 404);
    }

    driver.isOnline = isOnline;
    driver.isAvailable = isOnline;

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
    const { lat, lng } = req.body;

    const driver = await Driver.findById(req.user.id);

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
🔥 FINAL FIX: ALWAYS RETURN RIDES
========================================================= */

exports.getNearbyRides = async (req, res) => {
  try {
    const driver = await Driver.findById(req.user.id);

    if (!driver || !driver.isOnline) {
      return send(res, false, { message: "Driver offline" }, 400);
    }

    let rides = [];

    // 🔥 TRY LOCATION BASED (OPTIONAL)
    if (driver.location?.coordinates?.length) {
      const [lng, lat] = driver.location.coordinates;

      rides = await Ride.find({
        status: "searching_driver",
        rejectedDrivers: { $ne: driver._id },
        pickupLocation: {
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

    // 🔥 FALLBACK (MAIN FIX)
    if (rides.length === 0) {
      rides = await Ride.find({
        status: "searching_driver",
        rejectedDrivers: { $ne: driver._id },
      }).limit(10);
    }

    return send(res, true, { rides });

  } catch (err) {
    return send(res, false, { message: err.message }, 500);
  }
};

/* =========================================================
ACCEPT
========================================================= */

exports.acceptRide = async (req, res) => {
  try {
    const driver = await Driver.findById(req.user.id);

    if (!driver || !driver.isAvailable) {
      return send(res, false, { message: "Driver not available" }, 400);
    }

    const ride = await Ride.findOneAndUpdate(
      { _id: req.params.id, status: "searching_driver" },
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

    driver.isAvailable = false;
    driver.currentRide = ride._id;
    await driver.save();

    return send(res, true, { ride });
  } catch (err) {
    return send(res, false, { message: err.message }, 500);
  }
};

/* =========================================================
REJECT
========================================================= */

exports.rejectRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride) {
      return send(res, false, { message: "Ride not found" }, 404);
    }

    if (!ride.rejectedDrivers.includes(req.user.id)) {
      ride.rejectedDrivers.push(req.user.id);
      await ride.save();
    }

    return send(res, true, { message: "Ride rejected" });
  } catch (err) {
    return send(res, false, { message: err.message }, 500);
  }
};

/* =========================================================
START
========================================================= */

exports.startRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride || String(ride.driver) !== req.user.id) {
      return send(res, false, { message: "Unauthorized" }, 403);
    }

    ride.status = "ongoing";
    await ride.save();

    return send(res, true, { ride });
  } catch (err) {
    return send(res, false, { message: err.message }, 500);
  }
};

/* =========================================================
COMPLETE
========================================================= */

exports.completeRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride || String(ride.driver) !== req.user.id) {
      return send(res, false, { message: "Unauthorized" }, 403);
    }

    ride.status = "completed";
    await ride.save();

    const driver = await Driver.findById(req.user.id);
    driver.isAvailable = true;
    driver.currentRide = null;

    await driver.save();

    return send(res, true, { message: "Ride completed" });
  } catch (err) {
    return send(res, false, { message: err.message }, 500);
  }
};    