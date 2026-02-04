import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import path from "path";
import { fileURLToPath } from "url";

// Import routes
import authRoutes from "./routes/auth.js";
import appointmentRoutes from "./routes/appointments.js";
import doctorRoutes from "./routes/doctors.js";

import cors from "cors";

dotenv.config();
connectDB();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// -------------------------
// Middleware
// -------------------------
app.use(cors()); // allow all origins
app.use(express.json()); // parse JSON

// Serve uploaded images statically
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// -------------------------
// Routes
// -------------------------
app.get("/", (req, res) => {
  res.json({
    name: process.env.NAME,
    version: process.env.VERSION,
    message: "Server is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/doctors", doctorRoutes);

// -------------------------
// Start server
// -------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
