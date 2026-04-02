import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";

export default function PatientDashboard() {
  const [activeTab, setActiveTab] = useState("profile");
  const [appointments, setAppointments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [patient, setPatient] = useState(null);
  const [socket, setSocket] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const token = localStorage.getItem("token");

  // --------------------------
  // ORIGINAL LOGIC (UNTOUCHED)
  // --------------------------
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || !token) return;
    setPatient(user);

    // Initializing Socket with transport fixes
    const newSocket = io("http://localhost:5000", { 
      transports: ["websocket", "polling"],
      withCredentials: true,
      reconnection: true 
    });
    setSocket(newSocket);

    newSocket.on("connect", () => {
      newSocket.emit("join_user", user._id || user.id);
    });

    newSocket.on("new_notification", (notif) => {
      setNotifications((prev) => [notif, ...prev]);
    });

    fetchData();

    return () => { if (newSocket) newSocket.disconnect(); };
  }, []);

  const fetchData = async () => {
    try {
      const apptRes = await axios.get("http://localhost:5000/api/appointments/my", { headers: { Authorization: `Bearer ${token}` } });
      setAppointments(apptRes.data);
      const notifRes = await axios.get("http://localhost:5000/api/notifications/my", { headers: { Authorization: `Bearer ${token}` } });
      setNotifications(notifRes.data);
    } catch (err) { console.error(err); }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAsRead = async (id) => {
    try {
      await axios.put(`http://localhost:5000/api/notifications/${id}/read`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
    } catch (err) { console.error(err); }
  };

  const deleteAppointment = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/api/appointments/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setAppointments((prev) => prev.filter((a) => a._id !== id));
    } catch (err) { console.error(err); }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  // ---------------------------------------------------------
  // ENHANCED CHAT BOX (VIDEO CALL + IMAGE + REALTIME SYNC)
  // ---------------------------------------------------------
  function ChatBox({ patientId, doctor, mainSocket }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const fileInputRef = useRef();
    const scrollRef = useRef();
    
    // Determine the Doctor's User ID
    const doctorUserId = doctor?.userId?._id || doctor?.userId || doctor?._id;

    useEffect(() => {
      if (!patientId || !doctorUserId || !mainSocket) return;
      
      const room = [patientId, doctorUserId].sort().join("_");
      mainSocket.emit("join_room", { senderId: patientId, receiverId: doctorUserId });

      const handleReceive = (msg) => {
        setMessages((prev) => [...prev, msg]);
      };

      mainSocket.on("receive_message", handleReceive);
      
      axios.get(`http://localhost:5000/api/messages/${patientId}/${doctorUserId}`, { 
        headers: { Authorization: `Bearer ${token}` } 
      }).then(res => setMessages(res.data));

      return () => mainSocket.off("receive_message", handleReceive);
    }, [patientId, doctorUserId, mainSocket]);

    useEffect(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    const handleSend = (content, type = "text") => {
      const finalMsg = content || input;
      if (!finalMsg.trim()) return;

      const msgObj = {
        senderId: patientId,
        receiverId: doctorUserId,
        message: finalMsg,
        messageType: type,
        timestamp: new Date().toISOString()
      };

      mainSocket.emit("send_message", msgObj);
      setMessages((prev) => [...prev, msgObj]);
      setInput("");
    };

    const initiateVideoCall = () => {
      const roomId = [patientId, doctorUserId].sort().join("_");
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
      <div className="flex flex-col h-full bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center font-bold">
              {doctor?.userId?.name?.charAt(0)}
            </div>
            <h3 className="font-bold text-sm">Dr. {doctor?.userId?.name}</h3>
          </div>
          
          <div className="flex gap-2">
            <button onClick={initiateVideoCall} className="text-[10px] font-black bg-blue-600 px-4 py-2 rounded-xl hover:bg-blue-700 transition-all active:scale-95">
              📞 VIDEO CALL
            </button>
            <button onClick={() => fileInputRef.current.click()} className="text-[10px] font-black bg-white/10 px-4 py-2 rounded-xl hover:bg-white/20 transition-all">
              📷 ATTACH
            </button>
          </div>
          <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
          {messages.map((msg, i) => {
            const isImage = msg.message.match(/\.(jpeg|jpg|gif|png|jfif|webp)$/i);
            const isVideoCall = msg.messageType === "video_call";

            return (
              <div key={i} className={`flex ${msg.senderId === patientId ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl ${msg.senderId === patientId ? "bg-slate-800 text-white rounded-tr-none" : "bg-white border text-slate-800 rounded-tl-none shadow-sm"}`}>
                  {isVideoCall ? (
                    <div className="text-center p-2">
                      <p className="text-[10px] font-black uppercase opacity-60 mb-2">Video Consultation Request</p>
                      <button onClick={() => window.open(`/video-call/${msg.message}`, "_blank")} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-black text-[10px] hover:bg-blue-700">JOIN CALL</button>
                    </div>
                  ) : isImage ? (
                    <img src={msg.message} className="rounded-lg max-h-64 object-cover" alt="attachment" />
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
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder="Ask the doctor..." className="flex-1 bg-slate-100 rounded-xl px-4 py-3 outline-none" />
          <button onClick={() => handleSend()} className="bg-slate-900 text-white px-8 rounded-xl font-bold">SEND</button>
        </div>
      </div>
    );
  }

  // --------------------------
  // UI LAYOUT
  // --------------------------
  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
        <aside className="lg:col-span-1 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-sm">
            <img src={patient?.image ? `http://localhost:5000${patient.image}` : null} className="w-20 h-20 rounded-2xl mx-auto object-cover mb-4 shadow-md ring-4 ring-slate-50" alt="" />
            <h3 className="font-bold text-slate-900">{patient?.name}</h3>
            <p className="text-xs text-slate-400">{patient?.email}</p>
          </div>

          <nav className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            {[
              { id: "profile", label: "Profile", icon: "🏠" },
              { id: "appointments", label: "My Visits", icon: "📅" },
              { id: "notifications", label: "Alerts", icon: "🔔", badge: unreadCount },
              { id: "chat", label: "Consultation", icon: "💬" }
            ].map((t) => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} className={`w-full flex items-center justify-between px-6 py-4 text-sm font-bold transition-all ${activeTab === t.id ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50"}`}>
                <span className="flex items-center gap-3"><span>{t.icon}</span> {t.label}</span>
                {t.badge > 0 && <span className="bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full">{t.badge}</span>}
              </button>
            ))}
            <button onClick={handleLogout} className="w-full text-left px-6 py-4 text-sm font-bold text-red-500 hover:bg-red-50">Logout</button>
          </nav>
        </aside>

        <main className="lg:col-span-3 bg-white border border-slate-200 rounded-3xl p-6 md:p-10 shadow-sm min-h-[700px]">
          {activeTab === "profile" && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Personal Records</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</span>
                  <p className="text-xl font-bold text-slate-800 mt-1">{patient?.name}</p>
                </div>
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Account</span>
                  <p className="text-xl font-bold text-slate-800 mt-1">{patient?.email}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "appointments" && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <h2 className="text-3xl font-black text-slate-900">Your Visits</h2>
              {appointments.map((a) => (
                <div key={a._id} className="p-5 border border-slate-100 rounded-2xl flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <img src={a.doctorId?.userId?.image ? `http://localhost:5000${a.doctorId.userId.image}` : null} className="w-12 h-12 rounded-xl object-cover" alt="" />
                    <div>
                      <p className="font-bold text-slate-800">Dr. {a.doctorId?.userId?.name}</p>
                      <p className="text-xs text-slate-400">{new Date(a.date).toLocaleDateString()} • {a.time}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-[10px] font-black uppercase px-4 py-1 rounded-full ${a.status === 'confirmed' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>{a.status}</span>
                    <button onClick={() => deleteAppointment(a._id)} className="text-xs text-red-400 font-bold">Cancel</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="space-y-4 animate-in fade-in duration-500">
              <h2 className="text-3xl font-black text-slate-900">Recent Alerts</h2>
              {notifications.map((n) => (
                <div key={n._id} onClick={() => !n.isRead && markAsRead(n._id)} className={`p-5 rounded-2xl border transition-all cursor-pointer ${n.isRead ? "bg-white opacity-60" : "bg-blue-50 border-blue-100 shadow-sm"}`}>
                  <p className="text-sm font-bold text-slate-800">{n.title}</p>
                  <p className="text-xs text-slate-500 mt-1">{n.message}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === "chat" && (
            <div className="flex h-[600px] gap-6 animate-in fade-in duration-500">
              <div className="w-1/3 border border-slate-200 rounded-3xl overflow-hidden bg-slate-50">
                <div className="p-4 bg-white border-b text-[10px] font-black text-slate-400 uppercase tracking-widest">Consultations</div>
                <div className="flex-1 overflow-y-auto">
                  {appointments.filter(a => a.status === 'confirmed').map(a => (
                    <div key={a._id} onClick={() => setSelectedDoctor(a.doctorId)} className={`p-4 border-b cursor-pointer transition-all ${selectedDoctor?._id === a.doctorId._id ? "bg-blue-600 text-white" : "hover:bg-blue-50 text-slate-700"}`}>
                      <p className="text-xs font-black uppercase">DR. {a.doctorId?.userId?.name}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-1">
                {selectedDoctor ? <ChatBox patientId={patient?._id || patient?.id} doctor={selectedDoctor} mainSocket={socket} /> : 
                  <div className="h-full border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-300 gap-2">
                    <span className="text-3xl">💬</span>
                    <span className="font-black text-[10px] uppercase tracking-widest">Select a specialist to chat</span>
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