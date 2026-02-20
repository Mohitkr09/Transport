const express = require("express");
const router = express.Router();

const rideController = require("../controllers/rideController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

// ======================================================
// SAFE ASYNC WRAPPER
// ======================================================
const asyncHandler = fn =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

// ======================================================
// DEBUG LOGGER (remove in production if needed)
// ======================================================
router.use((req, res, next) => {
  console.log("🚗 RIDE ROUTE:", req.method, req.originalUrl);
  next();
});

// ======================================================
// HEALTH CHECK
// ======================================================
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Ride routes working ✅"
  });
});

// ======================================================
// CREATE RIDE
// POST /api/ride
// ======================================================
router.post(
  "/",
  protect,
  asyncHandler(rideController.createRide)
);

// ======================================================
// GET USER RIDES
// GET /api/ride
// ======================================================
router.get(
  "/",
  protect,
  asyncHandler(rideController.getUserRides)
);

// ======================================================
// GET SINGLE RIDE
// GET /api/ride/:id
// ======================================================
router.get(
  "/:id",
  protect,
  asyncHandler(rideController.getRideById)
);

// ======================================================
// DRIVER ACCEPT RIDE
// PUT /api/ride/:id/accept
// ======================================================
router.put(
  "/:id/accept",
  protect,
  asyncHandler(rideController.acceptRide)
);

// ======================================================
// START RIDE (NEW)
// PUT /api/ride/:id/start
// ======================================================
router.put(
  "/:id/start",
  protect,
  asyncHandler(rideController.startRide)
);

// ======================================================
// COMPLETE RIDE
// PUT /api/ride/:id/complete
// ======================================================
router.put(
  "/:id/complete",
  protect,
  asyncHandler(rideController.completeRide)
);

// ======================================================
// CANCEL RIDE
// PUT /api/ride/:id/cancel
// ======================================================
router.put(
  "/:id/cancel",
  protect,
  asyncHandler(rideController.cancelRide)
);

// ======================================================
// RATE RIDE (NEW)
// POST /api/ride/:id/rate
// ======================================================
router.post(
  "/:id/rate",
  protect,
  asyncHandler(rideController.rateRide)
);

// ======================================================
// ADMIN — GET ALL RIDES
// GET /api/ride/admin/all
// ======================================================
router.get(
  "/admin/all",
  protect,
  adminOnly,
  asyncHandler(rideController.getAllRides)
);

// ======================================================
// ADMIN — FORCE CANCEL RIDE
// PUT /api/ride/admin/:id/cancel
// ======================================================
router.put(
  "/admin/:id/cancel",
  protect,
  adminOnly,
  asyncHandler(rideController.adminCancelRide)
);

// ======================================================
// FALLBACK ROUTE (MUST BE LAST)
// ======================================================
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Ride route not found → ${req.method} ${req.originalUrl}`
  });
});

// ======================================================
module.exports = router;