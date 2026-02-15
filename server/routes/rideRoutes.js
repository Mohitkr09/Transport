const express = require("express");
const router = express.Router();

const {
  createRide,
  acceptRide,
  completeRide
} = require("../controllers/rideController");

const { protect } = require("../middleware/authMiddleware");

// =======================
// User requests ride (JWT protected)
// =======================
router.post("/create", protect, createRide);

// =======================
// Driver accepts ride
// =======================
router.put("/accept/:id", protect, acceptRide);

// =======================
// Complete ride
// =======================
router.put("/complete/:id", protect, completeRide);

module.exports = router;
