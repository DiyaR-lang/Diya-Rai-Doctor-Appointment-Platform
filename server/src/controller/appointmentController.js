import Doctor from "../models/Doctor.js";
import Appointment from "../models/Appointment.js";
import { sendNotification, sendEmail } from "../utils/notify.js";

export const bookAppointment = async (req, res) => {
  try {
    const { doctorId, date, time, note, fee } = req.body;
    const io = req.app.get("socketio");

    // BRIDGE: Find doctor and populate the User Account info
    const doctor = await Doctor.findById(doctorId).populate("userId");
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    // Handle Availability
    const day = doctor.availability.find(a => a.date === date);
    if (!day) return res.status(400).json({ message: "Date not available" });

    const slot = day.slots.find(s => s.time === time);
    if (!slot || slot.isBooked) {
      return res.status(400).json({ message: "Slot is already booked" });
    }

    // Create Appointment (using Profile ID for doctorId)
    const newAppointment = new Appointment({
      doctorId: doctor._id,
      patientId: req.user._id,
      date,
      time,
      note,
      fee,
      status: "pending",
      paymentStatus: "pending"
    });

    await newAppointment.save();

    // NOTIFICATION: Use doctor.userId._id (the 6982... ID)
    const doctorAccountID = doctor.userId._id.toString();
    
    await sendNotification(io, {
      userId: doctorAccountID,
      title: "New Booking Request",
      message: `A patient has requested a slot for ${date} at ${time}. Waiting for payment.`,
      type: "appointment_booked" 
    });

    res.status(201).json(newAppointment);
  } catch (error) {
    res.status(500).json({ message: "Booking failed", error: error.message });
  }
};
router.get("/doctor/new-requests", protect, authorizeRoles("doctor"), async (req, res) => {
  try {
    const doctorProfile = await Doctor.findOne({ userId: req.user._id });
    
    // Logic: Find appointments that are PAID but still PENDING confirmation
    const newAppointments = await Appointment.find({ 
      doctorId: doctorProfile._id,
      paymentStatus: "paid", 
      status: "pending" 
    })
    .populate("patientId", "name email image")
    .sort({ createdAt: -1 });

    res.json(newAppointments);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});
