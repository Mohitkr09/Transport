const Notification = require("../models/Notification");

module.exports = async function sendNotification(userId, data) {
  try {
    // save to DB
    const notif = await Notification.create({
      user: userId,
      ...data
    });

    // send realtime if online
    if (global.io) {
      global.io.to(userId.toString()).emit("notification", notif);
    }

  } catch (err) {
    console.error("Notification error:", err);
  }
};