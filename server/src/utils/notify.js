import Notification from "../models/Notification.js";
import { io } from "../server.js";

export const sendNotification = async ({ userId, title, message, type }) => {
  try {
    const notification = await Notification.create({
      user: userId,   // ✅ FIXED FIELD NAME
      title,
      message,
      type,
    });

    // 🔔 Realtime push
    io.to(userId.toString()).emit("newNotification", notification);

    console.log("🔔 Notification saved:", notification._id);
    return notification;
  } catch (err) {
    console.error("❌ Notification error:", err.message);
  }
};
