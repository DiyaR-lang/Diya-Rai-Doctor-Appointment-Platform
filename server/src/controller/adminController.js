import User from "../models/User.js";
import Doctor from "../models/Doctor.js";
import Appointment from "../models/Appointment.js";

// ==========================================
// 1. DELETE DOCTOR (System-Wide Purge)
// ==========================================
router.delete("/doctor/:id", async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    const userId = doctor.userId;

    // STEP 1: Delete all appointments associated with this doctor
    await Appointment.deleteMany({ doctorId: req.params.id });

    // STEP 2: Delete the Doctor Profile
    await doctor.deleteOne();

    // STEP 3: Delete the main User login account
    await User.findByIdAndDelete(userId);

    res.json({ message: "Doctor, login account, and all appointments purged." });
  } catch (err) {
    res.status(500).json({ message: "Deep delete failed", error: err.message });
  }
});

// ==========================================
// 2. DELETE PATIENT (System-Wide Purge)
// ==========================================
router.delete("/patient/:id", async (req, res) => {
  try {
    const patientId = req.params.id;

    // STEP 1: Delete all appointments booked by this patient
    await Appointment.deleteMany({ patientId: patientId });

    // STEP 2: Delete the User account
    const deletedUser = await User.findByIdAndDelete(patientId);
    
    if (!deletedUser) return res.status(404).json({ message: "Patient not found" });

    res.json({ message: "Patient and all related appointment history purged." });
  } catch (err) {
    res.status(500).json({ message: "Deep delete failed", error: err.message });
  }
});