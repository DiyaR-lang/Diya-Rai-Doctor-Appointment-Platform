import express from "express";
import Stripe from "stripe";
import dotenv from "dotenv";
import Appointment from "../models/Appointment.js";

dotenv.config();
const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// -------------------------
// CREATE PAYMENT INTENT
// -------------------------
router.post("/create-payment-intent", async (req, res) => {
  try {
    const { appointmentId } = req.body;

    // Find appointment in DB
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (!appointment.fee || appointment.fee <= 0) {
      return res.status(400).json({ message: "Invalid appointment fee" });
    }

    // Debug
    console.log("Appointment:", appointment);
    console.log("Fee (cents):", Math.round(appointment.fee * 100));

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(appointment.fee * 100), // in cents
      currency: "usd",
      metadata: { appointmentId: appointment._id.toString() }
    });

    // Save paymentIntentId
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
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    appointment.paymentStatus = "Paid";
    await appointment.save();

    res.json({
      message: "Payment successful",
      appointment
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error confirming payment" });
  }
});

export default router;