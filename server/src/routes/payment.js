import express from "express";
import Stripe from "stripe";
import dotenv from "dotenv";
import Appointment from "../models/Appointment.js";
import Doctor from "../models/Doctor.js";
import Payment from "../models/payment.js"; // PascalCase

dotenv.config();
const router = express.Router();

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);



// -------------------------
// ESEWA INITIATE PAYMENT
// -------------------------
router.post("/esewa/pay", async (req, res) => {
  try {
    const { appointmentId } = req.body;

    if (!appointmentId) return res.status(400).json({ message: "appointmentId missing" });

    const appointment = await Appointment.findById(appointmentId).populate("doctorId");

    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    const fee = appointment.fee || appointment.doctorId.fee;

    const paymentData = {
      amt: fee,
      psc: 0,
      pdc: 0,
      txAmt: 0,
      tAmt: fee,
      pid: appointment._id,
      scd: process.env.ESEWA_MERCHANT_CODE,
      su: process.env.ESEWA_SUCCESS_URL,
      fu: process.env.ESEWA_FAILURE_URL
    };

    res.json({
      message: "Redirect user to eSewa",
      paymentData,
      esewaUrl: "https://esewa.com.np/epay/main"
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error initiating eSewa payment" });
  }
});

// -------------------------
// ESEWA SUCCESS
// -------------------------
router.get("/esewa/success", async (req, res) => {
  try {
    const { oid, amt, refId } = req.query;

    const appointment = await Appointment.findById(oid);
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    appointment.paymentStatus = "paid";
    await appointment.save();

    const payment = new Payment({
      appointmentId: appointment._id,
      patientId: appointment.patientId,
      amount: amt,
      method: "esewa",
      transactionId: refId,
      status: "success"
    });

    await payment.save();

    res.send("Payment Successful. Appointment Confirmed.");
  } catch (error) {
    console.log(error);
    res.status(500).send("Payment verification failed");
  }
});

// -------------------------
// ESEWA FAILURE
// -------------------------
router.get("/esewa/failure", async (req, res) => {
  res.send("Payment Failed");
});

export default router;