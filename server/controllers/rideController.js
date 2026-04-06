const Ride = require("../models/Ride");
const Driver = require("../models/Driver");

/* ======================================================
💰 FARE
====================================================== */
const calculateFare = (vehicleType, distanceKm = 5) => {
  const rates = { bike: 10, auto: 15, car: 20 };
  return Math.round(distanceKm * (rates[vehicleType] || 20));
};

/* ======================================================
🚗 CREATE RIDE
====================================================== */
exports.createRide = async (req, res) => {
  try {
    const { pickupLocation, dropLocation, vehicleType, distance } = req.body;

    const ride = await Ride.create({
      user: req.user._id,
      pickupLocation,
      dropLocation,
      vehicleType,
      distanceKm: distance || 5,
      fare: calculateFare(vehicleType, distance || 5),
      status: "searching"
    });

    res.status(201).json({ success: true, ride });

  } catch (err) {
    console.error("❌ createRide:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ======================================================
📄 GET SINGLE RIDE
====================================================== */
exports.getRideById = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate("driver", "name phone")
      .populate("user", "name");

    if (!ride) {
      return res.status(404).json({ success: false, message: "Ride not found" });
    }

    res.json({ success: true, ride });

  } catch (err) {
    console.error("❌ getRideById:", err);
    res.status(500).json({ success: false });
  }
};

/* ======================================================
📜 USER RIDE HISTORY (FIXED)
====================================================== */
exports.getUserRides = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    const rides = await Ride.find({ user: userId })
      .sort({ createdAt: -1 });

    // 🔥 transform for frontend
    const formatted = rides.map(r => ({
      _id: r._id,
      pickup: r.pickupLocation?.address || "N/A",
      drop: r.dropLocation?.address || "N/A",
      fare: r.fare,
      status: r.status,
      createdAt: r.createdAt
    }));

    res.json({
      success: true,
      rides: formatted
    });

  } catch (err) {
    console.error("❌ getUserRides:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ======================================================
💳 PAYMENT HISTORY (FIXED)
====================================================== */
exports.getUserPayments = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    const rides = await Ride.find({ user: userId })
      .sort({ createdAt: -1 });

    const payments = rides.map(r => ({
      rideId: r._id,
      amount: r.fare || 0,
      date: r.createdAt,
      status: r.paymentStatus || "paid"
    }));

    res.json({
      success: true,
      payments
    });

  } catch (err) {
    console.error("❌ payments:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ======================================================
✅ ACCEPT RIDE
====================================================== */
exports.acceptRide = async (req, res) => {
  try {
    const ride = await Ride.findOneAndUpdate(
      { _id: req.params.id, status: "searching" },
      {
        status: "accepted",
        driver: req.user._id,
        acceptedAt: new Date()
      },
      { new: true }
    );

    if (!ride) {
      return res.status(400).json({
        success: false,
        message: "Ride already taken"
      });
    }

    res.json({ success: true, ride });

  } catch (err) {
    console.error("❌ acceptRide:", err);
    res.status(500).json({ success: false });
  }
};

/* ======================================================
🚦 START RIDE
====================================================== */
exports.startRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride) return res.status(404).json({ success: false });

    await ride.startRide();

    res.json({ success: true });

  } catch (err) {
    console.error("❌ startRide:", err);
    res.status(500).json({ success: false });
  }
};

/* ======================================================
🏁 COMPLETE RIDE
====================================================== */
exports.completeRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride) return res.status(404).json({ success: false });

    await ride.completeRide();

    res.json({ success: true });

  } catch (err) {
    console.error("❌ completeRide:", err);
    res.status(500).json({ success: false });
  }
};

/* ======================================================
❌ CANCEL
====================================================== */
exports.cancelRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride) return res.status(404).json({ success: false });

    await ride.cancelRide();

    res.json({ success: true });

  } catch (err) {
    console.error("❌ cancelRide:", err);
    res.status(500).json({ success: false });
  }
};

/* ======================================================
⭐ RATE
====================================================== */
exports.rateRide = async (req, res) => {
  try {
    const { rating } = req.body;

    const ride = await Ride.findById(req.params.id);

    ride.rating = rating;

    await ride.save();

    res.json({ success: true });

  } catch (err) {
    console.error("❌ rateRide:", err);
    res.status(500).json({ success: false });
  }
};