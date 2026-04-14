import axios from "axios";
import Payment from "../models/Payment.js";
import Doctor from "../models/Doctor.js";

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
// controller/paymentController.js
// controller/paymentController.js
export const verifyKhaltiPayment = async (req, res) => {
  const { pidx } = req.body;

  try {
    const khaltiResponse = await axios.post(
      "https://a.khalti.com/api/v2/epayment/lookup/",
      { pidx },
      { headers: { Authorization: `Key ${process.env.KHALTI_SECRET_KEY}` } }
    );

    // DEBUG: Log this to see the status Khalti is sending back
    console.log("Khalti Status:", khaltiResponse.data.status);

    if (khaltiResponse.data.status !== "Completed") {
      return res.status(400).json({ 
        success: false, 
        message: `Payment is still ${khaltiResponse.data.status}. Please complete payment first.` 
      });
    }

    // ONLY save if status is 'Completed'
    const payment = await Payment.findOneAndUpdate(
      { transactionId: pidx },
      { status: "Completed", amount: khaltiResponse.data.total_amount / 100 },
      { upsert: true, new: true }
    );

    res.status(200).json({ success: true, payment });
  } catch (error) {
    res.status(500).json({ success: false, message: "Verification API error" });
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
    // 1. Find the doctor profile associated with the logged-in User
    // (Assuming req.user._id is populated by your 'protect' middleware)
    const doctorProfile = await Doctor.findOne({ userId: req.user._id });

    if (!doctorProfile) {
      return res.status(404).json({ message: "Doctor profile not found" });
    }

    // 2. Fetch payments linked to this doctor
    // Ensure the field name in your Payment model is 'doctor' 
    const receipt = await Payment.find({ 
      doctor: doctorProfile._id,
      status: "Completed" // Only show actual earnings
    })
    .populate("patient", "name email image")
    .sort({ createdAt: -1 });

    res.status(200).json(receipt);
  } catch (error) {
    console.error("Doctor Receipt Error:", error);
    res.status(500).json({ message: "Error fetching doctor receipt" });
  }
};