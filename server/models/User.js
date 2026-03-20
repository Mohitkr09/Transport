const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

/* ======================================================
USER SCHEMA
====================================================== */

const userSchema = new mongoose.Schema({

  /* ================= BASIC INFO ================= */

  name: {
    type: String,
    required: [true, "Name required"],
    trim: true
  },

  email: {
    type: String,
    required: [true, "Email required"],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, "Invalid email"],
    index: true
  },

  password: {
    type: String,
    required: [true, "Password required"],
    minlength: 6,
    select: false // ✅ hidden by default
  },

  phone: {
    type: String,
    required: [true, "Phone required"],
    trim: true,
    match: [/^[0-9]{10,15}$/, "Invalid phone number"],
    index: true
  },

  role: {
    type: String,
    enum: ["user", "driver", "admin"],
    default: "user",
    index: true
  },

  /* ================= PROFILE ================= */

  avatar: {
    type: String,
    default: null
  },

  /* ================= LOCATION ================= */

  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point"
    },
    coordinates: {
      type: [Number],
      default: undefined
    }
  },

  lastLocationUpdate: Date,

  /* ================= ACCOUNT STATUS ================= */

  isActive: {
    type: Boolean,
    default: true
  },

  isBlocked: {
    type: Boolean,
    default: false
  },

  lastLogin: Date,

  /* ================= SECURITY ================= */

  otp: {
    code: Number,
    expiresAt: Date
  },

  resetPasswordToken: String,
  resetPasswordExpires: Date

}, {
  timestamps: true
});

/* ======================================================
INDEXES
====================================================== */

userSchema.index({ location: "2dsphere" });

/* ======================================================
PASSWORD HASH (FINAL SAFE VERSION)
====================================================== */

userSchema.pre("save", async function (next) {
  try {
    // 🔥 prevent re-hashing already hashed password
    if (!this.isModified("password")) return next();

    // extra safety (avoid double hashing bug)
    if (this.password.startsWith("$2a$") || this.password.startsWith("$2b$")) {
      return next();
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);

    next();
  } catch (err) {
    next(err);
  }
});

/* ======================================================
METHODS
====================================================== */

userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) {
    throw new Error("Password not loaded. Use .select('+password')");
  }
  return bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.updateLocation = function (lat, lng) {
  if (!lat || !lng) return;

  this.location = {
    type: "Point",
    coordinates: [Number(lng), Number(lat)]
  };

  this.lastLocationUpdate = new Date();
};

userSchema.methods.setOTP = function (code) {
  this.otp = {
    code,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000)
  };
};

userSchema.methods.verifyOTP = function (input) {
  if (!this.otp) return false;

  const isValid =
    this.otp.code === Number(input) &&
    this.otp.expiresAt > new Date();

  if (isValid) {
    this.otp = undefined;
  }

  return isValid;
};

/* ======================================================
VIRTUALS
====================================================== */

userSchema.virtual("isOnline").get(function () {
  if (!this.lastLogin) return false;

  const diff = Date.now() - new Date(this.lastLogin).getTime();
  return diff < 5 * 60 * 1000;
});

/* ======================================================
JSON CLEANUP
====================================================== */

userSchema.set("toJSON", {
  virtuals: true,
  transform: (_, ret) => {
    delete ret.password;
    delete ret.__v;
    delete ret.resetPasswordToken;
    delete ret.resetPasswordExpires;
    delete ret.otp;
    return ret;
  }
});

/* ======================================================
EXPORT
====================================================== */

module.exports = mongoose.model("User", userSchema);