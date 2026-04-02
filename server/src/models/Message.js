import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  message: { type: String, required: true },
  // 🔔 NEW: Distinguishes between text, image, and video_call
  messageType: { 
    type: String, 
    enum: ["text", "image", "video_call"], 
    default: "text" 
  },
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.model("Message", MessageSchema);