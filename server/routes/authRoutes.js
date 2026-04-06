const express = require("express");
const router = express.Router();

/* ================= IMPORTS ================= */
const {
  register,
  login
} = require("../controllers/authController");

/* 🔥 IMPORTANT FIX HERE */
const { protect } = require("../middleware/authMiddleware");

/* ================= ASYNC WRAPPER ================= */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/* ================= VALIDATION ================= */
const validateRegister = (req, res, next) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: "All fields are required",
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters",
    });
  }

  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password required",
    });
  }

  next();
};

/* ================= ROUTES ================= */

/* 🔐 REGISTER */
router.post(
  "/register",
  validateRegister,
  asyncHandler(register)
);

/* 🔐 LOGIN */
router.post(
  "/login",
  validateLogin,
  asyncHandler(login)
);

/* 👤 GET CURRENT USER */
router.get(
  "/me",
  protect, // ✅ NOW WORKS
  asyncHandler(async (req, res) => {
    res.status(200).json({
      success: true,
      user: req.user,
    });
  })
);

/* ❤️ HEALTH CHECK */
router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Auth routes working",
  });
});

/* ================= EXPORT ================= */
module.exports = router;