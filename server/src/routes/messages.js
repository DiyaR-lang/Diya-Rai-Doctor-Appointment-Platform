// messages.js
import express from "express";
import Message from "../models/Message.js";

const router = express.Router();

// Get all messages between patient and doctor
router.get("/:patientId/:doctorId", async (req, res) => {
  const { patientId, doctorId } = req.params;

  try {
    const messages = await Message.find({
      $or: [
        { senderId: patientId, receiverId: doctorId },
        { senderId: doctorId, receiverId: patientId },
      ],
    }).sort({ timestamp: 1 });

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;