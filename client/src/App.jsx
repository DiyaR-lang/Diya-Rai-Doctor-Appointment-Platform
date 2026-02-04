import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Login from "./components/Login";
import Register from "./components/Register";
import AdminDashboard from "./pages/admin/AdminDashboard";
import DoctorDashboard from "./pages/doctor/DoctorDashboard";
import PatientDashboard from "./pages/patient/PatientDashboard";
import AllDoctors from "./pages/AllDoctors";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="admin/dashboard" element={<AdminDashboard />} />
        <Route path="doctor/dashboard" element={<DoctorDashboard />} />
        <Route path="patient/dashboard" element={<PatientDashboard />} />
        <Route path="AllDoctors" element={<AllDoctors />} />
      </Route>
    </Routes>
  );
}
