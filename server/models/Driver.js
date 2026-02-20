const mongoose = require("mongoose");

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
      license: String,
      vehicleRC: String
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
      number: String,
      model: String,
      color: String
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
    // LIVE LOCATION
    // ========================
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: {
        type: [Number],
        default: undefined,
        validate: {
          validator: arr =>
            !arr || (
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

    lastLocationUpdate: Date,

    // ========================
    // RATINGS
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
    }
  },
  { timestamps: true }
);


// =====================================================
// INDEXES (VERY IMPORTANT FOR MATCHING SPEED)
// =====================================================

// geo search
driverSchema.index({ location: "2dsphere" });

// matching optimization index
driverSchema.index({
  isApproved: 1,
  isOnline: 1,
  isAvailable: 1,
  "vehicle.type": 1
});


// =====================================================
// AUTO STATUS LOGIC
// =====================================================
driverSchema.pre("save", function (next) {
  // offline driver cannot be available
  if (!this.isOnline) this.isAvailable = false;

  next();
});


// =====================================================
// LOCATION HELPER METHOD
// =====================================================
driverSchema.methods.updateLocation = function (lat, lng) {
  this.location = {
    type: "Point",
    coordinates: [lng, lat]
  };
  this.lastLocationUpdate = new Date();
};


// =====================================================
// VIRTUAL FIELD
// =====================================================
driverSchema.virtual("isBusy").get(function () {
  return !this.isAvailable;
});


// =====================================================
// JSON CLEANUP
// =====================================================
driverSchema.set("toJSON", {
  virtuals: true,
  transform: (_, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  }
});


// =====================================================
module.exports = mongoose.model("Driver", driverSchema);