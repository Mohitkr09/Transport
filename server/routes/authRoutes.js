const express = require("express");
const router = express.Router();

const { register, login, getMe } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

/* ================= VALIDATION ================= */

const validateRegister = (req, res, next) => {
  const { name, email, password, phone } = req.body;

  if (!name || !email || !password || !phone) {
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
  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({
      success: false,
      message: "Email, password and role required",
    });
  }

  next();
};

/* ================= ROUTES ================= */

router.post("/register", validateRegister, register);
router.post("/login", validateLogin, login);
router.get("/me", protect, getMe);

router.get("/", (req, res) => {
  res.json({ success: true, message: "Auth routes working" });
});

module.exports = router;