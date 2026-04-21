import express from "express";
import Appointment from "../models/Appointment.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

import { sendEmail } from "../utils/sendEmail.js";
import { sendNotification } from "../utils/notify.js"; 
import Doctor from "../models/Doctor.js";

const router = express.Router();

// ============================
// CREATE APPOINTMENT (Patient)
// ============================
// server/src/routes/appointments.js

// server/src/routes/appointments.js -> POST "/"
router.post("/", protect, authorizeRoles("patient"), async (req, res) => {
  try {
    const { doctorId, date, time, note, fee } = req.body;

    // Create the appointment as PENDING/UNPAID
    // DO NOT update doctor.availability yet!
    const appointment = await Appointment.create({
      doctorId,
      patientId: req.user._id,
      date,
      time,
      note,
      fee: fee,
      status: "pending",
      paymentStatus: "pending", // Keep it pending
    });

    // DO NOT send notifications to the doctor here.
    // The doctor shouldn't know until the money is paid.

    res.status(201).json(appointment);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});
// ============================
// GET PATIENT APPOINTMENTS
// ============================
router.get("/my", protect, authorizeRoles("patient"), async (req, res) => {
  try {
    const appointments = await Appointment.find({ patientId: req.user._id })
      .populate({
        path: "doctorId",
        populate: {
          path: "userId",
          select: "name email image specialty role",
        },
      })
      .sort({ createdAt: -1 });

    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ============================
// DELETE APPOINTMENT
// ============================
router.delete("/:id", protect, authorizeRoles("patient"), async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment)
      return res.status(404).json({ message: "Appointment not found" });

    if (appointment.patientId.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Not authorized" });

    await appointment.deleteOne();
    res.json({ message: "Appointment deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ============================
// GET ALL APPOINTMENTS (Doctor)
// ============================
// For Doctor Dashboard
router.get("/doctor/my", protect, authorizeRoles("doctor"), async (req, res) => {
  try {
    // 1. Find the profile first using the logged-in User ID
    const doctorProfile = await Doctor.findOne({ userId: req.user._id });
    if (!doctorProfile) return res.status(404).json({ message: "Doctor profile not found" });

    // 2. Query appointments using the Profile ID
    const appointments = await Appointment.find({ 
      doctorId: doctorProfile._id, 
      paymentStatus: "paid" 
    }).populate("patientId", "name email image");
    
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// For Patient Dashboard
router.get("/my", protect, authorizeRoles("patient"), async (req, res) => {
  // ONLY fetch paid appointments (or show unpaid ones with a "Pay Now" button)
  const appointments = await Appointment.find({ 
    patientId: req.user._id, 
    paymentStatus: "paid" 
  }).populate("doctorId");
  
  res.json(appointments);
});

// ============================
// CONFIRM APPOINTMENT (Doctor)
// ============================
router.put("/:id/confirm", protect, authorizeRoles("doctor"), async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate("patientId", "name email"); // Ensure patientId is populated

    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    appointment.status = "confirmed";
    await appointment.save();

    const io = req.app.get("socketio");

   
    const targetId = appointment.patientId._id || appointment.patientId;

    if (targetId) {
      await sendNotification(io, {
        userId: targetId.toString(), 
        title: "Appointment Confirmed",
        message: `Your appointment on ${appointment.date} has been confirmed`,
        type: "appointment_confirmed",
      });
    } else {
      console.error("NOTIFICATION ERROR: Could not find patient ID");
    }

    res.json({ message: "Appointment confirmed", appointment });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});
router.put("/:id/cancel", protect, authorizeRoles("doctor"), async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id).populate("patientId");
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    appointment.status = "cancelled";
    await appointment.save();

    const io = req.app.get("socketio");
    const targetId = appointment.patientId._id || appointment.patientId;

    await sendNotification(io, {
      userId: targetId.toString(),
      title: "Appointment Cancelled",
      message: `Your appointment on ${appointment.date} has been cancelled`,
      type: "appointment_cancelled",
    });

    res.json({ message: "Appointment cancelled", appointment });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});


export default router;