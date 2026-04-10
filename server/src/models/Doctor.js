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
  }, 

  phone: { 
    type: String 
  },

  address: { 
    type: String 
  },

  image: { 
    type: String 
  }, 

  nmcId: {
    type: String,
    required: true,
    unique: true
  },

  isVerified: {
    type: Boolean,
    default: true
  },

  // ✅ ADDED: Availability Array to support your Dashboard logic
  availability: [
    {
      date: { type: String, required: true }, // Store as "YYYY/MM/DD"
      nepaliDate: { type: String },
      range: { type: String, default: "06:00 - 19:00" },
      slots: [
        {
          time: { type: String, required: true },
          isBooked: { type: Boolean, default: false },
          bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
        }
      ]
    }
  ]

}, { timestamps: true });

// Define the model
const Doctor = mongoose.model("Doctor", doctorSchema);

// ✅ CRITICAL: Ensure this is exactly 'export default Doctor'
export default Doctor;