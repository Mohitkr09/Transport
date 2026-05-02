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

export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
    role: "user",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (token && role) redirectUser(role);
  }, []);

  const redirectUser = (role) => {
    const r = role.toLowerCase();

    if (r === "admin") navigate("/admin/dashboard");
    else if (r === "driver") navigate("/driver/dashboard");
    else navigate("/book");
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

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

      if (!data?.token) throw new Error("Invalid response");

      const finalRole = (data.role || role).toLowerCase();

      localStorage.setItem("token", data.token);
      localStorage.setItem("role", finalRole);
      localStorage.setItem("user", JSON.stringify(data.user));

      redirectUser(finalRole);

    } catch (err) {
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

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500">
      <div className="backdrop-blur-xl bg-white/90 p-8 rounded-3xl shadow-2xl w-[380px] border border-white/40">

        <h2 className="text-3xl font-bold text-center mb-2 text-gray-800">
          Welcome Back 👋
        </h2>
        <p className="text-center text-gray-500 mb-6 text-sm">
          Login to your TransportX account
        </p>

        <div className="space-y-4">

          <select
            name="role"
            value={form.role}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
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
            className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
          />

          <input
            name="password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
          />

          <button
            onClick={handleLogin}
            disabled={loading}
            className={`w-full py-2 rounded-xl text-white font-semibold transition-all duration-300 ${
              loading
                ? "bg-gray-400"
                : "bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg"
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

        {/* ===== SIGNUP SECTION ===== */}
        <div className="mt-6 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <span
            onClick={() => navigate('/signup')}
            className="text-indigo-600 font-semibold cursor-pointer hover:underline"
          >
            Sign up
          </span>
        </div>

      </div>
    </div>
  );
}
