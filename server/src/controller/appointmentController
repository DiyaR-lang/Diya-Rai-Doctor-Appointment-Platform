import Doctor from "../models/Doctor.js";
import Appointment from "../models/Appointment.js";
import { sendNotification, sendEmail } from "../utils/notify.js";

export const bookAppointment = async (req, res) => {
  try {
    const { doctorId, date, time } = req.body;
    
    // 1. Get the IO instance from the app
    const io = req.app.get("socketio");

    const doctor = await Doctor.findById(doctorId).populate("userId");
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    // 2. Find the specific date row (Matching your UI logic)
    const day = doctor.availability.find(a => a.date === date);
    if (!day) return res.status(400).json({ message: "Date not available" });

    // 3. Find the specific time slot
    const slot = day.slots.find(s => s.time === time);
    if (!slot || slot.isBooked) {
      return res.status(400).json({ message: "Slot is already booked or invalid" });
    }

    // 4. Mark as Booked in Doctor Model
    slot.isBooked = true;
    slot.bookedBy = req.user._id;

    // 5. Create the Appointment Record
    const newAppointment = new Appointment({
      doctorId,
      patientId: req.user._id,
      date,
      time,
      status: "scheduled"
    });

    await doctor.save();
    await newAppointment.save();

    // 6. REAL-TIME UPDATES & NOTIFICATIONS
    // This turns the button gray on everyone else's "All Doctors" page instantly
    io.emit("slot_booked", { doctorId, date, time });

    // Send Real-time notification to the Patient
    await sendNotification(io, {
      userId: req.user._id,
      title: "Appointment Success",
      message: `Your appointment with ${doctor.userId.name} on ${date} at ${time} is confirmed.`,
      type: "booking"
    });

    // Send Real-time notification to the Doctor
    await sendNotification(io, {
      userId: doctor.userId._id,
      title: "New Booking",
      message: `A new patient has booked a slot for ${date} at ${time}.`,
      type: "booking"
    });

    // Send Email (Optional but good for original logic)
    // await sendEmail(req.user.email, "Booking Confirmed", "<h1>Your appointment is set!</h1>");

    res.status(201).json({ message: "Appointment booked!", appointment: newAppointment });
  } catch (error) {
    res.status(500).json({ message: "Booking failed", error: error.message });
  }
};