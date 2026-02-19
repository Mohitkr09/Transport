const Ride = require("../models/Ride");
const Driver = require("../models/Driver");

// ======================================================
// 📍 DISTANCE CALCULATOR
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
  const rates = { bike: 10, auto: 15, car: 20 };
  return Math.round(distanceKm * (rates[vehicleType] || 20));
};

// ======================================================
// 🚕 CREATE RIDE
// ======================================================
exports.createRide = async (req, res) => {
  try {
    const { pickupLocation, dropLocation, vehicleType, distance } = req.body;

    // ================= AUTH =================
    const userId = req.user?._id;
    if (!userId)
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });

    // ================= VALIDATION =================
    if (
      !pickupLocation ||
      !dropLocation ||
      !vehicleType ||
      typeof pickupLocation.lat !== "number" ||
      typeof pickupLocation.lng !== "number" ||
      typeof dropLocation.lat !== "number" ||
      typeof dropLocation.lng !== "number"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid ride data"
      });
    }

    // ================= FIND DRIVERS =================
    const drivers = await Driver.find({
      isApproved: true,
      isOnline: true,
      isAvailable: true
    });

    if (!drivers.length)
      return res.json({
        success: false,
        message: "No drivers available"
      });

    // ================= FIND NEAREST DRIVER =================
    let nearestDriver = null;
    let minDistance = Infinity;

    for (const driver of drivers) {
      if (!driver.location?.coordinates) continue;

      const [lng, lat] = driver.location.coordinates;

      const dist = getDistanceKm(
        pickupLocation.lat,
        pickupLocation.lng,
        lat,
        lng
      );

      // radius filter
      if (dist > 10) continue;

      if (dist < minDistance) {
        minDistance = dist;
        nearestDriver = driver;
      }
    }

    if (!nearestDriver)
      return res.json({
        success: false,
        message: "No nearby drivers found"
      });

    // ================= DISTANCE =================
    const parsedDistance = parseFloat(distance);
    const safeDistance =
      Number.isFinite(parsedDistance) && parsedDistance > 0
        ? parsedDistance
        : 5;

    // ================= FARE =================
    const fare = calculateFare(vehicleType, safeDistance);

    // ================= FORMAT LOCATIONS (FIX) =================
    const formattedPickup = {
      address: pickupLocation.address,
      location: {
        type: "Point",
        coordinates: [pickupLocation.lng, pickupLocation.lat]
      }
    };

    const formattedDrop = {
      address: dropLocation.address,
      location: {
        type: "Point",
        coordinates: [dropLocation.lng, dropLocation.lat]
      }
    };

    // ================= CREATE RIDE =================
    const ride = await Ride.create({
      user: userId,
      driver: nearestDriver._id,
      pickupLocation: formattedPickup,
      dropLocation: formattedDrop,
      vehicleType,
      distanceKm: safeDistance,
      fare,
      status: "driver_assigned",
      requestedAt: new Date()
    });

    // ================= LOCK DRIVER =================
    nearestDriver.isAvailable = false;
    await nearestDriver.save();

    // ================= RESPONSE =================
    res.status(201).json({
      success: true,
      message: "Driver assigned successfully",
      ride
    });

  } catch (err) {
    console.error("CREATE RIDE ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to create ride"
    });
  }
};

// ======================================================
// 📄 GET USER RIDES
// ======================================================
exports.getUserRides = async (req, res) => {
  try {
    const rides = await Ride.find({ user: req.user._id })
      .populate("driver", "name email rating")
      .sort({ createdAt: -1 });

    res.json({ success: true, rides });

  } catch {
    res.status(500).json({ success:false,message:"Failed to fetch rides" });
  }
};

// ======================================================
// 📍 GET SINGLE RIDE
// ======================================================
exports.getRideById = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate("driver", "name email rating");

    if (!ride)
      return res.status(404).json({ message: "Ride not found" });

    if (
      ride.user.toString() !== req.user._id.toString() &&
      ride.driver.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    )
      return res.status(403).json({ message: "Access denied" });

    res.json({ success: true, ride });

  } catch {
    res.status(500).json({ success:false,message:"Failed to fetch ride" });
  }
};

// ======================================================
// DRIVER ACCEPT
// ======================================================
exports.acceptRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride) return res.status(404).json({ message:"Ride not found" });

    if (ride.driver.toString() !== req.user._id.toString())
      return res.status(403).json({ message:"Not your ride" });

    if (ride.status !== "driver_assigned")
      return res.status(400).json({ message:"Ride already accepted" });

    ride.status = "accepted";
    ride.acceptedAt = new Date();
    await ride.save();

    res.json({ success:true,message:"Ride accepted",ride });

  } catch {
    res.status(500).json({ message:"Failed to accept ride" });
  }
};

// ======================================================
// COMPLETE
// ======================================================
exports.completeRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride) return res.status(404).json({ message:"Ride not found" });

    if (ride.driver.toString() !== req.user._id.toString())
      return res.status(403).json({ message:"Not your ride" });

    if (!["accepted","ongoing"].includes(ride.status))
      return res.status(400).json({ message:"Ride cannot be completed" });

    ride.status = "completed";
    ride.completedAt = new Date();
    await ride.save();

    await Driver.findByIdAndUpdate(ride.driver,{ isAvailable:true });

    res.json({ success:true,message:"Ride completed",ride });

  } catch {
    res.status(500).json({ message:"Failed to complete ride" });
  }
};

// ======================================================
// CANCEL
// ======================================================
exports.cancelRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride) return res.status(404).json({ message:"Ride not found" });

    if (ride.status === "completed")
      return res.status(400).json({ message:"Completed ride cannot be cancelled" });

    ride.status = "cancelled";
    ride.cancelledAt = new Date();
    ride.cancelledBy = req.user.role || "user";
    await ride.save();

    await Driver.findByIdAndUpdate(ride.driver,{ isAvailable:true });

    res.json({ success:true,message:"Ride cancelled" });

  } catch {
    res.status(500).json({ message:"Failed to cancel ride" });
  }
};
