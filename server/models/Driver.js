const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

/* =========================================================
🚗 DRIVER SCHEMA
========================================================= */

const driverSchema = new mongoose.Schema(
  {
    /* ================= BASIC ================= */

    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    phone: {
      type: String,
      required: true
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false
    },

    role: {
      type: String,
      default: "driver"
    },

    /* ================= VEHICLE ================= */

    vehicle: {
      type: {
        type: String,
        enum: ["bike", "auto", "car"],
        required: true
      },
      number: {
        type: String,
        required: true
      }
    },

    // 🔥 IMPORTANT (used in matching)
    vehicleType: {
      type: String,
      enum: ["bike", "auto", "car"],
      required: true
    },

    /* ================= LOCATION ================= */

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: {
        type: [Number], // [lng, lat]
        default: [77.1025, 28.7041], // 🔥 fallback (Delhi)
        validate: {
          validator: function (val) {
            return (
              Array.isArray(val) &&
              val.length === 2 &&
              val[0] >= -180 &&
              val[0] <= 180 &&
              val[1] >= -90 &&
              val[1] <= 90
            );
          },
          message: "Coordinates must be valid [lng, lat]"
        }
      }
    },

    lastLocationUpdate: {
      type: Date,
      default: Date.now
    },

    /* ================= STATUS ================= */

    isApproved: {
      type: Boolean,
      default: true
    },

    isOnline: {
      type: Boolean,
      default: false
    },

    isAvailable: {
      type: Boolean,
      default: false
    },

    currentRide: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ride",
      default: null
    },

    lastActive: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

/* =========================================================
🔥 GEO INDEX (CRITICAL)
========================================================= */
driverSchema.index({ location: "2dsphere" });

/* =========================================================
⚡ MATCHING INDEX
========================================================= */
driverSchema.index({ isOnline: 1, isAvailable: 1, vehicleType: 1 });

/* =========================================================
🔐 PASSWORD HASH
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
🔥 AUTO STATUS LOGIC (VERY IMPORTANT)
========================================================= */
driverSchema.pre("save", function () {

  // ❌ Offline → not available
  if (!this.isOnline) {
    this.isAvailable = false;
  }

  // ✅ Online + no ride → available
  if (this.isOnline && !this.currentRide) {
    this.isAvailable = true;
  }

  // ❌ If has ride → not available
  if (this.currentRide) {
    this.isAvailable = false;
  }

  this.lastActive = Date.now();
});

/* =========================================================
📍 UPDATE LOCATION TIMESTAMP
========================================================= */
driverSchema.pre("save", function () {
  if (this.isModified("location")) {
    this.lastLocationUpdate = Date.now();
  }
});

/* =========================================================
🔑 COMPARE PASSWORD
========================================================= */
driverSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword.trim(), this.password);
};

/* =========================================================
📍 STATIC: FIND NEARBY DRIVERS (🔥 USED IN DISPATCH)
========================================================= */
driverSchema.statics.getNearbyDrivers = function (
  lat,
  lng,
  vehicleType,
  radius = 5000
) {
  return this.find({
    isOnline: true,
    isAvailable: true,
    vehicleType,
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [parseFloat(lng), parseFloat(lat)]
        },
        $maxDistance: radius
      }
    }
  });
};

/* =========================================================
🧼 CLEAN RESPONSE
========================================================= */
driverSchema.set("toJSON", {
  transform: (_, ret) => {
    delete ret.__v;
    delete ret.password;
    return ret;
  }
});

module.exports = mongoose.model("Driver", driverSchema);