import express from "express";
import Doctor from "../models/Doctor.js"; 
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// ==========================================
// 1. GET CURRENT DOCTOR PROFILE
// ==========================================
router.get("/profile/me", protect, async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ userId: req.user.id }).populate("userId", "name image email");
    if (!doctor) return res.status(404).json({ message: "Doctor profile not found" });
    res.json(doctor); 
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ==========================================
// 2. UPDATE AVAILABILITY
// ==========================================
router.post("/availability", protect, authorizeRoles("doctor"), async (req, res) => {
  try {
    const { doctorId, date, nepaliDate, range, slots } = req.body;
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
    res.status(500).json({ message: "Failed to update schedule" });
  }
});

// ==========================================
// 3. DELETE AVAILABILITY (FIXED & INTEGRATED)
// ==========================================
router.delete("/availability/:date", protect, authorizeRoles("doctor"), async (req, res) => {
  try {
    const { date } = req.params; 
    const doctor = await Doctor.findOne({ userId: req.user._id });

    if (!doctor) {
      return res.status(404).json({ message: "Doctor profile not found" });
    }

    // Use decodeURIComponent to handle the slashes in the date string (e.g., 2026/04/15)
    const decodedDate = decodeURIComponent(date);
    doctor.availability = doctor.availability.filter((a) => a.date !== decodedDate);

    await doctor.save();
    res.status(200).json({ 
      message: "Schedule deleted successfully", 
      availability: doctor.availability 
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// ==========================================
// 4. DOCTOR SEARCH 
// ==========================================
router.post("/search", async (req, res) => {
  try {
    const { name, specialty, experience } = req.body;
    let filter = {};
    if (specialty) filter.specialty = new RegExp(specialty, "i");
    if (experience) filter.experience = { $gte: Number(experience) };

    let doctors = await Doctor.find(filter).populate("userId", "name email");

    if (name) {
      doctors = doctors.filter(doc =>
        doc.userId && doc.userId.name.toLowerCase().includes(name.toLowerCase())
      );
    }
    res.json(doctors);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;