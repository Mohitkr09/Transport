const mongoose = require("mongoose");

const rideSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Driver"
  },

  pickupLocation: {
    address: String,
    lat: Number,
    lng: Number
  },

  dropLocation: {
    address: String,
    lat: Number,
    lng: Number
  },

  vehicleType: {
    type: String,
    enum: ["bike", "auto", "car"],
    required: true
  },

  fare: Number,

  status: {
    type: String,
    enum: ["requested", "accepted", "ongoing", "completed", "cancelled"],
    default: "requested"
  }

}, { timestamps: true });

module.exports = mongoose.model("Ride", rideSchema);
