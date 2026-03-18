const express = require("express");
const router = express.Router();

const rideController = require("../controllers/rideController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

/* ======================================================
SAFE CONTROLLER WRAPPER
Prevents server crash if controller missing
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

/* CREATE RIDE (User books ride) */

router.post(
  "/",
  protect,
  safe("createRide")
);


/* GET CURRENT USER RIDES */

router.get(
  "/my",
  protect,
  safe("getUserRides")
);


/* GET NEARBY RIDES FOR DRIVER */

router.get(
  "/nearby",
  protect,
  safe("getNearbyRides")
);


/* ======================================================
DRIVER RIDE ACTIONS
====================================================== */

/* ACCEPT RIDE */

router.put(
  "/:id/accept",
  protect,
  safe("acceptRide")
);


/* REJECT RIDE */

router.put(
  "/:id/reject",
  protect,
  safe("rejectRide")
);


/* START RIDE */

router.put(
  "/:id/start",
  protect,
  safe("startRide")
);


/* COMPLETE RIDE */

router.put(
  "/:id/complete",
  protect,
  safe("completeRide")
);


/* CANCEL RIDE */

router.put(
  "/:id/cancel",
  protect,
  safe("cancelRide")
);


/* RATE RIDE */

router.post(
  "/:id/rate",
  protect,
  safe("rateRide")
);


/* ======================================================
ADMIN ROUTES
Placed BEFORE :id catch route
====================================================== */

/* GET ALL RIDES */

router.get(
  "/admin/all",
  protect,
  adminOnly,
  safe("getAllRides")
);


/* ADMIN CANCEL RIDE */

router.put(
  "/admin/:id/cancel",
  protect,
  adminOnly,
  safe("adminCancelRide")
);


/* ======================================================
GET SINGLE RIDE
(Always LAST param route)
====================================================== */

router.get(
  "/:id",
  protect,
  safe("getRideById")
);


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