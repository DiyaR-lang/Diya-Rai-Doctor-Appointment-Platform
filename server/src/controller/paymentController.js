import axios from "axios";
import Payment from "../models/Payment.js";

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
  const { pidx, userId, doctorId, amount } = req.body;

  try {
    const response = await axios.post(
      "https://dev.khalti.com/api/v2/epayment/lookup/",
      { pidx }, // Use pidx here
      {
        headers: {
          Authorization: `Key ${process.env.KHALTI_SECRET_KEY.trim()}`,
          "Content-Type": "application/json",
        },
      }
    );

    // ✅ Match the 'Completed' state from your screenshot
    if (response.data.status === "Completed") { 
      const payment = await Payment.create({
        userId,
        doctorId,
        amount,
        transactionId: pidx, 
        status: "completed",
      });

      return res.status(200).json({
        success: true,
        message: "Payment saved to database successfully!",
        payment,
      });
    }

    res.status(400).json({ success: false, message: "Payment status is not Completed" });
  } catch (error) {
    console.error("DB Save Error:", error.response?.data || error.message);
    res.status(500).json({ success: false, message: "Server error during DB save" });
  }
};