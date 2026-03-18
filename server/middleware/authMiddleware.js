const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Driver = require("../models/Driver");

/* =========================================
PROTECT ROUTES
========================================= */

exports.protect = async (req, res, next) => {

  let token;

  try {

    /* ================================
    READ TOKEN
    ================================ */

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, token missing"
      });
    }

    /* ================================
    VERIFY TOKEN
    ================================ */

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    let user = null;

    /* ================================
    FETCH USER BASED ON ROLE
    ================================ */

    if (decoded.role === "driver") {
      user = await Driver.findById(decoded.id).select("-password");
    } else if (decoded.role === "admin") {
      user = {
        id: "admin-id",
        name: "Admin",
        email: process.env.ADMIN_EMAIL,
        role: "admin"
      };
    } else {
      user = await User.findById(decoded.id).select("-password");
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found"
      });
    }

    /* ================================
    🔥 CRITICAL FIX: ATTACH ROLE
    ================================ */

    req.user = {
      ...user.toObject?.() || user,
      role: decoded.role
    };

    next();

  } catch (err) {

    console.error("AUTH ERROR:", err.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });

  }

};


/* =========================================
ADMIN ONLY
========================================= */

exports.adminOnly = (req, res, next) => {

  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access only"
    });
  }

  next();

};


/* =========================================
DRIVER ONLY
========================================= */

exports.driverOnly = (req, res, next) => {

  if (!req.user || req.user.role !== "driver") {
    return res.status(403).json({
      success: false,
      message: "Driver access only"
    });
  }

  next();

};