const mongoose = require("mongoose");

// ======================================================
// DRIVER SCHEMA
// ======================================================
const driverSchema = new mongoose.Schema(
  {
    // ========================
    // BASIC INFO
    // ========================
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
      trim: true,
      index: true
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false
    },

    // ========================
    // DOCUMENTS
    // ========================
    documents: {
      license: {
        type: String,
        default: null
      },
      vehicleRC: {
        type: String,
        default: null
      }
    },

    // ========================
    // VEHICLE DETAILS
    // ========================
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
      model: {
        type: String,
        trim: true
      },
      color: {
        type: String,
        trim: true
      }
    },

    // ========================
    // ADMIN APPROVAL
    // ========================
    isApproved: {
      type: Boolean,
      default: false,
      index: true
    },

    // ========================
    // DRIVER STATUS
    // ========================
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

    // ========================
    // LIVE LOCATION (GeoJSON)
    // ========================
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: {
        type: [Number], // [lng, lat]
        default: undefined,
        validate: {
          validator: arr =>
            !arr ||
            (
              arr.length === 2 &&
              arr[0] >= -180 &&
              arr[0] <= 180 &&
              arr[1] >= -90 &&
              arr[1] <= 90
            ),
          message: "Invalid coordinates"
        }
      }
    },

    lastLocationUpdate: {
      type: Date,
      default: null
    },

    // ========================
    // PERFORMANCE METRICS
    // ========================
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
    }
  },
  {
    timestamps: true
  }
);

// ======================================================
// INDEXES (CRITICAL FOR SPEED)
// ======================================================

// geo search index
driverSchema.index({ location: "2dsphere" });

// matching optimization index
driverSchema.index({
  isApproved: 1,
  isOnline: 1,
  isAvailable: 1,
  "vehicle.type": 1
});

// performance ranking index
driverSchema.index({
  rating: -1,
  totalRides: -1
});

// ======================================================
// PRE-SAVE HOOKS
// ======================================================
driverSchema.pre("save", function (next) {
  // offline driver can't be available
  if (!this.isOnline) {
    this.isAvailable = false;
  }
  next();
});

// ======================================================
// INSTANCE METHODS
// ======================================================

// update driver location safely
driverSchema.methods.updateLocation = function (lat, lng) {
  this.location = {
    type: "Point",
    coordinates: [lng, lat]
  };
  this.lastLocationUpdate = new Date();
};

// mark driver busy
driverSchema.methods.markBusy = function () {
  this.isAvailable = false;
};

// mark driver free
driverSchema.methods.markAvailable = function () {
  if (this.isOnline) {
    this.isAvailable = true;
  }
};

// ======================================================
// STATIC METHODS (SMART MATCHING)
// ======================================================

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
    "vehicle.type": vehicleType,
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [lng, lat]
        },
        $maxDistance: radius
      }
    }
  })
    .sort({ rating: -1, totalRides: -1 })
    .limit(limit);
};

// ======================================================
// VIRTUAL FIELDS
// ======================================================

// driver busy status
driverSchema.virtual("isBusy").get(function () {
  return !this.isAvailable;
});

// experience level
driverSchema.virtual("experienceLevel").get(function () {
  if (this.totalRides > 1000) return "expert";
  if (this.totalRides > 200) return "pro";
  if (this.totalRides > 50) return "experienced";
  return "new";
});

// ======================================================
// JSON CLEANUP
// ======================================================
driverSchema.set("toJSON", {
  virtuals: true,
  transform: (_, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  }
});

// ======================================================
module.exports = mongoose.model("Driver", driverSchema);