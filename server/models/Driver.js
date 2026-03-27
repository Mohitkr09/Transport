const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const driverSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },

  phone: {
    type: String,
    required: true,
  },

  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false,
  },

  role: {
    type: String,
    default: "driver",
  },

  vehicle: {
    type: {
      type: String,
      enum: ["bike", "auto", "car"],
      required: true,
    },
    number: String,
  },

  isApproved: {
    type: Boolean,
    default: true, // ✅ for testing (important)
  },

  isOnline: {
    type: Boolean,
    default: false,
  },

  isAvailable: {
    type: Boolean,
    default: false,
  },

  lastActive: {
    type: Date,
    default: Date.now,
  }

}, { timestamps: true });

/* ================= PASSWORD HASH (NO NEXT) ================= */

driverSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  if (
    this.password.startsWith("$2a$") ||
    this.password.startsWith("$2b$")
  ) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password.trim(), salt);
});

/* ================= STATUS CONTROL (NO NEXT) ================= */

driverSchema.pre("save", function () {
  if (!this.isOnline) {
    this.isAvailable = false;
  }
});

/* ================= PASSWORD MATCH ================= */

driverSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword.trim(), this.password);
};

module.exports = mongoose.model("Driver", driverSchema);