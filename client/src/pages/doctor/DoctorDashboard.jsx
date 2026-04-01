import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";

export default function DoctorDashboard() {
  const [activeTab, setActiveTab] = useState("profile");
  const [appointments, setAppointments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [doctor, setDoctor] = useState(null);
  const [socket, setSocket] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");

  // --- DEDUPLICATION FOR CHAT LIST ---
  const uniquePatients = Array.from(
    new Map(
      appointments
        .filter((a) => a.status === "confirmed" && a.patientId)
        .map((a) => [a.patientId._id || a.patientId.id, a.patientId])
    ).values()
  );

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || !token) return;
    setDoctor(user);

    // 1. Initialize Socket (Matching Patient Logic)
    const newSocket = io("http://localhost:5000", { 
      transports: ["websocket"],
      reconnection: true 
    });
    setSocket(newSocket);

    newSocket.on("connect", () => {
      // CRITICAL: Tells backend to associate this socket with the Doctor's User ID
      newSocket.emit("join_user", user._id || user.id);
    });

    // 2. Real-time Notification Listener
    newSocket.on("new_notification", (notif) => {
      setNotifications((prev) => [notif, ...prev]);
    });

    // 3. Real-time Appointment Listener (Auto-refresh list when patient books)
    newSocket.on("new_appointment", (appt) => {
      setAppointments((prev) => [appt, ...prev]);
      // Also inject a local notification alert
      const localAlert = {
        _id: Date.now().toString(),
        title: "New Booking",
        message: `Patient ${appt.patientId?.name || 'User'} just requested an appointment.`,
        isRead: false,
        createdAt: new Date()
      };
      setNotifications((prev) => [localAlert, ...prev]);
    });

    fetchInitialData();

    return () => { if (newSocket) newSocket.disconnect(); };
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(false);
      // Get Doctor's Appointments
      const apptRes = await axios.get("http://localhost:5000/api/appointments/doctor/my", { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      setAppointments(apptRes.data);

      // Get Doctor's Notifications
      const notifRes = await axios.get("http://localhost:5000/api/notifications/my", { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      setNotifications(notifRes.data);
    } catch (err) {
      console.error("Fetch Error:", err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAsRead = async (id) => {
    try {
      await axios.put(`http://localhost:5000/api/notifications/${id}/read`, {}, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
    } catch (err) { console.error(err); }
  };

  const updateStatus = async (id, status) => {
    try {
      await axios.put(`http://localhost:5000/api/appointments/${id}/${status}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchInitialData(); // Refresh list
    } catch (err) { console.error(err); }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  // ---------------------------------------------------------
  // DOCTOR CHAT BOX (Matches Patient's Enhanced Logic)
  // ---------------------------------------------------------
  function ChatBox({ doctorId, patient, mainSocket }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const scrollRef = useRef();
    const fileInputRef = useRef();
    const patientId = patient?._id || patient?.id;

    useEffect(() => {
      if (!doctorId || !patientId || !mainSocket) return;
      const room = [doctorId, patientId].sort().join("_");
      mainSocket.emit("join_room", { senderId: doctorId, receiverId: patientId });

      const handleReceive = (msg) => {
        const msgRoom = [msg.senderId, msg.receiverId].sort().join("_");
        if (msgRoom === room && msg.senderId !== doctorId) {
          setMessages((prev) => [...prev, msg]);
        }
      };

      mainSocket.on("receive_message", handleReceive);
      axios.get(`http://localhost:5000/api/messages/${patientId}/${doctorId}`, { 
        headers: { Authorization: `Bearer ${token}` } 
      }).then(res => setMessages(res.data));

      return () => mainSocket.off("receive_message", handleReceive);
    }, [doctorId, patientId, mainSocket]);

    useEffect(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    const handleSend = (content) => {
      const finalMsg = content || input;
      if (!finalMsg.trim()) return;
      const msgObj = { senderId: doctorId, receiverId: patientId, message: finalMsg, timestamp: new Date().toISOString() };
      mainSocket.emit("send_message", msgObj);
      setMessages((prev) => [...prev, msgObj]);
      setInput("");
    };

    const handleImageUpload = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const formData = new FormData();
      formData.append("image", file);
      try {
        const res = await axios.post("http://localhost:5000/api/chat/upload", formData, {
          headers: { "Content-Type": "multipart/form-data", Authorization: `Bearer ${token}` }
        });
        handleSend(res.data.url);
      } catch (err) { alert("Upload failed"); }
    };

    return (
      <div className="flex flex-col h-full bg-white border rounded-3xl overflow-hidden shadow-sm">
        <div className="p-5 bg-slate-900 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center font-bold">{patient?.name?.charAt(0)}</div>
            <h3 className="font-bold">{patient?.name}</h3>
          </div>
          <button onClick={() => fileInputRef.current.click()} className="text-[10px] font-black bg-white/10 px-4 py-2 rounded-xl hover:bg-white/20 transition-all">📷 ATTACH REPORT</button>
          <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
          {messages.map((msg, i) => {
            const isImage = msg.message.match(/\.(jpeg|jpg|gif|png|jfif|webp)$/i);
            return (
              <div key={i} className={`flex ${msg.senderId === doctorId ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] p-4 rounded-2xl ${msg.senderId === doctorId ? "bg-green-600 text-white rounded-tr-none" : "bg-white border rounded-tl-none text-slate-800"}`}>
                  {isImage ? <img src={msg.message} className="rounded-lg max-h-60" onClick={() => window.open(msg.message)} /> : <p className="text-sm">{msg.message}</p>}
                </div>
              </div>
            );
          })}
          <div ref={scrollRef} />
        </div>
        <div className="p-4 border-t flex gap-2">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder="Type message..." className="flex-1 bg-slate-100 rounded-xl px-4 py-3 outline-none" />
          <button onClick={() => handleSend()} className="bg-green-600 text-white px-8 rounded-xl font-bold">SEND</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Sidebar */}
        <aside className="lg:col-span-1 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-sm">
            <img src={doctor?.image ? `http://localhost:5000${doctor.image}` : "https://via.placeholder.com/80"} className="w-20 h-20 rounded-2xl mx-auto object-cover mb-4 shadow-md" alt="" />
            <h3 className="font-bold text-slate-900 leading-none">Dr. {doctor?.name}</h3>
            <p className="text-[10px] text-slate-400 mt-2 font-black uppercase tracking-widest">{doctor?.specialty || "Medical Specialist"}</p>
          </div>

          <nav className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            {[
              { id: "profile", label: "Dashboard", icon: "🏠" },
              { id: "appointments", label: "Appointments", icon: "📅" },
              { id: "notifications", label: "Alerts", icon: "🔔", badge: unreadCount },
              { id: "chat", label: "Consultation", icon: "💬" }
            ].map((t) => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} className={`w-full flex items-center justify-between px-6 py-4 text-sm font-bold transition-all ${activeTab === t.id ? "bg-green-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}>
                <span className="flex items-center gap-3"><span>{t.icon}</span> {t.label}</span>
                {t.badge > 0 && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse">{t.badge}</span>}
              </button>
            ))}
            <button onClick={handleLogout} className="w-full text-left px-6 py-4 text-sm font-bold text-red-500 hover:bg-red-50">🚪 Logout</button>
          </nav>
        </aside>

        {/* Content Area */}
        <main className="lg:col-span-3 bg-white border border-slate-200 rounded-3xl p-6 md:p-10 shadow-sm min-h-[700px]">
          
          {activeTab === "profile" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-3xl font-black text-slate-900">Practitioner Profile</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Registered Name</span>
                  <p className="text-xl font-bold text-slate-800">Dr. {doctor?.name}</p>
                </div>
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Account Status</span>
                  <p className="text-xl font-bold text-green-600">Active</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "appointments" && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Booking Requests</h2>
              <div className="space-y-3">
                {appointments.map((a) => (
                  <div key={a._id} className="p-5 border border-slate-100 rounded-2xl flex items-center justify-between hover:bg-slate-50">
                    <div className="flex items-center gap-4">
                      <img src={a.patientId?.image ? `http://localhost:5000${a.patientId.image}` : "https://via.placeholder.com/50"} className="w-12 h-12 rounded-xl object-cover" alt="" />
                      <div>
                        <p className="font-bold text-slate-800">{a.patientId?.name || "Unknown Patient"}</p>
                        <p className="text-xs text-slate-400 font-bold">{new Date(a.date).toLocaleDateString()} • {a.time}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {a.status === "pending" ? (
                        <>
                          <button onClick={() => updateStatus(a._id, "confirm")} className="bg-green-600 text-white px-4 py-2 rounded-xl text-[10px] font-black">APPROVE</button>
                          <button onClick={() => updateStatus(a._id, "cancel")} className="bg-slate-100 text-slate-400 px-4 py-2 rounded-xl text-[10px] font-black">REJECT</button>
                        </>
                      ) : (
                        <span className={`text-[10px] font-black uppercase px-4 py-1 rounded-full ${a.status === 'confirmed' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>{a.status}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="space-y-4 animate-in fade-in duration-500">
              <h2 className="text-3xl font-black text-slate-900">System Notifications</h2>
              {notifications.length === 0 ? <p className="text-center py-20 text-slate-400 font-bold">No active alerts.</p> : 
                notifications.map((n) => (
                  <div key={n._id} onClick={() => !n.isRead && markAsRead(n._id)} className={`p-5 rounded-2xl border transition-all cursor-pointer ${n.isRead ? "bg-white opacity-60" : "bg-green-50 border-green-100 shadow-sm hover:translate-x-1"}`}>
                    <p className="text-sm font-bold text-slate-800 uppercase tracking-tighter">{n.title}</p>
                    <p className="text-xs text-slate-500 mt-1">{n.message}</p>
                  </div>
                ))
              }
            </div>
          )}

          {activeTab === "chat" && (
            <div className="flex h-[600px] gap-6 animate-in zoom-in-95 duration-500">
              <div className="w-1/3 border border-slate-200 rounded-3xl overflow-hidden flex flex-col bg-slate-50">
                <div className="p-4 bg-white border-b text-[10px] font-black text-slate-400 uppercase tracking-widest">Confirmed Patients</div>
                <div className="flex-1 overflow-y-auto">
                  {uniquePatients.map(p => (
                    <div key={p._id} onClick={() => setSelectedPatient(p)} className={`p-4 border-b cursor-pointer transition-all ${selectedPatient?._id === p._id ? "bg-green-600 text-white shadow-lg" : "hover:bg-green-50 text-slate-700"}`}>
                      <p className="text-xs font-black uppercase tracking-tight">{p.name}</p>
                      <p className={`text-[9px] mt-1 font-bold ${selectedPatient?._id === p._id ? "text-green-100" : "text-slate-400"}`}>View Consultation</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-1">
                {selectedPatient ? <ChatBox doctorId={doctor?._id || doctor?.id} patient={selectedPatient} mainSocket={socket} /> : 
                  <div className="h-full border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-300 gap-2">
                    <span className="text-4xl">💬</span>
                    <span className="font-black text-[10px] uppercase tracking-widest">Select a patient to begin advice</span>
                  </div>
                }
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}