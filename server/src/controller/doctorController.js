import Doctor from "../models/Doctor.js";

export const updateAvailability = async (req, res) => {
  try {
    const { date, nepaliDate, range, slots } = req.body;
    
    // Find doctor by the logged-in user's ID
    const doctor = await Doctor.findOne({ userId: req.user._id });

    if (!doctor) {
      return res.status(404).json({ message: "Doctor profile not found" });
    }

    // Check if availability for this date already exists
    const existingIndex = doctor.availability.findIndex((a) => a.date === date);

    const newDayData = {
      date,
      nepaliDate,
      range,
      // Map simple time strings ["09:00", "10:00"] to the slot object format
      slots: slots.map((t) => ({ time: t, isBooked: false })),
    };

    if (existingIndex !== -1) {
      // Update existing date
      doctor.availability[existingIndex] = newDayData;
    } else {
      // Add new date
      doctor.availability.push(newDayData);
    }

    await doctor.save();
    res.status(200).json({ message: "Availability updated successfully", doctor });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const getAllDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find().populate("userId", "name email");
    
    // Get current date to filter out past slots (Format: YYYY/MM/DD)
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '/');

    // Clean the data before sending to frontend
    const cleanedDoctors = doctors.map(doc => {
      const docObj = doc.toObject();
      // Only show today's and future availability
      docObj.availability = docObj.availability.filter(a => a.date >= today);
      return docObj;
    });

    res.status(200).json(cleanedDoctors);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

/*
--------------------------------
STEP 3 Logic: Get Doctor Availability
--------------------------------
*/
export const getDoctorDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const doctor = await Doctor.findById(id).populate("userId", "name email");

    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    // Clean data: only send future dates to the UI table
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '/');
    const filteredAvailability = doctor.availability.filter(a => a.date >= today);

    res.json({
      ...doctor._doc,
      availability: filteredAvailability
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching doctor details" });
  }
};

// DELETE AVAILABILITY
export const deleteAvailability = async (req, res) => {
  try {
    const { date } = req.params; 
    const doctor = await Doctor.findOne({ userId: req.user._id });

    if (!doctor) {
      return res.status(404).json({ message: "Doctor profile not found" });
    }

    // Decode URL date and filter it out
    const decodedDate = decodeURIComponent(date);
    doctor.availability = doctor.availability.filter((a) => a.date !== decodedDate);

    await doctor.save();
    res.status(200).json({ message: "Schedule deleted successfully", availability: doctor.availability });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
