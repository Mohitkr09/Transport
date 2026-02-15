const express = require("express");
const upload = require("../middleware/upload");
const { registerDriver } = require("../controllers/driverController");

const router = express.Router();

// ===============================
// DRIVER REGISTRATION (WITH DOCS)
// ===============================
// Accepts:
// - license (image/pdf)
// - vehicleRC (image/pdf)
router.post(
  "/register",
  upload.fields([
    { name: "license", maxCount: 1 },
    { name: "vehicleRC", maxCount: 1 }
  ]),
  registerDriver
);

module.exports = router;
