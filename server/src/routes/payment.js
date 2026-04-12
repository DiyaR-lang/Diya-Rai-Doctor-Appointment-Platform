import express from "express";
// ✅ Add getReceipt to this import line
import { 
  verifyKhaltiPayment, 
  initiateKhaltiPayment, 
  getReceipt 
} from "../controller/paymentController.js";

const router = express.Router();

router.post("/khalti/initiate", initiateKhaltiPayment);
router.post("/verify", verifyKhaltiPayment);

// Now this will work!
router.get("/receipt/:transactionId", getReceipt);


export default router;