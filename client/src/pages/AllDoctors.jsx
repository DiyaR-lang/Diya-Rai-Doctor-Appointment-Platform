import React, { useEffect, useState } from "react";
import axios from "axios";
import { Search, ArrowLeft, Check, Zap, Printer, Loader2, Calendar, Clock, Star, MapPin, Award, ChevronRight } from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";

export default function AllDoctors() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState({ name: "", specialty: "" });
  
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [appointmentDate, setAppointmentDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [note, setNote] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [appointmentId, setAppointmentId] = useState(null);
  const [currentStep, setCurrentStep] = useState(2); 
  const [paymentDetails, setPaymentDetails] = useState(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryPidx = searchParams.get("pidx");

  // --- LOGIC: VERIFICATION (UNTOUCHED) ---
  useEffect(() => {
    if (queryPidx) {
      const finalizeBooking = async () => {
        setBookingLoading(true);
        setCurrentStep(5); 
        try {
          const savedId = localStorage.getItem("pendingAppointmentId");
          const savedDoc = JSON.parse(localStorage.getItem("pendingDoctor"));
          const res = await axios.post("http://localhost:5000/api/payment/verify", {
            pidx: queryPidx,
            appointmentId: savedId
          });
          if (res.data.success) {
            setSelectedDoctor(savedDoc);
            setPaymentDetails(res.data.payment); 
            setCurrentStep(6); 
            localStorage.removeItem("pendingAppointmentId");
            localStorage.removeItem("pendingDoctor");
            setSearchParams({}); 
          }
        } catch (err) {
          console.error("Verification failed", err);
          setCurrentStep(2);
        } finally {
          setBookingLoading(false);
        }
      };
      finalizeBooking();
    }
  }, [queryPidx, setSearchParams]);

  // --- LOGIC: FETCH (UNTOUCHED) ---
  const fetchDoctors = async (filters = {}) => {
    setLoading(true);
    try {
      const res = await axios.post("http://localhost:5000/api/doctors/search", filters);
      setDoctors(res.data);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDoctors(); }, []);

  const handleSelectSlot = (doc, date, slot) => {
    setSelectedDoctor(doc);
    setAppointmentDate(date);
    const slotTime = typeof slot === 'object' ? slot.time : slot;
    setTimeSlot(slotTime);
    setCurrentStep(4); 
    window.scrollTo(0, 0);
  };

  const bookAppointment = async () => {
    if (!appointmentDate || !timeSlot) return alert("Please select date and time slot");
    setBookingLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        "http://localhost:5000/api/appointments",
        {
          doctorId: selectedDoctor._id,
          date: appointmentDate,
          time: timeSlot,
          note,
          fee: selectedDoctor.fee || 500
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAppointmentId(res.data._id);
      setCurrentStep(5); 
    } catch (err) {
      alert(err.response?.data?.message || "Booking failed");
    } finally { setBookingLoading(false); }
  };

  const handleKhaltiPayment = async () => {
    if (!appointmentId) return alert("Session expired.");
    localStorage.setItem("pendingAppointmentId", appointmentId);
    localStorage.setItem("pendingDoctor", JSON.stringify(selectedDoctor));
    setBookingLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        "http://localhost:5000/api/payment/khalti/initiate",
        { appointmentId, amount: selectedDoctor.fee || 500, patientName: "User" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success && res.data.payment_url) {
        window.location.href = res.data.payment_url;
      }
    } catch (err) {
      alert("Payment failed.");
    } finally { setBookingLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans pb-20 text-slate-900 pt-4">
      
      {/* 1. PROGRESS STEPPER */}
      <div className="bg-white border-b sticky top-0 z-10 w-full mb-8">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between relative max-w-5xl mx-auto">
            <div className="absolute top-[15px] left-0 w-full h-[2px] bg-slate-100 z-0"></div>
            <div className="absolute top-[15px] left-0 w-[40%] h-[2px] bg-red-500 z-0"></div>
            
            {[1, 2, 3, 4, 5, 6].map((step) => {
              const labels = ["", "Department", "Select Doctor", "Appointment", "Verify", "Payments", "Done"];
              const isActive = step === 2;
              return (
                <div key={step} className="relative z-10 flex flex-col items-center flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                    isActive ? "bg-red-500 border-red-500 text-white shadow-lg" : step < 2 ? "bg-red-100 border-red-200 text-red-600" : "bg-white border-slate-200 text-slate-300"
                  }`}>
                    <span className="text-[10px] font-bold">Step {step}</span>
                  </div>
                  <span className={`text-[11px] mt-2 font-bold ${isActive ? "text-red-600" : "text-slate-400"}`}>{labels[step]}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6">
        {currentStep <= 3 && (
          <div className="space-y-8">
            
            {/* 2. SEARCH BAR WITH SPECIALTY */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row gap-6 items-center">
                <div className="w-full md:w-1/3">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-2">Find By Specialty:</label>
                    <select 
                      onChange={(e) => setSearch({...search, specialty: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:border-red-500 transition-all font-medium"
                    >
                        <option value="">All Specialty</option>
                        <option value="Cardiologist">Cardiologist</option>
                        <option value="Neurologist">Neurologist</option>
                        <option value="Dermatologist">Dermatologist</option>
                    </select>
                </div>
                <div className="w-full md:flex-1 relative mt-auto">
                   <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-2">Search Doctor:</label>
                   <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Doctor Name..." 
                      className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-4 pr-14 outline-none focus:border-red-500 shadow-sm"
                      onChange={(e) => setSearch({...search, name: e.target.value})} 
                    />
                    <button 
                      onClick={() => fetchDoctors(search)} 
                      className="absolute right-0 top-0 h-full bg-red-500 text-white px-4 rounded-r-xl hover:bg-red-600 transition"
                    >
                      <Search size={20} />
                    </button>
                   </div>
                </div>
            </div>

            {/* 3. DOCTOR CARDS */}
            <div className="grid gap-8">
              {doctors.filter(d => d.isVerified).map((doc) => (
                <div key={doc._id} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col lg:flex-row hover:shadow-md transition-shadow">
                    
                    {/* Left Profile Section */}
                    <div className="lg:w-80 p-8 bg-slate-50 border-r border-slate-100 flex flex-col items-center text-center">
                      <img src={doc.image ? `http://localhost:5000${doc.image}` : "https://via.placeholder.com/150"} className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-md mb-6" alt="" />
                      <h3 className="text-xl font-bold text-slate-800 leading-tight">Dr. {doc.userId?.name}</h3>
                      <div className="mt-4 space-y-2">
                        <p className="text-xs text-blue-600 font-bold flex items-center justify-center gap-2 uppercase tracking-tight"><Award size={14}/> {doc.specialty}</p>
                        <p className="text-xs text-slate-500 flex items-center justify-center gap-2"><MapPin size={14}/> Kathmandu, Nepal</p>
                      </div>
                    </div>

                    {/* Right Schedule Section */}
                    <div className="flex-1 p-8">
                        <div className="grid grid-cols-3 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b pb-4 mb-6">
                            <span>Date</span>
                            <span className="text-center">Shift Range</span>
                            <span className="text-right">Available Slots</span>
                        </div>
                        
                        <div className="space-y-6">
                          {doc.availability?.map((avail, idx) => (
                            <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-50 pb-6">
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-slate-700">{avail.date}</span>
                                    <span className="text-[10px] text-slate-400 font-medium">[2083/01/09]</span>
                                </div>
                                
                                <div className="bg-slate-100 px-4 py-1.5 rounded-full flex items-center gap-2 text-xs font-bold text-slate-600">
                                    <Clock size={14} className="text-red-500" /> 06:00 - 19:00
                                </div>

                                <div className="flex flex-wrap gap-2 justify-end max-w-sm">
                                    {avail.slots?.map((slot, sIdx) => {
                                      const isBooked = typeof slot === 'object' ? slot.isBooked : false;
                                      return (
                                        <button 
                                          key={sIdx} 
                                          disabled={isBooked}
                                          onClick={() => handleSelectSlot(doc, avail.date, slot)} 
                                          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                                            isBooked 
                                            ? "bg-slate-50 text-slate-300 cursor-not-allowed border border-transparent" 
                                            : "bg-slate-700 text-white hover:bg-red-500 shadow-sm"
                                          }`}>
                                          {typeof slot === 'object' ? slot.time : slot}
                                        </button>
                                      );
                                    })}
                                </div>
                            </div>
                          ))}
                        </div>
                        <button className="w-full mt-6 bg-red-500 text-white py-3 rounded-xl font-bold uppercase text-[11px] tracking-widest hover:bg-red-600 transition">
                            Check Other Schedule Time to take appointment →
                        </button>
                    </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 4: REVIEW */}
        {currentStep === 4 && (
          <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-8 animate-in fade-in duration-500">
            <div className="md:col-span-2 bg-white p-10 rounded-3xl border border-slate-200 shadow-sm">
              <button onClick={() => setCurrentStep(3)} className="flex items-center text-slate-400 hover:text-red-600 mb-8 font-bold text-[11px] uppercase"><ArrowLeft size={16} className="mr-2" /> Back</button>
              <h3 className="text-2xl font-bold mb-4">Patient Notes</h3>
              <textarea 
                value={note} 
                onChange={(e) => setNote(e.target.value)} 
                rows="6" 
                className="w-full border border-slate-200 rounded-2xl p-5 bg-slate-50 focus:bg-white outline-none focus:border-red-500 transition-all" 
                placeholder="Briefly describe your symptoms..."
              ></textarea>
            </div>
            <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl h-fit">
                <h4 className="text-[10px] font-black text-red-500 uppercase mb-6 tracking-[0.2em]">Summary</h4>
                <div className="space-y-4 text-sm">
                  <div className="flex justify-between"><span>Doctor</span><span className="font-bold">Dr. {selectedDoctor?.userId?.name}</span></div>
                  <div className="flex justify-between border-t border-white/5 pt-4"><span>Schedule</span><span className="font-bold">{appointmentDate}</span></div>
                  <div className="flex justify-between border-t border-white/5 pt-4 text-xl font-black"><span>Fee</span><span className="text-red-500">Rs. {selectedDoctor?.fee || 500}</span></div>
                </div>
                <button onClick={bookAppointment} disabled={bookingLoading} className="w-full bg-red-600 py-4 rounded-2xl font-bold uppercase text-[11px] mt-8 hover:bg-red-500 transition disabled:bg-slate-800">
                  {bookingLoading ? <Loader2 className="animate-spin mx-auto"/> : "Confirm Appointment"}
                </button>
            </div>
          </div>
        )}

        {/* STEP 5: KHALTI */}
        {currentStep === 5 && (
            <div className="max-w-md mx-auto bg-white p-12 rounded-[2.5rem] border border-slate-200 shadow-2xl text-center">
                {bookingLoading ? (
                    <div className="py-10 flex flex-col items-center"><Loader2 className="animate-spin text-red-500 mb-4" size={40}/><p className="text-xs font-bold uppercase text-slate-400">Verifying...</p></div>
                ) : (
                    <>
                        <Zap className="mx-auto text-yellow-500 mb-4" size={32} />
                        <h2 className="text-xl font-bold mb-10">Secure Payment</h2>
                        <div onClick={handleKhaltiPayment} className="border-2 border-purple-100 p-8 rounded-3xl cursor-pointer hover:border-purple-600 hover:bg-purple-50 transition-all">
                            <img src="https://english.onlinekhabar.com/wp-content/uploads/2022/02/khalti-digital-wallet-1024x425.png" className="h-8 mx-auto mb-4" alt="Khalti" />
                            <span className="text-xs font-black text-purple-700 uppercase">Pay Rs. {selectedDoctor?.fee || 500}</span>
                        </div>
                    </>
                )}
            </div>
        )}

        {/* STEP 6: RECEIPT */}
        {currentStep === 6 && (
          <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <div className="bg-green-600 p-12 text-white text-center">
              <Check size={48} className="mx-auto mb-4 bg-white/20 p-2 rounded-full" />
              <h2 className="text-3xl font-bold">Booking Confirmed!</h2>
            </div>
            <div className="p-10 space-y-4">
               <div className="bg-slate-50 p-6 rounded-2xl space-y-3 text-sm">
                  <div className="flex justify-between border-b pb-2"><span>Doctor</span><span className="font-bold">Dr. {selectedDoctor?.userId?.name}</span></div>
                  <div className="flex justify-between border-b pb-2"><span>Time</span><span className="font-bold">{timeSlot}</span></div>
                  <div className="flex justify-between pt-2 text-lg font-bold"><span>Paid</span><span className="text-green-600">Rs. {paymentDetails?.amount || selectedDoctor?.fee}</span></div>
               </div>
               <button onClick={() => window.print()} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-2"><Printer size={16}/> Print Receipt</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}