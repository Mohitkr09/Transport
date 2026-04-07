const express = require("express");
const router = express.Router();

const driverController = require("../controllers/driverController");
const { protect, adminOnly, driverOnly } = require("../middleware/authMiddleware");

const Driver = require("../models/Driver");
const Ride = require("../models/Ride");

/* =================================================
SAFE ASYNC HANDLER
================================================= */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error("🔥 Route Error:", err.message);

    res.status(500).json({
      success: false,
      message: err.message || "Server error"
    });
  });
};

/* =================================================
LOGGER
================================================= */
router.use((req, res, next) => {
  console.log(`🚗 DRIVER → ${req.method} ${req.originalUrl}`);
  next();
});

/* =================================================
HEALTH CHECK
================================================= */
router.get("/health", (req, res) => {
  res.json({ success: true, message: "Driver API working ✅" });
});

/* =================================================
AUTH
================================================= */
router.post("/login", asyncHandler(driverController.loginDriver));

router.post(
  "/logout",
  protect,
  driverOnly,
  asyncHandler(async (req, res) => {
    const driverId = req.user?._id || req.user?.id;

    await Driver.findByIdAndUpdate(driverId, {
      isOnline: false,
      isAvailable: false,
      currentRide: null
    });

    res.json({ success: true, message: "Driver logged out" });
  })
);

/* =================================================
PROFILE
================================================= */
router.get(
  "/me",
  protect,
  driverOnly,
  asyncHandler(driverController.getDriverProfile)
);

/* =================================================
STATUS + LOCATION
================================================= */
router.put(
  "/online",
  protect,
  driverOnly,
  asyncHandler(driverController.updateDriverStatus)
);

router.put(
  "/location",
  protect,
  driverOnly,
  asyncHandler(driverController.updateDriverLocation)
);

/* =================================================
🔥 DRIVER STATS
================================================= */
router.get(
  "/stats",
  protect,
  driverOnly,
  asyncHandler(async (req, res) => {
    const driverId = req.user?._id || req.user?.id;

    if (!driverId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    const rides = await Ride.find({
      driver: driverId,
      status: "completed"
    }).select("fare");

    const totalRides = rides.length;
    const totalEarnings = rides.reduce(
      (sum, r) => sum + (r.fare || 0),
      0
    );

    res.json({
      success: true,
      stats: { totalRides, totalEarnings }
    });
  })
);

/* =================================================
🚗 NEARBY RIDES (MAIN ROUTE)
================================================= */
router.get(
  "/rides",
  protect,
  driverOnly,
  asyncHandler(driverController.getNearbyRides)
);

/* =================================================
🔥 OPTIONAL FIX (IMPORTANT)
Support old frontend: /ride/nearby
================================================= */
router.get(
  "/nearby",
  protect,
  driverOnly,
  asyncHandler(driverController.getNearbyRides)
);

/* =================================================
RIDE ACTIONS
================================================= */
router.put(
  "/ride/:id/accept",
  protect,
  driverOnly,
  asyncHandler(driverController.acceptRide)
);

router.put(
  "/ride/:id/reject",
  protect,
  driverOnly,
  asyncHandler(driverController.rejectRide)
);

router.put(
  "/ride/:id/start",
  protect,
  driverOnly,
  asyncHandler(driverController.startRide)
);

router.put(
  "/ride/:id/complete",
  protect,
  driverOnly,
  asyncHandler(driverController.completeRide)
);

/* =================================================
ADMIN ROUTES
================================================= */
router.get(
  "/all",
  protect,
  adminOnly,
  asyncHandler(async (req, res) => {
    const drivers = await Driver.find().select("-password");
    res.json({ success: true, drivers });
  })
);

router.put(
  "/:id/approve",
  protect,
  adminOnly,
  asyncHandler(async (req, res) => {
    const driver = await Driver.findByIdAndUpdate(
      req.params.id,
      { isApproved: true },
      { new: true }
    );

    res.json({ success: true, driver });
  })
);

router.delete(
  "/:id",
  protect,
  adminOnly,
  asyncHandler(async (req, res) => {
    await Driver.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: "Driver removed" });
  })
);

/* =================================================
404 HANDLER
================================================= */
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Driver route not found → ${req.method} ${req.originalUrl}`
  });
});

module.exports = router;