import express from "express";
import Appointment from "../models/Appointment.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import { io } from "../server.js";
import { sendEmail } from "../utils/sendEmail.js";
import { sendNotification } from "../utils/notify.js"; // 🔔 NEW

const router = express.Router();

// ============================
// CREATE APPOINTMENT (Patient)
// ============================
router.post("/", protect, authorizeRoles("patient"), async (req, res) => {
  try {
    const { doctorId, date, time, note } = req.body;

    if (!doctorId || !date || !time)
      return res.status(400).json({ message: "All fields required" });

    const appointment = await Appointment.create({
      doctorId,
      patientId: req.user._id,
      date,
      time,
      note,
      status: "pending",
    });

    // 🔔 Notify Doctor (Realtime + DB)
    await sendNotification({
      userId: doctorId,
      title: "New Appointment Booked",
      message: `New appointment on ${date} at ${time}`,
      type: "appointment_booked",
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
      .populate({ path: "doctorId", select: "name email" })
      .sort({ createdAt: -1 });

    res.json(appointments);
  } catch (err) {
    console.error("FETCH MY APPOINTMENTS ERROR:", err);
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
    console.error("DELETE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ============================
// GET ALL APPOINTMENTS (Doctor)
// ============================
router.get("/doctor/my", protect, authorizeRoles("doctor"), async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .populate("patientId", "name email")
      .populate("doctorId", "name email")
      .sort({ createdAt: -1 });

    res.json(appointments);
  } catch (err) {
    console.error("FETCH DOCTOR APPOINTMENTS ERROR:", err);
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

    // 🔔 Realtime socket
    io.to(appointment.patientId._id.toString()).emit("appointmentConfirmed", appointment);

    // 🔔 Save notification + realtime inbox
    await sendNotification({
      userId: appointment.patientId._id,
      title: "Appointment Confirmed",
      message: `Your appointment on ${appointment.date} at ${appointment.time} has been confirmed`,
      type: "appointment_confirmed",
    });

    // 📧 Email
    await sendEmail(
      appointment.patientId.email,
      "Appointment Confirmed",
      `<h3>Hello ${appointment.patientId.name}</h3>
       <p>Your appointment with Dr. ${appointment.doctorId.name} has been confirmed.</p>`
    );

    res.json({ message: "Appointment confirmed", appointment });
  } catch (err) {
    console.error("CONFIRM ERROR:", err);
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

    // 🔔 Realtime socket
    io.to(appointment.patientId._id.toString()).emit("appointmentCancelled", appointment);

    // 🔔 Save notification
    await sendNotification({
      userId: appointment.patientId._id,
      title: "Appointment Cancelled",
      message: `Your appointment on ${appointment.date} at ${appointment.time} has been cancelled`,
      type: "appointment_cancelled",
    });

    // 📧 Email
    await sendEmail(
      appointment.patientId.email,
      "Appointment Cancelled",
      `<h3>Hello ${appointment.patientId.name}</h3>
       <p>Your appointment with Dr. ${appointment.doctorId.name} has been cancelled.</p>`
    );

    res.json({ message: "Appointment cancelled", appointment });
  } catch (err) {
    console.error("CANCEL ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});


export default router;
