import express from "express";
import { verifyKhaltiPayment, initiateKhaltiPayment } from "../controller/paymentController.js";

const router = express.Router();

// This matches: POST /api/payment/khalti/initiate
router.post("/khalti/initiate", initiateKhaltiPayment);

// This matches: POST /api/payment/verify
router.post("/verify", verifyKhaltiPayment);

export default router;