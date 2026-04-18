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

  const [doctorProfile, setDoctorProfile] = useState(null);
  const [newDay, setNewDay] = useState({ date: "", nepaliDate: "", slots: "" });

  const token = localStorage.getItem("token");

  // Filtering for Earnings and Metrics
  const paidAppointments = appointments.filter(
    (a) => a.status === "confirmed" && a.paymentStatus === "paid"
  );
  const totalEarnings = paidAppointments.reduce((sum, app) => sum + (app.fee || 0), 0);

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

  const handleDeleteSchedule = async (dateToDelete) => {
    if (!window.confirm(`Are you sure you want to delete the schedule for ${dateToDelete}?`)) return;
    try {
      const encodedDate = encodeURIComponent(dateToDelete);
      await axios.delete(`http://localhost:5000/api/doctors/availability/${encodedDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchInitialData(); 
    } catch (err) {
      console.error("Delete Error:", err);
      alert("Failed to delete schedule.");
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAsRead = async (notification) => {
    try {
      await axios.put(`http://localhost:5000/api/notifications/${notification._id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications((prev) => 
        prev.map((n) => (n._id === notification._id ? { ...n, isRead: true } : n))
      );
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
    } catch (err) { 
      alert(err.response?.data?.message || "Action failed");
    }
  };

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
      <div className="flex flex-col h-[700px] bg-white border border-slate-100 rounded-[3rem] overflow-hidden shadow-2xl">
        <div className="p-7 bg-slate-900 text-white flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center font-bold text-xl shadow-lg shadow-emerald-500/20">
              {patient?.name?.charAt(0)}
            </div>
            <div>
               <h3 className="font-bold text-lg leading-tight">{patient?.name}</h3>
               <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Active Consultation</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={initiateVideoCall} className="bg-white/10 hover:bg-white/20 p-3 rounded-xl transition-all"><span className="text-xl">📹</span></button>
            <button onClick={() => fileInputRef.current.click()} className="bg-white/10 hover:bg-white/20 p-3 rounded-xl transition-all"><span className="text-xl">📎</span></button>
          </div>
          <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
        </div>
        <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/50 custom-scrollbar">
          {messages.map((msg, i) => {
            const isImage = msg.message.match(/\.(jpeg|jpg|gif|png|jfif|webp)$/i);
            const isVideoCall = msg.messageType === "video_call";
            const isMe = msg.senderId === doctorId;
            return (
              <div key={i} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] p-4 rounded-3xl shadow-sm ${isMe ? "bg-emerald-600 text-white rounded-tr-none" : "bg-white text-slate-700 rounded-tl-none border border-slate-100"}`}>
                  {isVideoCall ? (
                    <button onClick={() => window.open(`/video-call/${msg.message}`, "_blank")} className="bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-bold">JOIN VIDEO CALL</button>
                  ) : isImage ? (
                    <img src={msg.message} className="rounded-xl max-h-60" alt="" />
                  ) : (
                    <p className="text-sm font-medium">{msg.message}</p>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={scrollRef} />
        </div>
        <div className="p-5 bg-white border-t border-slate-100 flex gap-3">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder="Type your message..." className="flex-1 bg-slate-100 rounded-2xl px-5 outline-none font-medium text-slate-700" />
          <button onClick={() => handleSend()} className="bg-emerald-500 text-white p-4 rounded-2xl font-bold shadow-lg shadow-emerald-500/30">➤</button>
        </div>
      </div>
    );
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
      `}} />

      <div className="max-w-[1500px] mx-auto p-6 md:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Sidebar */}
          <aside className="lg:col-span-3 space-y-6">
            <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 text-center shadow-xl shadow-slate-200/50 relative overflow-hidden">
                {/* Visual Accent */}
                <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-emerald-500 to-sky-500 opacity-10"></div>
                
                <div className="relative pt-4">
                    <div className="relative inline-block">
                        <img src={getProfileImage()} className="w-28 h-28 rounded-full mx-auto object-cover border-4 border-white shadow-2xl" alt="Doctor" />
                        {doctorProfile?.isVerified && (
                             <div className="absolute bottom-1 right-1 bg-emerald-500 text-white w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] shadow-lg">✓</div>
                        )}
                    </div>
                    <h3 className="font-black text-xl text-slate-800 mt-5 tracking-tight">{doctorProfile?.userId?.name || doctor?.name}</h3>
                    <p className="text-[10px] text-emerald-600 font-black uppercase tracking-[0.2em] mt-2 bg-emerald-50 inline-block px-4 py-1.5 rounded-full">{doctorProfile?.specialty || "Practitioner"}</p>
                </div>
            </div>

            <nav className="bg-white border border-slate-200 rounded-[2.5rem] p-3 shadow-xl shadow-slate-200/50">
              {[
                { id: "profile", label: "Overview", icon: "📊" },
                { id: "availability", label: "My Timing", icon: "🕒" },
                { id: "appointments", label: "Patients", icon: "👥" },
                { id: "earnings", label: "Revenue", icon: "💳" },
                { id: "notifications", label: "Alerts", icon: "🔔", badge: unreadCount },
                { id: "chat", label: "Consult", icon: "💬" }
              ].map((t) => (
                <button 
                  key={t.id} 
                  onClick={() => setActiveTab(t.id)} 
                  className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all duration-300 mb-1 ${
                    activeTab === t.id 
                    ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span className="flex items-center gap-4">
                    <span className="text-xl">{t.icon}</span> 
                    <span className="text-sm font-bold tracking-tight">{t.label}</span>
                  </span>
                  {t.badge > 0 && (
                    <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-lg font-black">{t.badge}</span>
                  )}
                </button>
              ))}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-9 bg-white border border-slate-200 rounded-[3rem] p-8 md:p-12 shadow-2xl shadow-slate-200/60 min-h-[800px]">
            
            {activeTab === "profile" && (
              <div className="animate-in fade-in duration-700">
                {/* Verification Hero Card */}
                <div className={`mb-10 p-8 rounded-[2rem] flex items-center justify-between transition-all ${
                  doctorProfile?.isVerified 
                  ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-xl shadow-emerald-500/20" 
                  : "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-xl shadow-amber-500/20"
                }`}>
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-3xl">
                      {doctorProfile?.isVerified ? "🛡️" : "⌛"}
                    </div>
                    <div>
                      <h3 className="text-2xl font-black tracking-tight leading-none">
                        {doctorProfile?.isVerified ? "Verified Account" : "Review in Progress"}
                      </h3>
                      <p className="text-white/80 text-xs font-bold uppercase tracking-widest mt-2">
                        {doctorProfile?.isVerified ? "Your medical profile is officially active" : "Our admins are currently checking your license"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <div className="p-7 bg-slate-50 border border-slate-100 rounded-[2rem] hover:scale-[1.02] transition-transform">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Visits</p>
                        <p className="text-4xl font-black mt-2 text-slate-800">{appointments.length}</p>
                    </div>
                    <div className="p-7 bg-slate-50 border border-slate-100 rounded-[2rem] hover:scale-[1.02] transition-transform">
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Unread Alerts</p>
                        <p className="text-4xl font-black mt-2 text-slate-800">{unreadCount}</p>
                    </div>
                    <div className="p-7 bg-slate-900 rounded-[2rem] text-white hover:scale-[1.02] transition-transform shadow-xl shadow-slate-900/20">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Revenue</p>
                        <p className="text-4xl font-black mt-2 tracking-tighter">Rs. {totalEarnings}</p>
                    </div>
                </div>

                {/* Information Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="text-sm font-black uppercase tracking-widest text-slate-400 px-2">Medical Profile</h4>
                    <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 space-y-4">
                        <div className="flex justify-between border-b border-slate-100 pb-3"><span className="text-xs font-bold text-slate-500">Full Name</span><span className="text-sm font-black">{doctorProfile?.userId?.name}</span></div>
                        <div className="flex justify-between border-b border-slate-100 pb-3"><span className="text-xs font-bold text-slate-500">License ID</span><span className="text-sm font-black text-emerald-600">{doctorProfile?.nmcId}</span></div>
                        <div className="flex justify-between"><span className="text-xs font-bold text-slate-500">Field</span><span className="text-sm font-black uppercase">{doctorProfile?.specialty}</span></div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-sm font-black uppercase tracking-widest text-slate-400 px-2">Contact Details</h4>
                    <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 space-y-4">
                        <div className="flex justify-between border-b border-slate-100 pb-3"><span className="text-xs font-bold text-slate-500">Email Address</span><span className="text-sm font-black">{doctorProfile?.userId?.email}</span></div>
                        <div className="flex justify-between border-b border-slate-100 pb-3"><span className="text-xs font-bold text-slate-500">Phone</span><span className="text-sm font-black">{doctorProfile?.phone}</span></div>
                        <div className="flex justify-between"><span className="text-xs font-bold text-slate-500">Status</span><span className="text-[10px] font-black bg-emerald-500 text-white px-3 py-1 rounded-lg uppercase">Active</span></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "appointments" && (
              <div className="animate-in slide-in-from-right-10 duration-500">
                <header className="flex justify-between items-center mb-10">
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight">Patient Queue</h2>
                    <span className="bg-slate-100 px-4 py-2 rounded-xl text-xs font-black text-slate-500">{appointments.length} Total</span>
                </header>
                <div className="grid gap-4">
                  {appointments.map((a) => (
                    <div key={a._id} className="p-6 bg-white border border-slate-100 rounded-[2rem] flex items-center justify-between hover:border-emerald-200 transition-all shadow-sm">
                      <div className="flex items-center gap-5">
                        <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${a.patientId?.name}`} className="w-14 h-14 rounded-2xl object-cover bg-slate-100" alt="" />
                        <div>
                          <p className="font-black text-slate-800 text-lg leading-none">{a.patientId?.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">{new Date(a.date).toDateString()} at {a.time}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {a.status === "pending" ? (
                          <>
                            <button onClick={() => updateStatus(a._id, "cancel")} className="bg-rose-50 text-rose-500 px-6 py-3 rounded-xl text-[10px] font-black uppercase border border-rose-100">Decline</button>
                            <button onClick={() => updateStatus(a._id, "confirm")} className="bg-emerald-500 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-emerald-500/20">Accept</button>
                          </>
                        ) : (
                          <span className={`text-[10px] font-black uppercase px-5 py-2.5 rounded-xl border ${
                            a.status === 'confirmed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                          }`}>{a.status}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "availability" && (
              <div className="animate-in fade-in duration-500">
                <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-10">Scheduling</h2>
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
                  <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
                      <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6">Create New Slot</h4>
                      <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Date (English)</label>
                            <input type="date" value={newDay.date} onChange={e => setNewDay({...newDay, date: e.target.value})} className="w-full p-4 rounded-2xl border border-slate-200 outline-none font-bold text-sm focus:ring-4 ring-emerald-500/5 transition-all" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Date (Local)</label>
                            <input type="text" placeholder="2080-XX-XX" value={newDay.nepaliDate} onChange={e => setNewDay({...newDay, nepaliDate: e.target.value})} className="w-full p-4 rounded-2xl border border-slate-200 outline-none font-bold text-sm" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Available Slots</label>
                            <textarea placeholder="e.g. 10:00 AM, 11:30 AM" value={newDay.slots} onChange={e => setNewDay({...newDay, slots: e.target.value})} className="w-full p-4 rounded-2xl border border-slate-200 outline-none font-bold text-sm min-h-[100px]" />
                        </div>
                        <button onClick={handleSaveSchedule} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-900/20">Save Schedule</button>
                      </div>
                  </div>
                  <div className="xl:col-span-2 space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 px-2">Upcoming Timeline</h4>
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                        {doctorProfile?.availability?.map((day, idx) => (
                          <div key={idx} className="p-6 border border-slate-100 rounded-[2rem] bg-slate-50/30 group">
                            <div className="flex justify-between items-center mb-4">
                              <div>
                                  <p className="text-lg font-black text-slate-800">{day.date}</p>
                                  <p className="text-[9px] text-emerald-500 font-bold uppercase">{day.nepaliDate}</p>
                              </div>
                              <button onClick={() => handleDeleteSchedule(day.date)} className="opacity-0 group-hover:opacity-100 bg-rose-50 text-rose-500 px-3 py-1.5 rounded-lg text-[9px] font-black transition-all uppercase">Delete</button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {day.slots.map((slot, sIdx) => (
                                <span key={sIdx} className={`text-[10px] px-3 py-1.5 rounded-xl font-bold border ${slot.isBooked ? "bg-rose-50 text-rose-300 border-rose-100" : "bg-white text-slate-600 border-slate-200"}`}>{slot.time}</span>
                              ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "earnings" && (
              <div className="animate-in fade-in duration-500">
                <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-10">Revenue Overview</h2>
                <div className="bg-slate-900 p-10 rounded-[2.5rem] text-white flex items-center justify-between shadow-2xl shadow-slate-900/30 mb-10">
                    <div>
                        <p className="text-xs font-bold text-white/50 uppercase tracking-widest">Available Balance</p>
                        <h3 className="text-5xl font-black mt-2 tracking-tighter">Rs. {totalEarnings}</h3>
                    </div>
                    <div className="bg-white/10 p-5 rounded-3xl border border-white/10 backdrop-blur-md">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Total Paid Invoices</p>
                        <p className="text-2xl font-black mt-1">{paidAppointments.length}</p>
                    </div>
                </div>
                <div className="space-y-4">
                   {paidAppointments.map((a) => (
                    <div key={a._id} className="p-6 bg-white border border-slate-100 rounded-[2rem] flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black text-xs text-slate-500">{a.patientId?.name?.charAt(0)}</div>
                        <div><p className="font-bold text-slate-800 text-sm">{a.patientId?.name}</p><p className="text-[10px] text-slate-400">{new Date(a.date).toDateString()}</p></div>
                      </div>
                      <div className="font-black text-emerald-600 text-sm">Rs. {a.fee}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "notifications" && (
              <div className="animate-in zoom-in-95 duration-500">
                <div className="flex justify-between items-center mb-10">
                  <h2 className="text-4xl font-black text-slate-900 tracking-tight">System Alerts</h2>
                  <button onClick={clearReadNotifications} className="text-[10px] font-black text-rose-500 bg-rose-50 px-5 py-2.5 rounded-xl border border-rose-100 uppercase transition-all hover:bg-rose-500 hover:text-white">Clear All</button>
                </div>
                <div className="space-y-3">
                  {notifications.map((n) => (
                    <div key={n._id} onClick={() => markAsRead(n)} className={`p-6 rounded-[2rem] border transition-all cursor-pointer ${n.isRead ? "bg-slate-50/50 border-slate-100 opacity-60" : "bg-white border-sky-100 shadow-lg shadow-sky-500/5 ring-1 ring-sky-50"}`}>
                      <p className="text-xs font-black uppercase tracking-widest text-sky-600">{n.title}</p>
                      <p className="text-sm text-slate-600 mt-2 font-medium">{n.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "chat" && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 h-full animate-in fade-in duration-500">
                <aside className="md:col-span-4 space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 px-2">Select Patient</h4>
                  <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    {uniquePatients.map((p) => (
                      <button key={p._id} onClick={() => setSelectedPatient(p)} className={`w-full p-5 rounded-[2rem] border transition-all flex items-center gap-4 ${selectedPatient?._id === p._id ? "bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-900/20" : "bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100"}`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${selectedPatient?._id === p._id ? "bg-white/20" : "bg-white shadow-sm"}`}>{p.name.charAt(0)}</div>
                        <p className="font-bold text-sm tracking-tight">{p.name}</p>
                      </button>
                    ))}
                  </div>
                </aside>
                <div className="md:col-span-8">
                  {selectedPatient ? (
                    <ChatBox doctorId={doctor?._id || doctor?.id} patient={selectedPatient} mainSocket={socket} />
                  ) : (
                    <div className="h-[600px] bg-slate-50 rounded-[3rem] border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300">
                        <span className="text-5xl mb-4">💬</span>
                        <p className="font-black uppercase tracking-widest text-[10px]">Select a patient to begin</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}