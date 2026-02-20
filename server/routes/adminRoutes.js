const express = require("express");

const {
  createDriver,
  getPendingDrivers,
  getApprovedDrivers,
  approveDriver,
  rejectDriver,
  getDriverGrowth
} = require("../controllers/adminController");

const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();


// =======================================================
// 🛡️ APPLY GLOBAL ADMIN PROTECTION
// All routes below require:
// 1️⃣ Valid JWT
// 2️⃣ Admin role
// =======================================================
router.use(protect);
router.use(adminOnly);


// =======================================================
// ➕ CREATE NEW DRIVER (Admin Only)
// POST /api/admin/drivers
// =======================================================
router.post("/drivers", createDriver);


// =======================================================
// 📌 GET PENDING DRIVERS
// GET /api/admin/drivers/pending
// =======================================================
router.get("/drivers/pending", getPendingDrivers);


// =======================================================
// 📌 GET APPROVED DRIVERS
// GET /api/admin/drivers/approved
// =======================================================
router.get("/drivers/approved", getApprovedDrivers);


// =======================================================
// 📊 DRIVER GROWTH ANALYTICS
// GET /api/admin/analytics/driver-growth
// =======================================================
router.get("/analytics/driver-growth", getDriverGrowth);


// =======================================================
// ✅ APPROVE DRIVER
// PUT /api/admin/drivers/:id/approve
// =======================================================
router.put("/drivers/:id/approve", approveDriver);



router.delete("/drivers/:id", rejectDriver);


module.exports = router;
