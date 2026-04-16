import express from "express";
import User from "../models/User.js";
import Doctor from "../models/Doctor.js";
import Appointment from "../models/Appointment.js";

const router = express.Router();

// CUSTOM ADMIN AUTH: Checks for a specific secret header
const verifyAdminKey = (req, res, next) => {
  const adminSecret = req.headers["x-admin-secret"];
  // You can change "ResolveNow_Super_Secret_2026" to whatever you want
  if (adminSecret === "ResolveNow_Super_Secret_2026") {
    next();
  } else {
    res.status(403).json({ message: "Access Denied: Invalid Admin Secret" });
  }
};

// Apply this to all admin routes
router.use(verifyAdminKey);

// GET ALL DOCTORS & PATIENTS
router.get("/all-users", async (req, res) => {
  try {
    const doctors = await Doctor.find().populate("userId", "name email role image");
    const patients = await User.find({ role: "patient" }).select("-password");
    res.json({ doctors, patients });
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

// DELETE DOCTOR
router.delete("/doctor/:id", async (req, res) => {
  try {
    const doctorId = req.params.id;
    
    // 1. Find the doctor first to get the associated userId
    const doctor = await Doctor.findById(doctorId);
    
    if (!doctor) {
      return res.status(404).json({ message: "Doctor record not found in DB" });
    }

    const linkedUserId = doctor.userId;

    // 2. Perform the deletions
    await Appointment.deleteMany({ doctorId: doctorId }); // Clear appointments
    await Doctor.findByIdAndDelete(doctorId);            // Clear doctor profile
    
    if (linkedUserId) {
      await User.findByIdAndDelete(linkedUserId);        // Clear login account
    }

    console.log(`Successfully purged doctor: ${doctorId}`);
    res.status(200).json({ message: "Permanently deleted from system" });
  } catch (err) {
    console.error("Delete Error:", err);
    res.status(500).json({ message: "Internal Server Error during deletion" });
  }
});

// DELETE PATIENT
router.delete("/patient/:id", async (req, res) => {
  try {
    const patientId = req.params.id;

    // 1. Delete appointments and the user account
    await Appointment.deleteMany({ patientId: patientId });
    const deletedUser = await User.findByIdAndDelete(patientId);

    if (!deletedUser) {
      return res.status(404).json({ message: "Patient record not found in DB" });
    }

    console.log(`Successfully purged patient: ${patientId}`);
    res.status(200).json({ message: "Patient permanently removed" });
  } catch (err) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});
// GET SYSTEM STATS & ALL APPOINTMENTS
// server/src/routes/admin.js

router.get("/dashboard-stats", async (req, res) => {
  try {
    const totalDoctors = await Doctor.countDocuments();
    const totalPatients = await User.countDocuments({ role: "patient" });
    
    // FETCH APPOINTMENTS
    // We use .populate('patientId') because that is the standard for your system
    const allAppointments = await Appointment.find()
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name' } 
      })
      .populate('patientId', 'name email') // Changed from userId to patientId
      .sort({ createdAt: -1 })
      .lean();

    // Calculate revenue safely
    const totalRevenue = allAppointments.reduce((sum, app) => {
      const isPaid = app.paymentStatus?.toLowerCase() === "paid" || 
                     app.paymentStatus?.toLowerCase() === "completed";
      return isPaid ? sum + (Number(app.amount) || 0) : sum;
    }, 0);

    res.json({
      stats: {
        totalDoctors,
        totalPatients,
        totalAppointments: allAppointments.length,
        totalRevenue
      },
      appointments: allAppointments
    });
  } catch (err) {
    console.error("ADMIN STATS ERROR:", err);
    res.status(500).json({ message: "Error aggregating dashboard data" });
  }
});
// Approve a Doctor
router.put("/approve-doctor/:id", async (req, res) => {
  try {
    const adminSecret = req.headers['x-admin-secret'];
    if (adminSecret !== "ResolveNow_Super_Secret_2026") {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id, 
      { isVerified: true }, 
      { new: true }
    );

    if (!doctor) return res.status(404).json({ message: "Doctor not found" });
    
    res.json({ message: "Doctor verified successfully!", doctor });
  } catch (err) {
    res.status(500).json({ message: "Server error during verification" });
  }
});
export default router;