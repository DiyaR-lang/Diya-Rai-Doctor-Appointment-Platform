import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "",
    specialty: "",
    experience: "",
    fee: "",
    bio: "",
    phone: "",
    address: "",
    nmcId: "", // Added to match your Doctor model
  });

  const [imageFile, setImageFile] = useState(null);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setImageFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setSuccess("");
    setLoading(true);

    try {
      const formData = new FormData();
      for (let key in form) {
        formData.append(key, form[key]);
      }
      if (imageFile) {
        formData.append("image", imageFile);
      }

      const res = await axios.post(
        "http://localhost:5000/api/auth/register",
        formData,
        { headers: { "Content-Type": "multipart/form-data" }, timeout: 10000 }
      );

      setSuccess("✅ Registration successful! Redirecting to login...");
      setTimeout(() => {
        navigate("/login?force=true");
      }, 1500);

    } catch (err) {
      if (err.response) {
        setMessage(`❌ ${err.response.data.message || "Server error"}`);
      } else if (err.request) {
        setMessage("❌ Backend not responding. Is server running?");
      } else {
        setMessage("❌ Something went wrong in frontend");
      }
    } finally {
      setLoading(false);
    }
  };

  // UI Styles
  const pageStyle = {
    background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 20px"
  };

  const inputClass = "w-full border border-gray-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div style={pageStyle}>
      <div className="bg-white shadow-2xl rounded-2xl p-8 w-full max-w-lg">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-gray-800">Create Account</h2>
          <p className="text-gray-500 mt-2">Join our medical community today</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Base Fields */}
          <div>
            <label className={labelClass}>Full Name</label>
            <input name="name" placeholder="John Doe" onChange={handleChange} required className={inputClass} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Email Address</label>
              <input name="email" type="email" placeholder="john@example.com" onChange={handleChange} required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Password</label>
              <input name="password" type="password" placeholder="••••••••" onChange={handleChange} required className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Select Role</label>
            <select name="role" value={form.role} onChange={handleChange} required className={inputClass}>
              <option value="">Choose your profile...</option>
              {/* Removed Admin Role */}
              <option value="doctor">Doctor</option>
              <option value="patient">Patient</option>
            </select>
          </div>

          {/* Doctor-specific fields */}
          {form.role === "doctor" && (
            <div className="bg-blue-50 p-4 rounded-xl space-y-4 border border-blue-100 animate-in fade-in slide-in-from-top-4 duration-300">
              <h3 className="font-semibold text-blue-800 text-sm uppercase tracking-wider">Professional Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input name="nmcId" placeholder="NMC ID Number" onChange={handleChange} required className={inputClass} />
                <input name="specialty" placeholder="Specialty (e.g. Cardiology)" onChange={handleChange} required className={inputClass} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input name="experience" type="number" placeholder="Experience (Years)" onChange={handleChange} required className={inputClass} />
                <input name="fee" type="number" placeholder="Consultation Fee (Rs.)" onChange={handleChange} required className={inputClass} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input name="phone" placeholder="Phone Number" onChange={handleChange} required className={inputClass} />
                <input name="address" placeholder="Clinic Address" onChange={handleChange} required className={inputClass} />
              </div>

              <textarea name="bio" placeholder="Tell patients about yourself..." onChange={handleChange} rows="2" className={inputClass} />
              
              <div>
                <label className={labelClass}>Medical License / Profile Image</label>
                <input type="file" accept="image/*" onChange={handleFileChange} required className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700" />
              </div>
            </div>
          )}

          {/* Optional profile image for patient */}
          {form.role === "patient" && (
            <div>
              <label className={labelClass}>Profile Image (Optional)</label>
              <input type="file" accept="image/*" onChange={handleFileChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300" />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg font-bold text-white shadow-lg transition-all transform active:scale-95 ${
              loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "Creating Account..." : "Register Now"}
          </button>
        </form>

        {message && (
          <div className="mt-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded-lg text-sm text-center">
            {message}
          </div>
        )}
        
        {success && (
          <div className="mt-4 p-3 bg-green-100 border border-green-200 text-green-700 rounded-lg text-sm text-center">
            {success}
          </div>
        )}

        <p className="text-center mt-6 text-gray-600">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-600 font-semibold hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}