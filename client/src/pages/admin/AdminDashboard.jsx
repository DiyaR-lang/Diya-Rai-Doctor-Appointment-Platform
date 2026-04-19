import React, { useEffect, useState } from "react";
import axios from "axios";
import { 
  FiUsers, FiActivity, FiShield, FiSearch, FiLogOut, 
  FiGrid, FiCheckCircle, FiTrash2, FiClock, FiPlusCircle, 
  FiArrowUpRight, FiLayers
} from "react-icons/fi";

const ADMIN_SECRET = "ResolveNow_Super_Secret_2026";
const API_BASE_URL = "http://localhost:5000/api/admin";

export default function AdminDashboard() {
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState({ 
    totalDoctors: 0, totalPatients: 0, totalAppointments: 0, totalRevenue: 0 
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

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
      setDoctors(usersRes.data?.doctors || []);
      setPatients(usersRes.data?.patients || []);
      setStats(statsRes.data?.stats || {});
      setAppointments(statsRes.data?.appointments || []);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await axios.put(`${API_BASE_URL}/approve-doctor/${id}`, {}, { headers: { "x-admin-secret": ADMIN_SECRET } });
      fetchSystemData();
    } catch (err) { alert("Action failed"); }
  };

  const handleDelete = async (id, type) => {
    if (!window.confirm("Confirm deletion?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/${type}/${id}`, { headers: { "x-admin-secret": ADMIN_SECRET } });
      fetchSystemData();
    } catch (err) { alert("Delete failed"); }
  };

  if (loading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#F0F9FF]">
      <div className="w-12 h-12 border-4 border-sky-400 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-sky-600 font-bold tracking-widest text-xs uppercase">Initializing Healthcare Hub...</p>
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-[#F8FAFC] overflow-hidden font-sans text-slate-800">
      
      {/* RIGID SIDEBAR - Light Sky Theme */}
      <aside className="w-72 bg-gradient-to-b from-sky-50 to-white flex flex-col h-full border-r border-sky-100 shadow-[20px_0_40px_rgba(14,165,233,0.03)] z-20">
        <div className="p-10">
          <div className="flex items-center gap-3 mb-1">
            <div className="bg-sky-500 p-2.5 rounded-2xl shadow-lg shadow-sky-200">
                <FiLayers className="text-white text-xl" />
            </div>
            <span className="text-2xl font-black tracking-tighter text-slate-900">Medi<span className="text-sky-500">Hub</span> Nepal</span>
          </div>
          <p className="text-[10px] font-bold text-sky-400 uppercase tracking-[0.3em] ml-1">Admin Dashboard </p>
        </div>

        <nav className="flex-1 px-6 space-y-2">
          {[
            { id: 'overview', icon: <FiGrid />, label: 'Main Dashboard' },
            { id: 'doctors', icon: <FiShield />, label: 'Doctor Approvals' },
            { id: 'patients', icon: <FiUsers />, label: 'Patient Registry' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-[20px] text-sm font-bold transition-all duration-300 ${
                activeTab === item.id 
                ? "bg-white text-sky-600 shadow-xl shadow-sky-100 scale-105 border border-sky-100" 
                : "text-slate-400 hover:text-sky-500 hover:bg-sky-100/30"
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-8">
          <button onClick={() => window.location.href = '/'} className="w-full flex items-center gap-3 px-6 py-4 text-rose-400 font-bold text-sm bg-rose-50/50 hover:bg-rose-100/50 rounded-2xl transition-all border border-rose-100">
            <FiLogOut className="text-lg" /> Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-white/40 backdrop-blur-3xl">
        
        {/* TOP NAVBAR */}
        <header className="px-12 py-8 flex justify-between items-center border-b border-slate-100">
          <div>
            <h1 className="text-3xl font-black text-slate-900 capitalize tracking-tight">{activeTab}</h1>
            <div className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Server Secure • 2026</span>
            </div>
          </div>
          
          <div className="relative group">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-sky-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search data..."
              className="pl-12 pr-6 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-4 focus:ring-sky-50 focus:border-sky-200 outline-none w-80 transition-all font-bold"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </header>

        {/* SCROLLABLE BODY */}
        <section className="flex-1 overflow-y-auto p-12 bg-[#F8FAFC]/50">
          <div className="max-w-7xl mx-auto space-y-10">
            
            {/* STATS SECTION */}
            {activeTab === "overview" && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <StatCard label="Medical Staff" count={stats.totalDoctors} icon={<FiShield />} color="bg-sky-500" />
                  <StatCard label="Patients" count={stats.totalPatients} icon={<FiUsers />} color="bg-emerald-500" />
                  <StatCard label="Revenue (NPR)" count={stats.totalRevenue || 0} icon={<FiActivity />} color="bg-indigo-500" />
                </div>

                <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
                  <div className="px-10 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                    <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Live Activity Log</h3>
                    <div className="flex gap-2">
                        <span className="w-3 h-3 rounded-full bg-sky-100 flex items-center justify-center"><span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span></span>
                    </div>
                  </div>
                  <div className="p-0 overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                          <th className="px-10 py-5">Patient Name</th>
                          <th className="px-10 py-5">Consultant</th>
                          <th className="px-10 py-5">Payment Status</th>
                          <th className="px-10 py-5 text-right">Service Fee</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {appointments?.slice(0, 6).map(app => (
                          <tr key={app._id} className="hover:bg-sky-50/30 transition-all cursor-default group">
                            <td className="px-10 py-6">
                                <span className="font-bold text-slate-700 text-base">{app.patientId?.name || "Member"}</span>
                            </td>
                            <td className="px-10 py-6 font-semibold text-slate-500">
                                Dr. {app.doctorId?.userId?.name || "General"}
                            </td>
                            <td className="px-10 py-6">
                              <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                                app.paymentStatus === 'paid' 
                                ? 'bg-emerald-50 text-emerald-600' 
                                : 'bg-amber-50 text-amber-600'
                              }`}>
                                {app.paymentStatus || 'Waiting'}
                              </span>
                            </td>
                            <td className="px-10 py-6 text-right font-black text-slate-900">
                                Rs. {app.amount || 0}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* DOCTORS TAB */}
            {activeTab === "doctors" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {doctors?.filter(d => d.userId?.name?.toLowerCase().includes(searchTerm.toLowerCase())).map(doc => (
                  <div key={doc._id} className="bg-white p-8 rounded-[32px] border border-sky-50 shadow-xl shadow-sky-900/5 group hover:border-sky-200 transition-all relative overflow-hidden">
                    <div className={`absolute top-0 right-0 px-5 py-2 text-[9px] font-black uppercase tracking-widest ${doc.isVerified ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-white'}`}>
                      {doc.isVerified ? 'Official' : 'Pending'}
                    </div>
                    
                    <div className="w-14 h-14 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-500 text-2xl mb-6">
                        <FiShield />
                    </div>
                    
                    <h3 className="text-xl font-black text-slate-800 mb-1 leading-tight">Dr. {doc.userId?.name}</h3>
                    <p className="text-sky-400 text-[10px] font-black mb-8 uppercase tracking-widest">{doc.specialty}</p>
                    
                    <div className="flex gap-3 pt-6 border-t border-slate-50">
                      {!doc.isVerified && (
                        <button onClick={() => handleApprove(doc._id)} className="flex-1 bg-sky-500 text-white py-3 rounded-xl text-xs font-bold hover:bg-sky-600 transition-all">Verify</button>
                      )}
                      <button onClick={() => handleDelete(doc._id, 'doctor')} className="flex-1 bg-slate-50 text-slate-400 py-3 rounded-xl text-xs font-bold hover:bg-rose-500 hover:text-white transition-all">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* PATIENTS TAB */}
            {activeTab === "patients" && (
              <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50/50">
                    <tr>
                      <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Medical Holder</th>
                      <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Contact Email</th>
                      <th className="px-10 py-6 text-right text-[10px] font-black uppercase text-slate-400 tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {patients?.filter(p => p.name?.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                      <tr key={p._id} className="hover:bg-slate-50 transition-all">
                        <td className="px-10 py-6">
                          <p className="font-bold text-slate-800 text-lg">{p.name}</p>
                          <p className="text-[10px] text-sky-400 font-bold uppercase">ID: {p._id.slice(-6)}</p>
                        </td>
                        <td className="px-10 py-6 text-sm text-slate-500 font-medium">{p.email}</td>
                        <td className="px-10 py-6 text-right">
                          <button onClick={() => handleDelete(p._id, 'patient')} className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-300 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center ml-auto shadow-sm">
                            <FiTrash2 size={20} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <footer className="mt-20 py-10 border-t border-slate-100 text-center">
            <p className="text-slate-300 text-[10px] font-bold uppercase tracking-[0.5em]">Healthcare Terminal v2.5 • Nepal • 2026</p>
          </footer>
        </section>
      </main>
    </div>
  );
}

// Stats Card Sub-component
function StatCard({ label, count, icon, color }) {
  return (
    <div className="bg-white p-8 rounded-[32px] shadow-xl shadow-slate-200/40 border border-slate-50 flex items-center justify-between group hover:scale-[1.02] transition-all">
      <div>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">{label}</p>
        <p className="text-4xl font-black text-slate-900 tracking-tighter">{count}</p>
      </div>
      <div className={`w-16 h-16 rounded-3xl ${color} flex items-center justify-center text-white text-2xl shadow-lg transition-transform group-hover:rotate-6`}>
        {icon}
      </div>
    </div>
  );
}