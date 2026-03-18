const express = require("express");
const router = express.Router();

const { callDriver } = require("../controllers/callController");
const { protect } = require("../middleware/authMiddleware");

router.post("/driver", protect, callDriver);

module.exports = router;