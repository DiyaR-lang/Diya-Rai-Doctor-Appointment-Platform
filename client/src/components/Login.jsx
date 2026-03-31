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
        "http://localhost:5000/api/auth/login",
        form,
        { headers: { "Content-Type": "application/json" } }
      );

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      localStorage.setItem("email", res.data.user.email);
      localStorage.setItem("role", res.data.user.role);

      const role = res.data.user.role;
      if (role === "admin") navigate("/admin/dashboard");
      else if (role === "doctor") navigate("/doctor/dashboard");
      else navigate("/patient/dashboard");

    } catch (err) {
      setMessage(err.response?.data?.message || "❌ Login failed");
    } finally {
      setLoading(false);
    }
  };

  // --- UI Styles ---
  const styles = {
    container: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "100vh",
      backgroundColor: "#f0f2f5",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    },
    card: {
      backgroundColor: "#ffffff",
      padding: "40px",
      borderRadius: "12px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
      width: "100%",
      maxWidth: "400px",
      textAlign: "center",
    },
    header: {
      marginBottom: "24px",
      color: "#1a1a1b",
      fontSize: "28px",
      fontWeight: "600",
    },
    input: {
      width: "100%",
      padding: "12px 16px",
      margin: "8px 0",
      boxSizing: "border-box",
      borderRadius: "8px",
      border: "1px solid #ddd",
      fontSize: "16px",
      outline: "none",
      transition: "border-color 0.3s",
    },
    button: {
      width: "100%",
      padding: "12px",
      marginTop: "20px",
      borderRadius: "8px",
      border: "none",
      backgroundColor: loading ? "#a0aec0" : "#4A90E2",
      color: "white",
      fontSize: "16px",
      fontWeight: "bold",
      cursor: loading ? "not-allowed" : "pointer",
      transition: "background-color 0.3s",
    },
    linkText: {
      marginTop: "20px",
      fontSize: "14px",
      color: "#666",
    },
    error: {
      color: "#e53e3e",
      backgroundColor: "#fff5f5",
      padding: "10px",
      borderRadius: "6px",
      marginTop: "15px",
      fontSize: "14px",
      border: "1px solid #feb2b2"
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.header}>Welcome Back</h2>
        
        <form onSubmit={handleSubmit}>
          <input
            name="email"
            type="email"
            placeholder="Email Address"
            style={styles.input}
            value={form.email}
            onChange={handleChange}
            required
          />

          <input
            name="password"
            type="password"
            placeholder="Password"
            style={styles.input}
            value={form.password}
            onChange={handleChange}
            required
          />

          <select
            name="role"
            style={styles.input}
            value={form.role}
            onChange={handleChange}
            required
          >
            <option value="">Select Your Role</option>
            <option value="admin">Admin</option>
            <option value="doctor">Doctor</option>
            <option value="patient">Patient</option>
          </select>

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? "Verifying..." : "Login"}
          </button>
        </form>

        {message && <div style={styles.error}>{message}</div>}

        <p style={styles.linkText}>
          Don’t have an account?{" "}
          <Link to="/register" style={{ color: "#4A90E2", textDecoration: "none", fontWeight: "600" }}>
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}