const mongoose = require("mongoose");

const pointSchema = {
  type: {
    type: String,
    enum: ["Point"],
    default: "Point"
  },
  coordinates: {
    type: [Number],
    required: true
  }
};

const rideSchema = new mongoose.Schema({

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },

  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Driver",
    default: null
  },

  pickupLocation: {
    address: String,
    location: pointSchema
  },

  dropLocation: {
    address: String,
    location: pointSchema
  },

  vehicleType: {
    type: String,
    enum: ["bike","auto","car"],
    required: true
  },

  distanceKm: Number,
  durationMin: Number,

  fare: { type:Number, required:true },

  paymentStatus:{
    type:String,
    enum:["pending","paid","failed","refunded"],
    default:"pending"
  },

  paymentIntentId:{ type:String, select:false },

  status:{
    type:String,
    enum:[
      "requested",
      "driver_assigned",
      "accepted",
      "ongoing",
      "completed",
      "cancelled"
    ],
    default:"requested",
    index:true
  },

  requestedAt:{ type:Date, default:Date.now },
  acceptedAt:Date,
  startedAt:Date,
  completedAt:Date,
  cancelledAt:Date,

  driverLocation:{
    type:pointSchema,
    updatedAt:Date
  },

  cancelledBy:{
    type:String,
    enum:["user","driver","admin",null],
    default:null
  },

  cancelReason:String,

  rating:Number,
  feedback:String,
  surgeMultiplier:Number,
  estimatedArrivalMin:Number,
  otp:Number,

  isDeleted:{ type:Boolean, default:false }

},{ timestamps:true });

rideSchema.index({ user:1, createdAt:-1 });
rideSchema.index({ driver:1, status:1 });
rideSchema.index({ "pickupLocation.location":"2dsphere" });

module.exports = mongoose.model("Ride", rideSchema);
