import React, { useEffect, useState } from "react";
import axios from "axios";
import { Search, ChevronRight, ArrowLeft, Calendar, Clock, Check, User } from "lucide-react";

export default function AllDoctors() {
  // --- START: ORIGINAL CODE LOGIC (UNCHANGED) ---
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState({
    name: "",
    specialty: "",
    experience: "",
  });
  const [showSpecialties, setShowSpecialties] = useState(false);
  const [specialtiesList] = useState([
    "Cardiology", "Orthopedics", "Dentist", "Neurology", "Pediatrics",
    "Dermatology", "ENT", "Gynecology", "Psychiatry", "Urology",
    "General Medicine", "Physiotherapy",
  ]);

  const [showBooking, setShowBooking] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [appointmentDate, setAppointmentDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [note, setNote] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);

  const fetchDoctors = async (filters = {}) => {
    setLoading(true);
    try {
      const cleanFilters = {
        ...filters,
        experience: filters.experience === "" ? "" : Number(filters.experience)
      };
      const res = await axios.post("http://localhost:5000/api/doctors/search", cleanFilters);
      setDoctors(res.data);
    } catch (err) {
      console.error("Failed to fetch doctors:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  // Syncing slots when date or doctor changes
  useEffect(() => {
    if (selectedDoctor && appointmentDate) {
      const dayData = selectedDoctor.availability?.find(a => a.date === appointmentDate);
      setAvailableSlots(dayData ? dayData.slots : []);
    }
  }, [appointmentDate, selectedDoctor]);

  const handleChange = (e) => {
    setSearch({ ...search, [e.target.name]: e.target.value });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchDoctors(search);
    setShowSpecialties(false);
  };

  const bookAppointment = async () => {
    if (!appointmentDate || !timeSlot) {
      alert("Please select date and time slot");
      return;
    }
    setBookingLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "http://localhost:5000/api/appointments",
        {
          doctorId: selectedDoctor._id,
          doctorUserId: selectedDoctor.userId?._id || selectedDoctor.userId,
          date: appointmentDate,
          time: timeSlot,
          note,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCurrentStep(5); // Success state
    } catch (err) {
      alert(err.response?.data?.message || "Server error");
    } finally {
      setBookingLoading(false);
    }
  };
  // --- END: ORIGINAL CODE LOGIC (UNCHANGED) ---

  // --- UI STEP MANAGEMENT ---
  const [currentStep, setCurrentStep] = useState(2); 

  const handleSelectSlot = (doc, date, slot) => {
    setSelectedDoctor(doc);
    setAppointmentDate(date);
    setTimeSlot(slot);
    setCurrentStep(4); // Trigger transition to Step 4
    window.scrollTo(0, 0);
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-20">
      {/* 1. PROGRESS BAR (Matches your image_dba001.png) */}
      <div className="bg-white border-b py-8 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto flex justify-between items-center px-6 min-w-[800px]">
          {[
            { id: 1, label: "Select Department" },
            { id: 2, label: "Select the doctor" },
            { id: 3, label: "Select Appointment time" },
            { id: 4, label: "Verify Patient" },
            { id: 5, label: "Payments" },
            { id: 6, label: "Video Consultation" },
          ].map((item) => (
            <div key={item.id} className="flex flex-col items-center flex-1 relative">
              <div className={`w-3 h-3 rounded-full z-10 ${currentStep >= item.id ? "bg-red-500" : "bg-gray-300"}`}>
                {currentStep > item.id && <Check size={8} className="text-white mx-auto mt-0.5" />}
              </div>
              <span className={`text-[9px] mt-2 font-bold uppercase ${currentStep >= item.id ? "text-red-500" : "text-gray-400"}`}>Step {item.id}</span>
              <span className={`text-[11px] text-center mt-1 ${currentStep === item.id ? "text-red-600 font-bold" : "text-gray-400"}`}>{item.label}</span>
              {item.id < 6 && <div className={`absolute top-1.5 left-1/2 w-full h-[1.5px] ${currentStep > item.id ? "bg-red-500" : "bg-gray-200"}`}></div>}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        
        {/* VIEW: DOCTOR LIST & SLOT SELECTION (Step 2 & 3) */}
        {currentStep <= 3 && (
          <div className="animate-in fade-in duration-300">
            {/* Find By Specialty Bar */}
            <div className="flex flex-col md:flex-row gap-4 mb-8 items-center">
              <div className="flex items-center gap-4 bg-white px-4 py-2 border rounded shadow-sm w-full md:w-auto">
                <span className="font-bold text-gray-700 whitespace-nowrap">Find By Speciality:</span>
                <select name="specialty" value={search.specialty} onChange={handleChange} className="border-none outline-none bg-transparent text-gray-500">
                  <option value="">All Speciality</option>
                  {specialtiesList.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex-1 flex w-full">
                <input type="text" name="name" placeholder="Find Doctor" value={search.name} onChange={handleChange} className="flex-1 border rounded-l-md px-4 py-2 outline-none" />
                <button onClick={handleSearch} className="bg-red-500 text-white px-6 rounded-r-md hover:bg-red-600">
                  <Search size={20} />
                </button>
              </div>
            </div>

            {/* Doctors Grid (Matches image_dabfbd.png) */}
            <div className="space-y-6">
              {loading ? (
                <div className="text-center py-20 font-bold text-gray-400">Searching Doctors...</div>
              ) : (
                doctors.map((doc) => (
                  <div key={doc._id} className="bg-[#F9F9F9] border rounded-lg overflow-hidden flex flex-col lg:flex-row shadow-sm">
                    {/* Left: Doctor Card */}
                    <div className="lg:w-[40%] p-8 flex flex-col items-center border-r bg-white lg:bg-transparent">
                      <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-gray-100 shadow-inner mb-4">
                        <img src={doc.image ? `http://localhost:5000${doc.image}` : "https://via.placeholder.com/150"} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="text-left w-full pl-4">
                        <h2 className="text-xl font-bold text-[#2D3F50]">Dr. {doc.userId?.name}</h2>
                        <div className="mt-4 space-y-2 text-sm">
                          <p className="flex items-center gap-2 text-gray-500"><span className="text-teal-500 text-xs">▶</span> {doc.specialty}</p>
                          <p className="flex items-center gap-2 text-gray-500"><span className="text-teal-500 text-xs">▶</span> Experience: {doc.experience} years</p>
                          <p className="flex items-center gap-2 text-gray-400"><span className="text-teal-500 text-xs">▶</span> Next Available Time: <span className="text-red-500">Available Now</span></p>
                        </div>
                        <button className="mt-4 border border-red-400 text-red-500 px-4 py-1.5 rounded text-sm flex items-center gap-2 hover:bg-red-50 transition">
                          View Profile <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Right: Availability Table */}
                    <div className="flex-1 p-6 bg-white lg:bg-transparent">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-gray-500 border-b">
                            <th className="pb-3 text-left font-bold">Date</th>
                            <th className="pb-3 text-center font-bold">Dr. Available Time</th>
                            <th className="pb-3 text-left font-bold pl-4">Available Time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y text-gray-600">
                          {doc.availability?.map((avail, idx) => (
                            <tr key={idx}>
                              <td className="py-4 font-medium text-gray-500">{avail.date}</td>
                              <td className="py-4 text-center">06:00 - 19:00</td>
                              <td className="py-4 pl-4">
                                <div className="flex flex-wrap gap-2">
                                  {avail.slots?.map((slot, sIdx) => {
                                    const timeValue = typeof slot === "string" ? slot : slot.time;
                                    const isBooked = typeof slot === "object" ? slot.isBooked : false;
                                    return (
                                      <button 
                                        key={sIdx} 
                                        disabled={isBooked}
                                        onClick={() => handleSelectSlot(doc, avail.date, timeValue)}
                                        className={`px-3 py-1 rounded text-xs font-bold transition ${isBooked ? 'bg-gray-100 text-gray-300' : 'bg-[#646D77] text-white hover:bg-red-500'}`}
                                      >
                                        {timeValue}
                                      </button>
                                    );
                                  })}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <button className="mt-6 w-full bg-red-500 text-white py-3 rounded font-bold text-xs uppercase tracking-tight hover:bg-red-600 transition">
                        Check Other Schedule Time to take appointment →
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* VIEW: VERIFY PATIENT (Step 4 - Matches image_dba001.png) */}
        {currentStep === 4 && (
          <div className="animate-in slide-in-from-right-10 duration-500">
            <button onClick={() => setCurrentStep(2)} className="flex items-center text-gray-400 hover:text-red-500 mb-8 font-bold text-[11px] uppercase tracking-wider">
              <ArrowLeft size={16} className="mr-2" /> Change Selection
            </button>

            <div className="flex flex-col lg:flex-row gap-8 items-start">
              {/* Patient Form */}
              <div className="flex-1 bg-white p-10 rounded-xl border shadow-sm">
                <h3 className="text-2xl font-bold text-[#1D2B3A] mb-8">Verify Patient Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Patient Name</label>
                    <input type="text" className="w-full border-gray-200 border rounded-lg p-4 bg-gray-50/30 outline-none focus:border-red-400 transition" placeholder="Full Name" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone Number</label>
                    <input type="text" className="w-full border-gray-200 border rounded-lg p-4 bg-gray-50/30 outline-none focus:border-red-400 transition" placeholder="+977" />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Reason/Note for Appointment</label>
                    <textarea 
                      value={note} 
                      onChange={(e) => setNote(e.target.value)} 
                      rows="5" 
                      className="w-full border-gray-200 border rounded-lg p-4 bg-gray-50/30 outline-none focus:border-red-400 transition" 
                      placeholder="Mention any symptoms or medical history..."
                    ></textarea>
                  </div>
                </div>
              </div>

              {/* Sidebar Summary */}
              <div className="lg:w-[320px] bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="p-5 border-b bg-gray-50/50">
                  <h4 className="font-black text-[11px] text-[#1D2B3A] uppercase tracking-widest">Booking Summary</h4>
                </div>
                <div className="p-6 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100">
                      <img src={selectedDoctor?.image ? `http://localhost:5000${selectedDoctor.image}` : "https://via.placeholder.com/50"} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#1D2B3A]">Dr. {selectedDoctor?.userId?.name}</p>
                      <p className="text-[10px] text-red-500 font-bold uppercase">{selectedDoctor?.specialty}</p>
                    </div>
                  </div>
                  <div className="space-y-4 pt-4 border-t border-dashed">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400 flex items-center gap-2"><Calendar size={14}/> Date</span>
                      <span className="font-bold text-[#1D2B3A]">{appointmentDate}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400 flex items-center gap-2"><Clock size={14}/> Time</span>
                      <span className="font-bold text-[#1D2B3A]">{timeSlot}</span>
                    </div>
                  </div>
                  <div className="pt-6 border-t flex justify-between items-end">
                    <span className="font-bold text-[#1D2B3A]">Total Fee</span>
                    <span className="text-2xl font-black text-red-500">Rs. {selectedDoctor?.fee || "1500"}</span>
                  </div>
                  <button 
                    onClick={bookAppointment}
                    disabled={bookingLoading}
                    className="w-full bg-[#E63939] text-white py-4 rounded-xl font-bold uppercase text-xs tracking-widest shadow-lg shadow-red-100 hover:bg-red-600 transition disabled:bg-gray-300"
                  >
                    {bookingLoading ? "Processing..." : "Confirm & Pay"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: SUCCESS (Step 5) */}
        {currentStep === 5 && (
          <div className="max-w-md mx-auto text-center bg-white p-16 rounded-3xl border shadow-xl animate-in zoom-in duration-300">
             <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8">
                <Check size={48} className="text-green-500" />
             </div>
             <h2 className="text-2xl font-black text-[#1D2B3A]">Booking Successful!</h2>
             <p className="text-gray-500 mt-3 mb-10 text-sm leading-relaxed">Your appointment with Dr. {selectedDoctor?.userId?.name} is scheduled for {appointmentDate} at {timeSlot}.</p>
             <button onClick={() => window.location.reload()} className="w-full bg-[#1D2B3A] text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition shadow-lg">Back to Dashboard</button>
          </div>
        )}
      </div>
    </div>
  );
}