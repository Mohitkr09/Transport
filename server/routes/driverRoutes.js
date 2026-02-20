const express = require("express");
const router = express.Router();

// =================================================
// IMPORTS
// =================================================
const upload = require("../middleware/upload");
const driverController = require("../controllers/driverController");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const Driver = require("../models/Driver");

// =================================================
// SAFE ASYNC WRAPPER
// =================================================
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// =================================================
// DEBUG LOGGER
// =================================================
router.use((req, res, next) => {
  console.log("🚚 DRIVER ROUTE:", req.method, req.originalUrl);
  next();
});

// =================================================
// HEALTH CHECK
// =================================================
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Driver routes working ✅"
  });
});

// =================================================
// REGISTER DRIVER
// POST /api/driver/register
// =================================================
router.post(
  "/register",
  upload.fields([
    { name: "license", maxCount: 1 },
    { name: "vehicleRC", maxCount: 1 }
  ]),
  asyncHandler(driverController.registerDriver)
);

// =================================================
// LOGIN DRIVER
// POST /api/driver/login
// =================================================
router.post("/login", asyncHandler(driverController.loginDriver));

// =================================================
// LOGOUT DRIVER
// POST /api/driver/logout
// =================================================
router.post(
  "/logout",
  protect,
  asyncHandler(async (req, res) => {
    await Driver.findByIdAndUpdate(req.user._id, {
      isOnline: false,
      isAvailable: false
    });

    res.json({
      success: true,
      message: "Logged out successfully"
    });
  })
);

// =================================================
// DRIVER PROFILE
// GET /api/driver/me
// =================================================
router.get(
  "/me",
  protect,
  asyncHandler(driverController.getDriverProfile)
);

// =================================================
// TOGGLE ONLINE STATUS
// PUT /api/driver/online
// =================================================
router.put(
  "/online",
  protect,
  asyncHandler(driverController.toggleOnlineStatus)
);

// =================================================
// UPDATE LOCATION
// PUT /api/driver/location
// =================================================
router.put(
  "/location",
  protect,
  asyncHandler(driverController.updateLocation)
);

// =================================================
// FIND NEARBY DRIVERS
// GET /api/driver/nearby?lat=&lng=&radius=&vehicleType=
// =================================================
router.get(
  "/nearby",
  protect,
  asyncHandler(driverController.findNearbyDrivers)
);

// =================================================
// 🧪 DEBUG ROUTE — FORCE DRIVER AVAILABLE
// (REMOVE IN PRODUCTION)
// =================================================
router.put("/force-available/:id", asyncHandler(async (req, res) => {
  const driver = await Driver.findByIdAndUpdate(
    req.params.id,
    { isAvailable: true },
    { new: true }
  );

  if (!driver)
    return res.status(404).json({
      success: false,
      message: "Driver not found"
    });

  res.json({
    success: true,
    message: "Driver availability reset",
    driver
  });
}));

// =================================================
// ADMIN APPROVE DRIVER
// PUT /api/driver/:id/approve
// =================================================
router.put(
  "/:id/approve",
  protect,
  adminOnly,
  asyncHandler(driverController.approveDriver)
);

// =================================================
// ADMIN REJECT DRIVER
// PUT /api/driver/:id/reject
// =================================================
router.put(
  "/:id/reject",
  protect,
  adminOnly,
  asyncHandler(driverController.rejectDriver)
);

// =================================================
// ADMIN GET ALL DRIVERS
// GET /api/driver
// =================================================
router.get(
  "/",
  protect,
  adminOnly,
  asyncHandler(driverController.getAllDrivers)
);

// =================================================
// FALLBACK ROUTE (MUST BE LAST)
// =================================================
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Driver route not found → ${req.method} ${req.originalUrl}`
  });
});

// =================================================
module.exports = router;