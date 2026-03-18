const mongoose = require("mongoose");

/* ======================================================
GEO POINT
====================================================== */

const pointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point"
    },
    coordinates: {
      type: [Number],
      validate: {
        validator: arr =>
          !arr ||
          (arr.length === 2 &&
            arr[0] >= -180 &&
            arr[0] <= 180 &&
            arr[1] >= -90 &&
            arr[1] <= 90),
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
      required: true,
      index: true
    },

    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      default: null,
      index: true
    },

    pickupLocation: {
      address: String,
      location: { type: pointSchema, required: true }
    },

    dropLocation: {
      address: String,
      location: { type: pointSchema, required: true }
    },

    vehicleType: {
      type: String,
      enum: ["bike", "auto", "car"],
      required: true
    },

    distanceKm: Number,
    durationMin: Number,

    fare: {
      type: Number,
      required: true,
      min: 0
    },

    surgeMultiplier: {
      type: Number,
      default: 1
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending"
    },

    status: {
      type: String,
      enum: [
        "requested",
        "searching_driver",
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

    rejectedDrivers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Driver"
      }
    ],

    driverResponseDeadline: Date,

    requestedAt: { type: Date, default: Date.now },
    acceptedAt: Date,
    startedAt: Date,
    completedAt: Date,
    cancelledAt: Date,

    driverLocation: {
      type: pointSchema,
      default: null
    },

    driverLocationUpdatedAt: Date,

    cancelledBy: {
      type: String,
      enum: ["user", "driver", "admin", null],
      default: null
    },

    cancelReason: String,

    rating: { type: Number, min: 1, max: 5 },
    feedback: String,

    otp: {
      type: Number,
      min: 1000,
      max: 9999
    },

    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

/* ======================================================
INDEXES
====================================================== */

rideSchema.index({ "pickupLocation.location": "2dsphere" });
rideSchema.index({ status: 1, createdAt: -1 });
rideSchema.index({ driver: 1, status: 1 });
rideSchema.index({ rejectedDrivers: 1 });

/* ======================================================
VIRTUALS
====================================================== */

rideSchema.virtual("isActive").get(function () {
  return ["searching_driver", "accepted", "ongoing"].includes(this.status);
});

/* ======================================================
METHODS
====================================================== */

/* ASSIGN DRIVER */
rideSchema.methods.assignDriver = function (driverId) {
  this.driver = driverId;
  this.status = "driver_assigned";
  this.driverResponseDeadline = new Date(Date.now() + 15000);
  return this.save();
};

/* ACCEPT RIDE */
rideSchema.methods.acceptRide = function () {
  if (this.status !== "driver_assigned") throw new Error("Invalid state");

  this.status = "accepted";
  this.acceptedAt = new Date();
  return this.save();
};

/* START RIDE */
rideSchema.methods.startRide = function (otpInput) {
  if (this.status !== "accepted") throw new Error("Invalid state");

  if (this.otp && otpInput !== this.otp) {
    throw new Error("Invalid OTP");
  }

  this.status = "ongoing";
  this.startedAt = new Date();
  return this.save();
};

/* COMPLETE RIDE */
rideSchema.methods.completeRide = function () {
  if (this.status !== "ongoing") throw new Error("Invalid state");

  this.status = "completed";
  this.completedAt = new Date();
  return this.save();
};

/* CANCEL RIDE */
rideSchema.methods.cancelRide = function (by, reason) {
  if (["completed"].includes(this.status)) {
    throw new Error("Cannot cancel completed ride");
  }

  this.status = "cancelled";
  this.cancelledBy = by;
  this.cancelReason = reason;
  this.cancelledAt = new Date();
  return this.save();
};

/* REJECT DRIVER */
rideSchema.methods.rejectDriver = function (driverId) {
  this.rejectedDrivers.push(driverId);
  this.driver = null;
  this.status = "searching_driver";
  return this.save();
};

/* UPDATE DRIVER LOCATION */
rideSchema.methods.updateDriverLocation = function (lat, lng) {
  this.driverLocation = {
    type: "Point",
    coordinates: [Number(lng), Number(lat)]
  };

  this.driverLocationUpdatedAt = new Date();
  return this.save();
};

/* ======================================================
STATIC METHODS
====================================================== */

/* FIND RIDES FOR DRIVER */
rideSchema.statics.findAvailableRides = function (lat, lng, vehicleType) {
  return this.find({
    status: "searching_driver",
    vehicleType,
    "pickupLocation.location": {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [lng, lat]
        },
        $maxDistance: 5000
      }
    }
  });
};

/* HANDLE TIMEOUT */
rideSchema.statics.handleDriverTimeouts = async function () {
  const expired = await this.find({
    status: "driver_assigned",
    driverResponseDeadline: { $lt: new Date() }
  });

  for (const ride of expired) {
    ride.status = "searching_driver";
    ride.driver = null;
    await ride.save();
  }
};

/* ======================================================
JSON CLEANUP
====================================================== */

rideSchema.set("toJSON", {
  virtuals: true,
  transform: (_, ret) => {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model("Ride", rideSchema);