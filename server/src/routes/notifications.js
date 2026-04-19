import express from "express";
import Notification from "../models/Notification.js";
import { protect } from "../middleware/authMiddleware.js";


const router = express.Router();


export const createNotification = async (userId, title, message, type) => {
  try {
    // 1. Save to MongoDB so it persists
    const notification = new Notification({
      user: userId,
      title,
      message,
      type,
    });
    await notification.save();

    // 2. Emit via Socket.io to the specific user's private room
    // The room name is the User ID (set up in your server.js 'join_user')
    io.to(userId.toString()).emit("new_notification", notification);

    console.log(`Notification sent to User: ${userId}`);
    return notification;
  } catch (err) {
    console.error("NOTIFICATION HELPER ERROR:", err);
  }
};

// ============================
// GET DOCTOR'S NOTIFICATIONS
// ============================
router.get("/my", protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ============================
// MARK AS READ
// ============================
router.put("/:id/read", protect, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isRead: true },
      { new: true }
    );

    if (!notification) return res.status(404).json({ message: "Not found" });
    res.json(notification);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ============================
// GET UNREAD COUNT
// ============================
router.get("/unread/count", protect, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      user: req.user._id,
      isRead: false,
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// server/src/routes/notifications.js

// Delete all READ notifications for the logged-in user
router.delete("/clear-read", protect, async (req, res) => {
  try {
    await Notification.deleteMany({ 
      user: req.user._id, 
      isRead: true 
    });
    res.json({ message: "Read notifications cleared" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});
// TEMPORARY: Remove this before production
router.post("/manual-test", async (req, res) => {
    try {
        const { userId, title, message } = req.body;
        
        // 1. Create in Database
        const notification = await Notification.create({
            user: userId,
            title: title || "Test Notification",
            message: message || "This was triggered manually to bypass payment.",
            type: "appointment_booked",
            isRead: false
        });

        // 2. Emit via Socket (if doctor is online)
        const io = req.app.get("socketio");
        if (io) {
            io.to(userId).emit("new_notification", notification);
        }

        res.status(201).json(notification);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;