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
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
    role: "user", // ✅ default
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* ======================================================
  AUTO REDIRECT
  ====================================================== */

  useEffect(() => {
    try {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user") || "null");

      if (!token || !user?.role) return;

      redirectUser(user.role);
    } catch (err) {
      console.error("Auto redirect error:", err);
    }
  }, []);

  /* ======================================================
  REDIRECT FUNCTION (FIXED 🔥)
  ====================================================== */

  const redirectUser = (role) => {
    const r = role.toLowerCase();

    if (r === "admin") navigate("/admin/dashboard");
    else if (r === "driver") navigate("/driver/dashboard");
    else navigate("/book");
  };

  /* ======================================================
  INPUT HANDLER
  ====================================================== */

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* ======================================================
  LOGIN HANDLER
  ====================================================== */

  const handleLogin = async () => {
    if (loading) return;

    const email = form.email.trim().toLowerCase();
    const password = form.password.trim();
    const role = form.role;

    if (!email || !password) {
      setError("Enter email and password");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const payload = { email, password, role };

      console.log("📤 Sending payload:", payload);

      const res = await api.post("/auth/login", payload);

      const data = res.data;

      console.log("✅ LOGIN RESPONSE:", data);

      if (!data?.token || !data?.role) {
        throw new Error("Invalid response");
      }

      const finalRole = data.role.toLowerCase();

      /* ================= SAVE ================= */

      localStorage.clear();

      localStorage.setItem("token", data.token);
      localStorage.setItem(
        "user",
        JSON.stringify(data.user || { email, role: finalRole })
      );
      localStorage.setItem("role", finalRole);

      /* ================= REDIRECT ================= */

      redirectUser(finalRole);

    } catch (err) {
      console.error("❌ Login error:", err);

      if (err.response) {
        const status = err.response.status;
        const message = err.response?.data?.message;

        if (status === 400) setError(message || "Invalid request");
        else if (status === 401) setError("Invalid email or password");
        else if (status === 403) setError("Driver not approved");
        else setError(message || "Login failed");
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

  const handleKeyDown = (e) => {
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

          {/* ROLE */}
          <select
            name="role"
            value={form.role}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-lg
            dark:bg-gray-800 dark:border-gray-700"
          >
            <option value="user">User</option>
            <option value="driver">Driver</option>
            <option value="admin">Admin</option>
          </select>

          {/* EMAIL */}
          <input
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className="w-full px-4 py-2 border rounded-lg
            dark:bg-gray-800 dark:border-gray-700"
          />

          {/* PASSWORD */}
          <input
            name="password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className="w-full px-4 py-2 border rounded-lg
            dark:bg-gray-800 dark:border-gray-700"
          />

          {/* BUTTON */}
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

        {/* ERROR */}
        {error && (
          <p className="text-red-500 text-sm mt-3 text-center">
            {error}
          </p>
        )}

      </div>
    </div>
  );
}