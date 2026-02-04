import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useLocation, Link } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  // Check if the user clicked login from navbar
  const forceLogin = new URLSearchParams(location.search).get("force");

  // Prefill email and role if previously stored
  const [form, setForm] = useState({
    email: localStorage.getItem("email") || "",
    password: "",
    role: localStorage.getItem("role") || "",
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect to dashboard only if token exists AND not coming from navbar login
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!forceLogin && token && role) {
      if (role === "admin") navigate("/admin/dashboard");
      else if (role === "doctor") navigate("/doctor/dashboard");
      else if (role === "patient") navigate("/patient/dashboard");
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
      const res = await axios.post(
        "http://localhost:3000/api/auth/login",
        form,
        { headers: { "Content-Type": "application/json" } }
      );

      // Save auth data for persistent login
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.user.role);
      localStorage.setItem("name", res.data.user.name);
      localStorage.setItem("email", res.data.user.email);

      // Role-based redirect
      const role = res.data.user.role;
      if (role === "admin") navigate("/admin/dashboard");
      else if (role === "doctor") navigate("/doctor/dashboard");
      else if (role === "patient") navigate("/patient/dashboard");
      else navigate("/login"); // fallback

    } catch (err) {
      console.log("Login error:", err.response?.data || err.message);
      setMessage(err.response?.data?.message || "❌ Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 30, maxWidth: 400, margin: "auto" }}>
      <h2>Login</h2>

      <form onSubmit={handleSubmit}>
        <input
          name="email"
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          required
        />
        <br /><br />

        <input
          name="password"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          required
        />
        <br /><br />

        <select
          name="role"
          value={form.role}
          onChange={handleChange}
          required
        >
          <option value="">Select Role</option>
          <option value="admin">Admin</option>
          <option value="doctor">Doctor</option>
          <option value="patient">Patient</option>
        </select>
        <br /><br />

        <button type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      {message && <p style={{ color: "red", marginTop: 10 }}>{message}</p>}

      <p style={{ marginTop: 15 }}>
        Don’t have an account?{" "}
        <Link to="/register" style={{ color: "blue" }}>
          Register here
        </Link>
      </p>
    </div>
  );
}
