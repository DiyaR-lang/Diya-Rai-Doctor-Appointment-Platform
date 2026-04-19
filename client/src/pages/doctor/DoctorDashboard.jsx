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

  // Filtering paid appointments for revenue
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

  // ============================
  // SOCKET & INITIALIZATION
  // ============================
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
      // SUCCESS: Joins room using the Account ID (6982...)
      newSocket.emit("join_user", user._id || user.id);
      console.log("Joined Notification Room:", user._id);
    });

    // Real-time Notification Listener
    newSocket.on("new_notification", (notif) => {
      setNotifications((prev) => [notif, ...prev]);
    });

    // Real-time Appointment Refresh (e.g., when payment is verified)
    newSocket.on("new_appointment", (appt) => {
      setAppointments((prev) => {
        const exists = prev.find(a => a._id === appt._id);
        if (exists) return prev.map(a => a._id === appt._id ? appt : a);
        return [appt, ...prev];
      });
    });

    fetchInitialData();

    return () => { if (newSocket) newSocket.disconnect(); };
  }, []);

  const fetchInitialData = async () => {
    try {
      // 1. Fetch Appointments (Backend queries by Profile ID internally)
      const apptRes = await axios.get("http://localhost:5000/api/appointments/doctor/my", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAppointments(apptRes.data);

      // 2. Fetch Notifications (Backend queries by User Account ID)
      const notifRes = await axios.get("http://localhost:5000/api/notifications/my", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(notifRes.data);

      // 3. Fetch Profile
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

  // ============================
  // LOGIC HANDLERS
  // ============================
  const handleSaveSchedule = async () => {
    if (!newDay.date || !newDay.slots) return alert("Fill English date and slots");
    try {
      const slotArray = newDay.slots.split(",").map(s => s.trim());
      await axios.post("http://localhost:5000/api/doctors/availability", {
        doctorId: doctorProfile._id,
        date: newDay.date,
        nepaliDate: newDay.nepaliDate,
        slots: slotArray
      }, { headers: { Authorization: `Bearer ${token}` } });
      alert("Schedule Updated!");
      setNewDay({ date: "", nepaliDate: "", slots: "" });
      fetchInitialData();
    } catch (err) { alert("Error saving schedule."); }
  };

  const handleDeleteSchedule = async (dateToDelete) => {
    if (!window.confirm(`Delete schedule for ${dateToDelete}?`)) return;
    try {
      const encodedDate = encodeURIComponent(dateToDelete);
      await axios.delete(`http://localhost:5000/api/doctors/availability/${encodedDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchInitialData(); 
    } catch (err) { alert("Failed to delete."); }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAsRead = async (notification) => {
    if (notification.isRead) return;
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
    } catch (err) { alert(err.response?.data?.message || "Action failed"); }
  };

  // ============================
  // CHAT BOX SUB-COMPONENT
  // ============================
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
      <div className="flex flex-col h-[650px] bg-white border border-sky-100 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="p-6 bg-sky-600 text-white flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center font-bold">{patient?.name?.charAt(0)}</div>
            <div>
               <h3 className="font-bold text-base leading-tight">{patient?.name}</h3>
               <p className="text-[9px] text-sky-100 font-bold uppercase tracking-widest">Active Consultation</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={initiateVideoCall} className="hover:bg-white/20 p-2 rounded-lg transition-all text-xl">📹</button>
            <button onClick={() => fileInputRef.current.click()} className="hover:bg-white/20 p-2 rounded-lg transition-all text-xl">📎</button>
          </div>
          <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-sky-50/20 custom-scrollbar">
          {messages.map((msg, i) => {
            const isImage = msg.message.match(/\.(jpeg|jpg|gif|png|jfif|webp)$/i);
            const isVideoCall = msg.messageType === "video_call";
            const isMe = msg.senderId === doctorId;
            return (
              <div key={i} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] p-4 rounded-2xl shadow-sm ${isMe ? "bg-sky-500 text-white rounded-tr-none" : "bg-white text-slate-700 rounded-tl-none border border-sky-50"}`}>
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
        <div className="p-4 bg-white border-t border-sky-50 flex gap-2">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder="Type your message..." className="flex-1 bg-sky-50 rounded-xl px-4 outline-none font-medium text-slate-700" />
          <button onClick={() => handleSend()} className="bg-sky-500 text-white p-3 rounded-xl font-bold shadow-lg shadow-sky-500/20">➤</button>
        </div>
      </div>
    );
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-sky-50">
        <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F0F9FF] text-slate-800 font-sans selection:bg-sky-100">
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #BAE6FD; border-radius: 10px; }
      `}} />

      <div className="max-w-[1400px] mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* SIDEBAR */}
          <aside className="lg:col-span-3 space-y-4">
            <div className="bg-white border border-sky-100 rounded-[2rem] p-6 text-center shadow-lg shadow-sky-900/5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-br from-sky-400 to-sky-100 opacity-20"></div>
                <div className="relative pt-2">
                    <img src={getProfileImage()} className="w-24 h-24 rounded-full mx-auto object-cover border-4 border-white shadow-xl" alt="Doctor" />
                    <h3 className="font-bold text-xl text-slate-900 mt-4 tracking-tight">Dr. {doctorProfile?.userId?.name || doctor?.name}</h3>
                    <p className="text-[10px] text-sky-600 font-bold uppercase tracking-widest mt-1 bg-sky-50 inline-block px-3 py-1 rounded-lg">{doctorProfile?.specialty || "Practitioner"}</p>
                </div>
            </div>

            <nav className="bg-white/80 backdrop-blur-md border border-sky-100 rounded-[2rem] p-2 shadow-lg shadow-sky-900/5">
              {[
                { id: "profile", label: "Overview", icon: "📊" },
                { id: "availability", label: "My Timing", icon: "🕒" },
                { id: "appointments", label: "Patients", icon: "👥" },
                { id: "earnings", label: "Revenue", icon: "💰" },
                { id: "notifications", label: "Alerts", icon: "🔔", badge: unreadCount },
                { id: "chat", label: "Consult", icon: "💬" }
              ].map((t) => (
                <button key={t.id} onClick={() => setActiveTab(t.id)} className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl transition-all mb-1 ${activeTab === t.id ? "bg-sky-600 text-white shadow-md shadow-sky-200" : "text-slate-400 hover:bg-sky-50 hover:text-sky-600"}`}>
                  <span className="flex items-center gap-3">
                    <span className="text-lg">{t.icon}</span> 
                    <span className="text-sm font-bold">{t.label}</span>
                  </span>
                  {t.badge > 0 && <span className="bg-rose-500 text-white text-[9px] px-1.5 py-0.5 rounded-md font-bold">{t.badge}</span>}
                </button>
              ))}
            </nav>
          </aside>

          {/* MAIN CONTENT */}
          <main className="lg:col-span-9 bg-white border border-sky-100 rounded-[2.5rem] p-6 md:p-10 shadow-xl shadow-sky-900/5 min-h-[750px]">
            
            {activeTab === "profile" && (
              <div className="animate-in fade-in duration-500">
                <div className={`mb-8 p-6 rounded-3xl flex items-center gap-5 border ${doctorProfile?.isVerified ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"}`}>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${doctorProfile?.isVerified ? "bg-emerald-500" : "bg-amber-400"}`}>{doctorProfile?.isVerified ? "✅" : "⏳"}</div>
                  <div>
                    <h3 className={`font-bold text-lg ${doctorProfile?.isVerified ? "text-emerald-800" : "text-amber-800"}`}>{doctorProfile?.isVerified ? "Profile Verified" : "Verification in Progress"}</h3>
                    <p className={`text-xs font-medium opacity-80 ${doctorProfile?.isVerified ? "text-emerald-600" : "text-amber-600"}`}>{doctorProfile?.isVerified ? "Your account is visible to patients." : "Admins are reviewing your NMCID license."}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                    <StatCard label="Total Visits" count={appointments.length} icon="👨‍⚕️" color="bg-sky-100 text-sky-600" />
                    <StatCard label="Unread Alerts" count={unreadCount} icon="🔔" color="bg-rose-50 text-rose-500" />
                    <StatCard label="Revenue" count={`Rs. ${totalEarnings}`} icon="💰" color="bg-emerald-50 text-emerald-600" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InfoBox title="Medical Profile">
                    <InfoRow label="Dr. Name" value={doctorProfile?.userId?.name} />
                    <InfoRow label="License ID" value={doctorProfile?.nmcId} highlight />
                    <InfoRow label="Specialty" value={doctorProfile?.specialty} />
                  </InfoBox>
                  <InfoBox title="Contact Details">
                    <InfoRow label="Email" value={doctorProfile?.userId?.email} />
                    <InfoRow label="Phone" value={doctorProfile?.phone} />
                    <InfoRow label="Status" value="ACTIVE" badge />
                  </InfoBox>
                </div>
              </div>
            )}

            {activeTab === "appointments" && (
              <div className="animate-in slide-in-from-right-5">
                <h2 className="text-2xl font-bold mb-6 text-slate-900">Patient Queue</h2>
                <div className="space-y-3">
                  {appointments.map((a) => (
                    <div key={a._id} className="p-5 bg-sky-50/30 border border-sky-100 rounded-2xl flex items-center justify-between hover:bg-sky-50 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center font-bold text-sky-600">{a.patientId?.name?.charAt(0)}</div>
                        <div>
                          <p className="font-bold text-slate-800">{a.patientId?.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(a.date).toLocaleDateString()} • {a.time}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {a.status === "pending" ? (
                          <>
                            <button onClick={() => updateStatus(a._id, "cancel")} className="bg-rose-50 text-rose-500 px-4 py-2 rounded-xl text-[10px] font-bold uppercase">Decline</button>
                            <button onClick={() => updateStatus(a._id, "confirm")} className="bg-sky-600 text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase shadow-lg shadow-sky-200">Accept</button>
                          </>
                        ) : (
                          <span className={`text-[9px] font-bold uppercase px-4 py-2 rounded-lg ${a.status === 'confirmed' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>{a.status}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "availability" && (
                <div className="animate-in fade-in">
                    <h2 className="text-2xl font-bold mb-6 text-slate-900">Manage Timing</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-sky-50/50 p-6 rounded-3xl border border-sky-100">
                             <h4 className="text-xs font-bold text-sky-600 uppercase mb-4">Add Schedule</h4>
                             <div className="space-y-3">
                                <input type="date" value={newDay.date} onChange={e => setNewDay({...newDay, date: e.target.value})} className="w-full p-3 rounded-xl border border-sky-100 outline-none text-sm font-medium" />
                                <input type="text" placeholder="Nepali Date" value={newDay.nepaliDate} onChange={e => setNewDay({...newDay, nepaliDate: e.target.value})} className="w-full p-3 rounded-xl border border-sky-100 outline-none text-sm font-medium" />
                                <textarea placeholder="Slots (e.g. 10:00 AM, 02:00 PM)" value={newDay.slots} onChange={e => setNewDay({...newDay, slots: e.target.value})} className="w-full p-3 rounded-xl border border-sky-100 outline-none text-sm font-medium h-24" />
                                <button onClick={handleSaveSchedule} className="w-full bg-sky-600 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-sky-200">Update Slots</button>
                             </div>
                        </div>
                        <div className="space-y-3 overflow-y-auto max-h-[500px] custom-scrollbar pr-2">
                             {doctorProfile?.availability?.map((day, i) => (
                                 <div key={i} className="p-4 bg-white border border-sky-50 rounded-2xl shadow-sm group">
                                     <div className="flex justify-between items-center mb-2">
                                         <p className="font-bold text-slate-700">{day.date}</p>
                                         <button onClick={() => handleDeleteSchedule(day.date)} className="text-[10px] text-rose-500 opacity-0 group-hover:opacity-100 transition-all font-bold">DELETE</button>
                                     </div>
                                     <div className="flex flex-wrap gap-1.5">
                                         {day.slots.map((s, si) => <span key={si} className={`text-[9px] px-2 py-1 rounded-md ${s.isBooked ? 'bg-rose-50 text-rose-400' : 'bg-sky-50 text-sky-600'}`}>{s.time}</span>)}
                                     </div>
                                 </div>
                             ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "earnings" && (
                <div className="animate-in fade-in">
                    <h2 className="text-2xl font-bold mb-6 text-slate-900">Revenue Breakdown</h2>
                    <div className="bg-sky-600 p-8 rounded-[2rem] text-white shadow-xl shadow-sky-200 mb-8 flex justify-between items-center">
                        <div><p className="text-[10px] font-bold uppercase opacity-60">Total Earnings</p><p className="text-4xl font-bold">Rs. {totalEarnings}</p></div>
                        <div className="text-right"><p className="text-[10px] font-bold uppercase opacity-60">Success Rate</p><p className="text-xl font-bold">100%</p></div>
                    </div>
                    <div className="space-y-2">
                        {paidAppointments.map(app => (
                            <div key={app._id} className="p-4 bg-white border border-sky-50 rounded-2xl flex justify-between items-center text-sm">
                                <span className="font-bold text-slate-700">{app.patientId?.name}</span>
                                <span className="text-emerald-500 font-bold">Rs. {app.fee}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === "notifications" && (
                <div className="animate-in zoom-in-95">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-slate-900">Alerts</h2>
                        <button onClick={clearReadNotifications} className="text-[10px] font-bold text-rose-500 hover:underline">CLEAR READ</button>
                    </div>
                    <div className="space-y-3">
                        {notifications.length > 0 ? notifications.map(n => (
                            <div key={n._id} onClick={() => markAsRead(n)} className={`p-5 rounded-2xl border transition-all cursor-pointer ${n.isRead ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-sky-50 border-sky-200'}`}>
                                <p className="text-xs font-bold text-sky-700 uppercase">{n.title}</p>
                                <p className="text-sm text-slate-600 mt-1 font-medium">{n.message}</p>
                            </div>
                        )) : (
                          <div className="text-center py-10 text-slate-300 font-bold uppercase text-xs">No notifications yet</div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === "chat" && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-full animate-in fade-in">
                    <div className="md:col-span-4 space-y-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Patients</p>
                        {uniquePatients.map(p => (
                            <button key={p._id} onClick={() => setSelectedPatient(p)} className={`w-full p-4 rounded-2xl border flex items-center gap-3 transition-all ${selectedPatient?._id === p._id ? 'bg-sky-600 border-sky-600 text-white shadow-lg' : 'bg-white border-sky-50 text-slate-600'}`}>
                                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold text-xs">{p.name?.charAt(0)}</div>
                                <span className="font-bold text-sm truncate">{p.name}</span>
                            </button>
                        ))}
                    </div>
                    <div className="md:col-span-8">
                        {selectedPatient ? <ChatBox doctorId={doctor?._id || doctor?.id} patient={selectedPatient} mainSocket={socket} /> : <div className="h-[500px] border-2 border-dashed border-sky-100 rounded-[2.5rem] flex items-center justify-center text-sky-200 font-bold uppercase tracking-widest text-xs">Select a patient to start</div>}
                    </div>
                </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

// ============================
// HELPER COMPONENTS
// ============================
function StatCard({ label, count, icon, color }) {
  return (
    <div className="p-6 bg-white rounded-3xl border border-sky-50 shadow-sm flex items-center gap-4 group hover:scale-[1.02] transition-all">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${color}`}>{icon}</div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-xl font-bold text-slate-800">{count}</p>
      </div>
    </div>
  );
}

function InfoBox({ title, children }) {
  return (
    <div className="space-y-3">
      <h4 className="text-[10px] font-bold text-sky-600 uppercase tracking-widest px-2">{title}</h4>
      <div className="bg-sky-50/20 border border-sky-50 p-5 rounded-[2rem] space-y-3">{children}</div>
    </div>
  );
}

function InfoRow({ label, value, highlight, badge }) {
  return (
    <div className="flex justify-between items-center text-sm border-b border-sky-50/50 pb-2 last:border-0 last:pb-0">
      <span className="text-slate-400 font-medium">{label}</span>
      {badge ? (
        <span className="text-[9px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-md">ACTIVE</span>
      ) : (
        <span className={`font-bold ${highlight ? 'text-sky-600' : 'text-slate-700'}`}>{value || '---'}</span>
      )}
    </div>
  );
}