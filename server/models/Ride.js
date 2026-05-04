const mongoose = require("mongoose");

/* ======================================================
🌍 GEO POINT
====================================================== */
const pointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
      required: true,
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
        message: "Invalid coordinates",
      },
    },
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
      index: true,
    },

    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      default: null,
      index: true,
    },

    /* ================= LOCATIONS ================= */

    pickupLocation: {
      address: { type: String, required: true },
      location: { type: pointSchema, required: true },
    },

    dropLocation: {
      address: { type: String, required: true },
      location: { type: pointSchema, required: true },
    },

    /* ================= RIDE INFO ================= */

    vehicleType: {
      type: String,
      enum: ["bike", "auto", "car"],
      required: true,
    },

    distanceKm: {
      type: Number,
      default: 0,
      min: 0,
    },

    durationMin: {
      type: Number,
      default: 0,
    },

    fare: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentMethod: {
      type: String,
      enum: ["cash", "online"],
      default: "cash",
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "refunded"],
      default: "pending",
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
        "no_driver",
      ],
      default: "searching",
      index: true,
    },

    /* ================= CANCELLATION DETAILS ================= */

    cancelledBy: {
      type: String,
      enum: ["user", "driver", "system"],
      default: null,
    },

    cancellationReason: {
      type: String,
      default: "",
    },

    cancellationCharge: {
      type: Number,
      default: 0,
    },

    /* ================= DISPATCH ================= */

    rejectedDrivers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Driver",
      },
    ],

    dispatchIndex: {
      type: Number,
      default: 0,
    },

    /* ================= TRACKING ================= */

    driverLocation: {
      type: pointSchema,
      default: null,
    },

    routePath: [
      {
        lat: Number,
        lng: Number,
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    /* ================= TIMESTAMPS ================= */

    requestedAt: {
      type: Date,
      default: Date.now,
    },

    acceptedAt: Date,
    startedAt: Date,
    completedAt: Date,
    cancelledAt: Date,
  },
  { timestamps: true }
);

/* ======================================================
🔥 INDEXES
====================================================== */
rideSchema.index({ "pickupLocation.location": "2dsphere" });
rideSchema.index({ status: 1, vehicleType: 1 });

/* ======================================================
🚀 METHODS
====================================================== */

/* ACCEPT */
rideSchema.methods.acceptRide = function (driverId) {
  if (this.status !== "searching") {
    throw new Error("Ride already accepted");
  }

  this.driver = driverId;
  this.status = "accepted";
  this.acceptedAt = new Date();

  return this.save();
};

/* START */
rideSchema.methods.startRide = function () {
  if (this.status !== "accepted") {
    throw new Error("Ride not ready to start");
  }

  this.status = "ongoing";
  this.startedAt = new Date();

  return this.save();
};

/* COMPLETE */
rideSchema.methods.completeRide = function () {
  if (this.status !== "ongoing") {
    throw new Error("Ride not ongoing");
  }

  this.status = "completed";
  this.completedAt = new Date();
  this.paymentStatus = "paid";

  return this.save();
};

/* 🔴 CANCEL (IMPORTANT FIX) */
rideSchema.methods.cancelRide = function (
  cancelledBy = "user",
  reason = ""
) {
  if (["completed", "cancelled"].includes(this.status)) {
    throw new Error("Ride cannot be cancelled");
  }

  this.status = "cancelled";
  this.cancelledAt = new Date();
  this.cancelledBy = cancelledBy;
  this.cancellationReason = reason;

  /* 🔥 OPTIONAL LOGIC: Cancellation Charge */
  if (this.status === "accepted" || this.status === "ongoing") {
    this.cancellationCharge = Math.min(this.fare * 0.1, 50); // 10% or max ₹50
  }

  return this.save();
};

/* DRIVER LOCATION */
rideSchema.methods.updateDriverLocation = function (lat, lng) {
  this.driverLocation = {
    type: "Point",
    coordinates: [Number(lng), Number(lat)],
  };

  if (this.routePath.length > 200) {
    this.routePath.shift();
  }

  this.routePath.push({
    lat: Number(lat),
    lng: Number(lng),
    timestamp: new Date(),
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
          coordinates: [parseFloat(lng), parseFloat(lat)],
        },
        $maxDistance: radius,
      },
    },
  });
};

/* ======================================================
🧼 CLEAN RESPONSE
====================================================== */
rideSchema.set("toJSON", {
  transform: (_, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Ride", rideSchema);