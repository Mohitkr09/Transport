const express = require("express");

const adminController = require("../controllers/adminController");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

/* =================================================
GLOBAL ADMIN PROTECTION
================================================= */

router.use(protect);
router.use(authorize("admin")); // ✅ better than adminOnly

/* =================================================
DEBUG LOGGER
================================================= */

router.use((req, res, next) => {
  console.log(`🛠 ADMIN API → ${req.method} ${req.originalUrl} | user: ${req.user?.role}`);
  next();
});

/* =================================================
DRIVER MANAGEMENT
================================================= */

const driverRouter = express.Router();

/* CREATE DRIVER */
driverRouter.post("/", adminController.createDriver);

/* GET ALL DRIVERS */
driverRouter.get("/", adminController.getAllDrivers);

/* GET PENDING DRIVERS */
driverRouter.get("/pending", adminController.getPendingDrivers);

/* GET APPROVED DRIVERS */
driverRouter.get("/approved", adminController.getApprovedDrivers);

/* APPROVE DRIVER */
driverRouter.put("/:id/approve", adminController.approveDriver);

/* DELETE / REJECT DRIVER */
driverRouter.delete("/:id", adminController.rejectDriver);

/* MOUNT DRIVER ROUTES */
router.use("/drivers", driverRouter);

/* =================================================
ANALYTICS
================================================= */

const analyticsRouter = express.Router();

/* DRIVER GROWTH */
analyticsRouter.get("/driver-growth", adminController.getDriverGrowth);

/* FUTURE FEATURES */
// analyticsRouter.get("/revenue", adminController.getRevenue);
// analyticsRouter.get("/rides", adminController.getAllRides);

router.use("/analytics", analyticsRouter);

/* =================================================
ADMIN HEALTH CHECK
================================================= */

router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Admin API working",
    role: req.user?.role
  });
});

/* =================================================
404 FALLBACK
================================================= */

router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Admin route not found → ${req.method} ${req.originalUrl}`
  });
});

module.exports = router;