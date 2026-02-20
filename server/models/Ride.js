const mongoose = require("mongoose");

// ======================================================
// GEO POINT SCHEMA (Reusable)
// ======================================================
const pointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point"
    },
    coordinates: {
      type: [Number], // [lng, lat]
      validate: {
        validator: arr =>
          !arr ||
          (Array.isArray(arr) &&
            arr.length === 2 &&
            arr.every(n => typeof n === "number")),
        message: "Coordinates must be [lng, lat]"
      }
    }
  },
  { _id: false }
);

// ======================================================
// RIDE SCHEMA
// ======================================================
const rideSchema = new mongoose.Schema(
  {
    // ================= USER =================
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    // ================= DRIVER =================
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      default: null,
      index: true
    },

    // ================= LOCATIONS =================
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

    // ================= VEHICLE =================
    vehicleType: {
      type: String,
      enum: ["bike", "auto", "car"],
      required: true,
      index: true
    },

    // ================= DISTANCE =================
    distanceKm: {
      type: Number,
      default: 0
    },

    durationMin: Number,

    // ================= FARE =================
    fare: {
      type: Number,
      required: true,
      min: 0
    },

    surgeMultiplier: {
      type: Number,
      default: 1
    },

    // ================= PAYMENT =================
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
      index: true
    },

    paymentIntentId: {
      type: String,
      select: false
    },

    // ================= STATUS =================
    status: {
      type: String,
      enum: [
        "requested",
        "driver_assigned",
        "accepted",
        "ongoing",
        "completed",
        "cancelled",
        "no_driver_found"
      ],
      default: "requested",
      index: true
    },

    // ================= DRIVER RESPONSE TIMER =================
    driverResponseDeadline: Date,

    rejectedDrivers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Driver"
      }
    ],

    // ================= TIMESTAMPS =================
    requestedAt: { type: Date, default: Date.now },
    acceptedAt: Date,
    startedAt: Date,
    completedAt: Date,
    cancelledAt: Date,

    // ================= LIVE DRIVER LOCATION =================
    driverLocation: {
      type: pointSchema,
      default: null
    },

    driverLocationUpdatedAt: Date,

    // ================= CANCELLATION =================
    cancelledBy: {
      type: String,
      enum: ["user", "driver", "admin", null],
      default: null
    },

    cancelReason: String,

    // ================= FEEDBACK =================
    rating: {
      type: Number,
      min: 1,
      max: 5
    },

    feedback: String,

    // ================= OTP =================
    otp: {
      type: Number,
      min: 1000,
      max: 9999
    },

    // ================= ETA =================
    estimatedArrivalMin: Number,

    // ================= SOFT DELETE =================
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  { timestamps: true }
);

// ======================================================
// INDEXES (IMPORTANT)
// ======================================================
rideSchema.index({ user: 1, createdAt: -1 });
rideSchema.index({ driver: 1, status: 1 });
rideSchema.index({ status: 1, requestedAt: -1 });
rideSchema.index({ paymentStatus: 1 });
rideSchema.index({ "pickupLocation.location": "2dsphere" });
rideSchema.index({ driverResponseDeadline: 1 });

// ======================================================
// VIRTUALS
// ======================================================
rideSchema.virtual("isActive").get(function () {
  return ["requested", "driver_assigned", "accepted", "ongoing"].includes(
    this.status
  );
});

rideSchema.virtual("isCompleted").get(function () {
  return this.status === "completed";
});

// ======================================================
// METHODS
// ======================================================

// start ride
rideSchema.methods.startRide = function () {
  this.status = "ongoing";
  this.startedAt = new Date();
  return this.save();
};

// complete ride
rideSchema.methods.completeRide = function () {
  this.status = "completed";
  this.completedAt = new Date();
  return this.save();
};

// cancel ride
rideSchema.methods.cancelRide = function (by, reason) {
  this.status = "cancelled";
  this.cancelledAt = new Date();
  this.cancelledBy = by;
  this.cancelReason = reason;
  return this.save();
};

// assign driver
rideSchema.methods.assignDriver = function (driverId) {
  this.driver = driverId;
  this.status = "driver_assigned";
  this.driverResponseDeadline = new Date(Date.now() + 15000);
  return this.save();
};

// ======================================================
// JSON CLEANUP
// ======================================================
rideSchema.set("toJSON", {
  virtuals: true,
  transform: (_, ret) => {
    delete ret.__v;
    return ret;
  }
});

// ======================================================
// EXPORT
// ======================================================
module.exports = mongoose.model("Ride", rideSchema);