// server/src/utils/notify.js
import Notification from "../models/Notification.js";

export const sendNotification = async (io, data) => {
  try {
    // 1. Destructure with a safety check
    const { userId, title, message, type } = data || {};

    if (!userId) {
      console.error("NOTIFICATION ERROR: No userId provided.");
      return;
    }

    // 2. Save to MongoDB
    const notification = await Notification.create({
      user: userId,
      title,
      message,
      type,
    });

    // 3. Send Real-time "Ping"
    if (io) {
      // Use the event name 'new_notification' to match your Frontend
      io.to(userId.toString()).emit("new_notification", notification);
      console.log(`Notification emitted to room: ${userId}`);
    }

    return notification;
  } catch (err) {
    console.error("CRITICAL ERROR IN NOTIFY UTILITY:", err);
  }
};