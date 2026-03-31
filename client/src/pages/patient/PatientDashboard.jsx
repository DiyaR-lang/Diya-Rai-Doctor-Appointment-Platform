// src/components/PatientDashboard.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";

export default function PatientDashboard() {
  const [activeTab, setActiveTab] = useState("profile");
  const [appointments, setAppointments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [patient, setPatient] = useState(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    const token = localStorage.getItem("token");

    if (!user || !token) return;

    setPatient(user);

    // Initialize socket
    const newSocket = io("http://localhost:5000", { transports: ["websocket"] });
    setSocket(newSocket);

    // Join user room
    newSocket.emit("join", user.id);

    newSocket.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    // Listen for real-time notifications
    newSocket.on("new_notification", (notif) => {
      setNotifications((prev) => [notif, ...prev]);
    });

    // Fetch initial data
    axios
      .get("http://localhost:5000/api/appointments/my", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setAppointments(res.data))
      .catch(() => {});

    axios
      .get("http://localhost:5000/api/notifications/my", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setNotifications(res.data))
      .catch(() => {});

    return () => newSocket.disconnect();
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // --------------------------
  // Mark notification as read
  // --------------------------
  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `http://localhost:5000/api/notifications/${id}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications((prev) =>
        prev.map((n) => (n.id === id || n._id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error("MARK AS READ ERROR:", err);
    }
  };

  // --------------------------
  // Logout function
  // --------------------------
  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  // --------------------------
  // Delete appointment
  // --------------------------
  const deleteAppointment = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:5000/api/appointments/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAppointments((prev) => prev.filter((a) => a.id !== id && a._id !== id));
    } catch (err) {
      console.error("DELETE APPOINTMENT ERROR:", err);
    }
  };

  // --------------------------
  // Chat Component
  // --------------------------
  function ChatComponent({ patientId, doctorId }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [chatSocket, setChatSocket] = useState(null);

    // Initialize socket for chat
    useEffect(() => {
      const newSocket = io("http://localhost:5000", { transports: ["websocket"] });
      setChatSocket(newSocket);

      // Join patient-doctor room
      newSocket.emit("join_room", { patientId, doctorId });

      // Listen for incoming messages
      newSocket.on("receive_message", (msg) => {
        setMessages((prev) => [...prev, msg]);
      });

      return () => newSocket.disconnect();
    }, [patientId, doctorId]);

    // Fetch chat history
    useEffect(() => {
      const fetchMessages = async () => {
        try {
          const res = await axios.get(
            `http://localhost:5000/api/messages/${patientId}/${doctorId}`
          );
          setMessages(res.data);
        } catch (err) {
          console.error(err);
        }
      };
      fetchMessages();
    }, [patientId, doctorId]);

    const handleSend = () => {
      if (!input.trim()) return;
      chatSocket.emit("send_message", { patientId, doctorId, message: input });
      setInput("");
    };

    return (
      <div>
        <div
          style={{
            border: "1px solid lightgray",
            height: "300px",
            overflowY: "scroll",
            padding: "5px",
            marginBottom: "10px",
          }}
        >
          {messages.map((msg) => (
            <div key={msg._id} style={{ marginBottom: "5px" }}>
              <b>{msg.senderId === patientId ? "You" : "Doctor"}:</b> {msg.message}
            </div>
          ))}
        </div>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message"
          style={{ width: "80%" }}
        />
        <button onClick={handleSend} style={{ width: "18%", marginLeft: "2%" }}>
          Send
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="bg-white rounded-xl shadow p-4">
          <div className="bg-blue-600 text-white rounded-xl p-4 flex flex-col items-center">
            <img
              src={patient?.image || "https://via.placeholder.com/100"}
              alt="profile"
              className="w-20 h-20 rounded-full border-2 border-white object-cover"
            />
            <h3 className="mt-2 font-semibold">{patient?.name || "Patient"}</h3>
            <p className="text-sm opacity-90">{patient?.email}</p>
          </div>

          <ul className="mt-4 space-y-2 text-sm">
            <li
              onClick={() => setActiveTab("profile")}
              className={`p-2 rounded cursor-pointer ${
                activeTab === "profile" ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100"
              }`}
            >
              👤 Profile & Account
            </li>
            <li
              onClick={() => setActiveTab("appointments")}
              className={`p-2 rounded cursor-pointer ${
                activeTab === "appointments" ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100"
              }`}
            >
              📅 My Appointments
            </li>
            <li
              onClick={() => setActiveTab("notifications")}
              className={`p-2 rounded cursor-pointer flex items-center justify-between ${
                activeTab === "notifications" ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100"
              }`}
            >
              🔔 Notifications
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </li>
            <li
              onClick={() => setActiveTab("chat")}
              className={`p-2 rounded cursor-pointer ${
                activeTab === "chat" ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100"
              }`}
            >
              💬 Chat
            </li>
            <li
              onClick={handleLogout}
              className="p-2 rounded cursor-pointer text-red-600 hover:bg-red-100"
            >
              🚪 Logout
            </li>
          </ul>
        </div>

        {/* Main Content */}
        <div className="md:col-span-3 space-y-6">
          {/* Profile */}
          {activeTab === "profile" && (
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-bold mb-4">Profile & Account</h2>
              <p>Name: {patient?.name}</p>
              <p>Email: {patient?.email}</p>
              <p>Role: {patient?.role}</p>
            </div>
          )}

          {/* Appointments */}
          {activeTab === "appointments" && (
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-bold mb-4">My Appointments</h2>
              {appointments.length === 0 ? (
                <p>No appointments yet.</p>
              ) : (
                appointments.map((a) => (
                  <div
                    key={a.id || a._id}
                    className="border p-4 rounded mb-3 flex items-center justify-between"
                  >
                    <div>
                      <p><b>Doctor:</b> {a.doctorId?.name}</p>
                      <p><b>Date:</b> {new Date(a.date).toLocaleDateString()}</p>
                      <p><b>Time:</b> {a.time}</p>
                      <p>
                        <b>Status:</b>{" "}
                        <span
                          className={`px-2 py-1 rounded text-white text-xs ${
                            a.status === "confirmed"
                              ? "bg-green-600"
                              : a.status === "pending"
                              ? "bg-yellow-500"
                              : "bg-red-600"
                          }`}
                        >
                          {a.status}
                        </span>
                      </p>
                    </div>
                    {a.status !== "cancelled" && (
                      <button
                        onClick={() => deleteAppointment(a.id || a._id)}
                        className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Notifications */}
          {activeTab === "notifications" && (
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-bold mb-4">Notifications</h2>
              {notifications.length === 0 ? (
                <p>No notifications.</p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id || n._id}
                    onClick={() => !n.isRead && markAsRead(n.id || n._id)}
                    className={`border p-3 rounded mb-2 cursor-pointer ${
                      n.isRead ? "bg-gray-50" : "bg-blue-50"
                    }`}
                  >
                    <p>{n.title}</p>
                    <p>{n.message}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Chat */}
          {activeTab === "chat" && (
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-bold mb-4">Chat with Doctor</h2>
              <ChatComponent patientId={patient?.id} doctorId={"69821f8f1a956230db049f0a"} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}