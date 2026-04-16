import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

// --- MIDDLEWARE & UTILS ---
import upload from "./middleware/uploads.js"; 

// --- ROUTES ---
import authRoutes from "./routes/auth.js";
import appointmentRoutes from "./routes/appointments.js";
import doctorRoutes from "./routes/doctors.js";
import notificationRoutes from "./routes/notifications.js";
import paymentRoutes from "./routes/payment.js";
import messageRoutes from "./routes/messages.js";
import adminRoutes from "./routes/admin.js";
// --- MODELS ---
import Message from "./models/Message.js";

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

// 1. Socket.IO Setup
const io = new Server(server, { 
  cors: { 
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ["polling", "websocket"], // Put polling first for stability
  allowEIO3: true
});

// ✅ Make socket available everywhere (IMPORTANT for payment controller)
app.set("socketio", io);

// 2. Middleware
app.use(cors({
  origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
  credentials: true
}));

app.use(express.json());

// ✅ (NEW) Optional: log incoming requests (helps debug payment issues)
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.url}`);
  next();
});

// 3. Static Files & Path Config
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// 4. File Upload Route (unchanged)
app.post("/api/chat/upload", upload.single("image"), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const imageUrl = `http://localhost:5000/uploads/${req.file.filename}`;
    res.json({ url: imageUrl });

  } catch (error) {
    res.status(500).json({ message: "Upload failed" });
  }
});

// 5. API Routes
app.get("/", (req, res) => res.json({ message: "Server is running" }));

app.use("/api/auth", authRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);
// ✅ Payment route (already correct, just kept here)
app.use("/api/payment", paymentRoutes);

app.use("/api/messages", messageRoutes);

// -------------------------
// Socket.IO Logic (UNCHANGED)
// -------------------------
io.on("connection", (socket) => {
  console.log(`⚡ New Connection: ${socket.id}`);

  socket.on("join_user", (userId) => {
    if (userId) {
      socket.join(userId);
      console.log(`👤 User joined private room: ${userId}`);
    }
  });

  socket.on("join_room", (data) => {
    const { senderId, receiverId } = data;

    if (senderId && receiverId) {
      const room = [senderId, receiverId].sort().join("_");
      socket.join(room);
      console.log(`🤝 Joined Chat Room: ${room}`);
    }
  });

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

      io.to(room).emit("receive_message", newMessage);

      io.to(receiverId).emit("new_notification", {
        from: senderId,
        text: messageType === "video_call" ? "Incoming Video Call" : "New Message",
        payload: newMessage
      });

    } catch (err) {
      console.error("Socket Message Error:", err);
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(`❌ Disconnected: ${socket.id} | Reason: ${reason}`);
  });
});

// ❗ (NEW) Global Error Handler (helps debug Khalti issues)
app.use((err, req, res, next) => {
  console.error("🔥 Server Error:", err.stack);
  res.status(500).json({ message: "Internal Server Error" });
});

// Start Server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});