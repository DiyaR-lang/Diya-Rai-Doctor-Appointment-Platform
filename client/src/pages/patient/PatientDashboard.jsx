import { useEffect, useState, useRef } from "react";
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

    const newSocket = io("http://localhost:5000", { 
      transports: ["websocket"],
      reconnection: true 
    });
    setSocket(newSocket);

    newSocket.on("connect", () => {
      newSocket.emit("join_user", user._id || user.id);
    });

    newSocket.on("new_notification", (notif) => {
      setNotifications((prev) => [notif, ...prev]);
    });

    axios.get("http://localhost:5000/api/appointments/my", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setAppointments(res.data)).catch(console.error);

    axios.get("http://localhost:5000/api/notifications/my", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setNotifications(res.data)).catch(console.error);

    return () => { if (newSocket) newSocket.disconnect(); };
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAsRead = async (id) => {
    try {
      await axios.put(`http://localhost:5000/api/notifications/${id}/read`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setNotifications((prev) => prev.map((n) => (n.id === id || n._id === id ? { ...n, isRead: true } : n)));
    } catch (err) { console.error(err); }
  };

  const deleteAppointment = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/api/appointments/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setAppointments((prev) => prev.filter((a) => a.id !== id && a._id !== id));
    } catch (err) { console.error(err); }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  // ---------------------------------------------------------
  // ENHANCED CHAT BOX (IMAGE & REALTIME SYNC)
  // ---------------------------------------------------------
  function ChatBox({ patientId, doctor, mainSocket }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const fileInputRef = useRef();
    const scrollRef = useRef();
    const doctorUserId = doctor?.userId?._id || doctor?.userId || doctor?._id;

    // Auto-scroll to bottom on new message
    useEffect(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, [messages]);

    useEffect(() => {
      if (!patientId || !doctorUserId || !mainSocket) return;
      const room = [patientId, doctorUserId].sort().join("_");
      mainSocket.emit("join_room", { senderId: patientId, receiverId: doctorUserId });

      const handleReceive = (msg) => {
        const msgRoom = [msg.senderId, msg.receiverId].sort().join("_");
        if (msgRoom === room && msg.senderId !== patientId) {
          setMessages((prev) => [...prev, msg]);
        }
      };

      mainSocket.on("receive_message", handleReceive);
      axios.get(`http://localhost:5000/api/messages/${patientId}/${doctorUserId}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setMessages(res.data));

      return () => mainSocket.off("receive_message", handleReceive);
    }, [patientId, doctorUserId, mainSocket]);

    const handleSend = (content) => {
      const finalMsg = content || input;
      if (!finalMsg.trim()) return;

      const msgObj = {
        senderId: patientId,
        receiverId: doctorUserId,
        message: finalMsg,
        timestamp: new Date().toISOString()
      };

      mainSocket.emit("send_message", msgObj);
      setMessages((prev) => [...prev, msgObj]);
      setInput("");
    };

    // --- FILE UPLOAD LOGIC ---
    const handleImageUpload = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append("image", file); // Must match backend upload.single("image")

      try {
        const res = await axios.post("http://localhost:5000/api/chat/upload", formData, {
          headers: { 
            "Content-Type": "multipart/form-data", 
            Authorization: `Bearer ${token}` 
          }
        });
        
        // Use the URL returned by the backend to send a chat message
        handleSend(res.data.url);
      } catch (err) {
        console.error("Upload failed", err);
        alert("Image upload failed. Please try again.");
      }
    };

    return (
      <div className="flex flex-col h-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center font-bold text-white shadow-sm">
              {doctor?.userId?.name?.charAt(0)}
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm leading-none">Dr. {doctor?.userId?.name}</h3>
              <span className="text-[10px] text-green-500 font-bold uppercase">Online</span>
            </div>
          </div>
          
          <button 
            onClick={() => fileInputRef.current.click()} 
            className="flex items-center gap-2 text-xs font-black text-blue-600 bg-white border border-blue-100 px-3 py-2 rounded-lg hover:bg-blue-50 transition-all active:scale-95"
          >
            📷 ATTACH REPORT
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
            accept="image/*" 
            className="hidden" 
          />
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F1F5F9]/30">
          {messages.map((msg, i) => {
            // Robust check for image URLs (handles .jfif, .webp, etc)
            const isImage = msg.message.match(/\.(jpeg|jpg|gif|png|jfif|webp)$/i) != null;
            
            return (
              <div key={i} className={`flex ${msg.senderId === patientId ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl shadow-sm ${
                  msg.senderId === patientId ? "bg-slate-900 text-white rounded-tr-none" : "bg-white text-slate-800 rounded-tl-none border border-slate-100"
                }`}>
                  {isImage ? (
                    <div className="space-y-1">
                       <img 
                        src={msg.message} 
                        alt="Medical Attachment" 
                        className="rounded-lg max-h-64 object-cover cursor-zoom-in hover:opacity-90 transition-opacity" 
                        onClick={() => window.open(msg.message)} 
                      />
                      <p className="text-[10px] opacity-50 text-right">Click to expand</p>
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed">{msg.message}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 bg-white border-t flex gap-2">
          <input 
            type="text" 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Describe your symptoms or ask a question..." 
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
          />
          <button 
            onClick={() => handleSend()} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 rounded-xl font-bold text-sm transition-colors shadow-lg shadow-blue-500/20"
          >
            SEND
          </button>
        </div>
      </div>
    );
  }

  // --- REST OF THE COMPONENT (SIDEBAR & TABS) REMAINS THE SAME ---
  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 font-sans selection:bg-blue-600 selection:text-white">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Sidebar */}
        <aside className="lg:col-span-1 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-sm">
            <div className="relative inline-block">
               <img src={patient?.image ? `http://localhost:5000${patient.image}` : "https://via.placeholder.com/80"} className="w-20 h-20 rounded-2xl mx-auto object-cover mb-4 ring-4 ring-slate-50 shadow-md" alt="" />
               <div className="absolute bottom-4 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            <h3 className="font-bold text-slate-900">{patient?.name}</h3>
            <p className="text-xs text-slate-400 font-medium">{patient?.email}</p>
          </div>

          <nav className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            {[
              { id: "profile", label: "Overview", icon: "🏠" },
              { id: "appointments", label: "My Visits", icon: "📅" },
              { id: "notifications", label: "Alerts", icon: "🔔", badge: unreadCount },
              { id: "chat", label: "Consultation", icon: "💬" }
            ].map((t) => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} className={`w-full flex items-center justify-between px-6 py-4 text-sm font-bold transition-all ${activeTab === t.id ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50"}`}>
                <span className="flex items-center gap-3"><span>{t.icon}</span> {t.label}</span>
                {t.badge > 0 && <span className="bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full">{t.badge}</span>}
              </button>
            ))}
            <button onClick={handleLogout} className="w-full text-left px-6 py-4 text-sm font-bold text-red-500 hover:bg-red-50">🚪 Logout</button>
          </nav>
        </aside>

        {/* Content Area */}
        <main className="lg:col-span-3 bg-white border border-slate-200 rounded-3xl p-6 md:p-10 shadow-sm min-h-[700px]">
          
          {activeTab === "profile" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Patient Profile</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Name</span>
                  <p className="text-xl font-bold text-slate-800 mt-1">{patient?.name}</p>
                </div>
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address</span>
                  <p className="text-xl font-bold text-slate-800 mt-1">{patient?.email}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "appointments" && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Your Appointments</h2>
              <div className="space-y-3">
                {appointments.map((a) => (
                  <div key={a._id} className="p-5 border border-slate-100 rounded-2xl flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-200 rounded-xl overflow-hidden">
                        <img src={a.doctorId?.userId?.image ? `http://localhost:5000${a.doctorId.userId.image}` : "https://via.placeholder.com/50"} alt="" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">Dr. {a.doctorId?.userId?.name}</p>
                        <p className="text-xs text-slate-400">{new Date(a.date).toLocaleDateString()} • {a.time}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${a.status === 'confirmed' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>{a.status}</span>
                      <button onClick={() => deleteAppointment(a._id)} className="text-xs font-bold text-red-400 hover:text-red-600">Cancel</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
             <div className="space-y-4 animate-in fade-in duration-500">
               <h2 className="text-3xl font-black text-slate-900 tracking-tight">Recent Alerts</h2>
               {notifications.length === 0 ? <p className="text-slate-400 font-bold text-center py-20">No new alerts.</p> : 
                notifications.map((n) => (
                 <div key={n.id || n._id} onClick={() => !n.isRead && markAsRead(n.id || n._id)} className={`p-5 rounded-2xl border transition-all cursor-pointer ${n.isRead ? "bg-white border-slate-100 opacity-60" : "bg-blue-50 border-blue-100 shadow-sm hover:translate-x-1"}`}>
                   <p className="text-sm font-bold text-slate-800">{n.title || "Notification"}</p>
                   <p className="text-xs text-slate-500 mt-1">{n.message || n.text}</p>
                 </div>
                ))
               }
             </div>
          )}

          {activeTab === "chat" && (
            <div className="flex h-[600px] gap-6 animate-in fade-in duration-500">
              <div className="w-1/3 border border-slate-200 rounded-2xl overflow-hidden flex flex-col bg-slate-50">
                <div className="p-4 bg-white border-b text-[10px] font-black text-slate-400 uppercase tracking-widest">Confirmed Specialists</div>
                <div className="flex-1 overflow-y-auto">
                  {appointments.filter(a => a.status === 'confirmed').map(a => (
                    <div key={a._id} onClick={() => setSelectedDoctor(a.doctorId)} className={`p-4 border-b last:border-0 cursor-pointer transition-all ${selectedDoctor?._id === a.doctorId._id ? "bg-blue-600 text-white shadow-lg z-10 scale-[1.02]" : "hover:bg-white text-slate-700"}`}>
                       <p className="text-xs font-bold truncate">Dr. {a.doctorId?.userId?.name}</p>
                       <p className={`text-[9px] mt-1 ${selectedDoctor?._id === a.doctorId._id ? "text-blue-100" : "text-slate-400"}`}>General Consultation</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-1">
                {selectedDoctor ? <ChatBox patientId={patient?._id || patient?.id} doctor={selectedDoctor} mainSocket={socket} /> : 
                  <div className="h-full border-2 border-dashed border-slate-100 rounded-3xl flex flex-col items-center justify-center text-slate-300 gap-2">
                    <span className="text-4xl">💬</span>
                    <span className="font-bold text-xs uppercase tracking-widest">Select a specialist to chat</span>
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