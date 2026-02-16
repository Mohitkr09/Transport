const express = require("express");
const router = express.Router();

const {
  createRide,
  acceptRide,
  completeRide
} = require("../controllers/rideController");

const { protect } = require("../middleware/authMiddleware");

// CREATE RIDE
router.post("/create", protect, createRide);

// ACCEPT RIDE
router.put("/accept/:id", protect, acceptRide);

// COMPLETE RIDE
router.put("/complete/:id", protect, completeRide);

module.exports = router;
