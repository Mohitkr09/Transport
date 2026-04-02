const Notification = require("../models/Notification");

/* =========================================
GET USER NOTIFICATIONS
========================================= */
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      user: req.user.id,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("ride")
      .populate("driver");

    return res.status(200).json({
      success: true,
      count: notifications.length,
      notifications, // 🔥 FIXED (frontend expects this)
    });

  } catch (error) {
    console.error("GET NOTIFICATIONS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load activity", // 🔥 matches UI
    });
  }
};


/* =========================================
MARK SINGLE NOTIFICATION AS READ
========================================= */
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    if (notification.user.toString() !== req.user.id) {
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
};


/* =========================================
MARK ALL AS READ
========================================= */
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user.id, read: false, isDeleted: false },
      { read: true, readAt: new Date() }
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
};


/* =========================================
DELETE NOTIFICATION (SOFT DELETE)
========================================= */
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    if (notification.user.toString() !== req.user.id) {
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
    console.error("DELETE NOTIFICATION ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete notification",
    });
  }
};


/* =========================================
CREATE NOTIFICATION (INTERNAL USE)
========================================= */
exports.createNotification = async ({
  user,
  ride = null,
  driver = null,
  title,
  message,
  type = "system",
  metadata = {},
  io = null,
}) => {
  try {
    const notification = await Notification.create({
      user,
      ride,
      driver,
      title,
      message,
      type,
      metadata,
    });

    /* 🔥 REAL-TIME PUSH (FIXED EVENT NAME) */
    if (io) {
      io.to(user.toString()).emit("newNotification", notification);
    }

    return notification;

  } catch (error) {
    console.error("CREATE NOTIFICATION ERROR:", error);
  }
};