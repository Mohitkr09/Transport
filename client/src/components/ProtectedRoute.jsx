import React from "react";
import { Navigate, useLocation } from "react-router-dom";

const ProtectedRoute = ({ children, allowedRoles = [] }) => {

  const location = useLocation();

  const token = localStorage.getItem("token");

  let user = null;

  try {
    user = JSON.parse(localStorage.getItem("user"));
  } catch {
    user = null;
  }

  /* ================= NOT LOGGED IN ================= */

  if (!token || !user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  /* ================= ROLE CHECK ================= */

  if (
    allowedRoles.length > 0 &&
    !allowedRoles.includes(user.role)
  ) {

    /* Redirect based on role */

    if (user.role === "driver") {
      return <Navigate to="/driver" replace />;
    }

    if (user.role === "admin") {
      return <Navigate to="/admin" replace />;
    }

    return <Navigate to="/" replace />;
  }

  /* ================= AUTHORIZED ================= */

  return children;
};

export default ProtectedRoute;