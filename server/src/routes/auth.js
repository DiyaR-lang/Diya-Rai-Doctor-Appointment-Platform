import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Doctor from "../models/Doctor.js";
import upload from "../middleware/uploads.js";
import { protect } from "../middleware/authMiddleware.js";
const router = express.Router();
router.put("/update-profile", protect, upload.single("image"), async (req, res) => {
  try {
    const { name, email, bloodGroup, weight, heartRate, ...doctorData } = req.body;
    const userId = req.user._id;

    // 1. Prepare User Update Object
    const userUpdate = { name, email };
    if (req.file) {
      userUpdate.image = `/uploads/${req.file.filename}`;
    }

    // 2. Update the User (Health stats + basic info)
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { ...userUpdate, bloodGroup, weight, heartRate } },
      { new: true }
    ).select("-password");

    // 3. If User is a Doctor, sync professional profile
    if (updatedUser.role === "doctor") {
      const doctorUpdate = { ...doctorData };
      if (req.file) doctorUpdate.image = userUpdate.image;
      
      await Doctor.findOneAndUpdate(
        { userId: userId },
        { $set: doctorUpdate },
        { new: true }
      );
    }

    res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser
    });
  } catch (err) {
    console.error("UPDATE ERROR:", err);
    res.status(500).json({ message: "Server error during update" });
  }
});
// =========================
// REGISTER
// =========================

// =========================
// REGISTER (Updated for Unique NMC ID)
// =========================

router.post("/register", upload.single("image"), async (req, res) => {
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
      nmcId 
    } = req.body;

    // 1. Logic Check: Ensure NMC ID is unique before creating ANY account
    if (role === "doctor") {
      if (!nmcId) {
        return res.status(400).json({ message: "NMC ID is required for doctor registration." });
      }

      const existingDoctor = await Doctor.findOne({ nmcId });
      if (existingDoctor) {
        return res.status(400).json({ 
          message: "Registration failed: This NMC ID is already registered to another doctor." 
        });
      }
    }

    // 2. Check if User Email already exists (Standard Logic)
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User with this email already exists." });
    }

    const imagePath = req.file ? `/uploads/${req.file.filename}` : "";

    // 3. Create User with the image
    const user = await User.create({ 
      name, 
      email, 
      password, 
      role, 
      image: imagePath 
    });

    // 4. Create Doctor Profile if role is doctor
    if (role === "doctor") {
      await Doctor.create({
        userId: user._id,
        specialty,
        experience,
        fee,
        bio: bio || "",
        phone,
        address,
        image: imagePath, 
        nmcId, // Now guaranteed to be unique by our check above
      });
    }

    // 5. Generate Token
    const token = jwt.sign(
      { id: user._id, role: user.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: "9d" }
    );

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image 
      },
      token,
    });

  } catch (err) {
    // Handle MongoDB Duplicate Key Error (11000) just in case
    if (err.code === 11000) {
      return res.status(400).json({ message: "Duplicate data detected (Email or NMC ID)." });
    }
    console.error("Registration Error:", err);
    res.status(500).json({ message: err.message });
  }
});

// =========================
// LOGIN 
// =========================
router.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const user = await User.findOne({ email, role });

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id, // 
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image 
      },
      token,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


export default router;
