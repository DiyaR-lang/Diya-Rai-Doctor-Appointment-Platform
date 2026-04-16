import React, { useEffect, useState } from "react";
import axios from "axios";
import { 
  FiUsers, FiActivity, FiShield, FiPieChart, 
  FiSearch, FiLogOut, FiDollarSign, FiClock, 
  FiCheckCircle, FiTrash2, FiAlertCircle, FiTrendingUp, FiLayers
} from "react-icons/fi";

const ADMIN_SECRET = "ResolveNow_Super_Secret_2026";
const API_BASE_URL = "http://localhost:5000/api/admin";

export default function AdminDashboard() {
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState({ 
    totalDoctors: 0, 
    totalPatients: 0, 
    totalAppointments: 0, 
    totalRevenue: 0 
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [isProcessing, setIsProcessing] = useState(null);

  useEffect(() => {
    fetchSystemData();
  }, []);

  const fetchSystemData = async () => {
    try {
      const headers = { "x-admin-secret": ADMIN_SECRET };
      const [usersRes, statsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/all-users`, { headers }),
        axios.get(`${API_BASE_URL}/dashboard-stats`, { headers })
      ]);
      setDoctors(usersRes.data.doctors || []);
      setPatients(usersRes.data.patients || []);
      setStats(statsRes.data.stats || {});
      setAppointments(statsRes.data.appointments || []);
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    setIsProcessing(id);
    try {
      await axios.put(`${API_BASE_URL}/approve-doctor/${id}`, {}, {
        headers: { "x-admin-secret": ADMIN_SECRET }
      });
      fetchSystemData();
    } catch (err) {
      alert("Verification failed.");
    } finally {
      setIsProcessing(null);
    }
  };

  const handleDelete = async (id, type) => {
    if (!window.confirm(`Permanently remove this ${type}?`)) return;
    setIsProcessing(id);
    try {
      await axios.delete(`${API_BASE_URL}/${type}/${id}`, {
        headers: { "x-admin-secret": ADMIN_SECRET }
      });
      fetchSystemData();
    } catch (err) {
      alert("Deletion failed.");
    } finally {
      setIsProcessing(null);
    }
  };

  const filteredDoctors = doctors.filter(doc => 
    doc.userId?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPatients = patients.filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFDFD]">
      <div className="w-12 h-12 border-[3px] border-slate-100 border-t-emerald-500 rounded-full animate-spin mb-6"></div>
      <p className="font-bold text-slate-400 uppercase tracking-[0.3em] text-[10px]">Authorizing Secure Channel</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F4F7FE] flex font-sans text-[#1E293B] selection:bg-emerald-100 selection:text-emerald-900">
      
      {/* SIDEBAR - Ultra Modern Minimalist */}
      <aside className="w-[300px] bg-white border-r border-slate-200/60 p-10 flex flex-col fixed h-full shadow-[20px_0_40px_-20px_rgba(0,0,0,0.02)]">
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
              <FiLayers className="text-white text-xl" />
            </div>
            <h1 className="text-2xl font-black tracking-[-0.04em] text-slate-900">ResolveNow</h1>
          </div>
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] ml-1">Terminal v2.0</p>
        </div>
        
        <nav className="flex-1 space-y-3">
          {[
            { id: 'overview', icon: <FiPieChart />, label: 'Analytics' },
            { id: 'doctors', icon: <FiShield />, label: 'Verifications' },
            { id: 'patients', icon: <FiUsers />, label: 'Registry' }
          ].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold text-[13px] transition-all duration-300 ${activeTab === item.id ? "bg-slate-900 text-white shadow-2xl shadow-slate-300 translate-x-2" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"}`}>
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <button onClick={() => window.location.href = '/'} className="flex items-center gap-3 text-rose-500 font-bold text-xs p-4 hover:bg-rose-50 rounded-2xl mt-auto transition-colors group">
          <FiLogOut className="group-hover:-translate-x-1 transition-transform" /> TERMINATE SESSION
        </button>
      </aside>

      {/* MAIN VIEWPORT */}
      <main className="flex-1 ml-[300px] p-16">
        
        {/* Header - Fixed-feel Layout */}
        <header className="flex justify-between items-end mb-16">
          <div className="animate-in fade-in slide-in-from-left-4 duration-700">
            <h2 className="text-6xl font-black text-slate-900 tracking-[-0.05em] leading-none mb-4 capitalize">
              {activeTab}
            </h2>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Real-time Data Stream Active</p>
            </div>
          </div>
          
          <div className="relative w-[400px] shadow-2xl shadow-slate-200/50 rounded-3xl overflow-hidden group">
            <FiSearch className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
            <input 
              type="text" 
              placeholder={`Search ${activeTab}...`} 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-16 pr-8 py-5 bg-white border-none outline-none font-bold text-sm placeholder:text-slate-200 text-slate-700" 
            />
          </div>
        </header>

        {/* --- DASHBOARD ANALYTICS --- */}
        {activeTab === "overview" && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
              {/* Primary Metric - Impact */}
              <div className="xl:col-span-2 bg-[#0F172A] p-12 rounded-[4rem] text-white shadow-[0_40px_80px_-20px_rgba(15,23,42,0.3)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full -mr-40 -mt-40 blur-[100px]"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-6">
                    <FiTrendingUp className="text-emerald-400 text-xl" />
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">Global Utilization</p>
                  </div>
                  <h3 className="text-8xl font-black text-white tracking-[-0.06em] leading-none mb-4">
                    {stats.totalAppointments}
                  </h3>
                  <p className="text-emerald-400 font-bold text-sm uppercase tracking-widest italic">Total Consultations Processed</p>
                </div>
              </div>

              <StatCard icon={<FiShield />} label="Staff Verified" count={stats.totalDoctors} color="emerald" />
              <StatCard icon={<FiUsers />} label="Member Base" count={stats.totalPatients} color="indigo" />
            </div>

            {/* Live Feed - Sophisticated Table Style */}
            <div className="bg-white rounded-[4rem] p-12 shadow-[0_10px_60px_-15px_rgba(0,0,0,0.03)] border border-slate-100/50">
              <div className="flex justify-between items-center mb-12">
                <h3 className="text-2xl font-black tracking-tight flex items-center gap-4 text-slate-800">
                  <span className="w-10 h-1 rounded-full bg-emerald-500"></span>
                  System Traffic Feed
                </h3>
                <button className="text-[10px] font-black text-slate-400 hover:text-emerald-500 transition-colors uppercase tracking-widest border border-slate-100 px-6 py-2 rounded-full">View Full Logs</button>
              </div>

              <div className="space-y-6">
                {appointments.slice(0, 5).map(app => (
                  <div key={app._id} className="group grid grid-cols-5 items-center p-8 rounded-[2.5rem] bg-[#FDFDFD] hover:bg-white border border-transparent hover:border-slate-100 hover:shadow-xl transition-all duration-500">
                    <div className="col-span-2">
                      <p className="font-black text-slate-800 text-xl tracking-tight mb-1 group-hover:text-emerald-600 transition-colors">{app.patientId?.name || "Private User"}</p>
                      <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Medical Lead: Dr. {app.doctorId?.userId?.name || "Staff"}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-slate-300 uppercase block mb-1">Standard Fee</span>
                      <p className="font-black text-xl text-slate-900 tracking-tighter">Rs. {app.amount || 0}</p>
                    </div>
                    <div className="col-span-2 flex justify-end gap-6 items-center">
                      <span className={`px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.1em] ${
                        app.paymentStatus?.toLowerCase() === 'paid' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                      }`}>
                        {app.paymentStatus || 'Pending'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- DOCTOR VERIFICATION GRID --- */}
        {activeTab === "doctors" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-700">
            {filteredDoctors.map(doc => (
              <div key={doc._id} className="bg-white p-10 rounded-[3.5rem] shadow-xl border border-slate-100/50 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 group">
                <div className="flex justify-between items-start mb-8">
                   <div className="w-16 h-16 bg-slate-50 rounded-[1.5rem] flex items-center justify-center text-slate-300 text-2xl group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-all">
                     <FiShield />
                   </div>
                   {doc.isVerified ? (
                     <div className="bg-emerald-50 text-emerald-600 p-2 rounded-full"><FiCheckCircle /></div>
                   ) : (
                     <div className="bg-amber-50 text-amber-500 p-2 rounded-full animate-pulse"><FiAlertCircle /></div>
                   )}
                </div>
                <h4 className="text-2xl font-black text-slate-900 mb-1">{doc.userId?.name || "Medical Provider"}</h4>
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-8">{doc.specialty}</p>
                
                <div className="flex gap-4">
                  {!doc.isVerified && (
                    <button 
                      onClick={() => handleApprove(doc._id)}
                      disabled={isProcessing === doc._id}
                      className="flex-1 bg-emerald-500 text-white py-5 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest hover:bg-emerald-600 shadow-lg shadow-emerald-100 transition-all"
                    >
                      Grant Access
                    </button>
                  )}
                  <button 
                    onClick={() => handleDelete(doc._id, 'doctor')}
                    className="flex-1 bg-slate-50 text-slate-400 py-5 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all"
                  >
                    Purge Record
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* --- PATIENT REGISTRY --- */}
        {activeTab === "patients" && (
          <div className="bg-white rounded-[4rem] overflow-hidden shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-500">
            <table className="w-full text-left">
              <thead className="bg-[#FDFDFD] border-b border-slate-50">
                <tr>
                  <th className="px-12 py-8 text-[11px] font-black uppercase text-slate-300 tracking-widest">Full Name</th>
                  <th className="px-12 py-8 text-[11px] font-black uppercase text-slate-300 tracking-widest">Digital ID / Email</th>
                  <th className="px-12 py-8 text-right text-[11px] font-black uppercase text-slate-300 tracking-widest">Management</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredPatients.map(p => (
                  <tr key={p._id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="px-12 py-10 font-black text-slate-800 text-lg tracking-tight">{p.name}</td>
                    <td className="px-12 py-10 font-bold text-slate-400 text-sm italic">{p.email}</td>
                    <td className="px-12 py-10 text-right">
                      <button 
                        onClick={() => handleDelete(p._id, 'patient')}
                        className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all ml-auto"
                      >
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

// Stats Widget - Premium Aesthetic
function StatCard({ icon, label, count, color }) {
  const configs = { 
    emerald: "text-emerald-500 bg-emerald-50 shadow-emerald-100/50", 
    indigo: "text-indigo-500 bg-indigo-50 shadow-indigo-100/50" 
  };
  
  return (
    <div className="bg-white p-12 rounded-[3.5rem] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.03)] border border-slate-100/60 transition-all hover:-translate-y-3">
      <div className={`w-16 h-16 rounded-[1.8rem] flex items-center justify-center text-2xl mb-10 shadow-xl ${configs[color]}`}>
        {icon}
      </div>
      <p className="text-[11px] font-black text-slate-300 uppercase tracking-[0.2em] mb-2">{label}</p>
      <p className="text-5xl font-black text-slate-900 tracking-tighter">{count}</p>
    </div>
  );
}