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

  // --- SCHEDULE STATES (UNCHANGED) ---
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [newDay, setNewDay] = useState({ date: "", nepaliDate: "", slots: "" });
  const [selectedSlotDetail, setSelectedSlotDetail] = useState(null);

  const token = localStorage.getItem("token");

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

    const newSocket = io("http://localhost:5000", { 
      transports: ["websocket", "polling"],
      withCredentials: true,
      reconnection: true 
    });
    setSocket(newSocket);

    newSocket.on("connect", () => {
      newSocket.emit("join_user", user._id || user.id);
    });

    // 🔔 REAL-TIME HANDLER
    newSocket.on("new_notification", (notif) => {
      setNotifications((prev) => [notif, ...prev]);
    });

    newSocket.on("new_appointment", (appt) => {
      setAppointments((prev) => [appt, ...prev]);
    });

    fetchInitialData();

    return () => { if (newSocket) newSocket.disconnect(); };
  }, []);

  const fetchInitialData = async () => {
    try {
      const apptRes = await axios.get("http://localhost:5000/api/appointments/doctor/my", { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      setAppointments(apptRes.data);

      const notifRes = await axios.get("http://localhost:5000/api/notifications/my", { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      setNotifications(notifRes.data);

      const profileRes = await axios.get("http://localhost:5000/api/doctors/profile/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDoctorProfile(profileRes.data);
      
      setLoading(false);
    } catch (err) {
      console.error("Fetch Error:", err);
      setLoading(false);
    }
  };

  // --- SCHEDULE HANDLER (UNCHANGED) ---
  const handleSaveSchedule = async () => {
    if (!newDay.date || !newDay.slots) return alert("Please fill at least English date and slots");
    try {
      const slotArray = newDay.slots.split(",").map(s => s.trim()); 
      await axios.post("http://localhost:5000/api/doctors/availability", {
        doctorId: doctorProfile._id,
        date: newDay.date,
        nepaliDate: newDay.nepaliDate, 
        slots: slotArray 
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("Schedule Updated Successfully!");
      setNewDay({ date: "", nepaliDate: "", slots: "" });
      fetchInitialData();
    } catch (err) {
      alert("Error saving schedule.");
    }
  };

  // ✅ NOTIFICATION IMPROVEMENTS
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAsRead = async (notification) => {
    try {
      await axios.put(`http://localhost:5000/api/notifications/${notification._id}/read`, {}, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      
      // Update local state
      setNotifications((prev) => prev.map((n) => (n._id === notification._id ? { ...n, isRead: true } : n)));

      // 🚀 DEEP LINKING: Auto-navigate based on type
      if (notification.type === "appointment_booked") {
        setActiveTab("appointments");
      } else if (notification.type === "new_message") {
        setActiveTab("chat");
      }
    } catch (err) { console.error(err); }
  };

  const clearReadNotifications = async () => {
    try {
      await axios.delete("http://localhost:5000/api/notifications/clear-read", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.filter(n => !n.isRead));
    } catch (err) { console.error(err); }
  };

  const updateStatus = async (id, status) => {
    try {
      await axios.put(`http://localhost:5000/api/appointments/${id}/${status}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchInitialData(); 
    } catch (err) { console.error(err); }
  };

  // ---------------------------------------------------------
  // DOCTOR CHAT BOX (UNCHANGED)
  // ---------------------------------------------------------
  function ChatBox({ doctorId, patient, mainSocket }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const scrollRef = useRef();
    const fileInputRef = useRef();
    const patientId = patient?._id || patient?.id;

    useEffect(() => {
      if (!doctorId || !patientId || !mainSocket) return;
      mainSocket.emit("join_room", { senderId: doctorId, receiverId: patientId });
      const handleReceive = (msg) => { setMessages((prev) => [...prev, msg]); };
      mainSocket.on("receive_message", handleReceive);
      axios.get(`http://localhost:5000/api/messages/${patientId}/${doctorId}`, { 
        headers: { Authorization: `Bearer ${token}` } 
      }).then(res => setMessages(res.data));
      return () => mainSocket.off("receive_message", handleReceive);
    }, [doctorId, patientId, mainSocket]);

    useEffect(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    const handleSend = (content, type = "text") => {
      const finalMsg = content || input;
      if (!finalMsg.trim()) return;
      const msgObj = { senderId: doctorId, receiverId: patientId, message: finalMsg, messageType: type, timestamp: new Date().toISOString() };
      mainSocket.emit("send_message", msgObj);
      setMessages((prev) => [...prev, msgObj]);
      setInput("");
    };

    const initiateVideoCall = () => {
      const roomId = [doctorId, patientId].sort().join("_");
      handleSend(roomId, "video_call");
      window.open(`/video-call/${roomId}`, "_blank");
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
          <div className="flex gap-2">
            <button onClick={initiateVideoCall} className="text-[10px] font-black bg-blue-600 px-4 py-2 rounded-xl">📞 VIDEO CALL</button>
            <button onClick={() => fileInputRef.current.click()} className="text-[10px] font-black bg-white/10 px-4 py-2 rounded-xl">📷 ATTACH</button>
          </div>
          <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
          {messages.map((msg, i) => {
            const isImage = msg.message.match(/\.(jpeg|jpg|gif|png|jfif|webp)$/i);
            const isVideoCall = msg.messageType === "video_call";
            return (
              <div key={i} className={`flex ${msg.senderId === doctorId ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] p-4 rounded-2xl ${msg.senderId === doctorId ? "bg-green-600 text-white" : "bg-white border text-slate-800"}`}>
                  {isVideoCall ? (
                    <button onClick={() => window.open(`/video-call/${msg.message}`, "_blank")} className="bg-white text-green-600 px-4 py-2 rounded-lg font-black text-[10px]">JOIN CALL</button>
                  ) : isImage ? (
                    <img src={msg.message} className="rounded-lg max-h-60" alt="" />
                  ) : (
                    <p className="text-sm">{msg.message}</p>
                  )}
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
        <aside className="lg:col-span-1 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-sm">
            <img src={doctor?.image ? `http://localhost:5000${doctor.image}` : null} className="w-20 h-20 rounded-2xl mx-auto object-cover mb-4" alt="" />
            <h3 className="font-bold text-slate-900">Dr. {doctor?.name}</h3>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{doctor?.specialty}</p>
          </div>

          <nav className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            {[
              { id: "profile", label: "Dashboard", icon: "🏠" },
              { id: "availability", label: "Schedule", icon: "⏰" },
              { id: "appointments", label: "Appointments", icon: "📅" },
              { id: "notifications", label: "Alerts", icon: "🔔", badge: unreadCount },
              { id: "chat", label: "Consultation", icon: "💬" }
            ].map((t) => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} className={`w-full flex items-center justify-between px-6 py-4 text-sm font-bold transition-all ${activeTab === t.id ? "bg-green-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}>
                <span className="flex items-center gap-3"><span>{t.icon}</span> {t.label}</span>
                {t.badge > 0 && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse">{t.badge}</span>}
              </button>
            ))}
          </nav>
        </aside>

        <main className="lg:col-span-3 bg-white border border-slate-200 rounded-3xl p-6 md:p-10 shadow-sm min-h-[700px]">
          {activeTab === "profile" && <h2 className="text-3xl font-black text-slate-900">Practitioner Profile</h2>}

          {activeTab === "availability" && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <h2 className="text-3xl font-black text-slate-900">Manage Availability</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-slate-50 p-8 rounded-3xl space-y-4">
                   <p className="text-[10px] font-black uppercase text-slate-400">Add New Slots</p>
                   <input type="date" value={newDay.date} onChange={e => setNewDay({...newDay, date: e.target.value})} className="w-full p-4 rounded-xl border outline-none focus:ring-2 ring-green-500" />
                   <input type="text" placeholder="Nepali Date" value={newDay.nepaliDate} onChange={e => setNewDay({...newDay, nepaliDate: e.target.value})} className="w-full p-4 rounded-xl border outline-none focus:ring-2 ring-green-500" />
                   <input type="text" placeholder="Slots (e.g. 10:00, 11:30)" value={newDay.slots} onChange={e => setNewDay({...newDay, slots: e.target.value})} className="w-full p-4 rounded-xl border outline-none focus:ring-2 ring-green-500" />
                   <button onClick={handleSaveSchedule} className="w-full bg-green-600 text-white py-4 rounded-xl font-bold">UPDATE SCHEDULE</button>
                </div>
                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase text-slate-400">Current Schedule</p>
                  {doctorProfile?.availability?.map((day, idx) => (
                    <div key={idx} className="p-4 border rounded-2xl bg-white">
                      <div className="flex justify-between mb-3">
                        <p className="font-bold text-slate-800">{day.date}</p>
                        <span className="bg-green-50 text-green-600 px-3 py-1 rounded-full text-[10px] font-black">{day.slots.length} SLOTS</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {day.slots.map((slot, sIdx) => (
                          <button key={sIdx} className={`text-[10px] px-3 py-1.5 rounded-lg font-black border ${slot.isBooked ? "bg-red-50 text-red-500" : "bg-slate-50"}`}>{slot.time}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "appointments" && (
            <div className="space-y-6">
              <h2 className="text-3xl font-black text-slate-900">Booking Requests</h2>
              {appointments.map((a) => (
                <div key={a._id} className="p-5 border border-slate-100 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <img src={a.patientId?.image ? `http://localhost:5000${a.patientId.image}` : null} className="w-12 h-12 rounded-xl object-cover" alt="" />
                    <div>
                      <p className="font-bold text-slate-800">{a.patientId?.name}</p>
                      <p className="text-xs text-slate-400">{new Date(a.date).toLocaleDateString()} • {a.time}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {a.status === "pending" ? <button onClick={() => updateStatus(a._id, "confirm")} className="bg-green-600 text-white px-4 py-2 rounded-xl text-[10px] font-black">APPROVE</button> : <span className="text-[10px] font-black uppercase px-4 py-1 rounded-full bg-green-100 text-green-600">{a.status}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-black text-slate-900">System Notifications</h2>
                {notifications.some(n => n.isRead) && (
                  <button onClick={clearReadNotifications} className="text-[10px] font-black text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">🗑️ CLEAR READ</button>
                )}
              </div>
              {notifications.length === 0 ? <p className="text-slate-400">No notifications yet.</p> : 
                notifications.map((n) => (
                  <div key={n._id} onClick={() => markAsRead(n)} className={`p-5 rounded-2xl border cursor-pointer transition-all ${n.isRead ? "bg-white opacity-60" : "bg-green-50 border-green-100 shadow-sm"}`}>
                    <div className="flex justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-800 uppercase">{n.title}</p>
                        <p className="text-xs text-slate-500 mt-1">{n.message}</p>
                      </div>
                      {!n.isRead && <span className="text-[9px] bg-green-600 text-white px-2 py-0.5 rounded font-black">NEW</span>}
                    </div>
                  </div>
                ))
              }
            </div>
          )}

          {activeTab === "chat" && (
            <div className="flex h-[600px] gap-6">
              <div className="w-1/3 border border-slate-200 rounded-3xl overflow-hidden bg-slate-50">
                <div className="p-4 bg-white border-b text-[10px] font-black text-slate-400 uppercase tracking-widest">Patients</div>
                {uniquePatients.map(p => (
                  <div key={p._id} onClick={() => setSelectedPatient(p)} className={`p-4 border-b cursor-pointer ${selectedPatient?._id === p._id ? "bg-green-600 text-white" : "hover:bg-green-50"}`}>
                    <p className="text-xs font-black uppercase">{p.name}</p>
                  </div>
                ))}
              </div>
              <div className="flex-1">
                {selectedPatient ? <ChatBox doctorId={doctor?._id || doctor?.id} patient={selectedPatient} mainSocket={socket} /> : 
                  <div className="h-full border-2 border-dashed border-slate-200 rounded-3xl flex items-center justify-center text-slate-300 font-black">SELECT A PATIENT</div>
                }
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}