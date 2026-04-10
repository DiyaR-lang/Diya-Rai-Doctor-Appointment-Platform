import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import { 
  User, Calendar, Bell, MessageSquare, LogOut, 
  Video, Image as ImageIcon, Send, Clock, CheckCircle2, 
  Activity, Droplets, Scale, ShieldCheck, X, Trash2
} from "lucide-react";

export default function PatientDashboard() {
  const [activeTab, setActiveTab] = useState("profile");
  const [appointments, setAppointments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [patient, setPatient] = useState(null);
  const [socket, setSocket] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const token = localStorage.getItem("token");

  // ✅ NOTIFICATION & SOCKET LOGIC
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || !token) return;
    setPatient(user);

    // 1. Initialize Socket Connection
    const newSocket = io("http://localhost:5000", { 
      transports: ["websocket", "polling"],
      withCredentials: true,
      reconnection: true 
    });
    setSocket(newSocket);

    // 2. Join User Room
    newSocket.on("connect", () => {
      newSocket.emit("join_user", user._id || user.id);
    });

    // 3. Real-time Notification Listener
    newSocket.on("new_notification", (notif) => {
      setNotifications((prev) => [notif, ...prev]);
    });

    fetchData();

    return () => { if (newSocket) newSocket.disconnect(); };
  }, []);

  const fetchData = async () => {
    try {
      const apptRes = await axios.get("http://localhost:5000/api/appointments/my", { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      setAppointments(apptRes.data);
      
      const notifRes = await axios.get("http://localhost:5000/api/notifications/my", { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      setNotifications(notifRes.data);
    } catch (err) { console.error(err); }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // ✅ UPDATED: MARK AS READ WITH DEEP LINKING
  const markAsRead = async (notification) => {
    try {
      await axios.put(`http://localhost:5000/api/notifications/${notification._id}/read`, {}, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      
      setNotifications((prev) => 
        prev.map((n) => (n._id === notification._id ? { ...n, isRead: true } : n))
      );

      // Auto-navigate based on type
      if (notification.type === "appointment_confirmed" || notification.type === "appointment_status") {
        setActiveTab("appointments");
      } else if (notification.type === "new_message") {
        setActiveTab("chat");
      }
    } catch (err) { console.error(err); }
  };

  // ✅ NEW: CLEAR ALL READ NOTIFICATIONS
  const clearReadNotifications = async () => {
    try {
      await axios.delete("http://localhost:5000/api/notifications/clear-read", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.filter(n => !n.isRead));
    } catch (err) { console.error(err); }
  };

  const deleteAppointment = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/api/appointments/${id}`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      setAppointments((prev) => prev.filter((a) => a._id !== id));
    } catch (err) { console.error(err); }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  // --- CHAT BOX LOGIC (UNCHANGED) ---
  function ChatBox({ patientId, doctor, mainSocket }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const fileInputRef = useRef();
    const scrollRef = useRef();
    
    const doctorUserId = doctor?.userId?._id || doctor?.userId || doctor?._id;

    useEffect(() => {
      if (!patientId || !doctorUserId || !mainSocket) return;
      mainSocket.emit("join_room", { senderId: patientId, receiverId: doctorUserId });
      const handleReceive = (msg) => { setMessages((prev) => [...prev, msg]); };
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
      const msgObj = { senderId: patientId, receiverId: doctorUserId, message: finalMsg, messageType: type, timestamp: new Date().toISOString() };
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
      <div className="flex flex-col h-full bg-white rounded-3xl overflow-hidden shadow-xl border border-slate-100">
        <div className="p-4 bg-sky-600 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-bold border border-white/30 overflow-hidden">
              {doctor?.userId?.image ? (
                <img src={`http://localhost:5000${doctor.userId.image}`} alt="Dr" className="w-full h-full object-cover" />
              ) : doctor?.userId?.name?.charAt(0)}
            </div>
            <div>
              <h3 className="font-bold text-sm">Dr. {doctor?.userId?.name}</h3>
              <p className="text-[10px] text-sky-100 uppercase tracking-widest font-semibold">Active Session</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={initiateVideoCall} className="p-2 hover:bg-white/10 rounded-xl transition-all"><Video size={18}/></button>
            <button onClick={() => fileInputRef.current.click()} className="p-2 hover:bg-white/10 rounded-xl transition-all"><ImageIcon size={18}/></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F8FAFC]">
          {messages.map((msg, i) => {
            const isImage = msg.message.match(/\.(jpeg|jpg|gif|png|jfif|webp)$/i);
            const isVideoCall = msg.messageType === "video_call";
            const isMe = msg.senderId === patientId;
            return (
              <div key={i} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] p-3 rounded-2xl ${isMe ? "bg-sky-600 text-white rounded-tr-none shadow-md" : "bg-white border text-slate-800 rounded-tl-none shadow-sm"}`}>
                  {isVideoCall ? (
                    <div className="text-center p-1">
                      <p className="text-[10px] font-bold uppercase mb-2">Video Link Sent</p>
                      <button onClick={() => window.open(`/video-call/${msg.message}`, "_blank")} className={`px-4 py-1.5 rounded-lg font-bold text-[10px] ${isMe ? "bg-white text-sky-600" : "bg-sky-600 text-white"}`}>JOIN CALL</button>
                    </div>
                  ) : isImage ? (
                    <img src={msg.message} className="rounded-lg max-h-48 object-cover" alt="attachment" />
                  ) : (
                    <p className="text-sm leading-relaxed">{msg.message}</p>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={scrollRef} />
        </div>
        <div className="p-4 border-t bg-white flex gap-2 items-center">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder="Type a message..." className="flex-1 bg-slate-100 rounded-2xl px-5 py-3 text-sm outline-none border border-transparent focus:border-sky-300 transition-all" />
          <button onClick={() => handleSend()} className="bg-sky-600 text-white p-3 rounded-2xl hover:bg-sky-700 transition-all shadow-lg shadow-sky-100"><Send size={20}/></button>
        </div>
        <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7FA] p-4 md:p-6 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        <aside className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-200/50 text-center">
            <img 
              src={patient?.image ? `http://localhost:5000${patient.image}` : "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"} 
              className="w-24 h-24 rounded-3xl mx-auto object-cover mb-4 ring-4 ring-sky-50 shadow-md" 
              alt="Profile" 
            />
            <h3 className="font-bold text-xl text-slate-900">{patient?.name}</h3>
            <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-widest flex items-center justify-center gap-1">
              <ShieldCheck size={14} className="text-emerald-500"/> Patient Verified
            </p>
          </div>

          <nav className="bg-white/80 backdrop-blur-md rounded-[2rem] p-2 shadow-sm border border-slate-200/60">
            {[
              { id: "profile", label: "Dashboard", icon: <Activity size={18}/> },
              { id: "appointments", label: "My Visits", icon: <Calendar size={18}/> },
              { id: "notifications", label: "Inbox", icon: <Bell size={18}/>, badge: unreadCount },
              { id: "chat", label: "Consultation", icon: <MessageSquare size={18}/> }
            ].map((t) => (
              <button 
                key={t.id} 
                onClick={() => setActiveTab(t.id)} 
                className={`w-full flex items-center justify-between px-5 py-4 my-1 rounded-2xl text-sm font-bold transition-all duration-300 ${activeTab === t.id ? "bg-sky-600 text-white shadow-lg shadow-sky-100" : "text-slate-500 hover:bg-sky-50 hover:text-sky-600"}`}
              >
                <span className="flex items-center gap-4">{t.icon} {t.label}</span>
                {t.badge > 0 && <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse">{t.badge}</span>}
              </button>
            ))}
            <button onClick={handleLogout} className="w-full flex items-center gap-4 px-5 py-4 text-sm font-bold text-rose-500 hover:bg-rose-50 rounded-2xl transition-all">
              <LogOut size={18} /> Logout
            </button>
          </nav>
        </aside>

        <main className="lg:col-span-9 bg-white rounded-[2.5rem] p-6 md:p-10 shadow-xl border border-slate-200/50 min-h-[720px]">
          {activeTab === "profile" && (
            <div className="animate-in fade-in duration-500 space-y-8">
              <header><h2 className="text-4xl font-black text-slate-900 tracking-tight">Your <span className="text-sky-600">Health Card</span></h2></header>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex flex-col gap-3">
                  <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-rose-500"><Droplets/></div>
                  <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Blood Group</p><p className="font-bold text-xl">O+ Positive</p></div>
                </div>
                <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex flex-col gap-3">
                  <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-sky-500"><Scale/></div>
                  <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Weight Status</p><p className="font-bold text-xl">74.5 KG</p></div>
                </div>
                <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex flex-col gap-3">
                  <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-emerald-500"><Activity/></div>
                  <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Heart Rate</p><p className="font-bold text-xl">72 BPM</p></div>
                </div>
              </div>
              <div className="p-8 bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] text-white shadow-2xl">
                <h4 className="text-sky-400 font-bold text-xs uppercase tracking-[0.2em] mb-6">Patient Identification</h4>
                <div className="grid md:grid-cols-2 gap-8">
                  <div><p className="text-slate-500 text-[10px] font-bold uppercase">Official Name</p><p className="text-xl font-bold tracking-wide mt-1">{patient?.name}</p></div>
                  <div><p className="text-slate-500 text-[10px] font-bold uppercase">Email Account</p><p className="text-xl font-bold tracking-wide mt-1">{patient?.email}</p></div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "appointments" && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <h2 className="text-3xl font-black text-slate-900">Appointment <span className="text-sky-600">History</span></h2>
              <div className="grid gap-4">
                {appointments.map((a) => (
                  <div key={a._id} className="p-6 bg-white border border-slate-100 rounded-[2rem] flex items-center justify-between hover:shadow-xl hover:shadow-sky-50 transition-all duration-300">
                    <div className="flex items-center gap-5">
                      <div className="w-16 h-16 bg-sky-50 rounded-2xl overflow-hidden shadow-inner ring-2 ring-slate-50">
                        <img 
                          src={a.doctorId?.userId?.image ? `http://localhost:5000${a.doctorId.userId.image}` : "https://cdn-icons-png.flaticon.com/512/387/387561.png"} 
                          className="w-full h-full object-cover" alt="Doctor" 
                          onError={(e) => { e.target.src = "https://cdn-icons-png.flaticon.com/512/387/387561.png"; }}
                        />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-lg">Dr. {a.doctorId?.userId?.name}</p>
                        <div className="flex items-center gap-3 mt-1 text-slate-400 font-semibold text-xs">
                          <span className="bg-slate-50 px-2 py-1 rounded-md flex items-center gap-1"><Calendar size={12}/> {new Date(a.date).toLocaleDateString()}</span>
                          <span className="bg-slate-50 px-2 py-1 rounded-md flex items-center gap-1"><Clock size={12}/> {a.time}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`text-[10px] font-black uppercase px-4 py-2 rounded-full tracking-wider ${a.status === 'confirmed' ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-white'}`}>
                        {a.status}
                      </span>
                      <button onClick={() => deleteAppointment(a._id)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><X size={20}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black text-slate-900">Alert <span className="text-sky-600">Center</span></h2>
                {notifications.some(n => n.isRead) && (
                  <button onClick={clearReadNotifications} className="flex items-center gap-2 text-[10px] font-black text-rose-500 bg-rose-50 px-4 py-2 rounded-xl border border-rose-100 hover:bg-rose-100 transition-all">
                    <Trash2 size={14}/> CLEAR READ
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {notifications.length === 0 ? <p className="text-center py-20 text-slate-300 font-bold uppercase tracking-widest">No alerts yet</p> : 
                  notifications.map((n) => (
                    <div key={n._id} onClick={() => markAsRead(n)} className={`p-6 rounded-[2rem] border transition-all cursor-pointer relative overflow-hidden ${n.isRead ? "bg-slate-50/50 border-transparent opacity-60" : "bg-white border-sky-100 shadow-lg hover:border-sky-300"}`}>
                      {!n.isRead && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-sky-500 animate-pulse"></div>}
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            {n.title} {!n.isRead && <span className="bg-sky-500 text-white text-[8px] px-1.5 py-0.5 rounded">NEW</span>}
                          </p>
                          <p className="text-xs text-slate-500 mt-2 leading-relaxed font-medium">{n.message}</p>
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          )}

          {activeTab === "chat" && (
            <div className="flex h-[620px] gap-6 animate-in fade-in duration-500">
              <div className="w-1/3 bg-slate-50/50 rounded-[2rem] border border-slate-100 overflow-hidden flex flex-col">
                <div className="p-5 bg-white border-b font-black text-[10px] text-slate-400 uppercase tracking-widest">Select Doctor</div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {appointments.filter(a => a.status === 'confirmed').map(a => (
                    <div key={a._id} onClick={() => setSelectedDoctor(a.doctorId)} className={`p-4 rounded-2xl cursor-pointer transition-all flex items-center gap-4 ${selectedDoctor?._id === a.doctorId._id ? "bg-sky-600 text-white shadow-xl" : "bg-white hover:bg-sky-50 text-slate-600 border border-slate-100"}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold overflow-hidden ${selectedDoctor?._id === a.doctorId._id ? "bg-white/20" : "bg-sky-100 text-sky-600"}`}>
                        {a.doctorId?.userId?.image ? <img src={`http://localhost:5000${a.doctorId.userId.image}`} className="w-full h-full object-cover" alt="" /> : a.doctorId?.userId?.name?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0"><p className="text-sm font-bold truncate">Dr. {a.doctorId?.userId?.name}</p></div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-1">
                {selectedDoctor ? <ChatBox patientId={patient?._id || patient?.id} doctor={selectedDoctor} mainSocket={socket} /> : 
                  <div className="h-full border-4 border-dashed border-slate-50 rounded-[2.5rem] flex flex-col items-center justify-center text-slate-200 space-y-4">
                    <MessageSquare size={50} /><p className="font-bold text-xs uppercase tracking-widest">Select a specialist to communicate</p>
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