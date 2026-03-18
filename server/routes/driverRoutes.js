const express = require("express");
const router = express.Router();

/* =================================================
IMPORTS
================================================= */

const driverController = require("../controllers/driverController");
const { protect, adminOnly, driverOnly } = require("../middleware/authMiddleware");
const Driver = require("../models/Driver");

/* =================================================
ASYNC HANDLER
================================================= */

const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/* =================================================
HEALTH CHECK
================================================= */

router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Driver API working"
  });
});

/* =================================================
AUTH ROUTES
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

    res.json({
      success: true,
      message: "Driver logged out"
    });

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
RIDES (IMPORTANT FIX)
================================================= */

/* GET NEARBY RIDES */
router.get(
  "/rides/nearby",
  protect,
  driverOnly,
  asyncHandler(driverController.getNearbyRides)
);

/* ACCEPT RIDE */
router.put(
  "/ride/:id/accept",
  protect,
  driverOnly,
  asyncHandler(driverController.acceptRide)
);

/* REJECT RIDE */
router.put(
  "/ride/:id/reject",
  protect,
  driverOnly,
  asyncHandler(driverController.rejectRide)
);

/* START RIDE */
router.put(
  "/ride/:id/start",
  protect,
  driverOnly,
  asyncHandler(driverController.startRide)
);

/* COMPLETE RIDE */
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
ADMIN SET DRIVER LOCATION
================================================= */

router.put(
  "/:id/set-location",
  protect,
  adminOnly,
  asyncHandler(async (req, res) => {

    const { lat, lng } = req.body;

    if (!lat || !lng) {
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

    driver.lastLocationUpdate = new Date();
    driver.isOnline = true;
    driver.isAvailable = true;

    await driver.save();

    res.json({
      success: true,
      message: "Driver location updated",
      driver
    });

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
      {
        isAvailable: true,
        isOnline: true
      },
      { new: true }
    );

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found"
      });
    }

    res.json({
      success: true,
      message: "Driver forced available",
      driver
    });

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