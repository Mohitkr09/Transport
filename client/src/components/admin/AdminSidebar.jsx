import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

const AdminSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { name: "Dashboard", path: "/admin/dashboard" },
    { name: "Drivers", path: "/admin/drivers" },
    { name: "Analytics", path: "/admin/analytics" },
    { name: "Support Messages", path: "/admin/support" }, // NEW
    { name: "Settings", path: "/admin/settings" },
  ];

  return (
    <aside className="w-64 min-h-screen bg-white dark:bg-gray-800 shadow-lg p-6">

      {/* LOGO */}
      <h2
        onClick={() => navigate("/admin/dashboard")}
        className="text-2xl font-bold text-indigo-600 mb-10 cursor-pointer"
      >
        TransportX Admin
      </h2>

      {/* MENU */}
      <nav className="space-y-3">

        {menuItems.map((item) => (
          <button
            key={item.name}
            onClick={() => navigate(item.path)}
            className={`w-full text-left px-4 py-3 rounded-lg font-medium transition
              
              ${
                location.pathname === item.path
                  ? "bg-indigo-600 text-white shadow"
                  : "text-gray-700 dark:text-gray-300 hover:bg-indigo-100 dark:hover:bg-gray-700"
              }
            `}
          >
            {item.name}
          </button>
        ))}

      </nav>

      {/* FOOTER */}
      <div className="absolute bottom-6 left-6 text-sm text-gray-400">
        © 2026 TransportX
      </div>

    </aside>
  );
};

export default AdminSidebar;
