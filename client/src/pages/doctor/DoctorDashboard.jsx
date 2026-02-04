import React, { useEffect, useState } from "react";
import axios from "axios";

export default function DoctorDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token"); // doctor JWT token

  // Fetch all appointments
  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(
        "http://localhost:3000/api/appointments/doctor/my",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAppointments(data);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching appointments:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  // Confirm appointment
  const confirmAppointment = async (id) => {
    try {
      await axios.put(
        `http://localhost:3000/api/appointments/${id}/confirm`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchAppointments();
    } catch (err) {
      console.error(err);
    }
  };

  // Cancel appointment
  const cancelAppointment = async (id) => {
    try {
      await axios.put(
        `http://localhost:3000/api/appointments/${id}/cancel`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchAppointments();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading)
    return <div className="text-center mt-10 text-xl font-semibold">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6">Doctor Dashboard</h1>

      <div className="overflow-x-auto bg-white shadow-md rounded-lg p-4">
        <table className="min-w-full table-auto border-collapse">
          <thead className="bg-blue-500 text-white">
            <tr>
              <th className="px-4 py-2">Patient Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Time</th>
              <th className="px-4 py-2">Note</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((appt) => (
              <tr
                key={appt._id}
                className="border-b hover:bg-gray-50 transition-colors"
              >
                <td className="px-4 py-2">{appt.patientId?.name || "N/A"}</td>
                <td className="px-4 py-2">{appt.patientId?.email || "N/A"}</td>
                <td className="px-4 py-2">{appt.date}</td>
                <td className="px-4 py-2">{appt.time}</td>
                <td className="px-4 py-2">{appt.note}</td>
                <td className="px-4 py-2">
                  <span
                    className={`px-2 py-1 rounded-full text-white text-xs font-semibold ${
                      appt.status === "pending"
                        ? "bg-yellow-500"
                        : appt.status === "confirmed"
                        ? "bg-green-500"
                        : "bg-red-500"
                    }`}
                  >
                    {appt.status}
                  </span>
                </td>
                <td className="px-4 py-2 space-x-2">
                  {appt.status === "pending" && (
                    <>
                      <button
                        onClick={() => confirmAppointment(appt._id)}
                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => cancelAppointment(appt._id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  {(appt.status === "confirmed" || appt.status === "cancelled") && (
                    <span className="text-gray-500">{appt.status}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {appointments.length === 0 && (
          <div className="text-center text-gray-500 mt-4">
            No appointments found.
          </div>
        )}
      </div>
    </div>
  );
}
