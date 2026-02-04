// routes/doctors.js
import express from "express";
import Doctor from "../models/Doctor.js";

const router = express.Router();

// Search doctors
router.post("/search", async (req, res) => {
  try {
    const { name, specialty, experience } = req.body;

    let filter = {};
    if (specialty) filter.specialty = new RegExp(specialty, "i");
    if (experience) filter.experience = { $gte: experience };

    // Populate userId to get doctor's name and email
    let doctors = await Doctor.find(filter).populate("userId", "name email");

    // Filter by name if provided
    if (name) {
      doctors = doctors.filter(doc =>
        doc.userId.name.toLowerCase().includes(name.toLowerCase())
      );
    }

    res.json(doctors);
  } catch (err) {
    console.error("Doctor search error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
