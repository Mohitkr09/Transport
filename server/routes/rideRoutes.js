const express = require("express");
const router = express.Router();

const rideController = require("../controllers/rideController");
const { protect } = require("../middleware/authMiddleware");

// ======================================================
// ASYNC WRAPPER (NO TRY CATCH IN ROUTES)
// ======================================================
const asyncHandler = fn =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

// ======================================================
// OPTIONAL DEBUG LOGGER
// (disable in production by removing console.log)
// ======================================================
router.use((req, res, next) => {
  console.log("🚗 RIDE ROUTE:", req.method, req.originalUrl);
  next();
});

// ======================================================
// ROUTE HEALTH CHECK
// ======================================================
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Ride route working"
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
// EXPORT
// ======================================================
module.exports = router;