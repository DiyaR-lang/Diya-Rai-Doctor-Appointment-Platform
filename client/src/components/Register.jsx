import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

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
  });

  const [imageFile, setImageFile] = useState(null); // ✅ store file
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setImageFile(e.target.files[0]); // store selected file
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setSuccess("");
    setLoading(true);

    try {
      const formData = new FormData();

      // append all form fields
      for (let key in form) {
        formData.append(key, form[key]);
      }

      // append image if selected
      if (imageFile) {
        formData.append("image", imageFile);
      }

      const res = await axios.post(
        "http://localhost:3000/api/auth/register",
        formData,
        { headers: { "Content-Type": "multipart/form-data" }, timeout: 10000 }
      );

      console.log("Registered:", res.data);
      setSuccess("✅ Registration successful! Redirecting to login...");

      setTimeout(() => {
        navigate("/login?force=true");
      }, 1000);

    } catch (err) {
      console.log("Register error:", err);

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

  return (
    <div style={{ padding: 30, maxWidth: 500, margin: "auto" }}>
      <h2 className="text-2xl font-bold mb-4">Register</h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          name="name"
          placeholder="Name"
          onChange={handleChange}
          required
          className="border px-2 py-1 rounded"
        />

        <input
          name="email"
          type="email"
          placeholder="Email"
          onChange={handleChange}
          required
          className="border px-2 py-1 rounded"
        />

        <input
          name="password"
          type="password"
          placeholder="Password"
          onChange={handleChange}
          required
          className="border px-2 py-1 rounded"
        />

        <select
          name="role"
          value={form.role}
          onChange={handleChange}
          required
          className="border px-2 py-1 rounded"
        >
          <option value="">Select Role</option>
          <option value="admin">Admin</option>
          <option value="doctor">Doctor</option>
          <option value="patient">Patient</option>
        </select>

        {/* Doctor-specific fields */}
        {form.role === "doctor" && (
          <>
            <input
              name="specialty"
              placeholder="Specialty (e.g., Cardiology)"
              onChange={handleChange}
              required
              className="border px-2 py-1 rounded"
            />
            <input
              name="experience"
              type="number"
              placeholder="Experience (years)"
              onChange={handleChange}
              required
              className="border px-2 py-1 rounded"
            />
            <input
              name="fee"
              type="number"
              placeholder="Consultation Fee"
              onChange={handleChange}
              required
              className="border px-2 py-1 rounded"
            />
            <input
              name="bio"
              placeholder="Short Bio"
              onChange={handleChange}
              className="border px-2 py-1 rounded"
            />
            <input
              name="phone"
              placeholder="Phone Number"
              onChange={handleChange}
              required
              className="border px-2 py-1 rounded"
            />
            <input
              name="address"
              placeholder="Address"
              onChange={handleChange}
              required
              className="border px-2 py-1 rounded"
            />
            {/* File input for profile image */}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              required
              className="border px-2 py-1 rounded"
            />
          </>
        )}

        {/* Optional profile image for admin/patient */}
        {(form.role === "admin" || form.role === "patient") && (
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="border px-2 py-1 rounded"
          />
        )}

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mt-2"
        >
          {loading ? "Registering..." : "Register"}
        </button>
      </form>

      {message && <p className="text-red-500 mt-2">{message}</p>}
      {success && <p className="text-green-500 mt-2">{success}</p>}
    </div>
  );
}
