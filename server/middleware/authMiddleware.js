const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Driver = require("../models/Driver");

/* ================= PROTECT ================= */
exports.protect = async (req, res, next) => {
  try {
    let token;

    /* ================= GET TOKEN ================= */
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token missing",
      });
    }

    /* ================= VERIFY ================= */
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    let user;

    /* ================= FETCH USER ================= */
    if (decoded.role === "driver") {
      user = await Driver.findById(decoded.id).select("-password");
    } else {
      user = await User.findById(decoded.id).select("-password");
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    /* ================= FINAL FIX ================= */
    req.user = {
      _id: user._id,                 // ✅ FIX (IMPORTANT)
      id: user._id.toString(),       // optional
      role: decoded.role,
      name: user.name,
      email: user.email,
    };

    next();

  } catch (err) {
    console.error("🔥 AUTH ERROR:", err.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

/* ================= ADMIN ================= */
exports.adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin only",
    });
  }
  next();
};

/* ================= DRIVER ================= */
exports.driverOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "driver") {
    return res.status(403).json({
      success: false,
      message: "Driver only",
    });
  }
  next();
};