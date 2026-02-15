import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import { Bell, Menu, X } from "lucide-react";

const Navbar = () => {
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const [openProfile, setOpenProfile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  // Scroll detection
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Outside click
  useEffect(() => {
    const close = e => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setOpenProfile(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <nav
      className={`
        fixed top-0 w-full z-50 transition-all duration-300
        backdrop-blur-xl border-b
        ${
          scrolled
            ? "bg-gradient-to-r from-blue-700/80 via-indigo-900/80 to-blue-900/80 shadow-lg border-white/10"
            : "bg-gradient-to-r from-blue-700/60 via-indigo-900/60 to-blue-900/60 border-transparent"
        }
      `}
    >
      <div className="flex items-center h-16 px-6 md:px-10">

        {/* LOGO */}
        <div
          onClick={() => navigate("/")}
          className="
            text-2xl font-extrabold
            bg-gradient-to-r from-cyan-300 to-indigo-400
            bg-clip-text text-transparent
            cursor-pointer select-none
          "
        >
          TransportX
        </div>

        {/* CENTER LINKS */}
        <div className="hidden md:flex flex-1 justify-center gap-10">

          <NavItem label="Home" onClick={() => navigate("/")} />
          <NavItem label="About" onClick={() => navigate("/about")} />
          <NavItem label="Contact" onClick={() => navigate("/contact")} />

          {token && user?.role === "user" && (
            <NavItem label="Book Ride" onClick={() => navigate("/book")} />
          )}

        </div>

        {/* RIGHT SIDE */}
        <div className="flex items-center gap-4 ml-auto">

          <ThemeToggle />

          {/* NOTIFICATION */}
          {token && (
            <div className="relative cursor-pointer group">
              <Bell className="text-white" size={22}/>
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                3
              </span>

              <div className="absolute hidden group-hover:block right-0 mt-3 w-56 bg-white dark:bg-gray-800 shadow-xl rounded-xl p-3">
                <p className="font-semibold text-sm mb-2">Notifications</p>
                <p className="text-sm text-gray-500">No new alerts</p>
              </div>
            </div>
          )}

          {/* LOGIN / PROFILE */}
          {!token ? (
            <>
              <button
                onClick={() => navigate("/login")}
                className="font-medium text-white hover:text-cyan-300"
              >
                Login
              </button>

              <button
                onClick={() => navigate("/register")}
                className="
                  px-5 py-2 rounded-lg text-white font-semibold
                  bg-gradient-to-r from-cyan-500 to-indigo-500
                  hover:scale-105 transition shadow-md
                "
              >
                Register
              </button>
            </>
          ) : (
            <div ref={dropdownRef} className="relative">

              {/* Avatar */}
              <button
                onClick={() => setOpenProfile(!openProfile)}
                className="
                  w-10 h-10 rounded-full
                  bg-gradient-to-br from-cyan-400 to-indigo-500
                  text-white font-bold
                  flex items-center justify-center
                  shadow-lg hover:scale-110 transition
                "
              >
                {user?.name?.charAt(0).toUpperCase()}
              </button>

              {/* Dropdown */}
              {openProfile && (
                <div className="
                  absolute right-0 mt-4 w-56
                  backdrop-blur-xl
                  bg-white/90 dark:bg-gray-800/90
                  border border-white/20
                  rounded-xl shadow-xl p-3
                ">
                  <p className="font-semibold">{user.name}</p>
                  <p className="text-sm text-gray-500 capitalize">{user.role}</p>

                  <hr className="my-2"/>

                  {user.role === "admin" && (
                    <DropdownItem label="Admin Panel" onClick={() => navigate("/admin")} />
                  )}

                  {user.role === "driver" && (
                    <DropdownItem label="Driver Dashboard" onClick={() => navigate("/driver")} />
                  )}

                  {user.role === "user" && (
                    <DropdownItem label="Book Ride" onClick={() => navigate("/book")} />
                  )}

                  <DropdownItem label="Contact Support" onClick={() => navigate("/contact")} />

                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-gray-700 rounded-lg mt-1"
                  >
                    Logout
                  </button>
                </div>
              )}

            </div>
          )}

          {/* MOBILE */}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden text-white">
            {mobileOpen ? <X/> : <Menu/>}
          </button>

        </div>
      </div>

      {/* MOBILE MENU */}
      {mobileOpen && (
        <div className="md:hidden bg-blue-950/95 backdrop-blur-xl p-4 space-y-4 text-white">
          <MobileItem label="Home" go={() => navigate("/")} />
          <MobileItem label="About" go={() => navigate("/about")} />
          <MobileItem label="Contact" go={() => navigate("/contact")} />
        </div>
      )}
    </nav>
  );
};

/* NAV LINK */
const NavItem = ({ label, onClick }) => (
  <button
    onClick={onClick}
    className="relative font-medium text-white hover:text-cyan-300 group"
  >
    {label}
    <span className="absolute left-0 -bottom-1 h-[2px] w-0 bg-cyan-400 group-hover:w-full transition-all"/>
  </button>
);

/* MOBILE */
const MobileItem = ({ label, go }) => (
  <button onClick={go} className="block w-full text-left font-medium">
    {label}
  </button>
);

/* DROPDOWN */
const DropdownItem = ({ label, onClick }) => (
  <button
    onClick={onClick}
    className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
  >
    {label}
  </button>
);

export default Navbar;
