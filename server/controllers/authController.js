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
REGISTER USER
====================================================== */

exports.register = async (req, res) => {
  try {
    let { name, email, password, phone } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: "All fields required",
      });
    }

    email = email.toLowerCase().trim();
    password = password.trim();

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

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      role: "user",
    });

    const token = generateToken(user._id, "user");

    res.status(201).json({
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
    res.status(500).json({
      success: false,
      message: "Registration failed",
    });
  }
};

/* ======================================================
LOGIN (FINAL STABLE VERSION 🚀)
====================================================== */

exports.login = async (req, res) => {
  try {
    let { email, password, role } = req.body;

    /* ================= VALIDATION ================= */

    if (!email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Email, password and role required",
      });
    }

    email = email.toLowerCase().trim();
    password = password.trim();
    role = role.toLowerCase().trim();

    console.log("🔐 LOGIN ATTEMPT:", { email, role });

    let account = null;

    /* ================= DRIVER ================= */

    if (role === "driver") {
      account = await Driver.findOne({ email }).select("+password");
    }

    /* ================= USER / ADMIN ================= */

    else if (role === "user" || role === "admin") {
      account = await User.findOne({ email, role }).select("+password");
    }

    else {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    /* ================= ACCOUNT CHECK ================= */

    if (!account || !account.password) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    /* ================= PASSWORD MATCH ================= */

    const isMatch = await bcrypt.compare(password, account.password);

    console.log("🔑 PASSWORD MATCH:", isMatch);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    /* ================= DRIVER APPROVAL ================= */

    if (role === "driver" && !account.isApproved) {
      return res.status(403).json({
        success: false,
        message: "Driver not approved",
      });
    }

    /* ================= DRIVER STATUS UPDATE ================= */

    if (role === "driver") {
      account.isOnline = true;
      account.isAvailable = true;
      account.lastActive = new Date();
      await account.save();
    }

    /* ================= TOKEN ================= */

    const token = generateToken(account._id, account.role);

    /* ================= RESPONSE ================= */

    res.json({
      success: true,
      token,
      role: account.role,
      user: {
        id: account._id,
        name: account.name,
        email: account.email,
        phone: account.phone || "",
        role: account.role,
      },
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err);

    res.status(500).json({
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