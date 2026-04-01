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

// This tells Express: "When someone goes to /uploads, look in the root uploads folder"
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// 3. The Upload Route
app.post("/api/chat/upload", upload.single("image"), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    
    // This URL must match your server port and the static path above
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
    methods: ["GET", "POST"]
  } 
});

io.on("connection", (socket) => {
  console.log("New Connection:", socket.id);

  socket.on("join_user", (userId) => {
    if (userId) {
      socket.join(userId);
      console.log(`User ${userId} joined private notification room`);
    }
  });

  socket.on("join_room", ({ senderId, receiverId }) => {
    if (!senderId || !receiverId) return;
    const room = [senderId, receiverId].sort().join("_");

    socket.rooms.forEach((r) => {
      if (r.includes("_") && r !== room) {
        socket.leave(r);
      }
    });

    socket.join(room);
    console.log(`Socket ${socket.id} is now ONLY in room: ${room}`);
  });

  socket.on("send_message", async (data) => {
    const { senderId, receiverId, message } = data;
    if (!senderId || !receiverId || !message) return;

    try {
      const newMessage = new Message({ senderId, receiverId, message });
      await newMessage.save();

      const room = [senderId, receiverId].sort().join("_");

      io.to(room).emit("receive_message", newMessage);

      io.to(receiverId).emit("new_notification", {
        from: senderId,
        text: "New Message",
        payload: newMessage
      });
    } catch (err) {
      console.error("Socket Error:", err);
    }
  });

  socket.on("disconnect", () => console.log("Disconnected:", socket.id));
});

// -------------------------
// Start server
// -------------------------
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});