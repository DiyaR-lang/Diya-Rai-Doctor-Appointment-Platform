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

  // Redirect if already logged in
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!forceLogin && userStr) {
      const user = JSON.parse(userStr);
      const role = user.role;
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

      // Save full user object + token
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      localStorage.setItem("email", res.data.user.email);
      localStorage.setItem("role", res.data.user.role);

      // Redirect based on role
      const role = res.data.user.role;
      if (role === "admin") navigate("/admin/dashboard");
      else if (role === "doctor") navigate("/doctor/dashboard");
      else navigate("/patient/dashboard");

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
