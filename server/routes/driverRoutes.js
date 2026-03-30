const express = require("express");
const router = express.Router();

const driverController = require("../controllers/driverController");
const { protect, adminOnly, driverOnly } = require("../middleware/authMiddleware");
const Driver = require("../models/Driver");

/* =================================================
SAFE ASYNC HANDLER
================================================= */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

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
      isAvailable: false
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
🔥 RIDES (FIXED ROUTES)
================================================= */

/* 👉 THIS FIXES YOUR MAIN ISSUE */
router.get(
  "/nearby",
  protect,
  driverOnly,
  asyncHandler(driverController.getNearbyRides)
);

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
ADMIN LOCATION
================================================= */
router.put(
  "/:id/set-location",
  protect,
  adminOnly,
  asyncHandler(async (req, res) => {
    const { lat, lng } = req.body;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({
        success: false,
        message: "lat and lng required"
      });
    }

    const driver = await Driver.findById(req.params.id);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found"
      });
    }

    driver.location = {
      type: "Point",
      coordinates: [Number(lng), Number(lat)]
    };

    driver.isOnline = true;
    driver.isAvailable = true;

    await driver.save();

    res.json({ success: true, driver });
  })
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
FALLBACK
================================================= */
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Driver route not found → ${req.method} ${req.originalUrl}`
  });
});

module.exports = router;