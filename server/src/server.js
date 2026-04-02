import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

// --- NEW IMPORT FOR UPLOAD ---
import upload from "./middleware/uploads.js"; 

// Routes
import authRoutes from "./routes/auth.js";
import appointmentRoutes from "./routes/appointments.js";
import doctorRoutes from "./routes/doctors.js";
import notificationRoutes from "./routes/notifications.js";
import paymentRoutes from "./routes/payment.js";
import messageRoutes from "./routes/messages.js";

// Models
import Message from "./models/Message.js";

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

// -------------------------
// Middleware
// -------------------------
app.use(cors({
  origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
  credentials: true
}));
app.use(express.json());

// Serve uploaded images
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Adjusted to ensure it finds your uploads folder correctly
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// 3. The Upload Route
app.post("/api/chat/upload", upload.single("image"), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const imageUrl = `http://localhost:5000/uploads/${req.file.filename}`;
    res.json({ url: imageUrl });
  } catch (error) {
    res.status(500).json({ message: "Upload failed" });
  }
});

// -------------------------
// Routes
// -------------------------
app.get("/", (req, res) => {
  res.json({ message: "Server is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/messages", messageRoutes);

// -------------------------
// Socket.IO - Real-Time Logic
// -------------------------
export const io = new Server(server, { 
  cors: { 
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    methods: ["GET", "POST"],
    credentials: true
  },
  allowEIO3: true,
  pingTimeout: 60000,
  transports: ["websocket", "polling"]
});

io.on("connection", (socket) => {
  console.log(`⚡ New Connection: ${socket.id}`);

  // 1. Join Private User Room (For Notifications)
  socket.on("join_user", (userId) => {
    if (userId) {
      socket.join(userId);
      console.log(`👤 User joined private room: ${userId}`);
    }
  });

  // 2. Join Chat Room (For Messaging)
  socket.on("join_room", (data) => {
    const { senderId, receiverId } = data;
    if (senderId && receiverId) {
      const room = [senderId, receiverId].sort().join("_");
      socket.join(room);
      console.log(`🤝 Socket ${socket.id} joined Chat Room: ${room}`);
    }
  });

  // 3. Send/Receive Message Logic
  socket.on("send_message", async (data) => {
    const { senderId, receiverId, message, messageType } = data;
    if (!senderId || !receiverId || !message) return;

    try {
      const newMessage = new Message({ 
        senderId, 
        receiverId, 
        message, 
        messageType: messageType || "text" 
      });
      
      await newMessage.save();
      const room = [senderId, receiverId].sort().join("_");

      // Send to the chat room
      io.to(room).emit("receive_message", newMessage);

      // Notify the receiver's private room
      io.to(receiverId).emit("new_notification", {
        from: senderId,
        text: messageType === "video_call" ? "Incoming Video Call" : "New Message",
        payload: newMessage
      });

      console.log(`✉️ Message sent in room ${room} [Type: ${messageType || 'text'}]`);
    } catch (err) {
      console.error("Socket Message Error:", err);
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(`❌ Disconnected: ${socket.id} | Reason: ${reason}`);
  });
});

// -------------------------
// Start server
// -------------------------
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});