const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const driverSchema = new mongoose.Schema(
  {
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

    /* ================= VEHICLE ================= */

    vehicle: {
      type: {
        type: String,
        enum: ["bike", "auto", "car"],
        required: true,
      },
      number: String,
    },

    /* ================= LOCATION (🔥 IMPORTANT) ================= */

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [lng, lat]
        default: [0, 0],
      },
    },

    lastLocationUpdate: {
      type: Date,
      default: Date.now,
    },

    /* ================= STATUS ================= */

    isApproved: {
      type: Boolean,
      default: true, // for testing
    },

    isOnline: {
      type: Boolean,
      default: false,
    },

    isAvailable: {
      type: Boolean,
      default: false,
    },

    currentRide: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ride",
      default: null,
    },

    lastActive: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

/* =========================================================
🔥 GEO INDEX (CRITICAL FOR 50KM SEARCH)
========================================================= */

driverSchema.index({ location: "2dsphere" });

/* =========================================================
PASSWORD HASH
========================================================= */

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

/* =========================================================
STATUS CONTROL
========================================================= */

driverSchema.pre("save", function () {
  if (!this.isOnline) {
    this.isAvailable = false;
  }
});


driverSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword.trim(), this.password);
};

module.exports = mongoose.model("Driver", driverSchema);