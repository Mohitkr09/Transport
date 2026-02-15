const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ===============================
// PROTECT ROUTES (JWT AUTH)
// ===============================
exports.protect = async (req, res, next) => {
  let token;

  // ✅ Read token safely
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  // ❌ No token
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Not authorized, token missing"
    });
  }

  try {
    // ✅ Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ Attach user to request
    req.user = await User.findById(decoded.id).select("-password");

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User not found"
      });
    }

    next();
  } catch (err) {
    console.error("JWT VERIFY FAILED:", err.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });
  }
};

// ===============================
// ADMIN ONLY ACCESS
// ===============================
exports.adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied: Admin only"
    });
  }
  next();
};

// ===============================
// DRIVER ONLY ACCESS (OPTIONAL)
// ===============================
exports.driverOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "driver") {
    return res.status(403).json({
      success: false,
      message: "Access denied: Driver only"
    });
  }
  next();
};
