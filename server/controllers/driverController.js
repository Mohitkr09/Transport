const Driver = require("../models/Driver");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// =====================================================
// TOKEN GENERATOR
// =====================================================
const generateToken = (id) => {
  return jwt.sign(
    { id, role: "driver" },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// =====================================================
// REGISTER DRIVER
// =====================================================
exports.registerDriver = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // ---------- VALIDATION ----------
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    if (!req.files?.license || !req.files?.vehicleRC) {
      return res.status(400).json({
        success: false,
        message: "License and Vehicle RC required"
      });
    }

    // ---------- CHECK EXISTING ----------
    const existing = await Driver.findOne({ email });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Driver already exists"
      });
    }

    // ---------- HASH PASSWORD ----------
    const hashed = await bcrypt.hash(password, 10);

    // ---------- CREATE DRIVER ----------
    const driver = await Driver.create({
      name,
      email,
      password: hashed,
      documents: {
        license: req.files.license[0].filename,
        vehicleRC: req.files.vehicleRC[0].filename
      },
      isApproved: false,
      isOnline: false
    });

    res.status(201).json({
      success: true,
      message: "Registered successfully. Await admin approval.",
      driver: {
        id: driver._id,
        name: driver.name,
        email: driver.email,
        isApproved: driver.isApproved
      }
    });

  } catch (err) {
    console.error("REGISTER DRIVER ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Driver registration failed"
    });
  }
};


// =====================================================
// DRIVER LOGIN
// =====================================================
exports.loginDriver = async (req, res) => {
  try {
    const { email, password } = req.body;

    const driver = await Driver.findOne({ email });

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found"
      });
    }

    const match = await bcrypt.compare(password, driver.password);

    if (!match) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    if (!driver.isApproved) {
      return res.status(403).json({
        success: false,
        message: "Driver not approved yet"
      });
    }

    res.json({
      success: true,
      token: generateToken(driver._id),
      driver: {
        id: driver._id,
        name: driver.name,
        email: driver.email,
        isOnline: driver.isOnline
      }
    });

  } catch (err) {
    console.error("LOGIN DRIVER ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Login failed"
    });
  }
};


// =====================================================
// GET DRIVER PROFILE
// =====================================================
exports.getDriverProfile = async (req, res) => {
  try {
    const driver = await Driver.findById(req.user._id).select("-password");

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found"
      });
    }

    res.json({
      success: true,
      driver
    });

  } catch (err) {
    console.error("PROFILE ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch profile"
    });
  }
};


// =====================================================
// TOGGLE ONLINE STATUS
// =====================================================
exports.toggleOnlineStatus = async (req, res) => {
  try {
    const driver = await Driver.findById(req.user._id);

    if (!driver)
      return res.status(404).json({
        success: false,
        message: "Driver not found"
      });

    driver.isOnline = !driver.isOnline;
    await driver.save();

    res.json({
      success: true,
      isOnline: driver.isOnline
    });

  } catch (err) {
    console.error("STATUS ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Status update failed"
    });
  }
};


// =====================================================
// UPDATE DRIVER LOCATION (REALTIME GPS)
// =====================================================
exports.updateLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: "lat and lng required"
      });
    }

    const driver = await Driver.findByIdAndUpdate(
      req.user._id,
      {
        location: {
          type: "Point",
          coordinates: [lng, lat]
        },
        lastLocationUpdate: new Date()
      },
      { new: true }
    );

    res.json({
      success: true,
      location: driver.location
    });

  } catch (err) {
    console.error("LOCATION ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Location update failed"
    });
  }
};


// =====================================================
// ADMIN APPROVE DRIVER
// =====================================================
exports.approveDriver = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);

    if (!driver)
      return res.status(404).json({
        success: false,
        message: "Driver not found"
      });

    driver.isApproved = true;
    await driver.save();

    res.json({
      success: true,
      message: "Driver approved"
    });

  } catch (err) {
    console.error("APPROVE ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Approval failed"
    });
  }
};


// =====================================================
// ADMIN REJECT DRIVER
// =====================================================
exports.rejectDriver = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);

    if (!driver)
      return res.status(404).json({
        success: false,
        message: "Driver not found"
      });

    await driver.deleteOne();

    res.json({
      success: true,
      message: "Driver rejected and removed"
    });

  } catch (err) {
    console.error("REJECT ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Reject failed"
    });
  }
};


// =====================================================
// ADMIN GET ALL DRIVERS
// =====================================================
exports.getAllDrivers = async (req, res) => {
  try {
    const drivers = await Driver.find().select("-password");

    res.json({
      success: true,
      count: drivers.length,
      drivers
    });

  } catch (err) {
    console.error("GET DRIVERS ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch drivers"
    });
  }
};
