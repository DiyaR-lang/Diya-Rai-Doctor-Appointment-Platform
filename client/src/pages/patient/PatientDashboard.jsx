import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import { 
  User, Calendar, Bell, MessageSquare, LogOut, 
  Video, Image as ImageIcon, Send, Clock, CheckCircle2, 
  Activity, Droplets, Scale, ShieldCheck, X, Trash2, Camera, Edit3, Save, Receipt
} from "lucide-react";

export default function PatientDashboard() {
  const [activeTab, setActiveTab] = useState("profile");
  const [appointments, setAppointments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [patient, setPatient] = useState(null);
  const [socket, setSocket] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  
  // ✅ RECEIPT STATES
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // ✅ PROFILE EDITING STATES
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ 
    name: "", bloodGroup: "", weight: "", heartRate: "" 
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const profileUploadRef = useRef();

  const token = localStorage.getItem("token");

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || !token) return;
    setPatient(user);

    setFormData({
      name: user.name || "",
      bloodGroup: user.bloodGroup || "",
      weight: user.weight || "",
      heartRate: user.heartRate || ""
    });

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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUpdateProfile = async () => {
    const data = new FormData();
    data.append("name", formData.name);
    data.append("bloodGroup", formData.bloodGroup);
    data.append("weight", formData.weight);
    data.append("heartRate", formData.heartRate);
    if (selectedFile) data.append("image", selectedFile);

    try {
      const res = await axios.put("http://localhost:5000/api/auth/update-profile", data, {
        headers: { 
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}` 
        }
      });
      
      const updatedUser = res.data.user;
      setPatient(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser)); 
      setIsEditing(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      alert("Profile updated successfully!");
    } catch (err) {
      alert("Update failed. Check console.");
      console.error(err);
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
      if (notification.type === "appointment_confirmed" || notification.type === "appointment_status") {
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

  // --- CHAT BOX LOGIC ---
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
              {doctor?.userId?.image ? <img src={`http://localhost:5000${doctor.userId.image}`} alt="Dr" className="w-full h-full object-cover" /> : doctor?.userId?.name?.charAt(0)}
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
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-200/50 text-center relative">
            <div className="relative inline-block">
                <img 
                  src={previewUrl || (patient?.image ? `http://localhost:5000${patient.image}` : "https://cdn-icons-png.flaticon.com/512/3135/3135715.png")} 
                  className="w-24 h-24 rounded-3xl mx-auto object-cover mb-4 ring-4 ring-sky-50 shadow-md" 
                  alt="Profile" 
                />
                {isEditing && (
                    <button 
                        onClick={() => profileUploadRef.current.click()}
                        className="absolute bottom-4 right-0 bg-sky-600 text-white p-2 rounded-xl shadow-lg hover:bg-sky-700 transition-all"
                    >
                        <Camera size={14}/>
                    </button>
                )}
                <input type="file" ref={profileUploadRef} className="hidden" onChange={handleFileChange} accept="image/*" />
            </div>
            <h3 className="font-bold text-xl text-slate-900">{patient?.name}</h3>
            <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-widest flex items-center justify-center gap-1">
              <ShieldCheck size={14} className="text-emerald-500"/> Patient Verified
            </p>
          </div>

          <nav className="bg-white/80 backdrop-blur-md rounded-[2rem] p-2 shadow-sm border border-slate-200/60">
            {[
              { id: "profile", label: "Dashboard", icon: <Activity size={18}/> },
              { id: "appointments", label: "My Visits", icon: <Calendar size={18}/> },
              { id: "receipts", label: "Receipts", icon: <Receipt size={18}/> },
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
              <header className="flex justify-between items-center">
                <h2 className="text-4xl font-black text-slate-900 tracking-tight">Your <span className="text-sky-600">Health Card</span></h2>
                <button 
                  onClick={() => isEditing ? handleUpdateProfile() : setIsEditing(true)}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl font-bold transition-all shadow-sm ${isEditing ? "bg-emerald-500 text-white hover:bg-emerald-600" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                >
                  {isEditing ? <><Save size={18}/> Save Changes</> : <><Edit3 size={18}/> Edit Profile</>}
                </button>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex flex-col gap-3">
                  <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-rose-500"><Droplets/></div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Blood Group</p>
                    {isEditing ? (
                        <select 
                            className="w-full bg-white border rounded-lg p-1 mt-1 font-bold outline-none border-sky-200"
                            value={formData.bloodGroup}
                            onChange={(e) => setFormData({...formData, bloodGroup: e.target.value})}
                        >
                            <option value="">Select</option>
                            {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    ) : <p className="font-bold text-xl">{patient?.bloodGroup || "Not Set"}</p>}
                  </div>
                </div>

                <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex flex-col gap-3">
                  <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-sky-500"><Scale/></div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Weight Status</p>
                    {isEditing ? (
                        <input 
                            type="text" className="w-full bg-white border rounded-lg p-1 mt-1 font-bold outline-none border-sky-200"
                            value={formData.weight}
                            onChange={(e) => setFormData({...formData, weight: e.target.value})}
                        />
                    ) : <p className="font-bold text-xl">{patient?.weight || "0"} KG</p>}
                  </div>
                </div>

                <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex flex-col gap-3">
                  <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-emerald-500"><Activity/></div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Heart Rate</p>
                    {isEditing ? (
                        <input 
                            type="text" className="w-full bg-white border rounded-lg p-1 mt-1 font-bold outline-none border-sky-200"
                            value={formData.heartRate}
                            onChange={(e) => setFormData({...formData, heartRate: e.target.value})}
                        />
                    ) : <p className="font-bold text-xl">{patient?.heartRate || "0"} BPM</p>}
                  </div>
                </div>
              </div>

              <div className="p-8 bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                <h4 className="text-sky-400 font-bold text-xs uppercase tracking-[0.2em] mb-6 relative z-10">Patient Identification</h4>
                <div className="grid md:grid-cols-2 gap-8 relative z-10">
                  <div>
                    <p className="text-slate-500 text-[10px] font-bold uppercase">Official Name</p>
                    {isEditing ? (
                        <input 
                            type="text" className="bg-slate-700 text-white border-none rounded-lg p-2 mt-1 w-full outline-none focus:ring-2 focus:ring-sky-500"
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                        />
                    ) : <p className="text-xl font-bold tracking-wide mt-1">{patient?.name}</p>}
                  </div>
                  <div>
                    <p className="text-slate-500 text-[10px] font-bold uppercase">Email Account</p>
                    <p className="text-xl font-bold tracking-wide mt-1 opacity-80">{patient?.email}</p>
                  </div>
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
                      {a.status === "confirmed" && (
                        <button 
                          onClick={() => { setActiveTab("receipts"); setSelectedReceipt(a); }}
                          className="text-[10px] font-black text-sky-500 hover:bg-sky-50 px-3 py-2 rounded-xl border border-sky-100 transition-all uppercase"
                        >
                          RECEIPT
                        </button>
                      )}
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

          {/* ✅ NEW: RECEIPTS TAB CONTENT */}
          {activeTab === "receipts" && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <h2 className="text-3xl font-black text-slate-900">Billing & <span className="text-sky-600">Receipts</span></h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {appointments.filter(a => a.status === "confirmed").map((appt) => (
                  <div key={appt._id} className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 relative overflow-hidden group">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Invoice #{appt._id.slice(-6).toUpperCase()}</p>
                    <p className="font-bold text-slate-800">Consultation: Dr. {appt.doctorId?.userId?.name}</p>
                    <p className="text-xs text-slate-500 mb-4">{new Date(appt.date).toLocaleDateString()}</p>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[10px] font-black text-emerald-600 uppercase">Amount Paid</p>
                        <p className="text-xl font-black text-slate-900">Rs. {appt.fee || appt.doctorId?.fee || "500"}</p>
                      </div>
                      <button 
                        onClick={() => setSelectedReceipt(appt)}
                        className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                      >
                        DETAILS
                      </button>
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

      {/* ✅ VIRTUAL RECEIPT MODAL */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl relative animate-in zoom-in duration-300">
            <button onClick={() => setSelectedReceipt(null)} className="absolute top-6 right-6 text-slate-300 hover:text-slate-900 text-2xl">×</button>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-sky-600 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white text-3xl font-bold">P</div>
              <h3 className="text-xl font-black tracking-tighter">PRESCRIPTO MEDICAL</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Payment Receipt</p>
            </div>
            <div className="space-y-4 border-t border-b border-slate-100 py-6 mb-6">
              <div className="flex justify-between text-sm"><span className="text-slate-400">Patient:</span><span className="font-bold">{patient?.name}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-400">Doctor:</span><span className="font-bold">Dr. {selectedReceipt.doctorId?.userId?.name}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-400">Date:</span><span className="font-bold">{new Date(selectedReceipt.date).toLocaleDateString()}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-400">ID:</span><span className="font-bold font-mono text-[10px] uppercase">#{selectedReceipt._id.slice(-8)}</span></div>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl flex justify-between items-center mb-8">
              <span className="font-black text-slate-500 uppercase text-xs">Total Charged</span>
              <span className="font-black text-2xl text-emerald-600">Rs. {selectedReceipt.fee || selectedReceipt.doctorId?.fee || "500"}</span>
            </div>
            <button onClick={() => window.print()} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-sky-600 transition-all">
              Print Receipt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}