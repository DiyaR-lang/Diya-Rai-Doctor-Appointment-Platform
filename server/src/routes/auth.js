import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Doctor from "../models/Doctor.js";
import upload from "../middleware/uploads.js";

const router = express.Router();

// =========================
// REGISTER
// =========================
router.post(
  "/register",
  upload.single("image"), // handle single image upload
  async (req, res) => {
    try {
      const {
        name,
        email,
        password,
        role,
        specialty,
        experience,
        fee,
        bio,
        phone,
        address,
      } = req.body;

      if (!name || !email || !password || !role)
        return res.status(400).json({ message: "All fields are required." });

      const validRoles = ["admin", "doctor", "patient"];
      if (!validRoles.includes(role))
        return res.status(400).json({ message: "Invalid role." });

      const existingUser = await User.findOne({ email });
      if (existingUser)
        return res.status(400).json({ message: "Email already exists." });

      // If doctor, check required fields
      if (role === "doctor") {
        if (!specialty || !experience || !fee || !phone || !address) {
          return res.status(400).json({ message: "Doctor details required." });
        }
      }

      // Create user
      const user = await User.create({ name, email, password, role });

      // Save uploaded image path (full path for frontend)
      const image = req.file ? `/uploads/${req.file.filename}` : "";


      // Create doctor profile if role is doctor
      if (role === "doctor") {
        await Doctor.create({
          userId: user._id,
          specialty,
          experience,
          fee,
          bio: bio || "",
          phone,
          address,
          image, // now includes /uploads/ prefix
        });
      }

      // Token
      const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.status(201).json({
        message: "User registered successfully",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token,
      });
    } catch (err) {
      console.error("REGISTER ERROR FULL:", err);
      res.status(500).json({ message: err.message || "Server error" });
    }
  }
);

// =========================
// LOGIN
// =========================
router.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res
        .status(400)
        .json({ message: "Email, password, and role required." });
    }

    const user = await User.findOne({ email, role });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials or role." });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials or role." });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (err) {
    console.error("LOGIN ERROR FULL:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
});

export default router;
