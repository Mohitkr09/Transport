const express = require("express");
const router = express.Router();

const rideController = require("../controllers/rideController");
const { protect, adminOnly, driverOnly } = require("../middleware/authMiddleware");

/* ======================================================
SAFE CONTROLLER WRAPPER (IMPROVED)
====================================================== */
const safe = (fnName) => {
  const fn = rideController[fnName];

  if (typeof fn !== "function") {
    console.error(`❌ Missing controller → ${fnName}`);

    return (req, res) =>
      res.status(500).json({
        success: false,
        message: `Controller missing: ${fnName}`
      });
  }

  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (err) {
      console.error(`🔥 Error in ${fnName}:`, err.message);
      next(err);
    }
  };
};

/* ======================================================
REQUEST LOGGER
====================================================== */
router.use((req, res, next) => {
  console.log(`🚗 RIDE → ${req.method} ${req.originalUrl}`);
  next();
});

/* ======================================================
HEALTH CHECK
====================================================== */
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Ride routes working ✅"
  });
});

/* ======================================================
USER ROUTES
====================================================== */

/* CREATE RIDE */
router.post("/", protect, safe("createRide"));

/* USER RIDES */
router.get("/my", protect, safe("getUserRides"));

/* ======================================================
DRIVER ROUTES (FIXED 🔥)
====================================================== */

/* GET NEARBY RIDES */
router.get("/nearby", protect, driverOnly, safe("getNearbyRides"));

/* ACCEPT RIDE */
router.put("/:id/accept", protect, driverOnly, safe("acceptRide"));

/* REJECT RIDE */
router.put("/:id/reject", protect, driverOnly, safe("rejectRide"));

/* START RIDE */
router.put("/:id/start", protect, driverOnly, safe("startRide"));

/* COMPLETE RIDE */
router.put("/:id/complete", protect, driverOnly, safe("completeRide"));

/* ======================================================
COMMON USER/DRIVER ACTIONS
====================================================== */

/* CANCEL RIDE */
router.put("/:id/cancel", protect, safe("cancelRide"));

/* RATE RIDE */
router.post("/:id/rate", protect, safe("rateRide"));

/* ======================================================
ADMIN ROUTES
====================================================== */

/* GET ALL RIDES */
router.get("/admin/all", protect, adminOnly, safe("getAllRides"));

/* ADMIN CANCEL */
router.put("/admin/:id/cancel", protect, adminOnly, safe("adminCancelRide"));

/* ======================================================
GET SINGLE RIDE (KEEP LAST)
====================================================== */
router.get("/:id", protect, safe("getRideById"));

/* ======================================================
404 FALLBACK
====================================================== */
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Ride route not found → ${req.method} ${req.originalUrl}`
  });
});

module.exports = router;