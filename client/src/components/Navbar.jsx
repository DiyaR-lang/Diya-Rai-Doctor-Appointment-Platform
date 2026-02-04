import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

export default function Navbar() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation(); // to track current route

  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);

  // Close dropdown when clicking a link
  const handleNavigate = (path) => {
    setDropdownOpen(false);
    navigate(path);
  };

  // Navigation links
  const links = [
    { name: "Home", path: "/" },
    { name: "All Doctors", path: "/AllDoctors" },
    { name: "About", path: "/about" },
    { name: "Contact", path: "/contact" },
  ];

  return (
    <nav className="flex items-center justify-between py-5 px-6 md:px-12 border-b border-gray-100 relative">
      
      {/* Logo */}
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
        <div className="w-14 h-14 md:w-16 md:h-16">
          <img
            src="https://img.favpng.com/11/11/11/staff-of-hermes-caduceus-as-a-symbol-of-medicine-caduceus-as-a-symbol-of-medicine-clip-art-png-favpng-tjtjy62QwG0ipBZgKUrZfNTFi.jpg"
            alt="Doctor Logo"
            className="w-full h-full object-contain"
          />
        </div>
        <span className="text-2xl md:text-3xl font-bold text-blue-900 tracking-tight">
          
        </span>
      </div>

      {/* Desktop Links */}
      <ul className="hidden md:flex items-center gap-8 font-medium text-gray-700 uppercase text-xs tracking-wider">
        {links.map((link) => (
          <li
            key={link.name}
            className={`pb-1 cursor-pointer hover:text-blue-600 transition-all ${
              location.pathname === link.path ? "border-b-2 border-blue-600" : ""
            }`}
            onClick={() => navigate(link.path)}
          >
            {link.name}
          </li>
        ))}

        {/* Admin Panel */}
        <li
          className={`border border-gray-300 rounded-full px-4 py-1 text-[10px] cursor-pointer hover:bg-gray-50 transition-all ${
            location.pathname.includes("/admin") ? "bg-blue-100 border-blue-500 text-blue-700" : ""
          }`}
          onClick={() => navigate("/admin/dashboard")}
        >
          Admin Panel
        </li>
      </ul>

      {/* Right Dropdown: Login / Register */}
      <div className="relative">
        <button
          className="border border-gray-300 rounded-full px-4 py-1 text-[10px] hover:bg-gray-50 transition-all"
          onClick={toggleDropdown}
        >
          Create Account
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
            <p
              className="px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer"
              onClick={() => handleNavigate("/login")}
            >
              Login
            </p>
            <p
              className="px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer"
              onClick={() => handleNavigate("/register")}
            >
              Register
            </p>
          </div>
        )}
      </div>
    </nav>
  );
}
