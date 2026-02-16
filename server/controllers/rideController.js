const Ride = require("../models/Ride");
const Driver = require("../models/Driver");


// ======================================================
// 💰 FARE CALCULATOR
// ======================================================
const calculateFare = (vehicleType, distanceKm = 5) => {
  const rates = {
    bike: 10,
    auto: 15,
    car: 20
  };

  return Math.round(distanceKm * rates[vehicleType]);
};


// ======================================================
// 🚕 CREATE RIDE (USER)
// POST /api/ride/book
// ======================================================
exports.createRide = async (req, res) => {
  try {
    const { pickupLocation, dropLocation, vehicleType, distance } = req.body;

    const userId = req.user._id;

    // ================= VALIDATION =================
    if (!pickupLocation || !dropLocation || !vehicleType) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    // ================= FIND DRIVER =================
    const driver = await Driver.findOne({
      isApproved: true,
      isOnline: true
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "No drivers available"
      });
    }

    // ================= FARE =================
    const fare = calculateFare(vehicleType, distance || 5);

    // ================= CREATE RIDE =================
    const ride = await Ride.create({
      user: userId,
      driver: driver._id,
      pickupLocation,
      dropLocation,
      vehicleType,
      fare,
      status: "requested"
    });

    res.status(201).json({
      success: true,
      message: "Ride booked successfully",
      ride
    });

  } catch (err) {
    console.error("CREATE RIDE ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to create ride"
    });
  }
};



// ======================================================
// 📄 GET USER RIDES
// ======================================================
exports.getUserRides = async (req, res) => {
  try {
    const rides = await Ride.find({ user: req.user._id })
      .populate("driver", "name email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      rides
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch rides"
    });
  }
};



// ======================================================
// 📍 GET SINGLE RIDE
// ======================================================
exports.getRideById = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate("driver", "name email");

    if (!ride)
      return res.status(404).json({
        success: false,
        message: "Ride not found"
      });

    res.json({
      success: true,
      ride
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch ride"
    });
  }
};



// ======================================================
// 🚗 DRIVER ACCEPT RIDE
// ======================================================
exports.acceptRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride)
      return res.status(404).json({
        success: false,
        message: "Ride not found"
      });

    if (ride.status !== "requested")
      return res.status(400).json({
        success: false,
        message: "Ride already accepted"
      });

    ride.status = "accepted";
    await ride.save();

    res.json({
      success: true,
      message: "Ride accepted",
      ride
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to accept ride"
    });
  }
};



// ======================================================
// 🏁 COMPLETE RIDE
// ======================================================
exports.completeRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride)
      return res.status(404).json({
        success: false,
        message: "Ride not found"
      });

    if (ride.status !== "accepted" && ride.status !== "ongoing")
      return res.status(400).json({
        success: false,
        message: "Ride cannot be completed"
      });

    ride.status = "completed";
    await ride.save();

    res.json({
      success: true,
      message: "Ride completed",
      ride
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to complete ride"
    });
  }
};



// ======================================================
// ❌ CANCEL RIDE
// ======================================================
exports.cancelRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride)
      return res.status(404).json({
        success: false,
        message: "Ride not found"
      });

    if (ride.status === "completed")
      return res.status(400).json({
        success: false,
        message: "Completed ride cannot be cancelled"
      });

    ride.status = "cancelled";
    await ride.save();

    res.json({
      success: true,
      message: "Ride cancelled"
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Cancel failed"
    });
  }
};
