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

    // 🔥 FIX: NOT required anymore
    vehicleType: {
      type: String,
      enum: ["bike", "auto", "car"],
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
        default: [77.1025, 28.7041],
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
🔥 GEO INDEX
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

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password.trim(), salt);
});

/* =========================================================
🔥 FIX: AUTO SYNC vehicleType
========================================================= */
driverSchema.pre("save", function () {
  if (this.vehicle?.type) {
    this.vehicleType = this.vehicle.type;
  }
});

/* =========================================================
🔥 STATUS LOGIC
========================================================= */
driverSchema.pre("save", function () {

  if (!this.isOnline) {
    this.isAvailable = false;
  }

  if (this.isOnline && !this.currentRide) {
    this.isAvailable = true;
  }

  if (this.currentRide) {
    this.isAvailable = false;
  }

  this.lastActive = Date.now();
});

/* =========================================================
📍 LOCATION TIMESTAMP
========================================================= */
driverSchema.pre("save", function () {
  if (this.isModified("location")) {
    this.lastLocationUpdate = Date.now();
  }
});

/* =========================================================
🔑 PASSWORD CHECK
========================================================= */
driverSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword.trim(), this.password);
};

/* =========================================================
📍 NEARBY DRIVER SEARCH
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