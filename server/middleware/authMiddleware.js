const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ===============================
// PROTECT ROUTES
// ===============================
exports.protect = async (req, res, next) => {
  let token;

  try {
    // READ TOKEN
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    // NO TOKEN
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, token missing"
      });
    }

    // VERIFY TOKEN
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // GET USER
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found"
      });
    }

    // ATTACH USER
    req.user = user;

    next();
  } catch (err) {
    console.error("AUTH ERROR:", err.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });
  }
};

// ===============================
// ADMIN ONLY
// ===============================
exports.adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "admin")
    return res.status(403).json({
      success: false,
      message: "Admin access only"
    });

  next();
};


exports.driverOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "driver")
    return res.status(403).json({
      success: false,
      message: "Driver access only"
    });

  next();
};

                                              