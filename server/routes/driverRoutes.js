const express = require("express");

const router = express.Router();

const driverController =
  require("../controllers/driverController");

const {
  protect,
  adminOnly,
  driverOnly,
} = require(
  "../middleware/authMiddleware"
);

const Driver =
  require("../models/Driver");

const Ride =
  require("../models/Ride");

/* =================================================
SAFE HANDLER
================================================= */

const asyncHandler =
  (fn) =>
  async (req, res, next) => {

    try {

      await fn(
        req,
        res,
        next
      );

    } catch (err) {

      console.error(
        "🔥 Route Error:",
        err.message
      );

      return res.status(500).json({
        success: false,
        message:
          err.message ||
          "Server error",
      });
    }
  };

/* =================================================
LOGGER
================================================= */

router.use(
  (req, res, next) => {

    console.log(
      `🚗 DRIVER → ${req.method} ${req.originalUrl}`
    );

    next();
  }
);

/* =================================================
HEALTH
================================================= */

router.get(
  "/health",
  (req, res) => {

    res.json({
      success: true,
      message:
        "Driver API working ✅",
    });
  }
);

/* =================================================
AUTH
================================================= */

router.post(
  "/login",
  asyncHandler(
    driverController.loginDriver
  )
);

router.post(
  "/logout",
  protect,
  driverOnly,

  asyncHandler(
    async (req, res) => {

      const driverId =
        req.user?._id ||
        req.user?.id;

      await Driver.findByIdAndUpdate(
        driverId,
        {
          isOnline: false,

          isAvailable: false,

          currentRide: null,
        }
      );

      res.json({
        success: true,
        message:
          "Driver logged out",
      });
    }
  )
);

/* =================================================
PROFILE
================================================= */

router.get(
  "/me",
  protect,
  driverOnly,

  asyncHandler(
    driverController.getDriverProfile
  )
);

/* =================================================
ONLINE STATUS
================================================= */

router.put(
  "/online",
  protect,
  driverOnly,

  asyncHandler(
    driverController.updateDriverStatus
  )
);

/* =================================================
LOCATION
================================================= */

router.put(
  "/location",
  protect,
  driverOnly,

  asyncHandler(
    driverController.updateDriverLocation
  )
);

/* =================================================
ACTIVE RIDE
================================================= */

router.get(
  "/active",
  protect,
  driverOnly,

  asyncHandler(
    driverController.getActiveRide
  )
);

/* =================================================
DRIVER STATS
================================================= */

router.get(
  "/stats",
  protect,
  driverOnly,

  asyncHandler(
    async (req, res) => {

      const driverId =
        req.user?._id ||
        req.user?.id;

      const last24h =
        new Date(
          Date.now() -
            24 *
              60 *
              60 *
              1000
        );

      /* ACCEPTED */

      const accepted =
        await Ride.countDocuments({
          driver: driverId,

          status: {
            $in: [
              "accepted",
              "ongoing",
              "completed",
            ],
          },

          acceptedAt: {
            $gte: last24h,
          },
        });

      /* COMPLETED */

      const completed =
        await Ride.countDocuments({
          driver: driverId,

          status:
            "completed",

          completedAt: {
            $gte: last24h,
          },
        });

      /* MISSED */

      const missed =
        await Ride.countDocuments({
          rejectedDrivers:
            driverId,

          createdAt: {
            $gte: last24h,
          },
        });

      /* NEW */

      const newRides =
        await Ride.countDocuments({
          status:
            "searching",

          createdAt: {
            $gte: last24h,
          },
        });

      /* EARNINGS */

      const rides =
        await Ride.find({
          driver: driverId,

          status:
            "completed",
        }).select("fare");

      const totalRides =
        rides.length;

      const totalEarnings =
        rides.reduce(
          (sum, r) =>
            sum +
            (r.fare || 0),

          0
        );

      res.json({
        success: true,

        stats: {
          new: newRides,

          accepted,

          completed,

          missed,

          totalRides,

          totalEarnings,
        },
      });
    }
  )
);

/* =================================================
NEARBY RIDES
================================================= */

router.get(
  "/rides",
  protect,
  driverOnly,

  asyncHandler(
    driverController.getNearbyRides
  )
);

/* BACKWARD COMPAT */

router.get(
  "/nearby",
  protect,
  driverOnly,

  asyncHandler(
    driverController.getNearbyRides
  )
);

/* =================================================
RIDE ACTIONS
================================================= */

router.put(
  "/ride/:id/accept",
  protect,
  driverOnly,

  asyncHandler(
    driverController.acceptRide
  )
);

router.put(
  "/ride/:id/reject",
  protect,
  driverOnly,

  asyncHandler(
    driverController.rejectRide
  )
);

router.put(
  "/ride/:id/start",
  protect,
  driverOnly,

  asyncHandler(
    driverController.startRide
  )
);

router.put(
  "/ride/:id/complete",
  protect,
  driverOnly,

  asyncHandler(
    driverController.completeRide
  )
);

/* =================================================
ADMIN
================================================= */

router.get(
  "/all",
  protect,
  adminOnly,

  asyncHandler(
    async (req, res) => {

      const drivers =
        await Driver.find().select(
          "-password"
        );

      res.json({
        success: true,
        drivers,
      });
    }
  )
);

router.put(
  "/:id/approve",
  protect,
  adminOnly,

  asyncHandler(
    async (req, res) => {

      const driver =
        await Driver.findByIdAndUpdate(
          req.params.id,

          {
            isApproved: true,
          },

          {
            new: true,
          }
        );

      res.json({
        success: true,
        driver,
      });
    }
  )
);

router.delete(
  "/:id",
  protect,
  adminOnly,

  asyncHandler(
    async (req, res) => {

      await Driver.findByIdAndDelete(
        req.params.id
      );

      res.json({
        success: true,
        message:
          "Driver removed",
      });
    }
  )
);

/* =================================================
404
================================================= */

router.use(
  (req, res) => {

    res.status(404).json({
      success: false,

      message:
        `Driver route not found → ${req.method} ${req.originalUrl}`,
    });
  }
);

module.exports = router;