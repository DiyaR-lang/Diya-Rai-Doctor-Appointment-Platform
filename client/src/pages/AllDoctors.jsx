import React, { useEffect, useState } from "react";
import axios from "axios";

export default function AllDoctors() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState({
    name: "",
    specialty: "",
    experience: "",
  });
  const [showSpecialties, setShowSpecialties] = useState(false);
  const [specialtiesList] = useState([
    "Cardiology", "Orthopedics", "Dentist", "Neurology", "Pediatrics",
    "Dermatology", "ENT", "Gynecology", "Psychiatry", "Urology",
    "General Medicine", "Physiotherapy",
  ]);

  const [showBooking, setShowBooking] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [appointmentDate, setAppointmentDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [note, setNote] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  
  // NEW: State to hold the specific slots for the chosen date
  const [availableSlots, setAvailableSlots] = useState([]);

  const fetchDoctors = async (filters = {}) => {
    setLoading(true);
    try {
      const cleanFilters = {
        ...filters,
        experience: filters.experience === "" ? "" : Number(filters.experience)
      };
      
      const res = await axios.post("http://localhost:5000/api/doctors/search", cleanFilters);
      setDoctors(res.data);
    } catch (err) {
      console.error("Failed to fetch doctors:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  // Update available slots whenever the selected date or doctor changes
  useEffect(() => {
    if (selectedDoctor && appointmentDate) {
      // Find the availability object for the selected date
      const dayData = selectedDoctor.availability?.find(a => a.date === appointmentDate);
      setAvailableSlots(dayData ? dayData.slots : []);
      setTimeSlot(""); // Clear slot if date changes
    } else {
      setAvailableSlots([]);
    }
  }, [appointmentDate, selectedDoctor]);

  const handleChange = (e) => {
    setSearch({ ...search, [e.target.name]: e.target.value });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchDoctors(search);
    setShowSpecialties(false);
  };

  const bookAppointment = async () => {
    if (!appointmentDate || !timeSlot) {
      alert("Please select date and time slot");
      return;
    }
    setBookingLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "http://localhost:5000/api/appointments",
        {
          doctorId: selectedDoctor._id,
          // REQUIRED FOR NOTIFICATIONS: This is the User ID for the socket room
          doctorUserId: selectedDoctor.userId?._id || selectedDoctor.userId,
          date: appointmentDate,
          time: timeSlot,
          note,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Appointment booked successfully!");
      setShowBooking(false);
      // Reset booking fields
      setAppointmentDate("");
      setTimeSlot("");
      setNote("");
    } catch (err) {
      alert(err.response?.data?.message || "Server error");
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-blue-50 p-6">
      <div className="max-w-6xl mx-auto text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900">Find Your Doctor</h1>
        <p className="text-gray-600 text-lg">Search by specialty, name, or experience</p>
      </div>

      {/* Search Form - Logic Unchanged */}
      <form onSubmit={handleSearch} className="max-w-6xl mx-auto flex flex-wrap gap-4 bg-white p-6 rounded-lg shadow">
        <input
          type="text"
          name="name"
          placeholder="Doctor Name"
          value={search.name}
          onChange={handleChange}
          className="border px-4 py-2 rounded-lg w-full md:flex-1 focus:ring-2 focus:ring-blue-400 outline-none"
        />

        <div className="relative w-full md:w-1/3">
          <input
            type="text"
            name="specialty"
            placeholder="Specialty"
            value={search.specialty}
            onChange={handleChange}
            onFocus={() => setShowSpecialties(true)}
            className="border px-4 py-2 rounded-lg w-full focus:ring-2 focus:ring-blue-400 outline-none"
            autoComplete="off"
          />
          {showSpecialties && (
            <ul className="absolute z-10 bg-white border mt-1 w-full max-h-48 overflow-y-auto shadow-lg rounded-lg">
              {specialtiesList
                .filter((s) => s.toLowerCase().includes(search.specialty.toLowerCase()))
                .map((s) => (
                  <li
                    key={s}
                    className="px-4 py-2 hover:bg-blue-50 cursor-pointer"
                    onClick={() => {
                      setSearch({ ...search, specialty: s });
                      setShowSpecialties(false);
                    }}
                  >
                    {s}
                  </li>
                ))}
            </ul>
          )}
        </div>

        <input
          type="number"
          name="experience"
          placeholder="Min Experience"
          value={search.experience}
          onChange={handleChange}
          className="border px-4 py-2 rounded-lg w-full md:w-32 focus:ring-2 focus:ring-blue-400 outline-none"
        />

        <button type="submit" className="bg-blue-600 text-white px-8 py-2 rounded-lg hover:bg-blue-700 transition">
          Search
        </button>
      </form>

      {/* Doctors Grid - Styling and Logic Unchanged */}
      <div className="max-w-6xl mx-auto mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <p className="text-center col-span-full">Loading doctors...</p>
        ) : doctors.length === 0 ? (
          <p className="text-center col-span-full text-gray-500">No doctors found matching your criteria.</p>
        ) : (
          doctors.map((doc) => (
            <div key={doc._id} className="bg-white rounded-xl shadow-md p-6 flex flex-col hover:shadow-xl transition">
              <div className="flex items-center gap-4 mb-4">
                <img
                  src={doc.image ? (doc.image.startsWith('http') ? doc.image : `http://localhost:5000${doc.image}`) : "https://via.placeholder.com/80"}
                  alt="Doctor"
                  className="w-16 h-16 rounded-full object-cover border-2 border-blue-100"
                />
                <div>
                  <h2 className="text-lg font-bold text-gray-800">{doc.userId?.name || "Unknown Doctor"}</h2>
                  <p className="text-blue-600 text-sm font-medium">{doc.specialty}</p>
                  <p className="text-gray-500 text-xs">{doc.experience} Years Experience</p>
                </div>
              </div>
              <p className="text-gray-600 text-sm line-clamp-3 mb-4">{doc.description || doc.bio || "No description provided."}</p>
              <div className="mt-auto pt-4 border-t border-gray-100">
                <div className="flex justify-between text-sm mb-4">
                  <span className="text-gray-500">Consultation Fee:</span>
                  <span className="font-bold text-gray-800">Rs {doc.fee}</span>
                </div>
                <button
                  onClick={() => { setSelectedDoctor(doc); setShowBooking(true); }}
                  className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition"
                >
                  Book Appointment
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Booking Modal - Updated for Dynamic Slot Selection */}
      {showBooking && selectedDoctor && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold mb-1">Book Session</h2>
            <p className="text-sm text-blue-600 mb-4 font-bold">Dr. {selectedDoctor.userId?.name}</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase">1. Select Date</label>
                <input 
                  type="date" 
                  min={new Date().toISOString().split("T")[0]} // Prevent past dates
                  value={appointmentDate} 
                  onChange={(e) => setAppointmentDate(e.target.value)} 
                  className="w-full border p-2 rounded-lg mt-1 focus:ring-2 ring-blue-400 outline-none" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">2. Available Slots</label>
                {availableSlots.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {availableSlots.map((slot, i) => {
                      const timeString = typeof slot === 'string' ? slot : slot.time;
                      const isBooked = typeof slot === 'object' && slot.isBooked;
                      
                      return (
                        <button
                          key={i}
                          disabled={isBooked}
                          onClick={() => setTimeSlot(timeString)}
                          className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                            timeSlot === timeString 
                            ? "bg-blue-600 text-white border-blue-600 shadow-md" 
                            : isBooked 
                            ? "bg-gray-100 text-gray-300 cursor-not-allowed border-gray-100"
                            : "bg-white text-gray-700 border-gray-200 hover:border-blue-400 hover:text-blue-600"
                          }`}
                        >
                          {timeString}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-red-400 italic py-2">No slots available for this date.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase">3. Notes</label>
                <textarea 
                  value={note} 
                  onChange={(e) => setNote(e.target.value)} 
                  placeholder="Additional information..."
                  className="w-full border p-2 rounded-lg mt-1 focus:ring-2 ring-blue-400 outline-none text-sm" 
                  rows="2" 
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowBooking(false)} className="flex-1 bg-gray-100 py-2 rounded-lg font-bold text-gray-500 text-sm">CANCEL</button>
                <button 
                  onClick={bookAppointment} 
                  disabled={bookingLoading || !timeSlot} 
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg font-bold text-sm shadow-lg disabled:opacity-50"
                >
                  {bookingLoading ? "BOOKING..." : "CONFIRM"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}