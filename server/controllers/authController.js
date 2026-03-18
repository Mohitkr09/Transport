const User = require("../models/User");
const Driver = require("../models/Driver");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

/* ======================================================
TOKEN
====================================================== */

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

/* ======================================================
REGISTER USER (FIXED 🔥 PASSWORD HASH)
====================================================== */

exports.register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: "All fields required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const exists = await User.findOne({
      $or: [{ email }, { phone }],
    });

    if (exists) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }

    /* ✅ HASH PASSWORD */
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      phone,
    });

    const token = generateToken(user._id, "user");

    return res.status(201).json({
      success: true,
      token,
      role: "user",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: "user",
      },
    });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Registration failed",
    });
  }
};

/* ======================================================
LOGIN (FINAL STABLE VERSION 🔥)
====================================================== */

exports.login = async (req, res) => {
  try {
    let { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Email, password and role required",
      });
    }

    email = email.toLowerCase().trim();
    role = role.toLowerCase().trim();

    console.log("🔐 LOGIN ATTEMPT:", { email, role });

    /* ==================================================
    ADMIN LOGIN
    ================================================== */

    if (role === "admin") {
      if (
        email !== process.env.ADMIN_EMAIL ||
        password !== process.env.ADMIN_PASSWORD
      ) {
        return res.status(401).json({
          success: false,
          message: "Invalid admin credentials",
        });
      }

      const token = generateToken("admin-id", "admin");

      return res.json({
        success: true,
        token,
        role: "admin",
        user: {
          id: "admin-id",
          name: "Admin",
          email,
          role: "admin",
        },
      });
    }

    /* ==================================================
    DRIVER LOGIN
    ================================================== */

    if (role === "driver") {
      const driver = await Driver.findOne({ email }).select("+password");

      if (!driver || !driver.password) {
        return res.status(401).json({
          success: false,
          message: "Driver account not found",
        });
      }

      const match = await bcrypt.compare(password, driver.password);

      console.log("🔑 DRIVER PASSWORD MATCH:", match);

      if (!match) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      if (!driver.isApproved) {
        return res.status(403).json({
          success: false,
          message: "Driver not approved",
        });
      }

      /* ✅ UPDATE STATUS */
      driver.isOnline = true;
      driver.isAvailable = true;
      driver.lastActive = new Date();

      await driver.save();

      const token = generateToken(driver._id, "driver");

      return res.json({
        success: true,
        token,
        role: "driver",
        user: {
          id: driver._id,
          name: driver.name,
          email: driver.email,
          phone: driver.phone,
          role: "driver",
        },
      });
    }

    /* ==================================================
    USER LOGIN
    ================================================== */

    if (role === "user") {
      const user = await User.findOne({ email }).select("+password");

      if (!user || !user.password) {
        return res.status(401).json({
          success: false,
          message: "User account not found",
        });
      }

      const match = await bcrypt.compare(password, user.password);

      console.log("🔑 USER PASSWORD MATCH:", match);

      if (!match) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      const token = generateToken(user._id, "user");

      return res.json({
        success: true,
        token,
        role: "user",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: "user",
        },
      });
    }

    /* ==================================================
    INVALID ROLE
    ================================================== */

    return res.status(400).json({
      success: false,
      message: "Invalid role",
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* ======================================================
GET ME
====================================================== */

exports.getMe = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    return res.json({
      success: true,
      user: req.user,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user",
    });
  }
};

/* ======================================================
LOGOUT
====================================================== */

exports.logout = async (req, res) => {
  try {
    if (req.user?.role === "driver") {
      await Driver.findByIdAndUpdate(req.user.id, {
        isOnline: false,
        isAvailable: false,
        socketId: null,
      });
    }

    return res.json({
      success: true,
      message: "Logged out",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
};