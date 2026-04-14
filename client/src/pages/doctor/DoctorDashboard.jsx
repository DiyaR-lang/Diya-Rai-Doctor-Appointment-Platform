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

  // --- PROFILE & SCHEDULE STATES ---
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [newDay, setNewDay] = useState({ date: "", nepaliDate: "", slots: "" });

  const token = localStorage.getItem("token");

  // =========================
  // IMAGE LOGIC (INTEGRATED)
  // =========================
  const getProfileImage = () => {
    if (!doctorProfile) return "https://via.placeholder.com/150";
    if (doctorProfile.image) return `http://localhost:5000${doctorProfile.image}`;
    if (doctorProfile.userId?.image) return `http://localhost:5000${doctorProfile.userId.image}`;
    return "https://via.placeholder.com/150";
  };

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

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAsRead = async (notification) => {
    try {
      await axios.put(`http://localhost:5000/api/notifications/${notification._id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications((prev) => prev.map((n) => (n._id === notification._id ? { ...n, isRead: true } : n)));
      if (notification.type === "appointment_booked") setActiveTab("appointments");
      else if (notification.type === "new_message") setActiveTab("chat");
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

  // --- ChatBox Component ---
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
      <div className="flex flex-col h-full bg-white/70 backdrop-blur-3xl border border-white/40 rounded-[3rem] overflow-hidden shadow-2xl">
        <div className="p-7 bg-gradient-to-br from-emerald-600 via-emerald-500 to-sky-500 text-white flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-xl rounded-[1.2rem] flex items-center justify-center font-bold text-2xl border border-white/30 shadow-inner">
              {patient?.name?.charAt(0)}
            </div>
            <div>
               <h3 className="font-extrabold text-xl tracking-tight">{patient?.name}</h3>
               <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                  <p className="text-[10px] opacity-90 font-bold uppercase tracking-[0.1em]">Patient Online</p>
               </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={initiateVideoCall} className="text-[10px] font-black bg-white text-emerald-600 px-6 py-3 rounded-2xl hover:bg-sky-50 transition-all shadow-xl shadow-emerald-900/20 active:scale-95">VIDEO CONSULT</button>
            <button onClick={() => fileInputRef.current.click()} className="text-[10px] font-black bg-white/20 hover:bg-white/30 px-6 py-3 rounded-2xl transition-all border border-white/30 backdrop-blur-md">FILE</button>
          </div>
          <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
        </div>
        <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-white/30">
          {messages.map((msg, i) => {
            const isImage = msg.message.match(/\.(jpeg|jpg|gif|png|jfif|webp)$/i);
            const isVideoCall = msg.messageType === "video_call";
            return (
              <div key={i} className={`flex ${msg.senderId === doctorId ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] p-5 rounded-[2rem] shadow-sm relative ${msg.senderId === doctorId ? "bg-emerald-600 text-white rounded-tr-none" : "bg-white/80 backdrop-blur-md border border-sky-100 text-slate-700 rounded-tl-none shadow-md"}`}>
                  {isVideoCall ? (
                    <button onClick={() => window.open(`/video-call/${msg.message}`, "_blank")} className="bg-emerald-50 text-emerald-600 px-6 py-3 rounded-xl font-black text-[10px] hover:bg-emerald-100 transition-all">JOIN CALL SESSION</button>
                  ) : isImage ? (
                    <img src={msg.message} className="rounded-2xl max-h-72 object-cover border-4 border-white" alt="" />
                  ) : (
                    <p className="text-[15px] leading-relaxed font-semibold">{msg.message}</p>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={scrollRef} />
        </div>
        <div className="p-6 bg-white/80 backdrop-blur-xl border-t border-sky-50 flex gap-4">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder="Consult with patient..." className="flex-1 bg-sky-50/50 border border-sky-100/50 rounded-2xl px-6 py-4 outline-none focus:ring-4 ring-emerald-500/10 transition-all font-bold text-slate-700 placeholder:text-slate-300" />
          <button onClick={() => handleSend()} className="bg-gradient-to-tr from-emerald-600 to-emerald-400 hover:from-emerald-500 hover:to-emerald-300 text-white px-10 rounded-2xl font-black text-xs transition-all shadow-xl shadow-emerald-500/20 active:scale-95 uppercase">Send</button>
        </div>
      </div>
    );
  }

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <div className="w-16 h-16 relative">
            <div className="absolute inset-0 border-4 border-sky-100 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="mt-6 font-black text-sky-900/30 tracking-[0.3em] text-[10px] uppercase">Accessing Secure Data</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F0F4F8] text-slate-900 font-sans selection:bg-emerald-100 selection:text-emerald-900" style={{ backgroundImage: "radial-gradient(at 0% 0%, hsla(199,100%,93%,1) 0, transparent 50%), radial-gradient(at 100% 100%, hsla(152,81%,92%,1) 0, transparent 50%)", backgroundAttachment: "fixed" }}>
      <div className="max-w-[1600px] mx-auto p-4 md:p-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* NAVIGATION BAR - FIXED STYLE */}
          <aside className="lg:col-span-3 space-y-6">
            <div className="bg-white/60 backdrop-blur-2xl border border-white rounded-[3.5rem] p-10 text-center shadow-2xl shadow-sky-900/5 transition-all hover:shadow-emerald-900/5">
              <div className="relative inline-block group">
                  <div className="absolute inset-0 bg-emerald-400 rounded-[2.5rem] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                  <img 
                    src={getProfileImage()} 
                    className="relative w-32 h-32 rounded-[2.5rem] mx-auto object-cover mb-6 border-4 border-white shadow-xl" 
                    alt="Doctor" 
                  />
                  <div className="absolute bottom-4 right-0 w-8 h-8 bg-emerald-500 border-4 border-white rounded-2xl shadow-lg flex items-center justify-center text-[10px] text-white">✓</div>
              </div>
              <h3 className="font-black text-2xl text-slate-900 tracking-tight">Dr. {doctorProfile?.userId?.name || doctor?.name}</h3>
              <p className="text-[11px] text-emerald-600 font-black uppercase tracking-[0.25em] mt-3 bg-emerald-50/50 inline-block px-6 py-2 rounded-full border border-emerald-100">
                  {doctorProfile?.specialty || "Practitioner"}
              </p>
            </div>

            <nav className="bg-white/40 backdrop-blur-2xl border border-white rounded-[3rem] overflow-hidden shadow-xl shadow-sky-900/5">
              {[
                { id: "profile", label: "Dashboard", icon: "❖" },
                { id: "availability", label: "My Timing", icon: "⏲" },
                { id: "appointments", label: "Patient List", icon: "☷" },
                { id: "notifications", label: "System Alerts", icon: "⚡", badge: unreadCount },
                { id: "chat", label: "Consultation", icon: "◉" }
              ].map((t) => (
                <button key={t.id} onClick={() => setActiveTab(t.id)} className={`w-full flex items-center justify-between px-10 py-6 text-sm font-black transition-all duration-500 ${activeTab === t.id ? "bg-white text-emerald-600 shadow-xl shadow-emerald-900/5 scale-[1.02] z-10" : "text-slate-400 hover:text-sky-600 hover:bg-white/50"}`}>
                  <span className="flex items-center gap-5 text-xl"><span>{t.icon}</span> <span className="text-[13px] tracking-wide uppercase">{t.label}</span></span>
                  {t.badge > 0 && <span className="bg-sky-500 text-white text-[10px] px-3 py-1 rounded-xl shadow-lg shadow-sky-500/30">{t.badge}</span>}
                </button>
              ))}
            </nav>
          </aside>

          {/* MAIN CONTENT AREA */}
          <main className="lg:col-span-9 bg-white/70 backdrop-blur-3xl border border-white rounded-[4rem] p-10 md:p-16 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.05)] min-h-[850px] relative overflow-hidden">
            
            {/* STATS OVERVIEW (Visual Enhancements) */}
            <div className="flex gap-6 mb-16 overflow-x-auto pb-4 scrollbar-hide">
                <div className="flex-1 min-w-[200px] p-8 bg-gradient-to-br from-sky-500 to-sky-600 rounded-[2.5rem] text-white shadow-xl shadow-sky-500/20">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Total Appointments</p>
                    <p className="text-4xl font-black mt-2">{appointments.length}</p>
                </div>
                <div className="flex-1 min-w-[200px] p-8 bg-white border border-emerald-100 rounded-[2.5rem] shadow-xl shadow-emerald-900/5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Unread Alerts</p>
                    <p className="text-4xl font-black mt-2 text-slate-800">{unreadCount}</p>
                </div>
                <div className="flex-1 min-w-[200px] p-8 bg-white border border-sky-100 rounded-[2.5rem] shadow-xl shadow-sky-900/5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-sky-500">Consultation Fee</p>
                    <p className="text-4xl font-black mt-2 text-slate-800">Rs. {doctorProfile?.fee || '0'}</p>
                </div>
            </div>

            {/* PROFILE TAB */}
            {activeTab === "profile" && (
              <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
                <div className="mb-12">
                  <h2 className="text-5xl font-black text-slate-900 tracking-tighter">Medical Records</h2>
                  <div className="h-1.5 w-24 bg-gradient-to-r from-emerald-500 to-sky-500 rounded-full mt-4"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                   <div className="p-10 bg-white/50 border border-white rounded-[3.5rem] shadow-sm group hover:shadow-xl transition-all">
                      <p className="text-[12px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-8">Personal Credentials</p>
                      <div className="space-y-6">
                          <div className="flex justify-between items-center"><span className="text-[11px] font-bold text-slate-400 uppercase">Doctor Name</span><span className="font-black text-slate-800">Dr. {doctorProfile?.userId?.name}</span></div>
                          <div className="flex justify-between items-center"><span className="text-[11px] font-bold text-slate-400 uppercase">NMC License</span><span className="font-black text-slate-800">{doctorProfile?.nmcId}</span></div>
                          <div className="flex justify-between items-center"><span className="text-[11px] font-bold text-slate-400 uppercase">Field</span><span className="font-black text-emerald-600 bg-emerald-50 px-4 py-1 rounded-xl">{doctorProfile?.specialty}</span></div>
                          <div className="flex justify-between items-center"><span className="text-[11px] font-bold text-slate-400 uppercase">Experience</span><span className="font-black text-slate-800">{doctorProfile?.experience} Years</span></div>
                      </div>
                   </div>
                   <div className="p-10 bg-white/50 border border-white rounded-[3.5rem] shadow-sm">
                      <p className="text-[12px] font-black text-sky-500 uppercase tracking-[0.3em] mb-8">Access Points</p>
                      <div className="space-y-6">
                          <div className="flex justify-between items-center"><span className="text-[11px] font-bold text-slate-400 uppercase">Email</span><span className="font-black text-slate-800">{doctorProfile?.userId?.email}</span></div>
                          <div className="flex justify-between items-center"><span className="text-[11px] font-bold text-slate-400 uppercase">Phone</span><span className="font-black text-slate-800">{doctorProfile?.phone}</span></div>
                          <div className="flex flex-col gap-2"><span className="text-[11px] font-bold text-slate-400 uppercase">Clinical Location</span><span className="font-black text-slate-800 text-right">{doctorProfile?.address}</span></div>
                      </div>
                   </div>
                </div>
              </div>
            )}

            {/* AVAILABILITY TAB */}
            {activeTab === "availability" && (
              <div className="space-y-12 animate-in fade-in duration-700">
                <h2 className="text-5xl font-black text-slate-900 tracking-tighter">Schedule Planner</h2>
                <div className="grid grid-cols-1 xl:grid-cols-5 gap-12">
                  <div className="xl:col-span-2 bg-gradient-to-b from-sky-50/50 to-white border border-sky-100 p-10 rounded-[3.5rem] shadow-lg shadow-sky-900/5">
                     <p className="text-[12px] font-black uppercase text-sky-400 tracking-[0.2em] mb-8 text-center">Define New Slots</p>
                     <div className="space-y-4">
                        <input type="date" value={newDay.date} onChange={e => setNewDay({...newDay, date: e.target.value})} className="w-full p-5 rounded-[1.5rem] border border-sky-100 outline-none focus:ring-4 ring-emerald-500/10 font-black text-slate-700 bg-white shadow-inner" />
                        <input type="text" placeholder="Nepali Calendar Date" value={newDay.nepaliDate} onChange={e => setNewDay({...newDay, nepaliDate: e.target.value})} className="w-full p-5 rounded-[1.5rem] border border-sky-100 outline-none focus:ring-4 ring-emerald-500/10 font-black text-slate-700 bg-white" />
                        <textarea placeholder="List slots: 10:00, 11:30..." value={newDay.slots} onChange={e => setNewDay({...newDay, slots: e.target.value})} className="w-full p-5 rounded-[1.5rem] border border-sky-100 outline-none focus:ring-4 ring-emerald-500/10 font-black text-slate-700 bg-white min-h-[120px]" />
                        <button onClick={handleSaveSchedule} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-6 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-emerald-500/30 transition-all active:scale-95 mt-4">Save Working Hours</button>
                     </div>
                  </div>
                  <div className="xl:col-span-3">
                    <p className="text-[12px] font-black uppercase text-slate-400 tracking-[0.2em] mb-8">Timeline Preview</p>
                    <div className="space-y-6 max-h-[500px] overflow-y-auto pr-6 custom-scrollbar">
                    {doctorProfile?.availability?.map((day, idx) => (
                      <div key={idx} className="p-8 border border-sky-50 rounded-[3rem] bg-white hover:border-emerald-200 transition-all group shadow-sm hover:shadow-xl hover:shadow-sky-900/5">
                        <div className="flex justify-between items-start mb-6">
                          <div>
                              <p className="text-xl font-black text-slate-800 tracking-tight">{day.date}</p>
                              <p className="text-[10px] text-emerald-500 font-black uppercase mt-1">{day.nepaliDate}</p>
                          </div>
                          <span className="bg-emerald-50 text-emerald-600 px-5 py-2 rounded-2xl text-[10px] font-black border border-emerald-100">{day.slots.length} TIME SLOTS</span>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {day.slots.map((slot, sIdx) => (
                            <div key={sIdx} className={`text-[10px] px-5 py-2.5 rounded-xl font-black border transition-all ${slot.isBooked ? "bg-red-50 text-red-300 border-red-50" : "bg-sky-50 text-sky-600 border-sky-100 hover:scale-110"}`}>{slot.time}</div>
                          ))}
                        </div>
                      </div>
                    ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* APPOINTMENTS TAB */}
            {activeTab === "appointments" && (
              <div className="space-y-10 animate-in fade-in slide-in-from-right-12">
                <h2 className="text-5xl font-black text-slate-900 tracking-tighter">Queue Manager</h2>
                {appointments.length === 0 ? <div className="py-32 text-center text-slate-300 font-black uppercase tracking-[0.5em] text-xs">Waiting for requests...</div> : appointments.map((a) => (
                  <div key={a._id} className="p-8 border border-white rounded-[3.5rem] flex items-center justify-between bg-white shadow-sm hover:shadow-2xl hover:shadow-sky-900/10 transition-all group">
                    <div className="flex items-center gap-6">
                      <div className="relative group-hover:scale-110 transition-transform">
                          <img src={a.patientId?.image ? `http://localhost:5000${a.patientId.image}` : "https://api.dicebear.com/7.x/shapes/svg?seed=" + a.patientId?.name} className="w-20 h-20 rounded-[2.2rem] object-cover border-4 border-sky-50 group-hover:border-emerald-100 transition-all" alt="" />
                          <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 border-white ${a.status === 'confirmed' ? 'bg-emerald-500 shadow-emerald-500/50 shadow-lg' : 'bg-sky-400 animate-pulse'}`}></div>
                      </div>
                      <div>
                        <p className="font-black text-slate-800 text-2xl tracking-tight">{a.patientId?.name}</p>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="text-[11px] text-slate-400 font-black uppercase tracking-widest">{new Date(a.date).toLocaleDateString()}</span>
                            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                            <span className="text-[11px] text-emerald-500 font-black uppercase tracking-widest">{a.time}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      {a.status === "pending" ? (
                          <button onClick={() => updateStatus(a._id, "confirm")} className="bg-emerald-600 hover:bg-emerald-500 text-white px-10 py-4 rounded-[1.8rem] text-[11px] font-black shadow-2xl shadow-emerald-500/20 active:scale-95 transition-all uppercase tracking-widest">Confirm</button>
                      ) : (
                          <span className="text-[10px] font-black uppercase px-8 py-3.5 rounded-[1.5rem] bg-emerald-50 text-emerald-600 border border-emerald-100 tracking-[0.2em]">{a.status}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* NOTIFICATIONS TAB */}
            {activeTab === "notifications" && (
              <div className="space-y-8 animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-12">
                  <h2 className="text-5xl font-black text-slate-900 tracking-tighter">Activity</h2>
                  {notifications.some(n => n.isRead) && (
                    <button onClick={clearReadNotifications} className="text-[11px] font-black text-red-400 hover:bg-red-50 px-8 py-3.5 rounded-2xl border border-red-100 transition-all uppercase">Flush History</button>
                  )}
                </div>
                <div className="grid gap-6">
                {notifications.length === 0 ? <p className="text-slate-300 font-black py-20 text-center uppercase tracking-widest">System quiet...</p> : 
                  notifications.map((n) => (
                    <div key={n._id} onClick={() => markAsRead(n)} className={`p-10 rounded-[3.5rem] border transition-all ${n.isRead ? "bg-white/30 border-slate-50 opacity-50" : "bg-white border-white shadow-xl shadow-sky-900/5 hover:scale-[1.01]"}`}>
                      <div className="flex justify-between items-center">
                        <div className="flex gap-6 items-center">
                          <div className={`w-3 h-3 rounded-full ${n.isRead ? "bg-slate-200" : "bg-emerald-500 shadow-lg shadow-emerald-500/50"}`}></div>
                          <div>
                              <p className="text-[12px] font-black text-slate-800 uppercase tracking-widest">{n.title}</p>
                              <p className="text-[16px] text-slate-500 mt-2 font-bold">{n.message}</p>
                          </div>
                        </div>
                        {!n.isRead && <span className="bg-emerald-500 text-white px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-tighter">Live Alert</span>}
                      </div>
                    </div>
                  ))
                }
                </div>
              </div>
            )}

            {/* CHAT TAB */}
            {activeTab === "chat" && (
              <div className="flex h-[700px] gap-10 animate-in slide-in-from-left-12 duration-700">
                <div className="w-1/3 bg-white/40 border border-white rounded-[3.5rem] overflow-hidden flex flex-col shadow-inner">
                  <div className="p-8 bg-white/50 border-b border-sky-50 text-[12px] font-black text-sky-400 uppercase tracking-[0.3em]">Patient Directory</div>
                  <div className="overflow-y-auto flex-1 p-4 space-y-3 custom-scrollbar">
                      {uniquePatients.map(p => (
                      <div key={p._id} onClick={() => setSelectedPatient(p)} className={`p-6 rounded-[2rem] cursor-pointer transition-all flex items-center gap-5 ${selectedPatient?._id === p._id ? "bg-emerald-600 text-white shadow-2xl shadow-emerald-600/30 scale-105 z-10" : "hover:bg-white text-slate-500"}`}>
                          <div className={`w-10 h-10 rounded-[1rem] flex items-center justify-center font-black text-sm ${selectedPatient?._id === p._id ? "bg-white/20" : "bg-sky-100 text-sky-600"}`}>{p.name.charAt(0)}</div>
                          <p className="text-[15px] font-black tracking-tight uppercase">{p.name}</p>
                      </div>
                      ))}
                  </div>
                </div>
                <div className="flex-1">
                  {selectedPatient ? <ChatBox doctorId={doctor?._id || doctor?.id} patient={selectedPatient} mainSocket={socket} /> : 
                    <div className="h-full border-4 border-dashed border-sky-100/50 rounded-[4rem] flex flex-col items-center justify-center text-sky-200 gap-6">
                      <div className="w-20 h-20 bg-sky-50 rounded-full flex items-center justify-center text-4xl">🗨</div>
                      <p className="font-black text-[11px] uppercase tracking-[0.4em]">Initialize Session</p>
                    </div>
                  }
                </div>
              </div>
            )}

          </main>
        </div>
      </div>
    </div>
  );
}