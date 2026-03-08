import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },

  specialty: { 
    type: String, 
    required: true 
  },

  experience: { 
    type: Number, 
    required: true 
  },

  fee: { 
    type: Number, 
    required: true 
  },

  description: { 
    type: String 
  }, // bio / description

  phone: { 
    type: String 
  },

  address: { 
    type: String 
  },

  image: { 
    type: String 
  }, // optional

  // ✅ NEW FIELD — NMC License Number
  nmcId: {
    type: String,
    required: true,
    unique: true
  },

  // ✅ Optional verification status
  isVerified: {
    type: Boolean,
    default: true
  }

}, { timestamps: true });

export default mongoose.model("Doctor", doctorSchema);