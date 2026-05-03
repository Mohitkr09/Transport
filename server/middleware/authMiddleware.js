const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Driver = require("../models/Driver");

/* ================= PROTECT ================= */
exports.protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token missing",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    let user;

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

    req.user = {
      id: user._id.toString(),
      role: decoded.role,
      name: user.name,
      email: user.email,
    };

    next(); // ✅ correct

  } catch (err) {
    console.error("AUTH ERROR:", err.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

/* ================= ADMIN ================= */
exports.adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin only",
    });
  }
  next();
};

/* ================= DRIVER ================= */
exports.driverOnly = (req, res, next) => {
  if (req.user?.role !== "driver") {
    return res.status(403).json({
      success: false,
      message: "Driver only",
    });
  }
  next();
};