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
      lowercase: true
    },

    password: {
      type: String,
      required: true,
      minlength: 6
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
        default: "auto"
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
      default: true,
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
        default: [0, 0]
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



// ========================
// GEO INDEX (IMPORTANT)
// ========================
driverSchema.index({ location: "2dsphere" });



// ========================
// VIRTUAL FIELD
// ========================
driverSchema.virtual("isBusy").get(function () {
  return !this.isAvailable;
});



// ========================
// JSON CLEANUP
// ========================
driverSchema.set("toJSON", {
  virtuals: true,
  transform: (_, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  }
});



module.exports = mongoose.model("Driver", driverSchema);
