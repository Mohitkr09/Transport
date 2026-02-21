const Ride = require("../models/Ride");
const Driver = require("../models/Driver");

// ======================================================
// 💰 FARE CALCULATOR
// ======================================================
const calculateFare = (vehicleType, distanceKm = 5) => {
  const rates = { bike: 10, auto: 15, car: 20 };
  return Math.round(distanceKm * (rates[vehicleType] || 20));
};

// ======================================================
// 🎯 FIND BEST DRIVER (SMART MATCHING)
// ======================================================
const findBestDriver = async ({ lat, lng, vehicleType }) => {
  const drivers = await Driver.find({
    isApproved: true,
    isOnline: true,
    isAvailable: true,
    "vehicle.type": vehicleType,
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [lng, lat]
        },
        $maxDistance: 7000
      }
    }
  }).limit(10);

  if (!drivers.length) return null;

  // smart ranking score
  drivers.sort((a, b) => {
    const scoreA = a.rating * 2 + a.totalRides / 50;
    const scoreB = b.rating * 2 + b.totalRides / 50;
    return scoreB - scoreA;
  });

  return drivers[0];
};

// ======================================================
// 🚕 CREATE RIDE
// ======================================================
exports.createRide = async (req, res) => {
  let lockedDriver = null;

  try {
    const { pickupLocation, dropLocation, vehicleType, distance } = req.body;

    // ---------- AUTH ----------
    if (!req.user?._id)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    // ---------- VALIDATION ----------
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

    // ======================================================
    // FIND BEST DRIVER
    // ======================================================
    const bestDriver = await findBestDriver({
      lat: pickupLocation.lat,
      lng: pickupLocation.lng,
      vehicleType
    });

    if (!bestDriver)
      return res.status(404).json({
        success: false,
        message: "No nearby drivers available"
      });

    // ======================================================
    // ATOMIC LOCK DRIVER (ANTI DOUBLE BOOKING)
    // ======================================================
    lockedDriver = await Driver.findOneAndUpdate(
      {
        _id: bestDriver._id,
        isAvailable: true
      },
      { isAvailable: false },
      { new: true }
    );

    if (!lockedDriver)
      return res.status(409).json({
        success: false,
        message: "Driver just got booked. Try again."
      });

    // ======================================================
    // DISTANCE + FARE
    // ======================================================
    const parsed = parseFloat(distance);

    const safeDistance =
      Number.isFinite(parsed) && parsed > 0 ? parsed : 5;

    const fare = calculateFare(vehicleType, safeDistance);

    // ======================================================
    // CREATE RIDE
    // ======================================================
    const ride = await Ride.create({
      user: req.user._id,
      driver: lockedDriver._id,
      pickupLocation: {
        address: pickupLocation.address,
        location: {
          type: "Point",
          coordinates: [pickupLocation.lng, pickupLocation.lat]
        }
      },
      dropLocation: {
        address: dropLocation.address,
        location: {
          type: "Point",
          coordinates: [dropLocation.lng, dropLocation.lat]
        }
      },
      vehicleType,
      distanceKm: safeDistance,
      fare,
      status: "driver_assigned",
      requestedAt: new Date()
    });

    // ======================================================
    // AUTO RELEASE DRIVER IF NOT ACCEPTED
    // ======================================================
    setTimeout(async () => {
      try {
        const r = await Ride.findById(ride._id);

        if (r && r.status === "driver_assigned") {
          r.status = "cancelled";
          r.cancelledBy = "system_timeout";
          await r.save();

          await Driver.findByIdAndUpdate(r.driver, {
            isAvailable: true
          });
        }
      } catch (err) {
        console.error("AUTO RELEASE ERROR:", err);
      }
    }, 30000);

    res.status(201).json({
      success: true,
      message: "Driver assigned successfully",
      ride
    });

  } catch (err) {

    console.error("CREATE RIDE ERROR:", err);

    // unlock driver if crash occurs
    if (lockedDriver?._id) {
      await Driver.findByIdAndUpdate(
        lockedDriver._id,
        { isAvailable: true }
      );
    }

    res.status(500).json({
      success: false,
      message: "Failed to create ride"
    });
  }
};

// ======================================================
// USER RIDES
// ======================================================
exports.getUserRides = async (req, res) => {
  try {
    const rides = await Ride.find({ user: req.user._id })
      .populate("driver", "name email rating vehicle")
      .sort({ createdAt: -1 });

    res.json({ success: true, rides });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch rides"
    });
  }
};

// ======================================================
// ACCEPT RIDE
// ======================================================
exports.acceptRide = async (req, res) => {
  try {
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

    res.json({
      success: true,
      message: "Ride accepted",
      ride
    });

  } catch (err) {
    res.status(500).json({ message: "Failed to accept ride" });
  }
};

// ======================================================
// COMPLETE RIDE
// ======================================================
exports.completeRide = async (req, res) => {
  try {
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

    await Driver.findByIdAndUpdate(ride.driver, {
      isAvailable: true
    });

    res.json({
      success: true,
      message: "Ride completed",
      ride
    });

  } catch (err) {
    res.status(500).json({ message: "Failed to complete ride" });
  }
};