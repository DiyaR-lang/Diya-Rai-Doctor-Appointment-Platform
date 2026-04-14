import express from "express";
import { 
  verifyKhaltiPayment, 
  initiateKhaltiPayment, 
  getReceipt,
  getMyReceipt,
  getDoctorReceipt 
} from "../controller/paymentcontroller.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/khalti/initiate", protect, initiateKhaltiPayment);
router.post("/verify", verifyKhaltiPayment);

// Dashboard Routes - Updated to singular 'receipt'
router.get("/my-receipt", protect, getMyReceipt); // For Patients
router.get("/doctor-receipt", protect, getDoctorReceipt); // For Doctors

// Single Receipt Route
router.get("/receipt/:transactionId", getReceipt);

export default router;