const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // OPTIONAL RELATIONS
    ride: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ride",
    },

    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
    },

    // CONTENT
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

    // STATUS
    read: {
      type: Boolean,
      default: false,
      index: true,
    },

    readAt: {
      type: Date,
    },

    // EXTRA DATA (VERY IMPORTANT FOR SCALABILITY)
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // SOFT DELETE (OPTIONAL)
    isDeleted: {
      type: Boolean,
      default: false,
    },

    // PRIORITY (for UI sorting)
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
  },
  {
    timestamps: true,
  }
);


// ===============================
// INDEXES (IMPORTANT 🚀)
// ===============================

notificationSchema.index({ user: 1, read: 1 });
notificationSchema.index({ createdAt: -1 });


// ===============================
// METHODS
// ===============================

// Mark as read
notificationSchema.methods.markAsRead = function () {
  this.read = true;
  this.readAt = new Date();
  return this.save();
};


// ===============================
// STATIC METHODS
// ===============================

// Get user notifications
notificationSchema.statics.getUserNotifications = function (userId) {
  return this.find({ user: userId, isDeleted: false })
    .sort({ createdAt: -1 })
    .limit(50);
};


// ===============================
// EXPORT
// ===============================

module.exports = mongoose.model("Notification", notificationSchema);