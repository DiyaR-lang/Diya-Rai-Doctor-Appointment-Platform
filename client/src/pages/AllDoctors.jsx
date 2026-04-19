import React, { useEffect, useState } from "react";
import axios from "axios";
import { Search, ArrowLeft, Check, Zap, Printer, Loader2 } from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";

export default function AllDoctors() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState({ name: "", specialty: "" });
  
  // Booking States
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [appointmentDate, setAppointmentDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [note, setNote] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [appointmentId, setAppointmentId] = useState(null);
  const [currentStep, setCurrentStep] = useState(2); // Start at Doctors list
  const [paymentDetails, setPaymentDetails] = useState(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryPidx = searchParams.get("pidx");

  // --- 1. HANDLE KHALTI REDIRECT (Verification) ---
  useEffect(() => {
    if (queryPidx) {
      const finalizeBooking = async () => {
        setBookingLoading(true);
        setCurrentStep(5); // Show loading state in payment step
        try {
          const savedId = localStorage.getItem("pendingAppointmentId");
          const savedDoc = JSON.parse(localStorage.getItem("pendingDoctor"));

          const res = await axios.post("http://localhost:5000/api/payment/verify", {
            pidx: queryPidx,
            appointmentId: savedId
          });

          if (res.data.success) {
            setSelectedDoctor(savedDoc);
            setPaymentDetails(res.data.payment); // Data from backend verify
            setCurrentStep(6); // Move to Receipt
            
            // Cleanup
            localStorage.removeItem("pendingAppointmentId");
            localStorage.removeItem("pendingDoctor");
            setSearchParams({}); 
          }
        } catch (err) {
          console.error("Verification failed", err);
          alert("Payment verification failed. Please contact support.");
          setCurrentStep(2);
        } finally {
          setBookingLoading(false);
        }
      };
      finalizeBooking();
    }
  }, [queryPidx, setSearchParams]);

  // --- 2. FETCH DOCTORS ---
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

  // --- 3. SELECTION LOGIC ---
  const handleSelectSlot = (doc, date, slot) => {
    setSelectedDoctor(doc);
    setAppointmentDate(date);
    const slotTime = typeof slot === 'object' ? slot.time : slot;
    setTimeSlot(slotTime);
    setCurrentStep(4); // Move to Verify Info
    window.scrollTo(0, 0);
  };

  // --- 4. CREATE INITIAL APPOINTMENT ---
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
      setCurrentStep(5); // Move to Payment Gateway
    } catch (err) {
      alert(err.response?.data?.message || "Booking failed");
    } finally { setBookingLoading(false); }
  };

  // --- 5. INITIATE KHALTI ---
  const handleKhaltiPayment = async () => {
    if (!appointmentId) return alert("Session expired. Please re-book.");
    
    // Store context for when user returns from Khalti
    localStorage.setItem("pendingAppointmentId", appointmentId);
    localStorage.setItem("pendingDoctor", JSON.stringify(selectedDoctor));

    setBookingLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        "http://localhost:5000/api/payment/khalti/initiate",
        { 
            appointmentId, 
            amount: selectedDoctor.fee || 500,
            patientName: "User" // You can pull this from your auth state
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success && res.data.payment_url) {
        window.location.href = res.data.payment_url;
      } else {
        alert("Payment initiation failed.");
      }
    } catch (err) {
      console.error(err);
      alert("Payment initiation failed.");
    } finally { setBookingLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-20">
      {/* STEPPER NAVIGATION */}
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
        {/* VIEW 1: DOCTOR LISTING */}
        {currentStep <= 3 && (
          <div className="space-y-6">
            <div className="flex gap-4 bg-white p-4 rounded border shadow-sm">
              <input 
                type="text" 
                placeholder="Find Doctor" 
                className="flex-1 border p-2 rounded outline-none" 
                onChange={(e) => setSearch({...search, name: e.target.value})} 
              />
              <button onClick={() => fetchDoctors(search)} className="bg-red-500 text-white p-2.5 rounded hover:bg-red-600 transition">
                {loading ? <Loader2 className="animate-spin" size={18}/> : <Search size={18}/>}
              </button>
            </div>

            {doctors.filter(d => d.isVerified).map((doc) => (
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
                            {avail.slots?.map((slot, sIdx) => {
                                const isBooked = typeof slot === 'object' ? slot.isBooked : false;
                                return (
                                    <button 
                                        key={sIdx} 
                                        disabled={isBooked}
                                        onClick={() => handleSelectSlot(doc, avail.date, slot)} 
                                        className={`px-3 py-1 rounded text-xs transition ${isBooked ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-gray-700 text-white hover:bg-red-500"}`}>
                                        {typeof slot === 'object' ? slot.time : slot}
                                    </button>
                                );
                            })}
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

        {/* VIEW 2: VERIFY INFO */}
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
                <div className="flex justify-between text-sm py-2"><span>Doctor:</span><span className="font-bold">Dr. {selectedDoctor?.userId?.name}</span></div>
                <div className="flex justify-between text-sm py-2"><span>Date:</span><span className="font-bold">{appointmentDate}</span></div>
                <div className="flex justify-between text-sm py-2"><span>Time:</span><span className="font-bold">{timeSlot}</span></div>
                <div className="flex justify-between text-lg font-black pt-4 border-t mt-4"><span>Total Fee</span><span className="text-red-600">Rs. {selectedDoctor?.fee || 500}</span></div>
                <button onClick={bookAppointment} disabled={bookingLoading} className="w-full bg-red-600 text-white py-4 rounded-xl font-black uppercase text-[10px] mt-6 tracking-widest hover:bg-red-700 transition disabled:bg-gray-400">
                  {bookingLoading ? "Creating Appointment..." : "Confirm & Pay"}
                </button>
            </div>
          </div>
        )}

        {/* VIEW 3: PAYMENT CHOICE */}
        {currentStep === 5 && (
          <div className="max-w-md mx-auto bg-white p-10 rounded-2xl border shadow-xl text-center">
             {bookingLoading ? (
               <div className="py-10">
                 <Loader2 className="animate-spin h-10 w-10 text-red-500 mx-auto mb-4" />
                 <p className="text-gray-500 font-bold uppercase text-[10px]">Communicating with Khalti...</p>
               </div>
             ) : (
               <>
                <Zap className="mx-auto text-yellow-500 mb-4" size={40} />
                <h2 className="text-2xl font-black mb-8">Secure Checkout</h2>
                <div onClick={handleKhaltiPayment} className="border-2 border-purple-200 rounded-2xl p-6 flex flex-col items-center cursor-pointer hover:border-purple-600 hover:bg-purple-50 transition group">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/e/ee/Khalti_Digital_Wallet_Logo.png" className="h-8 object-contain mb-4" alt="Khalti" />
                  <span className="text-xs font-bold text-purple-700 uppercase">Pay Rs. {selectedDoctor?.fee || 500}</span>
                </div>
               </>
             )}
          </div>
        )}

        {/* VIEW 4: FINAL RECEIPT */}
        {currentStep === 6 && (
          <div className="max-w-2xl mx-auto bg-white border rounded-xl overflow-hidden shadow-2xl animate-in zoom-in duration-300">
             <div className="bg-green-600 p-8 text-white text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check size={32} className="text-white" />
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tighter">Booking Confirmed</h2>
                <p className="text-sm opacity-80 mt-1">Your payment was successful.</p>
             </div>
             <div className="p-8">
                <div className="flex justify-between items-center border-b pb-6 mb-6">
                   <div>
                     <p className="text-[10px] font-bold text-gray-400 uppercase">Transaction ID (Pidx)</p>
                     <p className="font-mono text-xs text-gray-600">{paymentDetails?.transactionId || queryPidx}</p>
                   </div>
                   <div className="text-right">
                     <p className="text-[10px] font-bold text-gray-400 uppercase">Date</p>
                     <p className="text-sm font-bold">{new Date().toLocaleDateString()}</p>
                   </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                    <div className="flex justify-between text-sm py-1"><span>Doctor</span><span className="font-bold">Dr. {selectedDoctor?.userId?.name}</span></div>
                    <div className="flex justify-between text-sm py-1"><span>Appointment</span><span className="font-bold">{appointmentDate} at {timeSlot}</span></div>
                </div>

                <div className="flex justify-between text-xl border-t pt-4 font-black">
                    <span>Total Paid</span>
                    <span className="text-red-600">Rs. {paymentDetails?.amount || selectedDoctor?.fee}</span>
                </div>

                <div className="flex gap-4 mt-8">
                  <button onClick={() => window.print()} className="flex-1 bg-gray-800 text-white py-4 rounded-xl font-bold uppercase text-[10px] flex items-center justify-center gap-2">
                    <Printer size={16}/> Print Receipt
                  </button>
                  <button onClick={() => navigate('/patient-dashboard')} className="flex-1 border-2 border-gray-200 text-gray-800 py-4 rounded-xl font-bold uppercase text-[10px]">
                    My Appointments
                  </button>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}