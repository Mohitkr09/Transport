import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import { Bell, Menu, X } from "lucide-react";
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
  const isAdmin = role === "admin";

  /* ================= STATE ================= */

  const [openProfile, setOpenProfile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [visible, setVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  /* ================= NOTIFICATIONS ================= */

  useEffect(() => {
    if (!token || !isUser) return;

    const stored = localStorage.getItem("notifications");
    if (stored) {
      const unread = JSON.parse(stored).filter(n => !n.read).length;
      setNotifCount(unread);
    }
  }, [token, isUser]);

  /* ================= SCROLL ================= */

  useEffect(() => {
    const handleScroll = () => {
      const current = window.scrollY;

      setScrolled(current > 20);
      setVisible(!(current > lastScrollY && current > 100));
      setLastScrollY(current);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  /* ================= CLOSE DROPDOWN ================= */

  useEffect(() => {
    const close = e => {
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


  /* ================= NAV ================= */

  const go = path => {
    navigate(path);
    setMobileOpen(false);
  };

  const isActive = path => location.pathname === path;

  /* ================= UI ================= */

  return (
    <motion.nav
      initial={{ y: 0 }}
      animate={{ y: visible ? 0 : -80 }}
      className={`fixed top-0 w-full z-50 transition-all duration-300 backdrop-blur-xl border-b
      ${scrolled
        ? "bg-white/80 dark:bg-gray-900/80 shadow-lg"
        : "bg-white/60 dark:bg-gray-900/60"}
      `}
    >

      <div className="max-w-7xl mx-auto flex items-center h-16 px-4 md:px-6">

        {/* LOGO */}
        <div
          onClick={() => go("/")}
          className="text-xl md:text-2xl font-extrabold cursor-pointer
          bg-gradient-to-r from-indigo-500 via-cyan-500 to-blue-500
          bg-clip-text text-transparent"
        >
          TransportX
        </div>

        {/* ================= CENTER NAV ================= */}

        <div className="hidden md:flex flex-1 justify-center gap-10">

          {/* 🚗 DRIVER ONLY */}
          {isDriver && (
            <>
              <NavItem label="Dashboard" active={isActive("/driver/dashboard")} go={() => go("/driver/dashboard")} />
              <NavItem label="Ride Requests" active={isActive("/driver/requests")} go={() => go("/driver/requests")} />
            </>
          )}

          {/* 👤 USER ONLY */}
          {!isDriver && (
            <>
              <NavItem label="Home" active={isActive("/")} go={() => go("/")} />
              <NavItem label="About" active={isActive("/about")} go={() => go("/about")} />
              <NavItem label="Contact" active={isActive("/contact")} go={() => go("/contact")} />

              {isUser && (
                <NavItem label="Book Ride" active={isActive("/book")} go={() => go("/book")} />
              )}
            </>
          )}

        </div>

        {/* ================= RIGHT ================= */}

        <div className="flex items-center gap-3 ml-auto">

          <ThemeToggle />

          {/* 🔔 USER ONLY */}
          {token && isUser && (
            <div
              onClick={() => go("/notifications")}
              className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
            >
              <Bell size={20} />
              {notifCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {notifCount}
                </span>
              )}
            </div>
          )}

          {/* 🚗 DRIVER STATUS BADGE */}
          {isDriver && (
            <span className="hidden md:inline text-xs bg-green-100 text-green-600 px-3 py-1 rounded-full">
              Driver Mode
            </span>
          )}

          {/* AUTH */}
          {!token ? (
            <div className="hidden md:flex gap-3">
              <button onClick={() => go("/login")}>Login</button>
              <button
                onClick={() => go("/register")}
                className="px-5 py-2 rounded-lg text-white bg-indigo-600"
              >
                Register
              </button>
            </div>
          ) : (
            <div ref={dropdownRef} className="relative hidden md:block">

              <button
                onClick={() => setOpenProfile(!openProfile)}
                className="w-10 h-10 rounded-full bg-indigo-600 text-white"
              >
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </button>

              <AnimatePresence>
                {openProfile && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute right-0 mt-4 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl p-4"
                  >
                    <p className="font-semibold">{user?.name}</p>
                    <p className="text-sm text-gray-500 capitalize">{role}</p>

                    <hr className="my-2" />

                    {isDriver && (
                      <button onClick={() => go("/driver/dashboard")} className="w-full text-left hover:text-indigo-500">
                        Dashboard
                      </button>
                    )}

                    {isUser && (
                      <button onClick={() => go("/book")} className="w-full text-left hover:text-indigo-500">
                        Book Ride
                      </button>
                    )}

                    <button onClick={handleLogout} className="w-full text-left text-red-500 mt-2">
                      Logout
                    </button>

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

      {/* ================= MOBILE ================= */}

      <AnimatePresence>
        {mobileOpen && (
          <motion.div className="md:hidden bg-white dark:bg-gray-900 px-6 py-4 space-y-4">

            {isDriver && (
              <>
                <MobileItem label="Dashboard" go={() => go("/driver/dashboard")} />
                <MobileItem label="Ride Requests" go={() => go("/driver/requests")} />
              </>
            )}

            {!isDriver && (
              <>
                <MobileItem label="Home" go={() => go("/")} />
                <MobileItem label="About" go={() => go("/about")} />
                <MobileItem label="Contact" go={() => go("/contact")} />
                {isUser && <MobileItem label="Book Ride" go={() => go("/book")} />}
              </>
            )}

            {!token ? (
              <>
                <MobileItem label="Login" go={() => go("/login")} />
                <MobileItem label="Register" go={() => go("/register")} />
              </>
            ) : (
              <MobileItem label="Logout" go={handleLogout} />
            )}

          </motion.div>
        )}
      </AnimatePresence>

    </motion.nav>
  );
};

/* ================= COMPONENTS ================= */

const NavItem = ({ label, go, active }) => (
  <button
    onClick={go}
    className={`relative ${active ? "text-indigo-500 font-semibold" : "hover:text-indigo-400"}`}
  >
    {label}
  </button>
);

const MobileItem = ({ label, go }) => (
  <button onClick={go} className="block w-full text-left">
    {label}
  </button>
);

export default Navbar;