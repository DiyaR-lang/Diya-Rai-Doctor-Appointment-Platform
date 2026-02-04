import React from "react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-6 py-12 grid md:grid-cols-4 gap-8">
        
        {/* Logo & Social */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 text-white p-2 rounded">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d=""
                />
              </svg>
            </div>
            <span className="font-bold text-lg">MediCare</span>
          </div>
          <p className="text-gray-400 text-sm">
            Your trusted healthcare partner for quality medical services and professional care.
          </p>
          <div className="flex gap-3 text-gray-400">
            <a href="#">FB</a>
            <a href="#">TW</a>
            <a href="#">IG</a>
            <a href="#">LN</a>
          </div>
        </div>

        {/* Quick Links */}
        <div className="flex flex-col gap-2 text-gray-400">
          <h3 className="font-semibold text-white">Quick Links</h3>
          <Link to="/">Home</Link>
          <Link to="/find-doctors">Find Doctors</Link>
          <Link to="/appointments">Appointments</Link>
          <Link to="/services">Services</Link>
          <Link to="/about">About Us</Link>
          <Link to="/contact">Contact</Link>
        </div>

        {/* Services */}
        <div className="flex flex-col gap-2 text-gray-400">
          <h3 className="font-semibold text-white">Services</h3>
          <p>General Medicine</p>
          <p>Cardiology</p>
          <p>Pediatrics</p>
          <p>Orthopedics</p>
          <p>Dermatology</p>
          <p>Emergency Care</p>
        </div>

        {/* Contact Info */}
        <div className="flex flex-col gap-2 text-gray-400">
          <h3 className="font-semibold text-white">Contact Info</h3>
          <p>123 Medical Center Drive, Healthcare City, HC 12345</p>
          <p>+1 (555) 123-4567</p>
          <p>contact@medicare.com</p>
          <p>24/7 Emergency Services</p>
        </div>
      </div>

      <div className="border-t border-gray-700 mt-6 text-center py-4 text-gray-500 text-sm">
        © {new Date().getFullYear()} MediCare. All rights reserved. &nbsp;
        <Link to="#" className="hover:text-white">Privacy Policy</Link> | 
        <Link to="#" className="hover:text-white"> Terms of Service</Link> | 
        <Link to="#" className="hover:text-white"> Cookie Policy</Link>
      </div>
    </footer>
  );
}
