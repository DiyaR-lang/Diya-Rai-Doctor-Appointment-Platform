import Notification from "../models/Notification.js";
import { io } from "../server.js"; // important!

export const sendNotification = async ({ userId, title, message, type }) => {
  // Save to DB
  const notification = await Notification.create({
    user: userId,
    title,
    message,
    type,
    isRead: false,
  });

  // 🔥 Emit to patient/doctor room in realtime
  io.to(userId.toString()).emit("notification:new", notification);

  return notification;
};
