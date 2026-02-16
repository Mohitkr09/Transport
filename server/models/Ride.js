const mongoose = require("mongoose");

const rideSchema = new mongoose.Schema(
  {
    // =========================
    // USER
    // =========================
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    // =========================
    // DRIVER
    // =========================
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      default: null
    },

    // =========================
    // PICKUP LOCATION
    // =========================
    pickupLocation: {
      address: { type: String, required: true },
      lat: { type: Number, required: true },
      lng: { type: Number, required: true }
    },

    // =========================
    // DROP LOCATION
    // =========================
    dropLocation: {
      address: { type: String, required: true },
      lat: { type: Number, required: true },
      lng: { type: Number, required: true }
    },

    // =========================
    // VEHICLE TYPE
    // =========================
    vehicleType: {
      type: String,
      enum: ["bike", "auto", "car"],
      required: true
    },

    // =========================
    // DISTANCE + TIME
    // =========================
    distanceKm: {
      type: Number,
      default: 0
    },

    durationMin: {
      type: Number,
      default: 0
    },

    // =========================
    // FARE
    // =========================
    fare: {
      type: Number,
      required: true
    },

    // =========================
    // PAYMENT INFO
    // =========================
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending"
    },

    paymentIntentId: String,
    paymentMethod: String,

    // =========================
    // RIDE STATUS
    // =========================
    status: {
      type: String,
      enum: [
        "requested",
        "driver_assigned",
        "accepted",
        "ongoing",
        "completed",
        "cancelled"
      ],
      default: "requested",
      index: true
    },

    // =========================
    // STATUS TIMESTAMPS
    // =========================
    requestedAt: {
      type: Date,
      default: Date.now
    },

    acceptedAt: Date,
    startedAt: Date,
    completedAt: Date,
    cancelledAt: Date,

    // =========================
    // DRIVER LIVE LOCATION
    // =========================
    driverLocation: {
      lat: Number,
      lng: Number,
      updatedAt: Date
    },

    // =========================
    // CANCELLATION INFO
    // =========================
    cancelledBy: {
      type: String,
      enum: ["user", "driver", "admin", null],
      default: null
    },

    cancelReason: String
  },

  { timestamps: true }
);

// =========================
// INDEXES FOR PERFORMANCE
// =========================
rideSchema.index({ user: 1, createdAt: -1 });
rideSchema.index({ driver: 1, status: 1 });

// =========================
// VIRTUAL FIELD
// =========================
rideSchema.virtual("isCompleted").get(function () {
  return this.status === "completed";
});

// =========================
// JSON CLEANUP
// =========================
rideSchema.set("toJSON", {
  virtuals: true,
  transform: (_, ret) => {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model("Ride", rideSchema);
