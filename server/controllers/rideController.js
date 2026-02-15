const Ride = require("../models/Ride");
const Driver = require("../models/Driver");

// ===============================
// Fare calculation
// ===============================
const calculateFare = (vehicleType, distanceKm = 5) => {
  const rates = {
    bike: 10,
    auto: 15,
    car: 20
  };

  return distanceKm * rates[vehicleType];
};

// ===============================
// CREATE RIDE (JWT protected)
// ===============================
exports.createRide = async (req, res) => {
  try {
    const { pickupLocation, dropLocation, vehicleType } = req.body;

    // 🔐 USER COMES FROM JWT
    const userId = req.user._id;

    if (!pickupLocation || !dropLocation || !vehicleType) {
      return res.status(400).json({
        error: "Missing required fields"
      });
    }

    // Find approved & offline driver
    const driver = await Driver.findOne({
      isApproved: true,
      isOnline: false
    });

    if (!driver) {
      return res.status(404).json({
        error: "No drivers available"
      });
    }

    const fare = calculateFare(vehicleType);

    const ride = await Ride.create({
      user: userId,              // ✅ SECURE
      driver: driver._id,
      pickupLocation,
      dropLocation,
      vehicleType,
      fare,
      status: "requested"
    });

    res.status(201).json({
      message: "Ride requested successfully",
      ride
    });

  } catch (err) {
    console.error("CREATE RIDE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

// ===============================
// ACCEPT RIDE (Driver)
// ===============================
exports.acceptRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride) {
      return res.status(404).json({ error: "Ride not found" });
    }

    if (ride.status !== "requested") {
      return res.status(400).json({
        error: "Ride cannot be accepted"
      });
    }

    ride.status = "accepted";
    await ride.save();

    res.json({
      message: "Ride accepted",
      ride
    });

  } catch (err) {
    console.error("ACCEPT RIDE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

// ===============================
// COMPLETE RIDE
// ===============================
exports.completeRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride) {
      return res.status(404).json({ error: "Ride not found" });
    }

    if (ride.status !== "accepted") {
      return res.status(400).json({
        error: "Ride cannot be completed"
      });
    }

    ride.status = "completed";
    await ride.save();

    res.json({
      message: "Ride completed",
      ride
    });

  } catch (err) {
    console.error("COMPLETE RIDE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};
