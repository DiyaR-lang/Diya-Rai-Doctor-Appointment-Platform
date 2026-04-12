import express from "express";

import Doctor from "../models/Doctor.js"; 
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// ==========================================
// 1. GET CURRENT DOCTOR PROFILE
// ==========================================
router.get("/profile/me", protect, async (req, res) => {
  try {
    // Populate userId to get Name and Image from the User Model
    const doctor = await Doctor.findOne({ userId: req.user.id }).populate("userId", "name image email");
    
    if (!doctor) {
      return res.status(404).json({ message: "Doctor profile not found" });
    }
    res.json(doctor); 
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});
// ==========================================
// 2. UPDATE AVAILABILITY (FOR BOOKING)
// ==========================================
router.post("/availability", protect, authorizeRoles("doctor"), async (req, res) => {
  try {
    const { doctorId, date, nepaliDate, range, slots } = req.body;

    if (!slots || !Array.isArray(slots)) {
      return res.status(400).json({ message: "slots expected as array of strings" });
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    const newDay = {
      date,
      nepaliDate,
      range: range || "06:00 - 19:00",
      slots: slots.map(time => ({ time, isBooked: false }))
    };

    const existingDateIndex = doctor.availability.findIndex(a => a.date === date);

    if (existingDateIndex !== -1) {
      doctor.availability[existingDateIndex] = newDay;
    } else {
      doctor.availability.push(newDay);
    }

    await doctor.save();
    res.status(200).json({ message: "Schedule updated", availability: doctor.availability });
  } catch (err) {
    console.error("Update availability error:", err);
    res.status(500).json({ message: "Failed to update schedule" });
  }
});

// ==========================================
// 3. DOCTOR SEARCH (ORIGINAL LOGIC PRESERVED)
// ==========================================
router.post("/search", async (req, res) => {
  try {
    const { name, specialty, experience } = req.body;

    let filter = {};
    if (specialty) filter.specialty = new RegExp(specialty, "i");
    if (experience) filter.experience = { $gte: Number(experience) }; // Ensure number

    // FIX: Using await on the model function
    let doctors = await Doctor.find(filter).populate("userId", "name email");

    if (name) {
      doctors = doctors.filter(doc =>
        doc.userId && doc.userId.name.toLowerCase().includes(name.toLowerCase())
      );
    }

    res.json(doctors);
  } catch (err) {
    console.error("Doctor search error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;