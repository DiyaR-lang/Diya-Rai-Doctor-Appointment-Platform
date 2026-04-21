import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useLocation, Link } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const forceLogin = new URLSearchParams(location.search).get("force");

  const [form, setForm] = useState({
    email: localStorage.getItem("email") || "",
    password: "",
    role: localStorage.getItem("role") || "",
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!forceLogin && userStr && userStr !== "undefined") {
      try {
        const user = JSON.parse(userStr);
        const role = user.role;
        // Admin redirection removed
        if (role === "doctor") navigate("/doctor/dashboard");
        else if (role === "patient") navigate("/patient/dashboard");
      } catch (error) {
        localStorage.removeItem("user");
      }
    }
  }, [navigate, forceLogin]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    try {
      const res = await axios.post("http://localhost:5000/api/auth/login", form);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      localStorage.setItem("email", res.data.user.email);
      localStorage.setItem("role", res.data.user.role);
      
      const role = res.data.user.role;
      // Redirection logic updated to exclude admin
      if (role === "doctor") {
        navigate("/doctor/dashboard");
      } else {
        navigate("/patient/dashboard");
      }
    } catch (err) {
      setMessage(err.response?.data?.message || "❌ Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        
        {/* Left Side: Visual Panel */}
        <div className="md:w-1/2 bg-gradient-to-br from-blue-600 to-cyan-500 p-12 text-white flex flex-col justify-center items-center text-center">
          <div className="mb-8 bg-white/20 p-4 rounded-full">
             <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
          </div>
          <h2 className="text-4xl font-bold mb-4">MedConnect</h2>
          <p className="text-blue-50 text-lg">Your health, our priority. Access your medical portal securely.</p>
        </div>

        {/* Right Side: Form */}
        <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
          <div className="text-right mb-8">
            <p className="text-sm text-gray-500">Don't have an account? <Link to="/register" className="text-blue-600 font-semibold border-2 border-blue-600 px-4 py-1 rounded-full hover:bg-blue-600 hover:text-white transition-all">Sign Up</Link></p>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome Back</h1>
          <p className="text-gray-500 mb-8">Please enter your details to sign in.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-gray-400">Email Address</label>
              <input name="email" type="email" placeholder="name@hospital.com" className="w-full border-b-2 border-gray-100 focus:border-blue-500 outline-none py-2 transition-colors" value={form.email} onChange={handleChange} required />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-gray-400">Password</label>
              <input name="password" type="password" placeholder="••••••••" className="w-full border-b-2 border-gray-100 focus:border-blue-500 outline-none py-2 transition-colors" value={form.password} onChange={handleChange} required />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-gray-400">Role</label>
              <select name="role" className="w-full border-b-2 border-gray-100 focus:border-blue-500 outline-none py-2 bg-transparent transition-colors" value={form.role} onChange={handleChange} required>
                <option value="">Select Role</option>
                {/* Admin option removed */}
                <option value="doctor">Doctor</option>
                <option value="patient">Patient</option>
              </select>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all mt-6 active:scale-95">
              {loading ? "Authenticating..." : "Sign In"}
            </button>
          </form>

          {message && <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm text-center border border-red-100">{message}</div>}
        </div>
      </div>
    </div>
  );
}