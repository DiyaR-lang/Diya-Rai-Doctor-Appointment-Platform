import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
{
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Appointment"
  },

  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  amount: {
    type: Number,
    required: true
  },

  method: {
    type: String
  },

  transactionId: {
    type: String
  },

  status: {
    type: String,
    enum: ["success", "failed"]
  }

},
{ timestamps: true }
);

export default mongoose.model("Payment", paymentSchema);