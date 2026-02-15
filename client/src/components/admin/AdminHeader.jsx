import React, { useState, useRef, useEffect } from "react";
import { Bell, ChevronDown } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const AdminHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const user = JSON.parse(localStorage.getItem("user"));

  // Close dropdown outside click
  useEffect(() => {
    const close = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  // Page title from route
  const pageName = location.pathname.split("/").pop() || "dashboard";

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b dark:border-gray-700 px-8 py-4 flex items-center justify-between">

      {/* LEFT — PAGE TITLE */}
      <h1 className="text-xl font-semibold capitalize text-gray-800 dark:text-white">
        {pageName}
      </h1>

      {/* RIGHT SIDE */}
      <div className="flex items-center gap-6">

        {/* NOTIFICATIONS */}
        <button className="relative p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition">
          <Bell size={20} />

          {/* badge */}
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
            3
          </span>
        </button>

        {/* USER MENU */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-2 rounded-lg"
          >
            <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>

            <ChevronDown size={16} />
          </button>

          {/* DROPDOWN */}
          {open && (
            <div className="absolute right-0 mt-3 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-3">

              <p className="font-semibold text-gray-800 dark:text-white">
                {user?.name}
              </p>
              <p className="text-sm text-gray-500 mb-2">
                {user?.email}
              </p>

              <hr className="my-2" />

              <button
                onClick={() => navigate("/admin/settings")}
                className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Settings
              </button>

              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 rounded text-red-500 hover:bg-red-50 dark:hover:bg-gray-700"
              >
                Logout
              </button>

            </div>
          )}
        </div>

      </div>
    </header>
  );
};

export default AdminHeader;
