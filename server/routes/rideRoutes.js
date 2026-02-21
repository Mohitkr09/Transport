const express = require("express");
const router = express.Router();

const rideController = require("../controllers/rideController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

// ======================================================
// SAFE ASYNC WRAPPER (CRASH SAFE)
// ======================================================
const asyncHandler = fn => {
  if (typeof fn !== "function") {
    throw new Error("Route handler is not a function");
  }
  return (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);
};


// ======================================================
// DEBUG LOGGER
// ======================================================
router.use((req, res, next) => {
  console.log(`🚗 RIDE ROUTE → ${req.method} ${req.originalUrl}`);
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
// USER ROUTES
// ======================================================

// CREATE RIDE
router.post("/", protect, asyncHandler(rideController.createRide));

// GET USER RIDES
router.get("/", protect, asyncHandler(rideController.getUserRides));

// GET SINGLE RIDE
router.get("/:id", protect, asyncHandler(rideController.getRideById));

// ACCEPT RIDE
router.put("/:id/accept", protect, asyncHandler(rideController.acceptRide));

// START RIDE
router.put("/:id/start", protect, asyncHandler(rideController.startRide));

// COMPLETE RIDE
router.put("/:id/complete", protect, asyncHandler(rideController.completeRide));

// CANCEL RIDE
router.put("/:id/cancel", protect, asyncHandler(rideController.cancelRide));

// RATE RIDE
router.post("/:id/rate", protect, asyncHandler(rideController.rateRide));


// ======================================================
// ADMIN ROUTES (IMPORTANT → ABOVE FALLBACK)
// ======================================================

// GET ALL RIDES
router.get(
  "/admin/all",
  protect,
  adminOnly,
  asyncHandler(rideController.getAllRides)
);

// FORCE CANCEL
router.put(
  "/admin/:id/cancel",
  protect,
  adminOnly,
  asyncHandler(rideController.adminCancelRide)
);


// ======================================================
// FALLBACK (MUST BE LAST)
// ======================================================
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Ride route not found → ${req.method} ${req.originalUrl}`
  });
});


// ======================================================
module.exports = router;