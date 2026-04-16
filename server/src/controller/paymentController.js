import axios from "axios";
import Payment from "../models/Payment.js";
import Doctor from "../models/Doctor.js";
import Appointment from "../models/Appointment.js";
// --- 1. INITIATE PAYMENT (The part you were missing) ---
export const initiateKhaltiPayment = async (req, res) => {
  try {
    const { appointmentId, amount, patientName } = req.body;

    const payload = {
      return_url: "http://localhost:5173/payment-success", // Your frontend success page
      website_url: "http://localhost:5173",
      amount: Math.round(amount * 100), // Convert to Paisa
      purchase_order_id: appointmentId,
      purchase_order_name: `Appointment with Doctor`,
    };

    const response = await axios.post(
      "https://dev.khalti.com/api/v2/epayment/initiate/",
      payload,
      {
        headers: {
          Authorization: `Key ${process.env.KHALTI_SECRET_KEY.trim()}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.json({
      success: true,
      payment_url: response.data.payment_url,
      pidx: response.data.pidx,
    });
  } catch (error) {
    console.error("Khalti Initiate Error:", error.response?.data || error.message);
    res.status(500).json({ success: false, message: "Initiation failed" });
  }
};

// --- 2. VERIFY PAYMENT (Updated for Sandbox URLs) ---
export const verifyKhaltiPayment = async (req, res) => {
  const { pidx, appointmentId } = req.body;

  if (!pidx || !appointmentId) {
    return res.status(400).json({ success: false, message: "Missing pidx or appointmentId" });
  }

  try {
    const khaltiResponse = await axios.post(
      "https://a.khalti.com/api/v2/epayment/lookup/",
      { pidx },
      {
        headers: {
          Authorization: `Key ${process.env.KHALTI_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (khaltiResponse.data.status === "Completed") {
      // This line was crashing because 'Appointment' wasn't imported!
      const updatedAppointment = await Appointment.findByIdAndUpdate(
        appointmentId,
        { 
          paymentStatus: "paid", 
          transactionId: khaltiResponse.data.transaction_id 
        },
        { new: true }
      );

      if (!updatedAppointment) {
        return res.status(404).json({ success: false, message: "Appointment record not found" });
      }

      // OPTIONAL: Create a record in your Payment collection too
      await Payment.create({
        userId: updatedAppointment.patientId,
        doctorId: updatedAppointment.doctorId,
        amount: khaltiResponse.data.total_amount / 100,
        transactionId: khaltiResponse.data.transaction_id,
        status: "Completed"
      });

      return res.status(200).json({
        success: true,
        payment: {
          transactionId: khaltiResponse.data.transaction_id,
          amount: khaltiResponse.data.total_amount / 100,
        }
      });
    } else {
      return res.status(400).json({ success: false, message: "Khalti payment not completed" });
    }
  } catch (error) {
    console.error("Khalti Verify Error:", error.response?.data || error.message);
    res.status(500).json({ success: false, message: "Internal Server Error during verification" });
  }
};
// controller/paymentController.js

export const getReceipt = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const payment = await Payment.findOne({ transactionId });

    if (!payment) {
      return res.status(404).json({ success: false, message: "Receipt not found" });
    }

    res.status(200).json({ success: true, payment });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching receipt" });
  }
};

// --- For Patient Dashboard ---
// Update getMyReceipt to match the new schema
export const getMyReceipt = async (req, res) => {
  try {
    const receipts = await Payment.find({ patient: req.user._id })
      .populate({
        path: "doctor",
        populate: { path: "userId", select: "name" }
      })
      .sort({ createdAt: -1 });
    res.status(200).json(receipts);
  } catch (error) {
    res.status(500).json({ message: "Error fetching receipts" });
  }
};


export const getDoctorReceipt = async (req, res) => {
  try {
    const doctorProfile = await Doctor.findOne({ userId: req.user._id });
    if (!doctorProfile) return res.status(404).json({ message: "Doctor profile not found" });

    // Find all completed payments
    const payments = await Payment.find({ doctorId: doctorProfile._id, status: "Completed" });
    
    // Extract transaction IDs or Appointment IDs to cross-verify status
    // Or simpler: filter appointments that are PAID AND CONFIRMED
    const earnings = await Appointment.find({
      doctorId: doctorProfile._id,
      paymentStatus: "paid",
      status: "confirmed" // Only confirmed appointments count as finalized earnings
    }).populate("patientId", "name email image");

    res.status(200).json(earnings);
  } catch (error) {
    res.status(500).json({ message: "Error fetching doctor earnings" });
  }
};
export const getDoctorEarnings = async (req, res) => {
  try {
    const doctorProfile = await Doctor.findOne({ userId: req.user._id });

    // Logic: Only sum the 'fee' if paymentStatus is 'paid' AND status is 'confirmed'
    const earnedAppointments = await Appointment.find({
      doctorId: doctorProfile._id,
      paymentStatus: "paid",
      status: "confirmed"
    });

    const totalEarnings = earnedAppointments.reduce((sum, item) => sum + (item.fee || 0), 0);

    res.status(200).json({
      totalEarnings,
      appointmentCount: earnedAppointments.length,
      history: earnedAppointments
    });
  } catch (error) {
    res.status(500).json({ message: "Error calculating earnings" });
  }
};