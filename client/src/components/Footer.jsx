import React from "react";
import { Link } from "react-router-dom";
import {
  FaTwitter,
  FaFacebook,
  FaInstagram,
  FaLinkedin,
  FaGithub
} from "react-icons/fa";

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-gray-100 dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-6 py-16 grid gap-12 md:grid-cols-4">

        {/* ================= BRAND ================= */}
        <div>
          <h2 className="text-2xl font-extrabold text-indigo-600">
            TransportX
          </h2>
          <p className="mt-4 text-gray-600 dark:text-gray-400 leading-relaxed">
            Smart mobility platform providing safe, reliable and fast
            transportation solutions for modern cities.
          </p>

          {/* Social Icons */}
          <div className="flex gap-4 mt-6 text-gray-500 dark:text-gray-400">
            <a href="#" className="hover:text-indigo-600 transition"><FaTwitter size={20} /></a>
            <a href="#" className="hover:text-indigo-600 transition"><FaFacebook size={20} /></a>
            <a href="#" className="hover:text-indigo-600 transition"><FaInstagram size={20} /></a>
            <a href="#" className="hover:text-indigo-600 transition"><FaLinkedin size={20} /></a>
            <a href="#" className="hover:text-indigo-600 transition"><FaGithub size={20} /></a>
          </div>
        </div>

        {/* ================= PRODUCT ================= */}
        <div>
          <h3 className="font-bold text-lg mb-4">Product</h3>
          <ul className="space-y-3 text-gray-600 dark:text-gray-400">
            <li><Link to="/book" className="hover:text-indigo-600">Book Ride</Link></li>
            <li><Link to="/drivers" className="hover:text-indigo-600">Become Driver</Link></li>
            <li><Link to="/pricing" className="hover:text-indigo-600">Pricing</Link></li>
            <li><Link to="/features" className="hover:text-indigo-600">Features</Link></li>
          </ul>
        </div>

        {/* ================= COMPANY ================= */}
        <div>
          <h3 className="font-bold text-lg mb-4">Company</h3>
          <ul className="space-y-3 text-gray-600 dark:text-gray-400">
            <li><Link to="/about" className="hover:text-indigo-600">About Us</Link></li>
            <li><Link to="/contact" className="hover:text-indigo-600">Contact</Link></li>
            <li><Link to="/careers" className="hover:text-indigo-600">Careers</Link></li>
            <li><Link to="/blog" className="hover:text-indigo-600">Blog</Link></li>
          </ul>
        </div>

        {/* ================= LEGAL ================= */}
        <div>
          <h3 className="font-bold text-lg mb-4">Legal</h3>
          <ul className="space-y-3 text-gray-600 dark:text-gray-400">
            <li><Link to="/privacy" className="hover:text-indigo-600">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-indigo-600">Terms of Service</Link></li>
            <li><Link to="/cookies" className="hover:text-indigo-600">Cookie Policy</Link></li>
            <li><Link to="/security" className="hover:text-indigo-600">Security</Link></li>
          </ul>
        </div>

      </div>

      {/* ================= BOTTOM BAR ================= */}
      <div className="border-t border-gray-200 dark:border-gray-800 text-center py-6 text-gray-500 dark:text-gray-400 text-sm">
        © {year} TransportX. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;