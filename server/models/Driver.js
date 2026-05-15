const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

/* =========================================================
📍 LOCATION SCHEMA
========================================================= */

const pointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },

    coordinates: {
      type: [Number], // [lng, lat]
      default: [77.1025, 28.7041],
    },
  },
  { _id: false }
);

/* =========================================================
🚗 DRIVER SCHEMA
========================================================= */

const driverSchema = new mongoose.Schema(
  {
    /* =========================================================
    👤 BASIC INFO
    ========================================================= */

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
      trim: true,
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

    /* =========================================================
    🖼️ PROFILE IMAGE
    ========================================================= */

    profilePic: {
      type: String,

      default:
        "https://cdn-icons-png.flaticon.com/512/149/149071.png",
    },

    /* =========================================================
    🚘 VEHICLE INFO
    ========================================================= */

    vehicle: {
      type: {
        type: String,

        enum: ["bike", "auto", "car"],

        required: true,
      },

      number: {
        type: String,
        required: true,
      },
    },

    /* =========================================================
    🔥 AUTO VEHICLE TYPE
    ========================================================= */

    vehicleType: {
      type: String,

      enum: ["bike", "auto", "car"],

      default: null,
    },

    /* =========================================================
    📍 LIVE LOCATION
    ========================================================= */

    location: {
      type: pointSchema,

      default: {
        type: "Point",
        coordinates: [77.1025, 28.7041],
      },
    },

    lastLocationUpdate: {
      type: Date,
      default: Date.now,
    },

    /* =========================================================
    🟢 DRIVER STATUS
    ========================================================= */

    isApproved: {
      type: Boolean,
      default: true,
    },

    isOnline: {
      type: Boolean,
      default: false,
    },

    isAvailable: {
      type: Boolean,
      default: false,
    },

    /* =========================================================
    🚖 CURRENT RIDE
    ========================================================= */

    currentRide: {
      type: mongoose.Schema.Types.ObjectId,

      ref: "Ride",

      default: null,
    },

    /* =========================================================
    📊 DRIVER STATS
    ========================================================= */

    totalRides: {
      type: Number,
      default: 0,
    },

    totalEarnings: {
      type: Number,
      default: 0,
    },

    rating: {
      type: Number,
      default: 5,
    },

    lastActive: {
      type: Date,
      default: Date.now,
    },
  },

  {
    timestamps: true,
  }
);

/* =========================================================
🔥 GEO INDEX
========================================================= */

driverSchema.index({
  location: "2dsphere",
});

/* =========================================================
⚡ MATCHING INDEX
========================================================= */

driverSchema.index({
  isOnline: 1,
  isAvailable: 1,
  vehicleType: 1,
});

/* =========================================================
🔐 PASSWORD HASH
========================================================= */

driverSchema.pre("save", async function (next) {

  if (!this.isModified("password")) {
    return next();
  }

  try {

    const salt =
      await bcrypt.genSalt(10);

    this.password =
      await bcrypt.hash(
        this.password.trim(),
        salt
      );

    next();

  } catch (err) {

    next(err);
  }
});

/* =========================================================
🔥 AUTO SYNC VEHICLE TYPE
========================================================= */

driverSchema.pre("save", function (next) {

  if (this.vehicle?.type) {

    this.vehicleType =
      this.vehicle.type;
  }

  next();
});

/* =========================================================
🟢 DRIVER STATUS LOGIC
========================================================= */

driverSchema.pre("save", function (next) {

  /* OFFLINE */

  if (!this.isOnline) {

    this.isAvailable = false;
  }

  /* ONLINE + NO RIDE */

  if (
    this.isOnline &&
    !this.currentRide
  ) {

    this.isAvailable = true;
  }

  /* ACTIVE RIDE */

  if (this.currentRide) {

    this.isAvailable = false;
  }

  this.lastActive = Date.now();

  next();
});

/* =========================================================
📍 LOCATION UPDATE TIME
========================================================= */

driverSchema.pre("save", function (next) {

  if (
    this.isModified("location")
  ) {

    this.lastLocationUpdate =
      Date.now();
  }

  next();
});

/* =========================================================
🔑 PASSWORD MATCH
========================================================= */

driverSchema.methods.matchPassword =
  async function (
    enteredPassword
  ) {

    return bcrypt.compare(
      enteredPassword.trim(),
      this.password
    );
  };

/* =========================================================
📍 FIND NEARBY DRIVERS
========================================================= */

driverSchema.statics.getNearbyDrivers =
  function (
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

            coordinates: [
              parseFloat(lng),
              parseFloat(lat),
            ],
          },

          $maxDistance: radius,
        },
      },
    });
  };

/* =========================================================
📍 UPDATE DRIVER LOCATION
========================================================= */

driverSchema.methods.updateLocation =
  function (lat, lng) {

    this.location = {

      type: "Point",

      coordinates: [
        Number(lng),
        Number(lat),
      ],
    };

    this.lastLocationUpdate =
      new Date();

    return this.save();
  };

/* =========================================================
🧼 CLEAN RESPONSE
========================================================= */

driverSchema.set("toJSON", {

  transform: (_, ret) => {

    delete ret.__v;

    delete ret.password;

    return ret;
  },
});

/* =========================================================
🚀 EXPORT MODEL
========================================================= */

module.exports =
  mongoose.models.Driver ||
  mongoose.model(
    "Driver",
    driverSchema
  );