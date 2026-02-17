const Ride = require("../models/Ride");
const Driver = require("../models/Driver");


// ======================================================
// 📍 DISTANCE CALCULATOR (HAVERSINE)
// ======================================================
const getDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};


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
// 🚕 CREATE RIDE
// POST /api/ride
// ======================================================
exports.createRide = async (req, res) => {
  try {
    const { pickupLocation, dropLocation, vehicleType, distance } = req.body;
    const userId = req.user._id;

    if (!pickupLocation || !dropLocation || !vehicleType)
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });

    // ================= FIND NEAREST DRIVER =================
    const drivers = await Driver.find({
      isApproved: true,
      isOnline: true,
      isAvailable: true
    });

    if (!drivers.length)
      return res.status(404).json({
        success: false,
        message: "No drivers available"
      });

    let nearestDriver = null;
    let minDistance = Infinity;

    drivers.forEach(driver => {
      if (!driver.location?.coordinates) return;

      const [lng, lat] = driver.location.coordinates;

      const dist = getDistanceKm(
        pickupLocation.lat,
        pickupLocation.lng,
        lat,
        lng
      );

      if (dist < minDistance) {
        minDistance = dist;
        nearestDriver = driver;
      }
    });

    if (!nearestDriver)
      return res.status(404).json({
        success: false,
        message: "No nearby drivers found"
      });

    // ================= CALCULATE FARE =================
    const safeDistance = Math.max(1, Number(distance) || 5);
    const fare = calculateFare(vehicleType, safeDistance);

    // ================= CREATE RIDE =================
    const ride = await Ride.create({
      user: userId,
      driver: nearestDriver._id,
      pickupLocation,
      dropLocation,
      vehicleType,
      distanceKm: safeDistance,
      fare,
      status: "driver_assigned",
      requestedAt: new Date()
    });

    // lock driver
    nearestDriver.isAvailable = false;
    await nearestDriver.save();

    res.status(201).json({
      success: true,
      message: "Driver assigned successfully",
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
  const rides = await Ride.find({ user: req.user._id })
    .populate("driver", "name email rating")
    .sort({ createdAt: -1 });

  res.json({ success: true, rides });
};



// ======================================================
// 📍 GET SINGLE RIDE
// ======================================================
exports.getRideById = async (req, res) => {
  const ride = await Ride.findById(req.params.id)
    .populate("driver", "name email rating");

  if (!ride)
    return res.status(404).json({ message: "Ride not found" });

  // security check
  if (
    ride.user.toString() !== req.user._id.toString() &&
    ride.driver.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  )
    return res.status(403).json({ message: "Access denied" });

  res.json({ success: true, ride });
};



// ======================================================
// 🚗 DRIVER ACCEPT RIDE
// ======================================================
exports.acceptRide = async (req, res) => {
  const ride = await Ride.findById(req.params.id);
  if (!ride)
    return res.status(404).json({ message: "Ride not found" });

  if (ride.driver.toString() !== req.user._id.toString())
    return res.status(403).json({ message: "Not your ride" });

  if (ride.status !== "driver_assigned")
    return res.status(400).json({ message: "Ride already accepted" });

  ride.status = "accepted";
  ride.acceptedAt = new Date();
  await ride.save();

  res.json({ success: true, message: "Ride accepted", ride });
};



// ======================================================
// 🏁 COMPLETE RIDE
// ======================================================
exports.completeRide = async (req, res) => {
  const ride = await Ride.findById(req.params.id);
  if (!ride)
    return res.status(404).json({ message: "Ride not found" });

  if (ride.driver.toString() !== req.user._id.toString())
    return res.status(403).json({ message: "Not your ride" });

  if (!["accepted", "ongoing"].includes(ride.status))
    return res.status(400).json({ message: "Ride cannot be completed" });

  ride.status = "completed";
  ride.completedAt = new Date();
  await ride.save();

  // free driver
  await Driver.findByIdAndUpdate(ride.driver, {
    isAvailable: true
  });

  res.json({ success: true, message: "Ride completed", ride });
};



// ======================================================
// ❌ CANCEL RIDE
// ======================================================
exports.cancelRide = async (req, res) => {
  const ride = await Ride.findById(req.params.id);
  if (!ride)
    return res.status(404).json({ message: "Ride not found" });

  if (ride.status === "completed")
    return res.status(400).json({
      message: "Completed ride cannot be cancelled"
    });

  ride.status = "cancelled";
  ride.cancelledAt = new Date();
  ride.cancelledBy = req.user.role || "user";
  await ride.save();

  // release driver
  await Driver.findByIdAndUpdate(ride.driver, {
    isAvailable: true
  });

  res.json({ success: true, message: "Ride cancelled" });
};
