import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";

export default function Navbar() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ ORIGINAL LOGIC WITH SAFETY FIX: Check for "undefined" string before parsing
  const rawUser = localStorage.getItem("user");
  const user = (rawUser && rawUser !== "undefined") ? JSON.parse(rawUser) : null;
  const token = localStorage.getItem("token");

  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);

  const handleNavigate = (path) => {
    setDropdownOpen(false);
    navigate(path);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setDropdownOpen(false);
    navigate("/login");
  };

  const links = [
    { name: "Home", path: "/" },
    { name: "All Doctors", path: "/all-doctors" }, 
    { name: "About", path: "/about" },
    { name: "Contact", path: "/contact" },
  ];

  return (
    <nav className="flex items-center justify-between py-5 px-6 md:px-12 border-b border-gray-100 relative bg-white">
      
      {/* Logo */}
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
        <div className="w-12 h-12 md:w-14 md:h-14">
          <img
            src="https://img.favpng.com/11/11/11/staff-of-hermes-caduseus-as-a-symbol-of-medicine-caduceus-as-a-symbol-of-medicine-clip-art-png-favpng-tjtjy62QwG0ipBZgKUrZfNTFi.jpg"
            alt="Doctor Logo"
            className="w-full h-full object-contain"
          />
        </div>
        <span className="text-xl md:text-2xl font-bold text-blue-900 tracking-tight">
          HEALTHCARE
        </span>
      </div>

      {/* Desktop Links */}
      <ul className="hidden md:flex items-center gap-8 font-medium text-gray-700 uppercase text-xs tracking-wider">
        {links.map((link) => (
          <li
            key={link.name}
            className={`pb-1 cursor-pointer hover:text-blue-600 transition-all ${
              location.pathname === link.path ? "border-b-2 border-blue-600 text-blue-600" : ""
            }`}
            onClick={() => navigate(link.path)}
          >
            {link.name}
          </li>
        ))}

        {user?.role === "admin" && (
          <li
            className={`border border-gray-300 rounded-full px-4 py-1 text-[10px] cursor-pointer hover:bg-gray-50 transition-all ${
              location.pathname.includes("/admin") ? "bg-blue-100 border-blue-500 text-blue-700" : ""
            }`}
            onClick={() => navigate("/admin/dashboard")}
          >
            Admin Panel
          </li>
        )}
      </ul>

      {/* Right Dropdown */}
      <div className="relative">
        <button
          className="bg-blue-600 text-white rounded-full px-5 py-2 text-xs hover:bg-blue-700 transition-all font-medium"
          onClick={toggleDropdown}
        >
          {token && user ? `Account (${user.name?.split(' ')[0] || 'User'})` : "Create Account"}
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
            {!token || !user ? (
              <>
                <p className="px-4 py-3 text-sm hover:bg-blue-50 cursor-pointer border-b" onClick={() => handleNavigate("/login")}>
                  Login
                </p>
                <p className="px-4 py-3 text-sm hover:bg-blue-50 cursor-pointer" onClick={() => handleNavigate("/register")}>
                  Register
                </p>
              </>
            ) : (
              <>
                <p className="px-4 py-3 text-sm font-bold text-gray-400 uppercase text-[10px] bg-gray-50">Dashboard</p>
                <p 
                  className="px-4 py-3 text-sm hover:bg-blue-50 cursor-pointer" 
                  onClick={() => handleNavigate(user.role === 'doctor' ? '/doctor/dashboard' : '/patient/dashboard')}
                >
                  My Profile
                </p>
                <p className="px-4 py-3 text-sm text-red-600 hover:bg-red-50 cursor-pointer border-t" onClick={handleLogout}>
                  Logout
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}