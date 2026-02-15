const mongoose = require("mongoose");

const driverSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },

   documents: {
  license: String,
  vehicleRC: String
},


    isApproved: { type: Boolean, default: false },
    isOnline: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Driver", driverSchema);
