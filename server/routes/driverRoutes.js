const express = require("express");
const router = express.Router();

// =================================================
// IMPORTS
// =================================================
const upload = require("../middleware/upload");
const driverController = require("../controllers/driverController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

// =================================================
// SAFE ASYNC WRAPPER
// =================================================
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// =================================================
// DEBUG LOGGER (helps debug routes)
// =================================================
router.use((req, res, next) => {
  console.log("🚚 DRIVER ROUTE:", req.method, req.originalUrl);
  next();
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
router.post(
  "/login",
  asyncHandler(driverController.loginDriver)
);

// =================================================
// GET DRIVER PROFILE
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
// UPDATE DRIVER LOCATION
// PUT /api/driver/location
// =================================================
router.put(
  "/location",
  protect,
  asyncHandler(driverController.updateLocation)
);

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
// HEALTH CHECK
// GET /api/driver/health
// =================================================
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Driver routes working ✅"
  });
});

// =================================================
// FALLBACK ROUTE (must be LAST)
// =================================================
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Driver route not found → ${req.method} ${req.originalUrl}`
  });
});

// =================================================
module.exports = router;
