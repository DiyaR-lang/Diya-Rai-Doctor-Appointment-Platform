import mongoose from "mongoose";

const patientSchema = new mongoose.Schema({
  name: String,
  approved: { type: Boolean, default: false },
  assignedDoctor: { type: String }, // doctorId
});

const Patient = mongoose.model("Patient", patientSchema);
export default Patient;