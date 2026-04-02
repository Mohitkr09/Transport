const mongoose = require("mongoose");

/* ======================================================
SCHEMA
====================================================== */

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    /* ================= RELATIONS ================= */

    ride: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ride",
    },

    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
    },

    /* ================= CONTENT ================= */

    title: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: ["ride", "payment", "driver", "system"],
      default: "system",
      index: true,
    },

    /* ================= STATUS ================= */

    read: {
      type: Boolean,
      default: false,
      index: true,
    },

    readAt: {
      type: Date,
    },

    /* ================= METADATA ================= */

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    /* ================= SOFT DELETE ================= */

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    /* ================= PRIORITY ================= */

    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

/* ======================================================
🔥 INDEXES (VERY IMPORTANT)
====================================================== */

// Fast user queries
notificationSchema.index({ user: 1, createdAt: -1 });

// Unread count
notificationSchema.index({ user: 1, read: 1 });

// Soft delete filter
notificationSchema.index({ user: 1, isDeleted: 1 });

// Priority sorting
notificationSchema.index({ priority: 1 });

/* ======================================================
MIDDLEWARE
====================================================== */

// Auto-set readAt
notificationSchema.pre("save", function (next) {
  if (this.isModified("read") && this.read) {
    this.readAt = new Date();
  }
  next();
});

/* ======================================================
METHODS
====================================================== */

// Mark single as read
notificationSchema.methods.markAsRead = function () {
  this.read = true;
  return this.save();
};

// Soft delete
notificationSchema.methods.softDelete = function () {
  this.isDeleted = true;
  return this.save();
};

/* ======================================================
STATIC METHODS
====================================================== */

// Get notifications (optimized)
notificationSchema.statics.getUserNotifications = function (userId) {
  return this.find({
    user: userId,
    isDeleted: false,
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate("ride")
    .populate("driver");
};

// Get unread count 🔥
notificationSchema.statics.getUnreadCount = function (userId) {
  return this.countDocuments({
    user: userId,
    read: false,
    isDeleted: false,
  });
};

// Mark all as read
notificationSchema.statics.markAllAsRead = function (userId) {
  return this.updateMany(
    {
      user: userId,
      read: false,
      isDeleted: false,
    },
    {
      read: true,
      readAt: new Date(),
    }
  );
};

/* ======================================================
JSON CLEANUP
====================================================== */

notificationSchema.set("toJSON", {
  transform: (_, ret) => {
    delete ret.__v;
    return ret;
  },
});

/* ======================================================
EXPORT
====================================================== */

module.exports = mongoose.model("Notification", notificationSchema);