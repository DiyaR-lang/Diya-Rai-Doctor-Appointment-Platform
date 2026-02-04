import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  specialty: { type: String, required: true },
  experience: { type: Number, required: true },
  fee: { type: Number, required: true },
  description: { type: String }, // bio / description
  phone: { type: String },
  address: { type: String },
  image: { type: String }, // optional
});

export default mongoose.model("Doctor", doctorSchema);
