const User = require("../models/User");
const Driver = require("../models/Driver");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

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
REGISTER USER / ADMIN
====================================================== */

exports.register = async (req, res) => {
  try {
    let { name, email, password, phone, role } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: "All fields required",
      });
    }

    email = email.toLowerCase().trim();
    password = password.trim();
    role = role?.toLowerCase().trim() || "user";

    if (!["user", "admin"].includes(role)) {
      role = "user";
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

    const user = await User.create({
      name,
      email,
      password,
      phone,
      role,
    });

    const token = generateToken(user._id, role);

    res.status(201).json({
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
    console.error("🔥 REGISTER ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* ======================================================
LOGIN (FIXED 🚀)
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

    console.log("🔐 LOGIN:", { email, role });

    let account = null;

    /* ================= DRIVER ================= */

    if (role === "driver") {
      account = await Driver.findOne({ email }).select("+password");

      if (account) {
        account.role = "driver"; // ✅ FIX (important)
      }
    }

    /* ================= USER / ADMIN ================= */

    else if (role === "user" || role === "admin") {
      account = await User.findOne({ email }).select("+password");

      if (account && account.role !== role) {
        return res.status(401).json({
          success: false,
          message: "Invalid role selected",
        });
      }
    }

    else {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    /* ================= ACCOUNT CHECK ================= */

    if (!account) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!account.password) {
      console.error("❌ Password missing in DB");
      return res.status(500).json({
        success: false,
        message: "Internal error",
      });
    }

    /* ================= PASSWORD MATCH ================= */

    let isMatch = false;

    try {
      isMatch = await bcrypt.compare(password, account.password);
    } catch (err) {
      console.error("❌ BCRYPT ERROR:", err);
      return res.status(500).json({
        success: false,
        message: "Password compare failed",
      });
    }

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

    /* ================= UPDATE STATUS ================= */

    account.lastLogin = new Date();

    if (role === "driver") {
      account.isOnline = true;
      account.isAvailable = true;
      account.lastActive = new Date();
    }

    await account.save();

    /* ================= TOKEN ================= */

    const token = generateToken(
      account._id,
      account.role || role // ✅ fallback fix
    );

    /* ================= RESPONSE ================= */

    res.json({
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
    console.error("🔥 LOGIN ERROR:", err);

    res.status(500).json({
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
    console.error("GET ME ERROR:", err);

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
    console.error("LOGOUT ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
};