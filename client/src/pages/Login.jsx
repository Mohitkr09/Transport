import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

/* ================= API ================= */

const BASE =
  import.meta.env.VITE_API_URL ||
  "https://transport-mpb5.onrender.com";

const API = BASE.endsWith("/api") ? BASE : `${BASE}/api`;

const api = axios.create({
  baseURL: API,
  timeout: 15000,
});

/* ================= COMPONENT ================= */

export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
    role: "user",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* ===== AUTO REDIRECT ===== */
  useEffect(() => {
    try {
      const token = localStorage.getItem("token");
      const role = localStorage.getItem("role");

      if (token && role) {
        redirectUser(role);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  /* ===== REDIRECT ===== */
  const redirectUser = (role) => {
    const r = role.toLowerCase();

    if (r === "admin") navigate("/admin/dashboard");
    else if (r === "driver") navigate("/driver/dashboard");
    else navigate("/book");
  };

  /* ===== INPUT ===== */
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* ===== LOGIN ===== */
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

      const res = await api.post("/auth/login", {
        email,
        password,
        role,
      });

      const data = res.data;

      if (!data?.token) {
        throw new Error("Invalid response");
      }

      const finalRole = (data.role || role).toLowerCase();

      /* ===== SAVE ===== */
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", finalRole);
      localStorage.setItem("user", JSON.stringify(data.user));

      /* ===== REDIRECT ===== */
      redirectUser(finalRole);

    } catch (err) {
      console.error(err);

      if (err.response) {
        const status = err.response.status;

        if (status === 401) setError("Invalid email or password");
        else if (status === 403) setError("Driver not approved");
        else setError(err.response.data?.message || "Login failed");
      } else {
        setError("Server not reachable");
      }

    } finally {
      setLoading(false);
    }
  };

  /* ===== ENTER KEY ===== */
  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  /* ===== UI ===== */
  return (
    <div className="min-h-screen flex items-center justify-center
    bg-gradient-to-br from-indigo-500 to-purple-600">

      <div className="bg-white p-8 rounded-2xl shadow-xl w-[350px]">

        <h2 className="text-2xl font-bold mb-6 text-center">
          Login
        </h2>

        <div className="space-y-4">

          <select
            name="role"
            value={form.role}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-lg"
          >
            <option value="user">User</option>
            <option value="driver">Driver</option>
            <option value="admin">Admin</option>
          </select>

          <input
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className="w-full px-4 py-2 border rounded-lg"
          />

          <input
            name="password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className="w-full px-4 py-2 border rounded-lg"
          />

          <button
            onClick={handleLogin}
            disabled={loading}
            className={`w-full py-2 rounded-lg text-white ${
              loading
                ? "bg-gray-400"
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