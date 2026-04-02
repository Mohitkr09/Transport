const mongoose = require("mongoose");

/* ======================================================
GEO POINT (STRICT + SAFE)
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
RIDE SCHEMA
====================================================== */

const rideSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      default: null
    },

    /* ================= LOCATIONS ================= */

    pickupLocation: {
      address: String,
      location: {
        type: pointSchema,
        required: true
      }
    },

    dropLocation: {
      address: String,
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
      default: 0
    },

    fare: {
      type: Number,
      required: true
    },

    /* ================= STATUS (🔥 FIXED) ================= */

    status: {
      type: String,
      enum: [
        "searching",   // 🔥 FIXED
        "accepted",
        "ongoing",
        "completed",
        "cancelled"
      ],
      default: "searching"
    },

    rejectedDrivers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Driver"
      }
    ],

    /* ================= TRACKING ================= */

    driverLocation: {
      type: pointSchema,
      default: null
    },

    /* ================= TIMESTAMPS ================= */

    requestedAt: {
      type: Date,
      default: Date.now
    },

    acceptedAt: Date,
    startedAt: Date,
    completedAt: Date
  },
  { timestamps: true }
);

/* ======================================================
🔥 GEO INDEX (CRITICAL)
====================================================== */

rideSchema.index({ "pickupLocation.location": "2dsphere" });

/* ======================================================
EXTRA INDEXES (PERFORMANCE)
====================================================== */

rideSchema.index({ status: 1 });
rideSchema.index({ driver: 1 });

/* ======================================================
METHODS
====================================================== */

rideSchema.methods.acceptRide = function (driverId) {
  this.driver = driverId;
  this.status = "accepted";
  this.acceptedAt = new Date();
  return this.save();
};

rideSchema.methods.startRide = function () {
  this.status = "ongoing";
  this.startedAt = new Date();
  return this.save();
};

rideSchema.methods.completeRide = function () {
  this.status = "completed";
  this.completedAt = new Date();
  return this.save();
};

rideSchema.methods.updateDriverLocation = function (lat, lng) {
  this.driverLocation = {
    type: "Point",
    coordinates: [Number(lng), Number(lat)]
  };
  return this.save();
};

/* ======================================================
STATIC: FIND NEARBY RIDES (🔥 FIXED)
====================================================== */

rideSchema.statics.getNearbyRides = function (lat, lng) {
  return this.find({
    status: "searching", // 🔥 FIXED
    "pickupLocation.location": {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [parseFloat(lng), parseFloat(lat)]
        },
        $maxDistance: 5000
      }
    }
  });
};

/* ======================================================
JSON CLEANUP
====================================================== */

rideSchema.set("toJSON", {
  transform: (_, ret) => {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model("Ride", rideSchema);