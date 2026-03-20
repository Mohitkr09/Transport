const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

/* ======================================================
DRIVER SCHEMA
====================================================== */

const driverSchema = new mongoose.Schema({

  /* ================= BASIC INFO ================= */

  name: {
    type: String,
    required: [true, "Driver name required"],
    trim: true
  },

  email: {
    type: String,
    required: [true, "Email required"],
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
    match: [/^\S+@\S+\.\S+$/, "Invalid email"]
  },

  phone: {
    type: String,
    required: [true, "Phone required"],
    trim: true,
    match: [/^[0-9]{10,15}$/, "Invalid phone number"]
  },

  password: {
    type: String,
    required: [true, "Password required"],
    minlength: 6,
    select: false // 🔥 IMPORTANT
  },

  role: {
    type: String,
    default: "driver"
  },

  /* ================= DOCUMENTS ================= */

  documents: {
    license: { type: String, default: null },
    vehicleRC: { type: String, default: null }
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
      trim: true,
      uppercase: true
    },
    model: String,
    color: String
  },

  /* ================= ADMIN CONTROL ================= */

  isApproved: {
    type: Boolean,
    default: false,
    index: true
  },

  addedByAdmin: {
    type: Boolean,
    default: false
  },

  /* ================= STATUS ================= */

  isOnline: {
    type: Boolean,
    default: false,
    index: true
  },

  isAvailable: {
    type: Boolean,
    default: false,
    index: true
  },

  currentRide: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Ride",
    default: null,
    index: true
  },

  /* ================= REALTIME ================= */

  socketId: {
    type: String,
    default: null,
    index: true
  },

  lastActive: {
    type: Date,
    default: Date.now
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
      default: undefined, // ✅ prevents empty array issues
      validate: {
        validator: function (val) {
          return !val || (
            val.length === 2 &&
            val[0] >= -180 && val[0] <= 180 &&
            val[1] >= -90 && val[1] <= 90
          );
        },
        message: "Invalid coordinates"
      }
    }
  },

  lastLocationUpdate: {
    type: Date,
    default: null
  },

  /* ================= PERFORMANCE ================= */

  rating: {
    type: Number,
    default: 5,
    min: 1,
    max: 5
  },

  totalRides: {
    type: Number,
    default: 0
  },

  cancelledRides: {
    type: Number,
    default: 0
  },

  earnings: {
    type: Number,
    default: 0
  }

}, {
  timestamps: true
});

/* ======================================================
INDEXES
====================================================== */

driverSchema.index({ location: "2dsphere" });

driverSchema.index({
  isApproved: 1,
  isOnline: 1,
  isAvailable: 1,
  "vehicle.type": 1
});

/* ======================================================
PASSWORD HASH (FIXED SAFE)
====================================================== */

driverSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password.trim(), salt);
    next();
  } catch (err) {
    next(err);
  }
});

/* ======================================================
STATUS CONTROL
====================================================== */

driverSchema.pre("save", function (next) {
  if (!this.isOnline) {
    this.isAvailable = false;
  }
  next();
});

/* ======================================================
METHODS
====================================================== */

/* PASSWORD */

driverSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword.trim(), this.password);
};

/* LOCATION */

driverSchema.methods.updateLocation = function (lat, lng) {
  if (!lat || !lng) return;

  this.location = {
    type: "Point",
    coordinates: [Number(lng), Number(lat)]
  };

  this.lastLocationUpdate = new Date();
  this.lastActive = new Date();
};

/* STATUS */

driverSchema.methods.goOnline = function () {
  this.isOnline = true;
  this.isAvailable = true;
  this.lastActive = new Date();
};

driverSchema.methods.goOffline = function () {
  this.isOnline = false;
  this.isAvailable = false;
  this.socketId = null;
};

driverSchema.methods.markBusy = function (rideId) {
  this.isAvailable = false;
  this.currentRide = rideId;
};

driverSchema.methods.markAvailable = function () {
  this.currentRide = null;
  if (this.isOnline) this.isAvailable = true;
};

/* RIDE */

driverSchema.methods.completeRide = function (fare = 0) {
  this.totalRides += 1;
  this.earnings += Number(fare || 0);
  this.currentRide = null;
  this.isAvailable = true;
};

driverSchema.methods.cancelRide = function () {
  this.cancelledRides += 1;
  this.currentRide = null;
  this.isAvailable = true;
};

/* ======================================================
NEARBY DRIVER SEARCH
====================================================== */

driverSchema.statics.findNearbyDrivers = async function ({
  lat,
  lng,
  vehicleType,
  radius = 5000,
  limit = 10
}) {
  return this.find({
    isApproved: true,
    isOnline: true,
    isAvailable: true,
    ...(vehicleType && { "vehicle.type": vehicleType }),
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [Number(lng), Number(lat)]
        },
        $maxDistance: radius
      }
    }
  })
    .sort({ rating: -1, totalRides: -1 })
    .limit(limit);
};

/* ======================================================
VIRTUALS
====================================================== */

driverSchema.virtual("isBusy").get(function () {
  return !this.isAvailable;
});

/* ======================================================
JSON CLEANUP
====================================================== */

driverSchema.set("toJSON", {
  virtuals: true,
  transform: (_, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model("Driver", driverSchema);