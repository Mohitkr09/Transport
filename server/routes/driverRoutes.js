const express = require("express");
const router = express.Router();

const driverController = require("../controllers/driverController");
const { protect, adminOnly, driverOnly } = require("../middleware/authMiddleware");
const Driver = require("../models/Driver");

/* =================================================
SAFE ASYNC HANDLER
================================================= */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error("🔥 Route Error:", err.message);
    res.status(500).json({ success: false, message: err.message });
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
HEALTH
================================================= */
router.get("/health", (req, res) => {
  res.json({ success: true, message: "Driver API working" });
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
    await Driver.findByIdAndUpdate(req.user.id, {
      isOnline: false,
      isAvailable: false,
      socketId: null
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
  asyncHandler(async (req, res) => {
    const driver = await Driver.findById(req.user.id);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found"
      });
    }

    res.json({ success: true, driver });
  })
);

/* =================================================
STATUS + LOCATION
================================================= */
router.put(
  "/online",
  protect,
  driverOnly,
  asyncHandler(async (req, res) => {
    const { isOnline } = req.body;

    const driver = await Driver.findByIdAndUpdate(
      req.user.id,
      {
        isOnline,
        isAvailable: isOnline
      },
      { new: true }
    );

    res.json({ success: true, driver });
  })
);

router.put(
  "/location",
  protect,
  driverOnly,
  asyncHandler(async (req, res) => {
    const { lat, lng } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: "lat & lng required"
      });
    }

    const driver = await Driver.findById(req.user.id);

    if (!driver) {
      return res.status(404).json({ success: false });
    }

    driver.location = {
      type: "Point",
      coordinates: [Number(lng), Number(lat)]
    };

    await driver.save();

    res.json({ success: true });
  })
);

/* =================================================
🔥 PUBLIC NEARBY DRIVERS (FIXED)
================================================= */
/* 🚀 THIS IS THE MOST IMPORTANT FIX */
router.get(
  "/nearby",
  asyncHandler(async (req, res) => {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: "lat & lng required"
      });
    }

    const drivers = await Driver.find({
      isOnline: true,
      isAvailable: true,
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: 5000
        }
      }
    }).select("location");

    res.json({ success: true, drivers });
  })
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
ADMIN
================================================= */
router.get(
  "/all",
  protect,
  adminOnly,
  asyncHandler(driverController.getAllDrivers)
);

router.put(
  "/:id/approve",
  protect,
  adminOnly,
  asyncHandler(driverController.approveDriver)
);

router.delete(
  "/:id",
  protect,
  adminOnly,
  asyncHandler(driverController.rejectDriver)
);

/* =================================================
DEV TOOL
================================================= */
router.put(
  "/force-available/:id",
  protect,
  adminOnly,
  asyncHandler(async (req, res) => {
    const driver = await Driver.findByIdAndUpdate(
      req.params.id,
      { isAvailable: true, isOnline: true },
      { new: true }
    );

    res.json({ success: true, driver });
  })
);

/* =================================================
404
================================================= */
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Driver route not found → ${req.method} ${req.originalUrl}`
  });
});

module.exports = router;