const express = require("express");
const router = express.Router();

const rideController = require("../controllers/rideController");
const { protect } = require("../middleware/authMiddleware");

const asyncHandler = fn =>
  (req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);

// ================= LOGGER =================
router.use((req,res,next)=>{
  console.log("🚗 RIDE ROUTE:", req.method, req.originalUrl);
  next();
});

// ================= CREATE RIDE =================
// POST /api/ride
router.post("/", protect, asyncHandler(rideController.createRide));

// ================= USER RIDES =================
// GET /api/ride
router.get("/", protect, asyncHandler(rideController.getUserRides));

// ================= SINGLE RIDE =================
// GET /api/ride/:id
router.get("/:id", protect, asyncHandler(rideController.getRideById));

// ================= ACCEPT =================
// PUT /api/ride/:id/accept
router.put("/:id/accept", protect, asyncHandler(rideController.acceptRide));

// ================= COMPLETE =================
// PUT /api/ride/:id/complete
router.put("/:id/complete", protect, asyncHandler(rideController.completeRide));

// ================= CANCEL =================
// PUT /api/ride/:id/cancel
router.put("/:id/cancel", protect, asyncHandler(rideController.cancelRide));

module.exports = router;
