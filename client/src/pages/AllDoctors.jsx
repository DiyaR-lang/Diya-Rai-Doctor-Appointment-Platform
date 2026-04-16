import React, { useEffect, useState } from "react";
import axios from "axios";
import { Search, ArrowLeft, Check, Zap, Printer } from "lucide-react";
import { useSearchParams } from "react-router-dom";

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
  const queryPidx = searchParams.get("pidx");

  // --- 1. AUTO-VERIFICATION LOGIC (The Fix) ---
  useEffect(() => {
    if (queryPidx) {
      const finalizeBooking = async () => {
        setBookingLoading(true);
        try {
          // Retrieve values saved before the Khalti redirect
          const savedId = localStorage.getItem("pendingAppointmentId");
          const savedDoc = JSON.parse(localStorage.getItem("pendingDoctor"));

          const res = await axios.post("http://localhost:5000/api/payment/verify", {
            pidx: queryPidx,
            appointmentId: savedId
          });

          if (res.data.success) {
            setSelectedDoctor(savedDoc);
            setPaymentDetails(res.data.payment);
            setCurrentStep(6); // Jump to the Receipt Step
            
            // Success Cleanup
            localStorage.removeItem("pendingAppointmentId");
            localStorage.removeItem("pendingDoctor");
            // Clear pidx from URL so refresh doesn't trigger verification again
            setSearchParams({}); 
          }
        } catch (err) {
          console.error("Verification failed", err);
          alert("Payment verification failed. Please contact support.");
        } finally {
          setBookingLoading(false);
        }
      };
      finalizeBooking();
    }
  }, [queryPidx, setSearchParams]);

  // --- 2. DATA FETCHING ---
  const fetchDoctors = async (filters = {}) => {
    setLoading(true);
    try {
      const res = await axios.post("http://localhost:5000/api/doctors/search", filters);
      setDoctors(res.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchDoctors(); }, []);

  // --- 3. SELECTION & BOOKING ---
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
          doctorUserId: selectedDoctor.userId?._id || selectedDoctor.userId,
          date: appointmentDate,
          time: timeSlot,
          note,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAppointmentId(res.data._id);
      setCurrentStep(5); 
    } catch (err) {
      alert(err.response?.data?.message || "Booking failed");
    } finally { setBookingLoading(false); }
  };

  // --- 4. KHALTI REDIRECT HANDLER ---
  const handleKhaltiPayment = async () => {
    if (!appointmentId) return alert("Session expired. Please re-book.");
    
    // Save critical data to localStorage before leaving the site
    localStorage.setItem("pendingAppointmentId", appointmentId);
    localStorage.setItem("pendingDoctor", JSON.stringify(selectedDoctor));

    setBookingLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        "http://localhost:5000/api/payment/khalti/initiate",
        { appointmentId, amount: selectedDoctor.fee || 500 },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success && res.data.payment_url) {
        window.location.href = res.data.payment_url;
      } else {
        alert("Payment initiation failed.");
      }
    } catch (err) {
      alert("Payment initiation failed.");
    } finally { setBookingLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-20">
      {/* 1. PROGRESS BAR */}
      <div className="bg-white border-b py-6 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto flex justify-between items-center px-6">
          {[1, 2, 3, 4, 5, 6].map((step) => {
            const labels = ["", "Department", "Doctors", "Selection", "Verify", "Payments", "Receipt"];
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
            <div className="flex gap-4 bg-white p-4 rounded border shadow-sm">
              <input type="text" placeholder="Find Doctor" className="flex-1 border p-2 rounded outline-none" onChange={(e) => setSearch({...search, name: e.target.value})} />
              <button onClick={() => fetchDoctors(search)} className="bg-red-500 text-white p-2.5 rounded hover:bg-red-600 transition"><Search size={18}/></button>
            </div>
            {doctors.map((doc) => (
              <div key={doc._id} className="bg-white border rounded-lg flex overflow-hidden shadow-sm hover:shadow-md transition">
                <div className="w-1/3 p-6 bg-gray-50 border-r flex flex-col items-center text-center">
                  <img src={doc.image ? `http://localhost:5000${doc.image}` : "https://via.placeholder.com/150"} className="w-24 h-24 rounded-full border-4 border-white shadow mb-4 object-cover" alt="" />
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
                                className="bg-gray-700 text-white px-3 py-1 rounded text-xs hover:bg-red-500 transition">
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

        {/* STEP 4: VERIFY PATIENT INFO */}
        {currentStep === 4 && (
          <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-8 animate-in slide-in-from-bottom-4">
            <div className="flex-1 bg-white p-8 rounded-xl border shadow-sm">
              <button onClick={() => setCurrentStep(2)} className="flex items-center text-gray-400 hover:text-red-500 mb-6 font-bold text-[10px] uppercase">
                <ArrowLeft size={16} className="mr-2" /> Change Selection
              </button>
              <h3 className="text-xl font-bold mb-6">Verify Information</h3>
              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-400 uppercase">Symptoms / Notes</label>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows="4" className="w-full border rounded-lg p-3 bg-gray-50 outline-none focus:border-red-500 transition" placeholder="Tell the doctor what's wrong..."></textarea>
              </div>
            </div>
            <div className="lg:w-80 bg-white border rounded-xl p-6 h-fit shadow-sm">
                <h4 className="text-[10px] font-black text-gray-400 uppercase border-b pb-2 mb-4">Summary</h4>
                <div className="flex justify-between text-sm py-2"><span>Date:</span><span className="font-bold">{appointmentDate}</span></div>
                <div className="flex justify-between text-sm py-2"><span>Time:</span><span className="font-bold">{timeSlot}</span></div>
                <div className="flex justify-between text-lg font-black pt-4 border-t mt-4"><span>Total Fee</span><span className="text-red-600">Rs. {selectedDoctor?.fee || 500}</span></div>
                <button onClick={bookAppointment} disabled={bookingLoading} className="w-full bg-red-600 text-white py-4 rounded-xl font-black uppercase text-[10px] mt-6 tracking-widest hover:bg-red-700 transition">
                  {bookingLoading ? "Processing..." : "Confirm & Pay"}
                </button>
            </div>
          </div>
        )}

        {/* STEP 5: PAYMENT GATEWAY */}
        {currentStep === 5 && (
          <div className="max-w-md mx-auto bg-white p-10 rounded-2xl border shadow-xl text-center animate-in zoom-in-95">
             {bookingLoading ? (
               <div className="py-10">
                 <div className="animate-spin h-10 w-10 border-4 border-red-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                 <p className="text-gray-500 font-bold uppercase text-[10px]">Processing...</p>
               </div>
             ) : (
               <>
                <Zap className="mx-auto text-yellow-500 mb-4" size={40} />
                <h2 className="text-2xl font-black mb-8">Secure Checkout</h2>
                <div onClick={handleKhaltiPayment} className="border-2 rounded-2xl p-6 flex flex-col items-center cursor-pointer hover:border-purple-600 hover:bg-purple-50 transition group">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/e/ee/Khalti_Digital_Wallet_Logo.png" className="h-8 object-contain mb-4" alt="Khalti" />
                  <span className="text-xs font-bold text-purple-700 uppercase">Pay Rs. {selectedDoctor?.fee || 500}</span>
                </div>
               </>
             )}
          </div>
        )}

        {/* STEP 6: FINAL RECEIPT */}
        {currentStep === 6 && (
          <div className="max-w-2xl mx-auto bg-white border rounded-xl overflow-hidden shadow-2xl animate-in zoom-in duration-300">
             <div className="bg-green-600 p-8 text-white text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check size={32} className="text-white" />
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tighter">Booking Confirmed</h2>
                <p className="text-sm opacity-80 mt-1">Dr. {selectedDoctor?.userId?.name} is expecting you.</p>
             </div>
             <div className="p-8">
                <div className="flex justify-between items-center border-b pb-6 mb-6">
                   <div>
                     <p className="text-[10px] font-bold text-gray-400 uppercase">Transaction ID</p>
                     <p className="font-mono text-sm">{paymentDetails?.transactionId || "N/A"}</p>
                   </div>
                   <div className="text-right">
                     <p className="text-[10px] font-bold text-gray-400 uppercase">Date</p>
                     <p className="text-sm font-bold">{new Date().toLocaleDateString()}</p>
                   </div>
                </div>
                <div className="space-y-4 mb-8">
                   <div className="flex justify-between text-xl border-t pt-4 font-black">
                     <span>Total Paid</span>
                     <span className="text-red-600">Rs. {paymentDetails?.amount || selectedDoctor?.fee}</span>
                   </div>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => window.print()} className="flex-1 bg-gray-800 text-white py-4 rounded-xl font-bold uppercase text-[10px] flex items-center justify-center gap-2">
                    <Printer size={16}/> Print Receipt
                  </button>
                  <button onClick={() => window.location.href = '/patient-dashboard'} className="flex-1 border-2 border-gray-200 text-gray-800 py-4 rounded-xl font-bold uppercase text-[10px]">
                    Go to Dashboard
                  </button>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}