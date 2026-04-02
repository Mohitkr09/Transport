const router = require("express").Router();
const Notification = require("../models/Notification");
const { protect } = require("../middleware/authMiddleware");

/* =========================================
GET USER NOTIFICATIONS
========================================= */
router.get("/", protect, async (req, res) => {
  try {
    const notifications = await Notification.find({
      user: req.user._id,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("ride")
      .populate("driver");

    return res.status(200).json({
      success: true,
      count: notifications.length,
      notifications, // 🔥 FIXED (important)
    });

  } catch (error) {
    console.error("GET NOTIFICATIONS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load activity", // 🔥 matches frontend UI
    });
  }
});


/* =========================================
MARK SINGLE AS READ
========================================= */
router.patch("/read/:id", protect, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    /* 🔐 SECURITY CHECK */
    if (notification.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    notification.read = true;
    notification.readAt = new Date();

    await notification.save();

    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
      notification,
    });

  } catch (error) {
    console.error("MARK READ ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update notification",
    });
  }
});


/* =========================================
MARK ALL AS READ
========================================= */
router.patch("/read-all", protect, async (req, res) => {
  try {
    await Notification.updateMany(
      {
        user: req.user._id,
        read: false,
        isDeleted: false // 🔥 FIXED
      },
      {
        read: true,
        readAt: new Date()
      }
    );

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });

  } catch (error) {
    console.error("MARK ALL READ ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update notifications",
    });
  }
});


/* =========================================
DELETE (SOFT DELETE)
========================================= */
router.delete("/:id", protect, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    /* 🔐 SECURITY CHECK */
    if (notification.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    notification.isDeleted = true;
    await notification.save();

    return res.status(200).json({
      success: true,
      message: "Notification deleted",
    });

  } catch (error) {
    console.error("DELETE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete notification",
    });
  }
});


/* =========================================
UNREAD COUNT (FOR BADGE 🔴)
========================================= */
router.get("/unread-count", protect, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      user: req.user._id,
      read: false,
      isDeleted: false,
    });

    return res.status(200).json({
      success: true,
      count,
    });

  } catch (error) {
    console.error("UNREAD COUNT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get unread count",
    });
  }
});

module.exports = router;