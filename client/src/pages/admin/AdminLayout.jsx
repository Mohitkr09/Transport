import React, { useState, useRef, useEffect } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { Bell, ChevronDown } from "lucide-react";

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef(null);

  const [openMenu, setOpenMenu] = useState(false);

  const user = JSON.parse(localStorage.getItem("user"));

  // Close dropdown outside click
  useEffect(() => {
    const close = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenMenu(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  // Dynamic page title
  const pageName = location.pathname.split("/").pop() || "dashboard";

  return (
    <div className="min-h-screen flex bg-gray-100 dark:bg-gray-900">

      {/* ================= SIDEBAR ================= */}
      <div className="
  w-64 p-6 space-y-8
  bg-white dark:bg-gray-800
  text-gray-800 dark:text-white
  border-r border-gray-200 dark:border-gray-700
  transition-colors duration-300
">

  <h2 className="text-2xl font-bold text-indigo-600">
    TransportX Admin
  </h2>

  <nav className="space-y-3">

    <SidebarLink to="/admin/dashboard" label="Dashboard" />
    <SidebarLink to="/admin/drivers" label="Drivers" />
    <SidebarLink to="/admin/analytics" label="Analytics" />
    <SidebarLink to="/admin/support" label="Support Messages" />
    <SidebarLink to="/admin/settings" label="Settings" />

  </nav>

  <div className="absolute bottom-6 text-sm text-gray-400">
    © 2026 TransportX
  </div>

</div>



      {/* ================= RIGHT SIDE ================= */}
      <div className="flex-1 flex flex-col">

        {/* ================= HEADER ================= */}
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b dark:border-gray-700 px-8 py-4 flex items-center justify-between">

          {/* PAGE TITLE */}
          <h1 className="text-xl font-semibold capitalize text-gray-800 dark:text-white">
            {pageName}
          </h1>

          {/* RIGHT CONTROLS */}
          <div className="flex items-center gap-6">

            {/* NOTIFICATION BELL */}
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
                onClick={() => setOpenMenu(!openMenu)}
                className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-2 rounded-lg"
              >
                <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <ChevronDown size={16} />
              </button>


              {/* DROPDOWN */}
              {openMenu && (
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


        {/* ================= PAGE CONTENT ================= */}
        <main className="flex-1 p-10 overflow-y-auto">
          <Outlet />
        </main>

      </div>
    </div>
  );
};



/* ================= SIDEBAR LINK ================= */
const SidebarLink = ({ to, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `block px-4 py-3 rounded-lg font-medium transition ${
        isActive
          ? "bg-indigo-600 text-white shadow"
          : "text-gray-300 hover:bg-gray-700"
      }`
    }
  >
    {label}
  </NavLink>
);

export default AdminLayout;
