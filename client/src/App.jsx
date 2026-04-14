import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Layout & Global Components
import Layout from "./components/Layout";
import Notifications from "./components/Notifications";

// Pages
import Home from "./pages/Home";
import Login from "./components/Login";
import Register from "./components/Register";
import AllDoctors from "./pages/AllDoctors";

// Dashboards
import AdminDashboard from "./pages/admin/AdminDashboard";
import DoctorDashboard from "./pages/doctor/DoctorDashboard";
import PatientDashboard from "./pages/patient/PatientDashboard";

// Video Call Component
import VideoCall from "./pages/VideoCall";

export default function App() {
  return (
    <Routes>
      {/* Routes that include the Navbar/Footer from Layout */}
      <Route path="/" element={<Layout />}>
        
        <Route index element={<Navigate to="/home" replace />} />
        <Route path="home" element={<Home />} />

        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        
        <Route path="all-doctors" element={<AllDoctors />} />
        
        {/* --- ADD THIS ROUTE TO FIX THE 404 --- */}
        <Route path="payment-success" element={<AllDoctors />} />
        
        <Route path="notifications" element={<Notifications />} />
        
        {/* Protected Dashboard Routes */}
        <Route path="admin/dashboard" element={<AdminDashboard />} />
        <Route path="doctor/dashboard" element={<DoctorDashboard />} />
        <Route path="patient/dashboard" element={<PatientDashboard />} />
      </Route>

      <Route path="/video-call/:roomId" element={<VideoCall />} />

      {/* Catch-all for 404 errors */}
      <Route path="*" element={
        <div className="flex items-center justify-center h-screen font-bold text-slate-400">
          404 | Page Not Found
        </div>
      } />
    </Routes>
  );
}