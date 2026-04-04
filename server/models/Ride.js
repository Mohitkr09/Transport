const mongoose = require("mongoose");

/* ======================================================
🌍 GEO POINT (STRICT + SAFE)
====================================================== */

const pointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
      required: true
    },
    coordinates: {
      type: [Number], // [lng, lat]
      required: true,
      validate: {
        validator: (arr) =>
          Array.isArray(arr) &&
          arr.length === 2 &&
          arr[0] >= -180 &&
          arr[0] <= 180 &&
          arr[1] >= -90 &&
          arr[1] <= 90,
        message: "Invalid coordinates"
      }
    }
  },
  { _id: false }
);

/* ======================================================
🚗 RIDE SCHEMA
====================================================== */

const rideSchema = new mongoose.Schema(
  {
    /* ================= USERS ================= */

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      default: null,
      index: true
    },

    /* ================= LOCATIONS ================= */

    pickupLocation: {
      address: {
        type: String,
        required: true
      },
      location: {
        type: pointSchema,
        required: true
      }
    },

    dropLocation: {
      address: {
        type: String,
        required: true
      },
      location: {
        type: pointSchema,
        required: true
      }
    },

    /* ================= RIDE INFO ================= */

    vehicleType: {
      type: String,
      enum: ["bike", "auto", "car"],
      required: true
    },

    distanceKm: {
      type: Number,
      default: 0,
      min: 0
    },

    durationMin: {
      type: Number,
      default: 0
    },

    fare: {
      type: Number,
      required: true,
      min: 0
    },

    paymentMethod: {
      type: String,
      enum: ["cash", "online"],
      default: "cash"
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending"
    },

    /* ================= STATUS ================= */

    status: {
      type: String,
      enum: [
        "searching",
        "accepted",
        "ongoing",
        "completed",
        "cancelled",
        "no_driver"
      ],
      default: "searching",
      index: true
    },

    /* ================= DISPATCH ================= */

    rejectedDrivers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Driver"
      }
    ],

    dispatchIndex: {
      type: Number,
      default: 0
    },

    /* ================= TRACKING ================= */

    driverLocation: {
      type: pointSchema,
      default: null
    },

    routePath: [
      {
        lat: Number,
        lng: Number,
        timestamp: {
          type: Date,
          default: Date.now
        }
      }
    ],

    /* ================= TIMESTAMPS ================= */

    requestedAt: {
      type: Date,
      default: Date.now
    },

    acceptedAt: Date,
    startedAt: Date,
    completedAt: Date,
    cancelledAt: Date
  },
  { timestamps: true }
);

/* ======================================================
🔥 GEO INDEX (CRITICAL)
====================================================== */

rideSchema.index({ "pickupLocation.location": "2dsphere" });

/* ======================================================
⚡ EXTRA INDEXES
====================================================== */

rideSchema.index({ status: 1, vehicleType: 1 });

/* ======================================================
🚀 METHODS
====================================================== */

/* ACCEPT RIDE (SAFE) */
rideSchema.methods.acceptRide = function (driverId) {
  if (this.status !== "searching") {
    throw new Error("Ride already accepted");
  }

  this.driver = driverId;
  this.status = "accepted";
  this.acceptedAt = new Date();

  return this.save();
};

/* START RIDE */
rideSchema.methods.startRide = function () {
  this.status = "ongoing";
  this.startedAt = new Date();
  return this.save();
};

/* COMPLETE RIDE */
rideSchema.methods.completeRide = function () {
  this.status = "completed";
  this.completedAt = new Date();
  this.paymentStatus = "paid";
  return this.save();
};

/* CANCEL RIDE */
rideSchema.methods.cancelRide = function () {
  this.status = "cancelled";
  this.cancelledAt = new Date();
  return this.save();
};

/* NO DRIVER FOUND */
rideSchema.methods.markNoDriver = function () {
  this.status = "no_driver";
  return this.save();
};

/* DRIVER LIVE LOCATION + ROUTE */
rideSchema.methods.updateDriverLocation = function (lat, lng) {
  this.driverLocation = {
    type: "Point",
    coordinates: [Number(lng), Number(lat)]
  };

  // 🔥 LIMIT ROUTE PATH (PREVENT DB OVERLOAD)
  if (this.routePath.length > 200) {
    this.routePath.shift();
  }

  this.routePath.push({
    lat: Number(lat),
    lng: Number(lng),
    timestamp: new Date()
  });

  return this.save();
};

/* ======================================================
📍 STATIC: FIND NEARBY RIDES
====================================================== */

rideSchema.statics.getNearbyRides = function (lat, lng, radius = 5000) {
  return this.find({
    status: "searching",
    "pickupLocation.location": {
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

/* ======================================================
🧼 CLEAN RESPONSE (IMPORTANT FOR FRONTEND)
====================================================== */

rideSchema.set("toJSON", {
  transform: (_, ret) => {
    delete ret.__v;

    // 🔥 ensure safe frontend fields
    ret.pickupLocation = ret.pickupLocation || {};
    ret.dropLocation = ret.dropLocation || {};

    return ret;
  }
});

module.exports = mongoose.model("Ride", rideSchema);