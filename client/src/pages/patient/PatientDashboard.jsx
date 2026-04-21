import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import { useSearchParams } from "react-router-dom";
import {
  User, Calendar, Bell, MessageSquare, LogOut,
  Video, Image as ImageIcon, Send, Clock, CheckCircle2,
  Activity, Droplets, Scale, ShieldCheck, X, Trash2, Camera, Edit3, Save,
  Receipt, CreditCard, Loader2, Hourglass
} from "lucide-react";

const API = "http://localhost:5000";

export default function PatientDashboard() {
  const [activeTab, setActiveTab] = useState("profile");
  const [appointments, setAppointments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [patient, setPatient] = useState(null);
  const [socket, setSocket] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  const [isPaying, setIsPaying] = useState(null);
  const [payLoading, setPayLoading] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "", bloodGroup: "", weight: "", heartRate: "",
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const profileUploadRef = useRef();

  const token = localStorage.getItem("token");

  // ── DERIVED LISTS ─────────────────────────────────────────────────────────
  // paid + confirmed → show in My Visits and Chat
  const confirmedAppointments = appointments.filter(
    (a) => a.status === "confirmed" && a.paymentStatus === "paid"
  );
  // unpaid pending → needs payment action
  const pendingPay = appointments.filter(
    (a) => a.paymentStatus === "pending" && a.status === "pending"
  );
  // paid but not yet confirmed by doctor
  const waitingForApproval = appointments.filter(
    (a) => a.paymentStatus === "paid" && a.status === "pending"
  );
  // all paid → receipts
  const paidAppointments = appointments.filter((a) => a.paymentStatus === "paid");

  // ── FETCH DATA ────────────────────────────────────────────────────────────
  const fetchData = async (authToken = token) => {
    try {
      const [apptRes, notifRes] = await Promise.all([
        // GET /api/appointments/my — patient route, returns all their appointments
        axios.get(`${API}/api/appointments/my`, {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
        axios.get(`${API}/api/notifications/my`, {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
      ]);

      setAppointments(apptRes.data);

      // Guard both bare array and { notifications: [] } response shapes
      const notifData = Array.isArray(notifRes.data)
        ? notifRes.data
        : notifRes.data?.notifications ?? [];
      setNotifications(notifData);
    } catch (err) {
      console.error("fetchData error:", err);
    }
  };

  // ── KHALTI RETURN VERIFICATION ────────────────────────────────────────────
  useEffect(() => {
    const pidx = searchParams.get("pidx");
    const status = searchParams.get("status");

    if (pidx && status === "Completed") {
      const verifyReturnPayment = async () => {
        try {
          const savedId = localStorage.getItem("pendingAppointmentId");
          const res = await axios.post(
            `${API}/api/payment/verifyKhalti`,
            { pidx, appointmentId: savedId },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (res.data.success) {
            localStorage.removeItem("pendingAppointmentId");
            setSearchParams({});
            await fetchData();
            if (socket) socket.emit("payment_completed", { appointmentId: savedId });
            alert("Payment Successful! Waiting for doctor approval.");
          }
        } catch (err) {
          console.error("Verification error:", err);
          alert("Payment verification failed. Please contact support.");
        }
      };
      verifyReturnPayment();
    }
  }, [searchParams, socket]);

  // ── SOCKET + INITIAL LOAD ─────────────────────────────────────────────────
  useEffect(() => {
    const t = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || !t) return;

    setPatient(user);
    setFormData({
      name: user.name || "",
      bloodGroup: user.bloodGroup || "",
      weight: user.weight || "",
      heartRate: user.heartRate || "",
    });

    const newSocket = io(API, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      reconnection: true,
    });
    setSocket(newSocket);

    newSocket.on("connect", () => {
      const roomId = user._id || user.id;
      console.log("Patient joining socket room:", roomId);
      newSocket.emit("join_user", roomId);
    });

    // Deduplicate incoming socket notifications
    newSocket.on("new_notification", (notif) => {
      setNotifications((prev) =>
        prev.some((n) => n._id === notif._id) ? prev : [notif, ...prev]
      );
    });

    // When a slot is booked elsewhere, refresh to stay in sync
    newSocket.on("slot_booked", () => fetchData(t));

    // When doctor confirms/cancels, refresh appointments
    newSocket.on("appointment_updated", () => fetchData(t));

    fetchData(t);

    return () => { if (newSocket) newSocket.disconnect(); };
  }, []);

  // ── NOTIFICATION ACTIONS ──────────────────────────────────────────────────
  const markAsRead = async (id) => {
    try {
      await axios.put(
        `${API}/api/notifications/${id}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error("markAsRead error:", err);
    }
  };

  const clearReadNotifications = async () => {
    if (!window.confirm("Clear all read notifications?")) return;
    try {
      await axios.delete(`${API}/api/notifications/clear-read`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.filter((n) => !n.isRead));
    } catch (err) {
      console.error("clearReadNotifications error:", err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;


  const handleFinalizePayment = async (appt) => {
    setPayLoading(true);
    try {
      const res = await axios.post(
        `${API}/api/payment/khalti/initiate`,
        { appointmentId: appt._id, amount: appt.fee || 500 },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success && res.data.payment_url) {
        localStorage.setItem("pendingAppointmentId", appt._id);
        window.location.href = res.data.payment_url;
      }
    } catch (err) {
      console.error("handleFinalizePayment error:", err);
      alert("Could not start payment. Please try again.");
    } finally {
      setPayLoading(false);
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
      const res = await axios.put(`${API}/api/auth/update-profile`, data, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });
      const updatedUser = res.data.user;
      setPatient(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setIsEditing(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      alert("Profile updated successfully!");
    } catch (err) {
      console.error("handleUpdateProfile error:", err);
      alert("Update failed.");
    }
  };


  const deleteAppointment = async (id) => {
    if (!window.confirm("Cancel this appointment?")) return;
    try {
      await axios.delete(`${API}/api/appointments/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAppointments((prev) => prev.filter((a) => a._id !== id));
    } catch (err) {
      console.error("deleteAppointment error:", err);
      alert(err.response?.data?.message || "Could not delete appointment.");
    }
  };

  // ── CHAT BOX ──────────────────────────────────────────────────────────────
  function ChatBox({ patientId, doctor, mainSocket }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const fileInputRef = useRef();
    const scrollRef = useRef();

    // Resolve the doctor's User._id (needed for socket room + message API)
    const doctorUserId =
      doctor?.userId?._id || doctor?.userId || doctor?._id;

    useEffect(() => {
      if (!patientId || !doctorUserId || !mainSocket) return;

      mainSocket.emit("join_room", { senderId: patientId, receiverId: doctorUserId });

      const handleReceive = (msg) => setMessages((prev) => [...prev, msg]);
      mainSocket.on("receive_message", handleReceive);

      axios
        .get(`${API}/api/messages/${patientId}/${doctorUserId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => setMessages(res.data))
        .catch((err) => console.error("load messages error:", err));

      return () => mainSocket.off("receive_message", handleReceive);
    }, [patientId, doctorUserId, mainSocket]);

    useEffect(() => {
      if (scrollRef.current)
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    const handleSend = (content, type = "text") => {
      const finalMsg = content || input;
      if (!finalMsg.trim()) return;
      const msgObj = {
        senderId: patientId,
        receiverId: doctorUserId,
        message: finalMsg,
        messageType: type,
        timestamp: new Date().toISOString(),
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
        const res = await axios.post(`${API}/api/chat/upload`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        });
        handleSend(res.data.url);
      } catch (err) {
        alert("Upload failed");
      }
    };

    return (
      <div className="flex flex-col h-full bg-white rounded-3xl overflow-hidden shadow-xl border border-slate-100">
        <div className="p-4 bg-sky-600 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-bold border border-white/30 overflow-hidden">
              {doctor?.userId?.image ? (
                <img
                  src={`${API}${doctor.userId.image}`}
                  alt="Dr"
                  className="w-full h-full object-cover"
                />
              ) : (
                doctor?.userId?.name?.charAt(0)
              )}
            </div>
            <div>
              <h3 className="font-bold text-sm">Dr. {doctor?.userId?.name}</h3>
              <p className="text-[10px] text-sky-100 uppercase tracking-widest font-semibold">
                Verified Professional
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={initiateVideoCall}
              className="p-2 hover:bg-white/10 rounded-xl transition-all"
            >
              <Video size={18} />
            </button>
            <button
              onClick={() => fileInputRef.current.click()}
              className="p-2 hover:bg-white/10 rounded-xl transition-all"
            >
              <ImageIcon size={18} />
            </button>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F8FAFC]">
          {messages.map((msg, i) => {
            const isImage = msg.message?.match(/\.(jpeg|jpg|gif|png|jfif|webp)$/i);
            const isVideoCall = msg.messageType === "video_call";
            const isMe = msg.senderId === (patient?._id || patient?.id);
            return (
              <div key={i} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] p-3 rounded-2xl ${
                    isMe
                      ? "bg-sky-600 text-white rounded-tr-none shadow-md"
                      : "bg-white border text-slate-800 rounded-tl-none shadow-sm"
                  }`}
                >
                  {isVideoCall ? (
                    <div className="text-center p-1">
                      <p className="text-[10px] font-bold uppercase mb-2">Video Link Sent</p>
                      <button
                        onClick={() => window.open(`/video-call/${msg.message}`, "_blank")}
                        className={`px-4 py-1.5 rounded-lg font-bold text-[10px] ${
                          isMe ? "bg-white text-sky-600" : "bg-sky-600 text-white"
                        }`}
                      >
                        JOIN CALL
                      </button>
                    </div>
                  ) : isImage ? (
                    <img
                      src={msg.message}
                      className="rounded-lg max-h-48 object-cover"
                      alt="attachment"
                    />
                  ) : (
                    <p className="text-sm leading-relaxed">{msg.message}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t bg-white flex gap-2 items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message..."
            className="flex-1 bg-slate-100 rounded-2xl px-5 py-3 text-sm outline-none border border-transparent focus:border-sky-300 transition-all"
          />
          <button
            onClick={() => handleSend()}
            className="bg-sky-600 text-white p-3 rounded-2xl hover:bg-sky-700 transition-all shadow-lg shadow-sky-100"
          >
            <Send size={20} />
          </button>
        </div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageUpload}
          className="hidden"
          accept="image/*"
        />
      </div>
    );
  }

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F4F7FA] p-4 md:p-6 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── SIDEBAR ──────────────────────────────────────────────────────── */}
        <aside className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-200/50 text-center relative">
            <div className="relative inline-block">
              <img
                src={
                  previewUrl ||
                  (patient?.image
                    ? `${API}${patient.image}`
                    : "https://cdn-icons-png.flaticon.com/512/3135/3135715.png")
                }
                className="w-24 h-24 rounded-3xl mx-auto object-cover mb-4 ring-4 ring-sky-50 shadow-md"
                alt="Profile"
              />
              {isEditing && (
                <button
                  onClick={() => profileUploadRef.current.click()}
                  className="absolute bottom-4 right-0 bg-sky-600 text-white p-2 rounded-xl shadow-lg hover:bg-sky-700 transition-all"
                >
                  <Camera size={14} />
                </button>
              )}
              <input
                type="file"
                ref={profileUploadRef}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    setSelectedFile(file);
                    setPreviewUrl(URL.createObjectURL(file));
                  }
                }}
                accept="image/*"
              />
            </div>
            <h3 className="font-bold text-xl text-slate-900">{patient?.name}</h3>
            <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-widest flex items-center justify-center gap-1">
              <ShieldCheck size={14} className="text-emerald-500" /> Patient Verified
            </p>
          </div>

          <nav className="bg-white/80 backdrop-blur-md rounded-[2rem] p-2 shadow-sm border border-slate-200/60">
            {[
              { id: "profile", label: "Dashboard", icon: <Activity size={18} /> },
              { id: "appointments", label: "My Visits", icon: <Calendar size={18} /> },
              { id: "receipts", label: "Receipts", icon: <Receipt size={18} /> },
              {
                id: "notifications",
                label: "Inbox",
                icon: <Bell size={18} />,
                badge: unreadCount,
              },
              { id: "chat", label: "Consultation", icon: <MessageSquare size={18} /> },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`w-full flex items-center justify-between px-5 py-4 my-1 rounded-2xl text-sm font-bold transition-all duration-300 ${
                  activeTab === t.id
                    ? "bg-sky-600 text-white shadow-lg shadow-sky-100"
                    : "text-slate-500 hover:bg-sky-50 hover:text-sky-600"
                }`}
              >
                <span className="flex items-center gap-4">
                  {t.icon} {t.label}
                </span>
                {t.badge > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse">
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
            <button
              onClick={() => { localStorage.clear(); window.location.href = "/login"; }}
              className="w-full flex items-center gap-4 px-5 py-4 text-sm font-bold text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"
            >
              <LogOut size={18} /> Logout
            </button>
          </nav>
        </aside>

        {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
        <main className="lg:col-span-9 bg-white rounded-[2.5rem] p-6 md:p-10 shadow-xl border border-slate-200/50 min-h-[720px]">

          {/* ── PROFILE TAB ── */}
          {activeTab === "profile" && (
            <div className="animate-in fade-in duration-500 space-y-8">
              <header className="flex justify-between items-center">
                <h2 className="text-4xl font-black text-slate-900 tracking-tight">
                  Your <span className="text-sky-600">Health Card</span>
                </h2>
                <button
                  onClick={() => (isEditing ? handleUpdateProfile() : setIsEditing(true))}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl font-bold transition-all shadow-sm ${
                    isEditing
                      ? "bg-emerald-500 text-white hover:bg-emerald-600"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {isEditing ? (
                    <><Save size={18} /> Save Changes</>
                  ) : (
                    <><Edit3 size={18} /> Edit Profile</>
                  )}
                </button>
              </header>

              {isEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: "Full Name", key: "name", type: "text" },
                    { label: "Blood Group", key: "bloodGroup", type: "text" },
                    { label: "Weight (KG)", key: "weight", type: "number" },
                    { label: "Heart Rate (BPM)", key: "heartRate", type: "number" },
                  ].map(({ label, key, type }) => (
                    <div key={key} className="flex flex-col gap-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {label}
                      </label>
                      <input
                        type={type}
                        value={formData[key]}
                        onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                        className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium outline-none focus:border-sky-400 transition-all"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex flex-col gap-3">
                    <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-rose-500"><Droplets /></div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Blood Group</p>
                      <p className="font-bold text-xl">{patient?.bloodGroup || "N/A"}</p>
                    </div>
                  </div>
                  <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex flex-col gap-3">
                    <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-sky-500"><Scale /></div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Weight</p>
                      <p className="font-bold text-xl">{patient?.weight || "0"} KG</p>
                    </div>
                  </div>
                  <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex flex-col gap-3">
                    <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-emerald-500"><Activity /></div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Heart Rate</p>
                      <p className="font-bold text-xl">{patient?.heartRate || "0"} BPM</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Pending payment banner */}
              {pendingPay.length > 0 && (
                <div className="bg-amber-50 border-2 border-dashed border-amber-200 rounded-[2rem] p-6">
                  <h4 className="flex items-center gap-2 text-amber-700 font-black text-xs uppercase tracking-widest mb-4">
                    <CreditCard size={16} /> Action Required: Finalize Booking
                  </h4>
                  <div className="space-y-3">
                    {pendingPay.map((a) => (
                      <div
                        key={a._id}
                        className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-amber-100"
                      >
                        <div className="flex flex-col">
                          <p className="text-sm font-bold text-slate-900">
                            Dr. {a.doctorId?.userId?.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">
                            {a.date} at {a.time}
                          </p>
                        </div>
                        <button
                          onClick={() => setIsPaying(a)}
                          className="bg-amber-500 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase hover:bg-amber-600 transition-all shadow-md shadow-amber-100"
                        >
                          PAY RS. {a.fee || "500"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Waiting for approval banner */}
              {waitingForApproval.length > 0 && (
                <div className="bg-sky-50 border border-sky-100 rounded-[2rem] p-6">
                  <h4 className="flex items-center gap-2 text-sky-700 font-black text-xs uppercase tracking-widest mb-4">
                    <Hourglass size={16} /> Waiting for Doctor Approval
                  </h4>
                  <div className="space-y-3">
                    {waitingForApproval.map((a) => (
                      <div
                        key={a._id}
                        className="flex items-center justify-between bg-white/60 p-4 rounded-2xl border border-sky-50"
                      >
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            Dr. {a.doctorId?.userId?.name}
                          </p>
                          <p className="text-[10px] text-sky-600 font-black uppercase">
                            Payment Confirmed · Pending Doctor Approval
                          </p>
                        </div>
                        <p className="text-[10px] text-sky-400 font-bold italic animate-pulse">
                          Processing...
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── APPOINTMENTS TAB ── */}
          {activeTab === "appointments" && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <h2 className="text-3xl font-black text-slate-900">
                My <span className="text-sky-600">Visits</span>
              </h2>

              {/* Waiting for approval section */}
              {waitingForApproval.length > 0 && (
                <div className="bg-sky-50 border border-sky-100 rounded-[2rem] p-6">
                  <h4 className="flex items-center gap-2 text-sky-700 font-black text-xs uppercase tracking-widest mb-4">
                    <Hourglass size={16} /> Waiting for Doctor's Approval
                  </h4>
                  <div className="space-y-3">
                    {waitingForApproval.map((a) => (
                      <div
                        key={a._id}
                        className="flex items-center justify-between bg-white/60 p-4 rounded-2xl border border-sky-50"
                      >
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            Dr. {a.doctorId?.userId?.name}
                          </p>
                          <p className="text-[10px] text-sky-600 font-black uppercase">
                            Payment Successful · Pending Confirmation
                          </p>
                        </div>
                        <p className="text-[10px] text-sky-400 italic font-bold animate-pulse">
                          Processing...
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending payment section */}
              {pendingPay.length > 0 && (
                <div className="bg-amber-50 border-2 border-dashed border-amber-200 rounded-[2rem] p-6">
                  <h4 className="flex items-center gap-2 text-amber-700 font-black text-xs uppercase tracking-widest mb-4">
                    <CreditCard size={16} /> Awaiting Payment
                  </h4>
                  <div className="space-y-3">
                    {pendingPay.map((a) => (
                      <div
                        key={a._id}
                        className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-amber-100"
                      >
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            Dr. {a.doctorId?.userId?.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">
                            {a.date} at {a.time}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setIsPaying(a)}
                            className="bg-amber-500 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase hover:bg-amber-600 transition-all"
                          >
                            PAY RS. {a.fee || "500"}
                          </button>
                          <button
                            onClick={() => deleteAppointment(a._id)}
                            className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Confirmed appointments */}
              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                  Confirmed Visits
                </h4>
                <div className="grid gap-4">
                  {confirmedAppointments.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50 rounded-[2.5rem] border border-dashed text-slate-300 font-bold uppercase tracking-widest text-xs">
                      No confirmed visits yet
                    </div>
                  ) : (
                    confirmedAppointments.map((a) => (
                      <div
                        key={a._id}
                        className="p-6 bg-white border border-slate-100 rounded-[2rem] flex items-center justify-between hover:shadow-xl transition-all duration-300"
                      >
                        <div className="flex items-center gap-5">
                          <div className="w-16 h-16 bg-sky-50 rounded-2xl overflow-hidden shadow-inner ring-2 ring-slate-50">
                            <img
                              src={
                                a.doctorId?.userId?.image
                                  ? `${API}${a.doctorId.userId.image}`
                                  : "https://cdn-icons-png.flaticon.com/512/387/387561.png"
                              }
                              className="w-full h-full object-cover"
                              alt="Doctor"
                            />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-lg">
                              Dr. {a.doctorId?.userId?.name}
                            </p>
                            <div className="flex items-center gap-3 mt-1 text-slate-400 font-semibold text-xs">
                              <span className="bg-slate-50 px-2 py-1 rounded-md flex items-center gap-1">
                                <Calendar size={12} /> {a.date}
                              </span>
                              <span className="bg-slate-50 px-2 py-1 rounded-md flex items-center gap-1">
                                <Clock size={12} /> {a.time}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-[10px] font-black uppercase px-4 py-2 rounded-full tracking-wider bg-emerald-500 text-white">
                            Confirmed
                          </span>
                          <button
                            onClick={() => deleteAppointment(a._id)}
                            className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                          >
                            <X size={20} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── RECEIPTS TAB ── */}
          {activeTab === "receipts" && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <h2 className="text-3xl font-black text-slate-900">
                Billing &amp; <span className="text-sky-600">Receipts</span>
              </h2>
              {paidAppointments.length === 0 ? (
                <div className="text-center py-20 text-slate-300 font-bold uppercase text-xs tracking-widest">
                  No paid appointments yet
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {paidAppointments.map((appt) => (
                    <div
                      key={appt._id}
                      className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 relative overflow-hidden group"
                    >
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-2">
                        Invoice #{appt._id.slice(-6).toUpperCase()}
                      </p>
                      <p className="font-bold text-slate-800">
                        Consultation: Dr. {appt.doctorId?.userId?.name}
                      </p>
                      <p className="text-xs text-slate-500 mb-4">{appt.date} · {appt.time}</p>
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[10px] font-black text-emerald-600 uppercase">
                            Amount Paid
                          </p>
                          <p className="text-xl font-black text-slate-900">Rs. {appt.fee || "500"}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${
                              appt.status === "confirmed"
                                ? "bg-emerald-100 text-emerald-600"
                                : "bg-sky-100 text-sky-600"
                            }`}
                          >
                            {appt.status}
                          </span>
                          <button
                            onClick={() => setSelectedReceipt(appt)}
                            className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                          >
                            DETAILS
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── CHAT TAB ── */}
          {activeTab === "chat" && (
            <div className="flex h-[620px] gap-6 animate-in fade-in duration-500">
              <div className="w-1/3 bg-slate-50/50 rounded-[2rem] border border-slate-100 overflow-hidden flex flex-col">
                <div className="p-5 bg-white border-b font-black text-[10px] text-slate-400 uppercase tracking-widest">
                  Confirmed Specialists
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {confirmedAppointments.length === 0 && (
                    <p className="text-center text-slate-300 text-xs font-bold uppercase py-8">
                      No confirmed doctors yet
                    </p>
                  )}
                  {confirmedAppointments.map((a) => (
                    <div
                      key={a._id}
                      onClick={() => setSelectedDoctor(a.doctorId)}
                      className={`p-4 rounded-2xl cursor-pointer transition-all flex items-center gap-4 ${
                        selectedDoctor?._id === a.doctorId._id
                          ? "bg-sky-600 text-white shadow-xl"
                          : "bg-white hover:bg-sky-50 text-slate-600 border border-slate-100"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold overflow-hidden bg-sky-100">
                        {a.doctorId?.userId?.image ? (
                          <img
                            src={`${API}${a.doctorId.userId.image}`}
                            className="w-full h-full object-cover"
                            alt=""
                          />
                        ) : (
                          a.doctorId?.userId?.name?.charAt(0)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">
                          Dr. {a.doctorId?.userId?.name}
                        </p>
                        <p className={`text-[9px] font-bold uppercase ${selectedDoctor?._id === a.doctorId._id ? "text-sky-200" : "text-slate-400"}`}>
                          {a.doctorId?.specialty || "Specialist"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex-1">
                {selectedDoctor ? (
                  <ChatBox
                    patientId={patient?._id || patient?.id}
                    doctor={selectedDoctor}
                    mainSocket={socket}
                  />
                ) : (
                  <div className="h-full border-4 border-dashed border-slate-50 rounded-[2.5rem] flex flex-col items-center justify-center text-slate-200 space-y-4">
                    <MessageSquare size={50} />
                    <p className="font-bold text-xs uppercase tracking-widest text-center px-10">
                      Select a confirmed specialist to start chat
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── NOTIFICATIONS TAB ── */}
          {activeTab === "notifications" && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-black text-slate-900">
                    Alert <span className="text-sky-600">Center</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    {unreadCount} unread · {notifications.length} total
                  </p>
                </div>
                {notifications.some((n) => n.isRead) && (
                  <button
                    onClick={clearReadNotifications}
                    className="text-[10px] font-black text-rose-500 hover:text-rose-700 uppercase tracking-widest flex items-center gap-1"
                  >
                    <Trash2 size={14} /> Clear Read
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {notifications.length === 0 ? (
                  <div className="text-center py-20 text-slate-300 font-bold uppercase text-xs tracking-widest">
                    No notifications yet
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n._id}
                      onClick={() => !n.isRead && markAsRead(n._id)}
                      className={`p-6 rounded-[2rem] border transition-all cursor-pointer relative overflow-hidden ${
                        n.isRead
                          ? "bg-slate-50/50 border-transparent opacity-60"
                          : "bg-white border-sky-100 shadow-lg shadow-sky-50 hover:shadow-xl"
                      }`}
                    >
                      {!n.isRead && (
                        <div className="absolute top-6 right-6 w-2 h-2 bg-sky-600 rounded-full animate-pulse" />
                      )}
                      <p className="text-sm font-bold text-slate-900">{n.title}</p>
                      <p className="text-xs text-slate-500 mt-2">{n.message}</p>
                      {n.createdAt && (
                        <p className="text-[9px] text-slate-400 mt-4 font-bold uppercase">
                          {new Date(n.createdAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── MODAL: PAYMENT CONFIRMATION ── */}
      {isPaying && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl relative animate-in zoom-in duration-300">
            <button
              onClick={() => setIsPaying(null)}
              className="absolute top-8 right-8 text-slate-300 hover:text-slate-900 text-2xl"
            >
              ×
            </button>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CreditCard size={32} />
              </div>
              <h3 className="text-xl font-black tracking-tight">Finalize Booking</h3>
            </div>
            <div className="space-y-4 border-t border-b border-slate-100 py-6 mb-8">
              <div className="flex justify-between text-sm text-slate-600 font-bold">
                <span>Doctor</span>
                <span className="text-slate-900">Dr. {isPaying.doctorId?.userId?.name}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600 font-bold">
                <span>Date</span>
                <span className="text-slate-900">{isPaying.date} at {isPaying.time}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600 font-bold">
                <span>Amount</span>
                <span className="text-sky-600">Rs. {isPaying.fee || 500}</span>
              </div>
            </div>
            <button
              onClick={() => handleFinalizePayment(isPaying)}
              disabled={payLoading}
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-sky-600 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {payLoading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                "PAY WITH KHALTI"
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL: RECEIPT VIEW ── */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl relative animate-in zoom-in duration-300">
            <button
              onClick={() => setSelectedReceipt(null)}
              className="absolute top-6 right-6 text-slate-300 hover:text-slate-900 text-2xl"
            >
              ×
            </button>
            <div className="text-center mb-8">
              <h3 className="text-xl font-black tracking-tighter uppercase">MediHub Nepal</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Payment Receipt
              </p>
            </div>
            <div className="space-y-4 border-t border-b border-slate-100 py-6 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Invoice</span>
                <span className="font-bold">#{selectedReceipt._id.slice(-6).toUpperCase()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Doctor</span>
                <span className="font-bold">Dr. {selectedReceipt.doctorId?.userId?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Date</span>
                <span className="font-bold">{selectedReceipt.date}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Time</span>
                <span className="font-bold">{selectedReceipt.time}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Status</span>
                <span className={`font-black uppercase text-xs px-3 py-1 rounded-full ${
                  selectedReceipt.status === "confirmed"
                    ? "bg-emerald-100 text-emerald-600"
                    : "bg-sky-100 text-sky-600"
                }`}>
                  {selectedReceipt.status}
                </span>
              </div>
              <div className="flex justify-between text-sm border-t pt-4">
                <span className="text-slate-400 font-bold">Total Paid</span>
                <span className="font-black text-lg text-slate-900">
                  Rs. {selectedReceipt.fee || "500"}
                </span>
              </div>
            </div>
            <button
              onClick={() => window.print()}
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-sky-600 transition-all"
            >
              Print Receipt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}