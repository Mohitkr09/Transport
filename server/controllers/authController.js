const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ================= TOKEN GENERATOR =================
const generateToken = (id, role) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET missing in environment variables");
  }

  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// ===================================================
// REGISTER
// ===================================================
exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // validate
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields required"
      });
    }

    // check existing
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({
        success: false,
        message: "User already exists"
      });
    }

    // hash password
    const hashed = await bcrypt.hash(password, 10);

    // create user
    const user = await User.create({
      name,
      email,
      password: hashed,
      role: role || "user"
    });

    // token
    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Server error"
    });
  }
};

// ===================================================
// LOGIN
// ===================================================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    // validate
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password required"
      });
    }

    // find user
    const user = await User.findOne({ email });

    if (!user || !user.password) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    // compare password safely
    let match = false;
    try {
      match = await bcrypt.compare(password, user.password);
    } catch (err) {
      console.error("Password compare failed:", err);
      return res.status(500).json({
        success: false,
        message: "Password validation error"
      });
    }

    if (!match) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    // generate token safely
    let token;
    try {
      token = generateToken(user._id, user.role);
    } catch (err) {
      console.error("JWT error:", err);
      return res.status(500).json({
        success: false,
        message: "Token generation failed"
      });
    }

    // success
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err);

    res.status(500).json({
      success: false,
      message: err.message || "Server error"
    });
  }
};
