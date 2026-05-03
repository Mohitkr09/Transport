import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";

/* ================= API ================= */
const BASE =
  import.meta.env.VITE_API_URL ||
  "https://transport-mpb5.onrender.com";

const API = BASE.endsWith("/api") ? BASE : `${BASE}/api`;

const api = axios.create({
  baseURL: API,
  timeout: 20000,
});

/* ================= COMPONENT ================= */
export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
    role: "user",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* ================= AUTO REDIRECT ================= */
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

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  /* ================= VALIDATION ================= */
  const isValidEmail = /\S+@\S+\.\S+/.test(form.email);

  /* ================= LOGIN ================= */
  const handleLogin = async () => {
    if (loading) return;

    if (!isValidEmail) return setError("Enter valid email");
    if (!form.password) return setError("Enter password");

    try {
      setLoading(true);
      setError("");

      const res = await api.post("/auth/login", form);
      const data = res.data;

      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role);
      localStorage.setItem("user", JSON.stringify(data.user));

      redirectUser(data.role);

    } catch (err) {
      if (err.response) {
        const status = err.response.status;

        if (status === 401) setError("Invalid credentials");
        else if (status === 403) setError("Driver not approved");
        else setError(err.response.data?.message || "Login failed");
      } else {
        setError("Server not reachable");
      }
    } finally {
      setLoading(false);
    }
  };

  /* ================= FLOATING INPUT ================= */
  const Input = ({ name, label, type = "text" }) => {
    const value = form[name];

    return (
      <div className="relative">
        <input
          name={name}
          type={type}
          value={value}
          onChange={handleChange}
          className="peer w-full px-4 pt-5 pb-2 rounded-xl border focus:ring-2 focus:ring-indigo-400 outline-none"
        />
        <label className="absolute left-3 top-2 text-sm text-gray-500 transition-all 
          peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base
          peer-focus:top-2 peer-focus:text-sm peer-focus:text-indigo-500">
          {label}
        </label>
      </div>
    );
  };

  /* ================= UI ================= */
  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500">

      <div className="w-full max-w-md sm:max-w-lg backdrop-blur-xl bg-white/80 rounded-3xl shadow-2xl p-6 sm:p-8 border border-white/40">

        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">
          Welcome Back 👋
        </h2>

        <p className="text-center text-gray-500 mb-6 text-sm">
          Login to your TransportX account
        </p>

        <div className="space-y-4">

          {/* ROLE */}
          <select
            name="role"
            value={form.role}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-indigo-400"
          >
            <option value="user">User</option>
            <option value="driver">Driver</option>
            <option value="admin">Admin</option>
          </select>

          {/* EMAIL */}
          <div className="relative">
            <input
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border"
              placeholder="Email"
            />
            <div className="absolute right-3 top-3">
              {form.email &&
                (isValidEmail ? (
                  <CheckCircle className="text-green-500" size={20} />
                ) : (
                  <XCircle className="text-red-500" size={20} />
                ))}
            </div>
          </div>

          {/* PASSWORD */}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={form.password}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border pr-10"
              placeholder="Password"
            />
            <div
              className="absolute right-3 top-3 cursor-pointer"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
            </div>
          </div>

          {/* BUTTON */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className={`w-full py-3 rounded-xl text-white font-semibold transition-all ${
              loading
                ? "bg-gray-400"
                : "bg-indigo-600 hover:bg-indigo-700 hover:scale-[1.02]"
            }`}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </div>

        {/* ERROR */}
        {error && (
          <p className="text-red-500 text-sm mt-4 text-center">
            {error}
          </p>
        )}

        {/* SIGNUP */}
        <p className="text-center text-sm mt-6">
          Don’t have an account?{" "}
          <span
            onClick={() => navigate("/signup")}
            className="text-indigo-600 cursor-pointer font-semibold hover:underline"
          >
            Sign up
          </span>
        </p>

      </div>
    </div>
  );
}