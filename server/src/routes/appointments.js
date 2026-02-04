
import express from "express";
import Appointment from "../models/Appointment.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// ============================
// CREATE APPOINTMENT (Patient only)
// ============================
router.post(
  "/",
  protect,
  authorizeRoles("patient"),
  async (req, res) => {
    try {
      const { doctorId, date, time, note } = req.body;

      if (!doctorId || !date || !time) {
        return res.status(400).json({ message: "All fields required" });
      }

      const appointment = await Appointment.create({
        doctorId,
        patientId: req.user._id,
        date,
        time,
        note,
        status: "pending", // default
      });

      res.status(201).json(appointment);
    } catch (err) {
      console.error("BOOK APPOINTMENT ERROR:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// ============================
// GET MY APPOINTMENTS (Patient only)
// ============================
router.get(
  "/my",
  protect,
  authorizeRoles("patient"),
  async (req, res) => {
    try {
      const appointments = await Appointment.find({ patientId: req.user._id })
        .populate({ path: "doctorId", select: "name email" })
        .sort({ createdAt: -1 });

      res.json(appointments);
    } catch (err) {
      console.error("FETCH MY APPOINTMENTS ERROR:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// ============================
// DELETE APPOINTMENT (Patient only)
// ============================
router.delete(
  "/:id",
  protect,
  authorizeRoles("patient"),
  async (req, res) => {
    try {
      const appointment = await Appointment.findById(req.params.id);
      if (!appointment) return res.status(404).json({ message: "Appointment not found" });

      if (appointment.patientId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Not authorized to delete this appointment" });
      }

      await appointment.deleteOne();
      res.json({ message: "Appointment deleted successfully" });
    } catch (err) {
      console.error("DELETE APPOINTMENT ERROR:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// ============================
// GET ALL APPOINTMENTS (Doctor sees all bookings)
// ============================
router.get(
  "/doctor/my",
  protect,
  authorizeRoles("doctor"),
  async (req, res) => {
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
  }
);

// ============================
// CONFIRM APPOINTMENT (Doctor)
// ============================
router.put(
  "/:id/confirm",
  protect,
  authorizeRoles("doctor"),
  async (req, res) => {
    try {
      const appointment = await Appointment.findById(req.params.id);
      if (!appointment) return res.status(404).json({ message: "Appointment not found" });

      appointment.status = "confirmed";
      await appointment.save();

      res.json({ message: "Appointment confirmed", appointment });
    } catch (err) {
      console.error("CONFIRM APPOINTMENT ERROR:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// ============================
// CANCEL APPOINTMENT (Doctor)
// ============================
router.put(
  "/:id/cancel",
  protect,
  authorizeRoles("doctor"),
  async (req, res) => {
    try {
      const appointment = await Appointment.findById(req.params.id);
      if (!appointment) return res.status(404).json({ message: "Appointment not found" });

      appointment.status = "cancelled";
      await appointment.save();

      res.json({ message: "Appointment cancelled", appointment });
    } catch (err) {
      console.error("CANCEL APPOINTMENT ERROR:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

export default router;
