import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";   // adjust path if needed
import Footer from "../components/Footer";   // adjust path if needed

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      
      {/* Navbar */}
      <Navbar />

      {/* Page Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <Footer />

    </div>
  );
}
