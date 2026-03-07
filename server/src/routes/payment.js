import express from "express";
import Stripe from "stripe";
import dotenv from "dotenv";
import Appointment from "../models/Appointment.js";
import Doctor from "../models/Doctor.js";

dotenv.config();
const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// -------------------------
// CREATE PAYMENT INTENT
// -------------------------
router.post("/create-payment-intent", async (req, res) => {
  try {
    const { appointmentId } = req.body;

    // Populate doctor info to get doctor fee
    const appointment = await Appointment.findById(appointmentId).populate("doctorId");
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    // Use appointment fee if exists, otherwise inherit from doctor
    const fee = appointment.fee || appointment.doctorId.fee;
    if (!fee || fee <= 0) return res.status(400).json({ message: "Invalid appointment fee" });

    // Save fee to appointment (for record)
    appointment.fee = fee;
    await appointment.save();

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(fee * 100), // in paisa (NPR)
      currency: "npr",
      metadata: { appointmentId: appointment._id.toString() }
    });

    appointment.paymentIntentId = paymentIntent.id;
    await appointment.save();

    res.json({ clientSecret: paymentIntent.client_secret });

  } catch (error) {
    console.log("Stripe Error:", error);
    res.status(500).json({ message: "Payment error" });
  }
});

// -------------------------
// CONFIRM PAYMENT
// -------------------------
router.post("/confirm-payment", async (req, res) => {
  try {
    const { appointmentId } = req.body;

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    appointment.paymentStatus = "paid"; // lowercase to match enum
    await appointment.save();

    res.json({ message: "Payment successful", appointment });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error confirming payment" });
  }
});

export default router;