import React, { useEffect, useState } from "react";
import axios from "axios";
import { Search, ArrowLeft, Check, Zap } from "lucide-react";

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

  const fetchDoctors = async (filters = {}) => {
    setLoading(true);
    try {
      const res = await axios.post("http://localhost:5000/api/doctors/search", filters);
      setDoctors(res.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchDoctors(); }, []);

  const handleSelectSlot = (doc, date, slot) => {
    setSelectedDoctor(doc);
    setAppointmentDate(date);
    // FIX: Extract .time from slot object to avoid "Objects are not valid as React child"
    const slotTime = typeof slot === 'object' ? slot.time : slot;
    setTimeSlot(slotTime);
    setCurrentStep(4); // Moves to Verify Patient
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
          doctorUserId: selectedDoctor.userId?._id || selectedDoctor.userId,
          date: appointmentDate,
          time: timeSlot,
          note,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAppointmentId(res.data._id);
      setCurrentStep(5); // Moves to Payments
    } catch (err) {
      alert(err.response?.data?.message || "Booking failed");
    } finally { setBookingLoading(false); }
  };

  const handleKhaltiPayment = async () => {
    if (!appointmentId) return alert("Session expired. Please re-book.");
    setBookingLoading(true);
    try {
      const token = localStorage.getItem("token");
      // FIX: URL corrected to match app.use("/api/payment", ...)
      const res = await axios.post(
        "http://localhost:5000/api/payment/khalti/initiate",
        { appointmentId, amount: selectedDoctor.fee || 500 },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success && res.data.payment_url) {
        window.location.href = res.data.payment_url;
      } else {
        alert("Payment initiation failed at gateway.");
      }
    } catch (err) {
      alert("Payment initiation failed. Check backend console.");
    } finally { setBookingLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-20">
      {/* 1. PROGRESS BAR */}
      <div className="bg-white border-b py-6 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto flex justify-between items-center px-6 min-w-[800px]">
          {[1, 2, 3, 4, 5, 6].map((step) => {
            const labels = ["", "Select Department", "Select the doctor", "Select Appointment time", "Verify Patient", "Payments", "Video Consultation"];
            return (
              <div key={step} className="flex flex-col items-center flex-1 relative">
                <div className={`w-3 h-3 rounded-full z-10 ${currentStep >= step ? "bg-red-500" : "bg-gray-300"}`}>
                   {currentStep > step && <Check size={10} className="text-white mx-auto mt-0.5" />}
                </div>
                <span className={`text-[10px] mt-2 font-bold uppercase ${currentStep >= step ? "text-red-500" : "text-gray-400"}`}>Step {step}</span>
                <span className={`text-[11px] text-center ${currentStep === step ? "text-red-600 font-bold" : "text-gray-400"}`}>{labels[step]}</span>
                {step < 6 && <div className={`absolute top-1.5 left-1/2 w-full h-[1.5px] ${currentStep > step ? "bg-red-500" : "bg-gray-200"}`}></div>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* DOCTOR LIST (Steps 2 & 3) */}
        {currentStep <= 3 && (
          <div className="space-y-6">
            <div className="flex gap-4 bg-white p-4 rounded border">
              <input type="text" placeholder="Find Doctor" className="flex-1 border p-2 rounded outline-none" onChange={(e) => setSearch({...search, name: e.target.value})} />
              <button onClick={() => fetchDoctors(search)} className="bg-red-500 text-white p-2.5 rounded hover:bg-red-600"><Search size={18}/></button>
            </div>
            {doctors.map((doc) => (
              <div key={doc._id} className="bg-white border rounded-lg flex overflow-hidden shadow-sm">
                <div className="w-1/3 p-6 bg-gray-50 border-r flex flex-col items-center text-center">
                  <img src={doc.image ? `http://localhost:5000${doc.image}` : null} className="w-24 h-24 rounded-full border-4 border-white shadow mb-4 object-cover" alt="" />
                  <h2 className="text-lg font-bold">Dr. {doc.userId?.name}</h2>
                  <p className="text-xs text-red-500 font-bold uppercase">{doc.specialty}</p>
                </div>
                <div className="w-2/3 p-6">
                  <table className="w-full text-sm">
                    <tbody className="divide-y">
                      {doc.availability?.map((avail, idx) => (
                        <tr key={idx}>
                          <td className="py-4 font-medium w-32">{avail.date}</td>
                          <td className="py-4 flex flex-wrap gap-2">
                            {avail.slots?.map((slot, sIdx) => (
                              <button key={sIdx} onClick={() => handleSelectSlot(doc, avail.date, slot)} 
                                className="bg-gray-700 text-white px-3 py-1 rounded text-xs hover:bg-red-500">
                                {typeof slot === 'object' ? slot.time : slot}
                              </button>
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* STEP 4: VERIFY PATIENT */}
        {currentStep === 4 && (
          <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-8">
            <div className="flex-1 bg-white p-8 rounded-xl border shadow-sm">
              <button onClick={() => setCurrentStep(2)} className="flex items-center text-gray-400 hover:text-red-500 mb-6 font-bold text-[10px] uppercase">
                <ArrowLeft size={16} className="mr-2" /> Change Selection
              </button>
              <h3 className="text-xl font-bold mb-6">Verify Patient Information</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div><label className="text-[10px] font-black text-gray-400 uppercase">Patient Name</label><input type="text" className="w-full border rounded-lg p-3 bg-gray-50" placeholder="Full Name" /></div>
                <div><label className="text-[10px] font-black text-gray-400 uppercase">Phone Number</label><input type="text" className="w-full border rounded-lg p-3 bg-gray-50" placeholder="+977" /></div>
                <div className="col-span-2"><label className="text-[10px] font-black text-gray-400 uppercase">Reason/Note</label><textarea value={note} onChange={(e) => setNote(e.target.value)} rows="4" className="w-full border rounded-lg p-3 bg-gray-50" placeholder="Symptoms..."></textarea></div>
              </div>
            </div>
            <div className="lg:w-80 bg-white border rounded-xl p-6 h-fit shadow-sm">
                <h4 className="text-[10px] font-black text-gray-400 uppercase border-b pb-2 mb-4">Summary</h4>
                <div className="flex justify-between text-sm py-2"><span>Date:</span><span className="font-bold">{appointmentDate}</span></div>
                <div className="flex justify-between text-sm py-2"><span>Time:</span><span className="font-bold">{timeSlot}</span></div>
                <div className="flex justify-between text-lg font-black pt-4 border-t mt-4"><span>Total Fee</span><span className="text-red-600">Rs. {selectedDoctor?.fee || 500}</span></div>
                <button onClick={bookAppointment} disabled={bookingLoading} className="w-full bg-red-600 text-white py-4 rounded-xl font-black uppercase text-[10px] mt-6 tracking-widest">
                  {bookingLoading ? "Processing..." : "Confirm & Pay"}
                </button>
            </div>
          </div>
        )}

        {/* STEP 5: PAYMENTS */}
        {currentStep === 5 && (
          <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in">
            <div className="lg:w-[450px] bg-white p-8 rounded-xl border shadow-sm">
              <div className="flex gap-4 border-b pb-6 mb-6">
                <img src={selectedDoctor?.image ? `http://localhost:5000${selectedDoctor.image}` : null} className="w-20 h-20 rounded-lg object-cover" alt="" />
                <div>
                  <h2 className="text-lg font-bold">Dr. {selectedDoctor?.userId?.name}</h2>
                  <p className="text-[10px] text-teal-600 font-bold uppercase flex items-center gap-1"><Zap size={10}/> {selectedDoctor?.specialty}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 bg-gray-50 rounded-lg border divide-x divide-y text-center">
                <div className="p-4"><p className="text-[9px] text-red-500 font-bold uppercase">Date</p><p className="text-xs font-bold">{appointmentDate}</p></div>
                <div className="p-4"><p className="text-[9px] text-red-500 font-bold uppercase">Time</p><p className="text-xs font-bold">{timeSlot}</p></div>
                <div className="p-4 border-t"><p className="text-[9px] text-red-500 font-bold uppercase">Fee</p><p className="text-xs font-bold">Rs {selectedDoctor?.fee || 500}</p></div>
                <div className="p-4 border-t"><p className="text-[9px] text-red-500 font-bold uppercase">Token No</p><p className="text-xs font-bold">#24263002</p></div>
              </div>
            </div>

            <div className="flex-1 bg-white p-8 rounded-xl border shadow-sm">
               <p className="text-[10px] font-bold text-gray-400 uppercase text-center">Payment Amount</p>
               <p className="text-3xl font-black text-center text-gray-800 mb-8">Rs {selectedDoctor?.fee || 500}</p>
               <div className="grid grid-cols-4 gap-4">
                  <div onClick={handleKhaltiPayment} className="border-2 rounded-xl p-4 flex flex-col items-center cursor-pointer hover:border-purple-600 transition group">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/e/ee/Khalti_Digital_Wallet_Logo.png" className="h-6 object-contain mb-2" alt="Khalti" />
                    <div className="w-3 h-3 rounded-full border-2 group-hover:bg-purple-600 transition"></div>
                  </div>
                  {['eSewa', 'ConnectIPS', 'IME Pay'].map(m => (
                    <div key={m} className="border-2 border-gray-100 opacity-40 rounded-xl p-4 flex items-center justify-center grayscale text-[9px] font-bold text-gray-400 uppercase">
                       {m}
                    </div>
                  ))}
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}