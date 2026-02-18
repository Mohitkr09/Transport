const express = require("express");
const router = express.Router();

const rideController = require("../controllers/rideController");
const { protect } = require("../middleware/authMiddleware");

const asyncHandler = fn => (req,res,next)=>
  Promise.resolve(fn(req,res,next)).catch(next);

// ======================================================
// LOGGER
// ======================================================
router.use((req,res,next)=>{
  console.log("🚗",req.method,req.originalUrl);
  next();
});

// ======================================================
// CREATE RIDE  (MUST BE FIRST)
// ======================================================
router.post("/", protect, asyncHandler(rideController.createRide));

// ======================================================
// GET USER RIDES
// ======================================================
router.get("/", protect, asyncHandler(rideController.getUserRides));

// ======================================================
// ACCEPT
// ======================================================
router.put("/:id/accept", protect, asyncHandler(rideController.acceptRide));

// ======================================================
// COMPLETE
// ======================================================
router.put("/:id/complete", protect, asyncHandler(rideController.completeRide));

// ======================================================
// CANCEL
// ======================================================
router.put("/:id/cancel", protect, asyncHandler(rideController.cancelRide));

// ======================================================
// GET SINGLE RIDE (MUST BE LAST)
// ======================================================
router.get("/:id", protect, asyncHandler(rideController.getRideById));

module.exports = router;
