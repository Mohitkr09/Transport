import React from "react";
import { Navigate, useLocation } from "react-router-dom";

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const location = useLocation();

  const token = localStorage.getItem("token");
  const storedRole = localStorage.getItem("role");

  let user = null;

  try {
    user = JSON.parse(localStorage.getItem("user"));
  } catch {
    user = null;
  }

  /* ================= NOT LOGGED IN ================= */

  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  /* ================= ROLE FIX ================= */

  const role = storedRole || user?.role;

  /* ================= ROLE CHECK ================= */

  if (
    allowedRoles.length > 0 &&
    !allowedRoles.includes(role)
  ) {

    // 🔥 smarter redirects
    if (role === "driver") {
      return <Navigate to="/driver/dashboard" replace />;
    }

    if (role === "admin") {
      return <Navigate to="/admin/dashboard" replace />;
    }

    // ✅ IMPORTANT FIX → go profile instead of home
    return <Navigate to="/profile" replace />;
  }

  /* ================= AUTHORIZED ================= */

  return children;
};

export default ProtectedRoute;