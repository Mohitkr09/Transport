const express = require("express");
const router = express.Router();

const rideController = require("../controllers/rideController");
const { protect, adminOnly, driverOnly } = require("../middleware/authMiddleware");

/* ======================================================
SAFE HANDLER (NO CRASH)
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

      res.status(500).json({
        success: false,
        message: err.message || "Server error"
      });
    }
  };
};

/* ======================================================
LOGGER (DEBUG)
====================================================== */
router.use((req, res, next) => {
  console.log(`🚗 RIDE → ${req.method} ${req.originalUrl}`);
  next();
});

/* ======================================================
HEALTH
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

/* ✅ USER RIDE HISTORY (USED IN PROFILE) */
router.get("/my", protect, safe("getUserRides"));

/* ✅ PAYMENT HISTORY (NEW) */
router.get("/payments", protect, safe("getUserPayments"));

/* ======================================================
🔥 DRIVER ROUTES
====================================================== */

/* NEARBY RIDES */
router.get("/nearby", protect, driverOnly, safe("getNearbyRides"));

/* ACCEPT / REJECT */
router.put("/:id/accept", protect, driverOnly, safe("acceptRide"));
router.put("/:id/reject", protect, driverOnly, safe("rejectRide"));

/* RIDE FLOW */
router.put("/:id/start", protect, driverOnly, safe("startRide"));
router.put("/:id/complete", protect, driverOnly, safe("completeRide"));

/* ======================================================
COMMON ROUTES
====================================================== */

/* CANCEL */
router.put("/:id/cancel", protect, safe("cancelRide"));

/* RATE */
router.post("/:id/rate", protect, safe("rateRide"));

/* ======================================================
ADMIN
====================================================== */

router.get("/admin/all", protect, adminOnly, safe("getAllRides"));
router.put("/admin/:id/cancel", protect, adminOnly, safe("adminCancelRide"));

/* ======================================================
GET SINGLE RIDE
====================================================== */
router.get("/:id", protect, safe("getRideById"));

/* ======================================================
404 HANDLER
====================================================== */
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Ride route not found → ${req.method} ${req.originalUrl}`
  });
});

module.exports = router;