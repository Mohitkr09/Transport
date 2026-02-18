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

router.post("/", protect, asyncHandler(rideController.createRide));

// ======================================================
// GET USER RIDES
// ======================================================
router.get("/", protect, asyncHandler(rideController.getUserRides));

// ======================================================
// GET SINGLE RIDE
// ======================================================
router.get("/:id", protect, asyncHandler(rideController.getRideById));

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

module.exports = router;
