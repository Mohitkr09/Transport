const express = require("express");
const router = express.Router();

const rideController = require("../controllers/rideController");
const {
  protect,
  adminOnly,
  driverOnly,
} = require("../middleware/authMiddleware");

/* ======================================================
🛡 SAFE HANDLER (NO CRASH)
====================================================== */
const safe = (fnName) => {
  const fn = rideController[fnName];

  if (typeof fn !== "function") {
    console.error(`❌ Missing controller → ${fnName}`);

    return (req, res) =>
      res.status(500).json({
        success: false,
        message: `Controller missing: ${fnName}`,
      });
  }

  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (err) {
      console.error(`🔥 Error in ${fnName}:`, err);

      res.status(500).json({
        success: false,
        message: err.message || "Server error",
      });
    }
  };
};

/* ======================================================
📊 LOGGER (DEBUG)
====================================================== */
router.use((req, res, next) => {
  console.log(`🚗 RIDE API → ${req.method} ${req.originalUrl}`);
  next();
});

/* ======================================================
❤️ HEALTH CHECK
====================================================== */
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Ride routes working ✅",
  });
});

/* ======================================================
👤 USER ROUTES
====================================================== */

/* CREATE RIDE */
router.post("/", protect, safe("createRide"));

/* USER RIDES */
router.get("/my", protect, safe("getUserRides"));

/* PAYMENTS */
router.get("/payments", protect, safe("getUserPayments"));

/* ======================================================
🚖 DRIVER ROUTES
====================================================== */

/* ACCEPT / REJECT */
router.put("/:id/accept", protect, driverOnly, safe("acceptRide"));
router.put("/:id/reject", protect, driverOnly, safe("rejectRide"));

/* RIDE FLOW */
router.put("/:id/start", protect, driverOnly, safe("startRide"));
router.put("/:id/complete", protect, driverOnly, safe("completeRide"));

/* ======================================================
🔁 COMMON ROUTES (USER + DRIVER)
====================================================== */

/* ❌ CANCEL RIDE (UPDATED) */
router.put("/:id/cancel", protect, safe("cancelRide"));

/* ⭐ RATE RIDE */
router.post("/:id/rate", protect, safe("rateRide"));

/* 📄 GET SINGLE RIDE */
router.get("/:id", protect, safe("getRideById"));

/* ======================================================
🛠 ADMIN ROUTES
====================================================== */

/* GET ALL RIDES */
router.get("/admin/all", protect, adminOnly, safe("getAllRides"));

/* FORCE CANCEL */
router.put(
  "/admin/:id/cancel",
  protect,
  adminOnly,
  safe("adminCancelRide")
);

/* ======================================================
🚫 404 HANDLER
====================================================== */
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Ride route not found → ${req.method} ${req.originalUrl}`,
  });
});

module.exports = router;