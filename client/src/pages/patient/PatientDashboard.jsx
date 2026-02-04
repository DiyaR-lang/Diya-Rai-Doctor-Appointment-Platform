// src/pages/PatientProfile.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";

export default function PatientDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [patient, setPatient] = useState(null);
  const [activeTab, setActiveTab] = useState("bookings");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const token = localStorage.getItem("token");
        const user = JSON.parse(localStorage.getItem("user"));
        setPatient(user);

        const res = await axios.get("http://localhost:3000/api/appointments/my", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAppointments(res.data);
      } catch (err) {
        console.error("Failed to fetch appointments:", err);
      }
    };
    fetchAppointments();
  }, []);

  // Delete appointment
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this appointment?")) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:3000/api/appointments/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAppointments((prev) => prev.filter((a) => a._id !== id));
    } catch (err) {
      console.error("Failed to delete appointment:", err);
      alert("Failed to delete appointment. Try again.");
    }
  };

  // Update profile
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!patient) return;

    try {
      setSaving(true);
      const token = localStorage.getItem("token");

      const res = await axios.put(
        "http://localhost:3000/api/patient/update",
        {
          name: patient.name,
          email: patient.email,
          image: patient.image,
          bloodType: patient.bloodType,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("Profile updated successfully!");
      localStorage.setItem("user", JSON.stringify(res.data));
      setPatient(res.data);
    } catch (err) {
      console.error("Failed to update profile:", err);
      alert("Failed to update profile. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        {patient && (
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between bg-white p-6 rounded-lg shadow mb-6">
            <div className="flex items-center gap-4">
              <img
                src={patient.image || "https://via.placeholder.com/100"}
                alt={patient.name}
                className="w-24 h-24 rounded-full border-2 border-blue-400 object-cover"
              />
              <div>
                <h2 className="text-2xl font-bold">{patient.name}</h2>
                <p className="text-gray-600">{patient.email}</p>
                <p className="text-gray-500">
                  Blood Type: {patient.bloodType || "-"}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 mt-4 md:mt-0">
              <button
                onClick={() => setActiveTab("bookings")}
                className={`px-4 py-2 rounded border font-semibold ${
                  activeTab === "bookings"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300"
                } hover:bg-blue-500 hover:text-white transition`}
              >
                My Bookings
              </button>
              <button
                onClick={() => setActiveTab("settings")}
                className={`px-4 py-2 rounded border font-semibold ${
                  activeTab === "settings"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300"
                } hover:bg-blue-500 hover:text-white transition`}
              >
                Settings
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        {activeTab === "bookings" ? (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-bold mb-4">My Appointments</h3>
            {appointments.length === 0 ? (
              <p className="text-gray-600">No appointments booked yet.</p>
            ) : (
              <ul className="space-y-4">
                {appointments.map((a) => (
                  <li
                    key={a._id}
                    className="border p-4 rounded-lg flex flex-col md:flex-row gap-4 items-start justify-between"
                  >
                    <div className="flex gap-4">
                      <img
                        src={a.doctorId?.image || "https://via.placeholder.com/60"}
                        alt={a.doctorId?.name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                      <div className="text-gray-700">
                        <p><strong>Doctor:</strong> {a.doctorId?.name || "N/A"}</p>
                        <p><strong>Email:</strong> {a.doctorId?.email || "-"}</p>
                        <p><strong>Date:</strong> {new Date(a.date).toLocaleDateString()}</p>
                        <p><strong>Time:</strong> {a.time}</p>
                        <p>
                          <strong>Status:</strong>{" "}
                          <span
                            className={`${
                              a.status === "confirmed"
                                ? "text-green-600"
                                : a.status === "cancelled"
                                ? "text-red-600"
                                : "text-yellow-600"
                            } font-semibold`}
                          >
                            {a.status}
                          </span>
                        </p>
                        <p><strong>Notes:</strong> {a.note || "-"}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(a._id)}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 self-start mt-4 md:mt-0"
                    >
                      Cancel
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-bold mb-4">Settings</h3>
            {patient && (
              <form className="space-y-4" onSubmit={handleUpdateProfile}>
                <div>
                  <label className="block text-gray-700 mb-1">Name:</label>
                  <input
                    type="text"
                    value={patient.name}
                    onChange={(e) =>
                      setPatient({ ...patient, name: e.target.value })
                    }
                    className="border p-2 rounded w-full"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">Email:</label>
                  <input
                    type="email"
                    value={patient.email}
                    onChange={(e) =>
                      setPatient({ ...patient, email: e.target.value })
                    }
                    className="border p-2 rounded w-full"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">Profile Picture URL:</label>
                  <input
                    type="text"
                    value={patient.image || ""}
                    onChange={(e) =>
                      setPatient({ ...patient, image: e.target.value })
                    }
                    className="border p-2 rounded w-full"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">Blood Type:</label>
                  <input
                    type="text"
                    value={patient.bloodType || ""}
                    onChange={(e) =>
                      setPatient({ ...patient, bloodType: e.target.value })
                    }
                    className="border p-2 rounded w-full"
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
