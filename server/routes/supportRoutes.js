const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const {
  createMessage,
  getMessages,
  resolveMessage
} = require("../controllers/supportController");

const { protect, adminOnly } = require("../middleware/authMiddleware");


// ==============================
// ASYNC HANDLER WRAPPER
// prevents server crashes
// ==============================
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);


// ==============================
// VALIDATE OBJECT ID
// ==============================
const validateId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(400).json({
      success: false,
      message: "Invalid ID"
    });

  next();
};


// ==============================
// PUBLIC ROUTE — SUBMIT MESSAGE
// ==============================
router.post("/", asyncHandler(createMessage));


// ==============================
// ADMIN ROUTE — GET ALL MESSAGES
// ==============================
router.get("/", protect, adminOnly, asyncHandler(getMessages));


// ==============================
// ADMIN ROUTE — RESOLVE MESSAGE
// ==============================
router.put(
  "/:id/resolve",
  protect,
  adminOnly,
  validateId,
  asyncHandler(resolveMessage)
);


// ==============================
module.exports = router;
