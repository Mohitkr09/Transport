const User = require("../models/User");
const Driver = require("../models/Driver");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendEmail");

/* ======================================================
TOKEN
====================================================== */
const generateToken = (id, role) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET missing in .env");
  }

  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

/* ======================================================
REGISTER (FINAL FIXED 🚀)
====================================================== */
exports.register = async (req, res) => {
  try {
    let { name, email, password, phone, role } = req.body;

    /* ===== VALIDATION ===== */
    if (!name || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: "All fields required",
      });
    }

    email = email.toLowerCase().trim();
    password = password.trim();
    role = role?.toLowerCase().trim() || "user";

    if (!["user", "admin"].includes(role)) role = "user";

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    /* ===== CHECK EXIST ===== */
    const exists = await User.findOne({
      $or: [{ email }, { phone }],
    });

    if (exists) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }

    /* ===== CREATE USER ===== */
    const user = await User.create({
      name,
      email,
      password,
      phone,
      role,
    });

    /* ===== SAFE EMAIL (CRITICAL FIX) ===== */
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      sendEmail({
        to: user.email,
        subject: "Welcome to TransportX 🚗",
        html: `<h2>Welcome ${user.name}</h2>`,
      }).catch(err => {
        console.log("⚠️ Email failed:", err.message);
      });
    }

    /* ===== TOKEN ===== */
    const token = generateToken(user._id, role);

    return res.status(201).json({
      success: true,
      token,
      role,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role,
      },
    });

  } catch (err) {
    console.error("🔥 REGISTER ERROR FULL:", err);

    /* ===== REAL ERROR RESPONSE (IMPORTANT) ===== */
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email or phone already exists",
      });
    }

    if (err.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: err.message || "Server error",
    });
  }
};

/* ======================================================
LOGIN (SAFE)
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
    password = password.trim();
    role = role.toLowerCase().trim();

    let account = null;

    /* DRIVER */
    if (role === "driver") {
      account = await Driver.findOne({ email }).select("+password");
      if (account) account.role = "driver";
    }

    /* USER / ADMIN */
    else {
      account = await User.findOne({ email }).select("+password");

      if (account && account.role !== role) {
        return res.status(401).json({
          success: false,
          message: "Invalid role selected",
        });
      }
    }

    if (!account) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isMatch = await bcrypt.compare(password, account.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    /* DRIVER APPROVAL */
    if (role === "driver" && !account.isApproved) {
      return res.status(403).json({
        success: false,
        message: "Driver not approved",
      });
    }

    /* UPDATE LOGIN */
    if (role === "driver") {
      await Driver.findByIdAndUpdate(account._id, {
        isOnline: true,
        isAvailable: true,
        lastLogin: new Date(),
      });
    } else {
      await User.findByIdAndUpdate(account._id, {
        lastLogin: new Date(),
      });
    }

    const token = generateToken(account._id, account.role || role);

    return res.json({
      success: true,
      token,
      role: account.role || role,
      user: {
        id: account._id,
        name: account.name,
        email: account.email,
        phone: account.phone || "",
        role: account.role || role,
      },
    });

  } catch (err) {
    console.error("🔥 LOGIN ERROR FULL:", err);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
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

    res.json({
      success: true,
      user: req.user,
    });
  } catch (err) {
    res.status(500).json({
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

    res.json({
      success: true,
      message: "Logged out",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
};