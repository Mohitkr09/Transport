import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

/* ======================================================
API CONFIG
====================================================== */

const BASE =
  import.meta.env.VITE_API_URL ||
  "https://transport-mpb5.onrender.com";

const API = BASE.endsWith("/api") ? BASE : `${BASE}/api`;

const api = axios.create({
  baseURL: API,
  timeout: 15000,
});

/* ======================================================
LOGIN COMPONENT
====================================================== */

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [role, setRole] = useState("user"); // ✅ DEFAULT ROLE

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  /* ======================================================
  AUTO REDIRECT
  ====================================================== */

  useEffect(() => {
    try {
      const token = localStorage.getItem("token");
      const storedUser = JSON.parse(localStorage.getItem("user") || "null");

      if (!token || !storedUser?.role) return;

      const r = storedUser.role.toLowerCase();

      if (r === "admin") navigate("/admin/dashboard");
      else if (r === "driver") navigate("/driver/dashboard");
      else navigate("/book");
    } catch (err) {
      console.error("Auto redirect error:", err);
    }
  }, [navigate]);

  /* ======================================================
  LOGIN HANDLER
  ====================================================== */

  const handleLogin = async () => {
    if (loading) return;

    if (!email.trim() || !password.trim()) {
      setError("Enter email and password");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const payload = {
        email: email.trim().toLowerCase(),
        password: password.trim(),
        role: role, // ✅ SELECTED ROLE
      };

      console.log("📤 Sending payload:", payload);

      const res = await api.post("/auth/login", payload);

      console.log("✅ LOGIN RESPONSE:", res.data);

      if (!res?.data?.token || !res?.data?.role) {
        throw new Error("Invalid server response");
      }

      const finalRole = res.data.role.toLowerCase();

      const userData = res.data.user || {
        email,
        role: finalRole,
      };

      /* ================= SAVE SESSION ================= */

      localStorage.clear();

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("role", finalRole);

      /* ================= REDIRECT ================= */

      if (finalRole === "admin") navigate("/admin/dashboard");
      else if (finalRole === "driver") navigate("/driver/dashboard");
      else navigate("/book");

    } catch (err) {
      console.error("❌ Login error:", err);

      if (err.response) {
        const status = err.response.status;
        const message = err.response?.data?.message;

        if (status === 400) {
          setError(message || "Invalid request");
        } else if (status === 401) {
          setError("Invalid email or password");
        } else if (status === 403) {
          setError("Driver not approved");
        } else {
          setError(message || "Login failed");
        }
      } else if (err.code === "ECONNABORTED") {
        setError("Server timeout");
      } else {
        setError("Server unreachable");
      }

    } finally {
      setLoading(false);
    }
  };

  /* ======================================================
  ENTER KEY
  ====================================================== */

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  /* ======================================================
  UI
  ====================================================== */

  return (
    <div className="min-h-screen flex items-center justify-center
    bg-gradient-to-br from-indigo-500 to-purple-600
    dark:from-gray-900 dark:to-gray-800">

      <div className="bg-white dark:bg-gray-900
      p-8 rounded-2xl shadow-xl w-[350px]
      text-gray-800 dark:text-gray-100">

        <h2 className="text-2xl font-bold mb-6 text-center">
          Login
        </h2>

        <div className="space-y-4">

          {/* ✅ ROLE SELECTOR */}
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg
            dark:bg-gray-800 dark:border-gray-700"
          >
            <option value="user">User</option>
            <option value="driver">Driver</option>
            <option value="admin">Admin</option>
          </select>

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyPress}
            className="w-full px-4 py-2 border rounded-lg
            dark:bg-gray-800 dark:border-gray-700"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyPress}
            className="w-full px-4 py-2 border rounded-lg
            dark:bg-gray-800 dark:border-gray-700"
          />

          <button
            onClick={handleLogin}
            disabled={loading}
            className={`w-full py-2 rounded-lg text-white transition
            ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {loading ? "Logging in..." : "Login"}
          </button>

        </div>

        {error && (
          <p className="text-red-500 text-sm mt-3 text-center">
            {error}
          </p>
        )}

      </div>
    </div>
  );
}