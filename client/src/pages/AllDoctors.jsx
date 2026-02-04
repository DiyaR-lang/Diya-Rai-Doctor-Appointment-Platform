// src/pages/AllDoctors.jsx
import { useEffect, useState } from "react";
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
  const [specialtiesList, setSpecialtiesList] = useState([
    "Cardiology",
    "Orthopedics",
    "Dentist",
    "Neurology",
    "Pediatrics",
    "Dermatology",
    "ENT",
    "Gynecology",
    "Psychiatry",
    "Urology",
    "General Medicine",
    "Physiotherapy",
  ]);

  // Booking Modal States
  const [showBooking, setShowBooking] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [appointmentDate, setAppointmentDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [note, setNote] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);

  const fetchDoctors = async (filters = {}) => {
    setLoading(true);
    try {
      const res = await axios.post(
        "http://localhost:3000/api/doctors/search",
        filters
      );
      setDoctors(res.data);
    } catch (err) {
      console.error("Failed to fetch doctors:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors(); // initial fetch
  }, []);

  const handleChange = (e) => {
    setSearch({ ...search, [e.target.name]: e.target.value });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchDoctors(search);
    setShowSpecialties(false);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".specialty-dropdown")) {
        setShowSpecialties(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Booking Function
  const bookAppointment = async () => {
    if (!appointmentDate || !timeSlot) {
      alert("Please select date and time slot");
      return;
    }

    setBookingLoading(true);
    try {
      const token = localStorage.getItem("token"); // JWT token for backend
      await axios.post(
        "http://localhost:3000/api/appointments",
        {
          doctorId: selectedDoctor._id,
          date: appointmentDate,
          time: timeSlot,
          note,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      alert("Appointment booked successfully!");
      setShowBooking(false);
      setAppointmentDate("");
      setTimeSlot("");
      setNote("");
    } catch (err) {
      console.error(err);
      alert("Failed to book appointment");
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-blue-50 p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto text-center mb-8">
        <h1 className="text-4xl font-bold text-black">Find Your Doctor</h1>
        <p className="text-black text-lg">
          Search by specialty, name, or experience
        </p>
      </div>

      {/* Search Form */}
      <form
        onSubmit={handleSearch}
        className="max-w-6xl mx-auto flex flex-wrap gap-4 bg-white p-6 rounded-lg shadow"
      >
        <input
          type="text"
          name="name"
          placeholder="Doctor Name"
          value={search.name}
          onChange={handleChange}
          className="border px-4 py-2 rounded-lg w-full md:w-1/3 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        <div className="relative specialty-dropdown w-full md:w-1/3">
          <input
            type="text"
            name="specialty"
            placeholder="Specialty (e.g., Cardiology)"
            value={search.specialty}
            onChange={handleChange}
            onFocus={() => setShowSpecialties(true)}
            className="border px-4 py-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
            autoComplete="off"
          />
          {showSpecialties && (
            <ul className="absolute z-10 bg-white border mt-1 w-full max-h-48 overflow-y-auto shadow rounded-lg">
              {specialtiesList
                .filter((s) =>
                  s.toLowerCase().includes(search.specialty.toLowerCase())
                )
                .map((s) => (
                  <li
                    key={s}
                    className="px-4 py-2 hover:bg-blue-100 cursor-pointer"
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
          placeholder="Experience ≥"
          value={search.experience}
          onChange={handleChange}
          className="border px-4 py-2 rounded-lg w-full md:w-1/6 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          Search
        </button>
      </form>

      {/* Doctors Grid */}
      <div className="max-w-6xl mx-auto mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <p className="text-center col-span-full">Loading doctors...</p>
        ) : doctors.length === 0 ? (
          <p className="text-center col-span-full">No doctors found</p>
        ) : (
          doctors.map((doc) => (
            <div
              key={doc._id}
              className="bg-white rounded-xl shadow-lg p-6 flex flex-col gap-4 transition hover:shadow-2xl"
            >
              <div className="flex items-center gap-4">
                <img
                  src={
                    doc.image
                      ? `http://localhost:3000${doc.image}`
                      : "https://via.placeholder.com/80"
                  }
                  alt={doc.userId?.name || "Doctor"}
                  className="w-20 h-20 rounded-full object-cover border-2 border-blue-200"
                />
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    {doc.userId?.name || "Dr. Unknown"}
                  </h2>
                  <p className="text-blue-600 font-semibold">
                    {doc.specialty || "Specialty not set"}
                  </p>
                  <p className="text-gray-500 text-sm">
                    {doc.experience || 0} yrs experience
                  </p>
                  <p className="text-gray-500 text-sm">
                    Fee: Rs {doc.fee || "N/A"}
                  </p>
                </div>
              </div>
              <p className="text-gray-700">{doc.bio || "No description"}</p>
              <p className="text-gray-500 text-sm">
                Phone: {doc.phone || "N/A"}
              </p>
              <p className="text-gray-500 text-sm">
                Address: {doc.address || "N/A"}
              </p>

              {/* Book Appointment Button - always visible for now */}
              <button
                className="mt-auto bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                onClick={() => {
                  setSelectedDoctor(doc);
                  setShowBooking(true);
                }}
              >
                Book Appointment
              </button>
            </div>
          ))
        )}
      </div>

      {/* Booking Modal */}
      {showBooking && selectedDoctor && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 relative">
            <h2 className="text-xl font-bold mb-4">
              Book {selectedDoctor.userId?.name}
            </h2>
            <label className="block mb-2">Date:</label>
            <input
              type="date"
              value={appointmentDate}
              onChange={(e) => setAppointmentDate(e.target.value)}
              className="border p-2 rounded w-full mb-4"
            />
            <label className="block mb-2">Time Slot:</label>
            <input
              type="text"
              placeholder="10:00 AM"
              value={timeSlot}
              onChange={(e) => setTimeSlot(e.target.value)}
              className="border p-2 rounded w-full mb-4"
            />
            <label className="block mb-2">Notes:</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="border p-2 rounded w-full mb-4"
              placeholder="Any symptoms or notes..."
            />
            <div className="flex justify-end gap-2">
              <button
                className="bg-gray-500 text-white px-4 py-2 rounded"
                onClick={() => setShowBooking(false)}
              >
                Cancel
              </button>
              <button
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                onClick={bookAppointment}
                disabled={bookingLoading}
              >
                {bookingLoading ? "Booking..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
