const express = require("express");
const router = express.Router();

// ================= IMPORTS =================
const rideController = require("../controllers/rideController");
const { protect } = require("../middleware/authMiddleware");


const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);



// Create ride
router.post(
  "/create",
  protect,
  asyncHandler(rideController.createRide)
);

// Accept ride (driver)
router.put(
  "/accept/:id",
  protect,
  asyncHandler(rideController.acceptRide)
);

// Complete ride
router.put(
  "/complete/:id",
  protect,
  asyncHandler(rideController.completeRide)
);

// ================= HEALTH CHECK =================
// useful for testing route mount
router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Ride routes working"
  });
});


module.exports = router;
