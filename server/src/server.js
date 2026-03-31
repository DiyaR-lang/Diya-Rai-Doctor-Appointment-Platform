// server.js
import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

// Routes
import authRoutes from "./routes/auth.js";
import appointmentRoutes from "./routes/appointments.js";
import doctorRoutes from "./routes/doctors.js";
import notificationRoutes from "./routes/notifications.js";
import paymentRoutes from "./routes/payment.js";
import messageRoutes from "./routes/messages.js"; // <-- new

// Models
import Patient from "./models/Patient.js";
import Message from "./models/Message.js";

dotenv.config();
connectDB();

const app = express(); // ✅ Only declare once
const server = http.createServer(app);

// -------------------------
// Middleware
// -------------------------
app.use(cors());
app.use(express.json());

// Serve uploaded images
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

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
app.use("/api/messages", messageRoutes); // <-- message API

// -------------------------
// Socket.IO - Real-Time Chat
// -------------------------
export const io = new Server(server, { cors: { origin: "*" } });

const users = {}; // store connected users

io.on("connection", (socket) => {
  console.log("🔌 Socket connected:", socket.id);

  // Join room
  socket.on("join_room", ({ patientId, doctorId }) => {
    const room = patientId + "_" + doctorId;
    socket.join(room);
    console.log(`User joined room: ${room}`);
  });

  // Receive message
  socket.on("send_message", async (data) => {
    const { patientId, doctorId, message } = data;
    const room = patientId + "_" + doctorId;

    // Save message to DB
    const newMessage = await Message.create({
      senderId: patientId, // or doctorId depending on sender
      receiverId: doctorId,
      message,
    });

    // Emit to everyone in room
    io.to(room).emit("receive_message", newMessage);
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

// -------------------------
// Start server
// -------------------------
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});