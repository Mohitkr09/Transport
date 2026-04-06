import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import { Bell, Menu, X, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef(null);

  /* ================= AUTH ================= */
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role") || "";
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const isDriver = role === "driver";
  const isUser = role === "user";

  /* ================= STATE ================= */
  const [openProfile, setOpenProfile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [notifCount, setNotifCount] = useState(0);

  /* ================= NOTIFICATIONS ================= */
  useEffect(() => {
    if (!token || !isUser) return;

    const stored = localStorage.getItem("notifications");
    if (stored) {
      const unread = JSON.parse(stored).filter(n => !n.read).length;
      setNotifCount(unread);
    }
  }, [token, isUser]);

  /* ================= SCROLL EFFECT ================= */
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /* ================= CLOSE DROPDOWN ================= */
  useEffect(() => {
    const close = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenProfile(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  /* ================= LOGOUT ================= */
  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  const go = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  /* ================= UI ================= */
  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 border-b
      ${scrolled
        ? "bg-white/90 backdrop-blur-lg shadow-md"
        : "bg-white/70 backdrop-blur-md"}
      `}
    >
      <div className="max-w-7xl mx-auto flex items-center h-16 px-4 md:px-6">

        {/* LOGO */}
        <div
          onClick={() => go("/")}
          className="text-2xl font-extrabold cursor-pointer
          bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500
          bg-clip-text text-transparent"
        >
          TransportX
        </div>

        {/* CENTER NAV */}
        <div className="hidden md:flex flex-1 justify-center gap-8">
          {!isDriver && (
            <>
              <NavItem label="Home" active={isActive("/")} go={() => go("/")} />
              <NavItem label="About" active={isActive("/about")} go={() => go("/about")} />
              <NavItem label="Contact" active={isActive("/contact")} go={() => go("/contact")} />
              {isUser && <NavItem label="Book Ride" active={isActive("/book")} go={() => go("/book")} />}
            </>
          )}

          {isDriver && (
            <>
              <NavItem label="Dashboard" active={isActive("/driver/dashboard")} go={() => go("/driver/dashboard")} />
              <NavItem label="Requests" active={isActive("/driver/requests")} go={() => go("/driver/requests")} />
            </>
          )}
        </div>

        {/* RIGHT SIDE */}
        <div className="flex items-center gap-3 ml-auto">

          <ThemeToggle />

          {/* 🔔 NOTIFICATION */}
          {token && isUser && (
            <div
              onClick={() => go("/notifications")}
              className="relative p-2 rounded-full hover:bg-gray-100 cursor-pointer transition"
            >
              <Bell size={20} />
              {notifCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {notifCount}
                </span>
              )}
            </div>
          )}

          {/* PROFILE */}
          {token && (
            <div ref={dropdownRef} className="relative">

              <button
                onClick={() => setOpenProfile(!openProfile)}
                className="flex items-center justify-center w-10 h-10 rounded-full 
                bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-bold shadow-md hover:scale-105 transition"
              >
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt="profile"
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  user?.name?.charAt(0)?.toUpperCase() || <User size={18} />
                )}
              </button>

              <AnimatePresence>
                {openProfile && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-xl p-4"
                  >
                    {/* USER INFO */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-500 text-white flex items-center justify-center">
                        {user?.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold">{user?.name}</p>
                        <p className="text-sm text-gray-500 capitalize">{role}</p>
                      </div>
                    </div>

                    <hr className="my-2" />

                    {/* MENU */}
                    {isUser && (
                      <DropdownItem label="My Profile" go={() => go("/profile")} />
                    )}

                    {isDriver && (
                      <DropdownItem label="Dashboard" go={() => go("/driver/dashboard")} />
                    )}

                    <DropdownItem label="Settings" go={() => go("/settings")} />

                    <DropdownItem label="Logout" go={handleLogout} danger />

                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* MOBILE MENU */}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden">
            {mobileOpen ? <X /> : <Menu />}
          </button>

        </div>
      </div>

      {/* MOBILE MENU */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="md:hidden bg-white px-6 py-4 space-y-3 shadow-lg"
          >
            <MobileItem label="Home" go={() => go("/")} />
            <MobileItem label="About" go={() => go("/about")} />
            <MobileItem label="Contact" go={() => go("/contact")} />
            {isUser && <MobileItem label="Book Ride" go={() => go("/book")} />}

            {token ? (
              <>
                <MobileItem label="Profile" go={() => go("/profile")} />
                <MobileItem label="Logout" go={handleLogout} />
              </>
            ) : (
              <>
                <MobileItem label="Login" go={() => go("/login")} />
                <MobileItem label="Register" go={() => go("/register")} />
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

/* ================= COMPONENTS ================= */

const NavItem = ({ label, go, active }) => (
  <button
    onClick={go}
    className={`relative font-medium transition ${
      active ? "text-indigo-600" : "text-gray-600 hover:text-indigo-500"
    }`}
  >
    {label}
  </button>
);

const MobileItem = ({ label, go }) => (
  <button onClick={go} className="block w-full text-left py-2">
    {label}
  </button>
);

const DropdownItem = ({ label, go, danger }) => (
  <button
    onClick={go}
    className={`block w-full text-left py-2 px-2 rounded-lg transition ${
      danger
        ? "text-red-500 hover:bg-red-50"
        : "hover:bg-gray-100"
    }`}
  >
    {label}
  </button>
);

export default Navbar;