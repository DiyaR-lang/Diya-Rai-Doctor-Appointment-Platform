import express from "express";
import Appointment from "../models/Appointment.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import { io } from "../server.js";
import { sendEmail } from "../utils/sendEmail.js";
import { sendNotification } from "../utils/notify.js"; 
import Doctor from "../models/Doctor.js";

const router = express.Router();

// ============================
// CREATE APPOINTMENT (Patient)
// ============================
router.post("/", protect, authorizeRoles("patient"), async (req, res) => {
  try {
    const { doctorId, date, time, note, fee } = req.body;

    if (!doctorId || !date || !time)
      return res.status(400).json({ message: "All fields required" });

    // Validate doctor exists and FETCH the linked User ID
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    let appointmentFee = fee ? Number(fee) : doctor.fee;
    if (!appointmentFee || appointmentFee <= 0)
      return res.status(400).json({ message: "Invalid appointment fee" });

    const appointment = await Appointment.create({
      doctorId,
      patientId: req.user._id,
      date,
      time,
      note,
      fee: appointmentFee,
      status: "pending",
      paymentStatus: "pending",
    });

    // 🔔 Notify Doctor 
    // FIXED: We send to doctor.userId because that is the ID the doctor 
    // uses to "join_user" in their dashboard.
    const targetId = doctor.userId ? doctor.userId.toString() : doctorId;

    await sendNotification({
      userId: targetId,
      title: "New Appointment Booked",
      message: `A new patient booked an appointment for ${date} at ${time}`,
      type: "appointment_booked",
    });

    // 🔔 Realtime socket (Optional but matches your confirm/cancel logic)
    io.to(targetId).emit("new_notification", {
      title: "New Appointment Booked",
      message: `New booking from ${req.user.name}`,
      type: "appointment_booked"
    });

    res.status(201).json(appointment);
  } catch (err) {
    console.error("BOOK APPOINTMENT ERROR:", err);
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
router.get("/doctor/my", protect, authorizeRoles("doctor"), async (req, res) => {
  try {
    // Find the doctor profile associated with this user
    const doctorProfile = await Doctor.findOne({ userId: req.user._id });
    
    // Fetch only appointments for this specific doctor
    const appointments = await Appointment.find({ doctorId: doctorProfile._id })
      .populate("patientId", "name email image")
      .sort({ createdAt: -1 });

    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ============================
// CONFIRM APPOINTMENT (Doctor)
// ============================
router.put("/:id/confirm", protect, authorizeRoles("doctor"), async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate("patientId", "name email")
      .populate("doctorId", "name");

    if (!appointment)
      return res.status(404).json({ message: "Appointment not found" });

    appointment.status = "confirmed";
    await appointment.save();

    io.to(appointment.patientId._id.toString()).emit("appointmentConfirmed", appointment);

    await sendNotification({
      userId: appointment.patientId._id,
      title: "Appointment Confirmed",
      message: `Your appointment on ${appointment.date} at ${appointment.time} has been confirmed`,
      type: "appointment_confirmed",
    });

    await sendEmail(
      appointment.patientId.email,
      "Appointment Confirmed",
      `<h3>Hello ${appointment.patientId.name}</h3><p>Your appointment has been confirmed.</p>`
    );

    res.json({ message: "Appointment confirmed", appointment });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ============================
// CANCEL APPOINTMENT (Doctor)
// ============================
router.put("/:id/cancel", protect, authorizeRoles("doctor"), async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate("patientId", "name email")
      .populate("doctorId", "name");

    if (!appointment)
      return res.status(404).json({ message: "Appointment not found" });

    appointment.status = "cancelled";
    await appointment.save();

    io.to(appointment.patientId._id.toString()).emit("appointmentCancelled", appointment);

    await sendNotification({
      userId: appointment.patientId._id,
      title: "Appointment Cancelled",
      message: `Your appointment on ${appointment.date} at ${appointment.time} has been cancelled`,
      type: "appointment_cancelled",
    });

    res.json({ message: "Appointment cancelled", appointment });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;