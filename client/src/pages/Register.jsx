import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

/* ================= API ================= */
const BASE =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";   // ✅ FIXED (local first)

const API = BASE.endsWith("/api") ? BASE : `${BASE}/api`;

const api = axios.create({
  baseURL: API,
  timeout: 20000,
});

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "user",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const update = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  /* ================= REGISTER ================= */
  const handleRegister = async () => {
    if (loading) return;

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const password = form.password.trim();
    const phone = form.phone.trim();
    const role = form.role;

    if (!name || !email || !password || !phone) {
      return setError("All fields are required");
    }

    if (password.length < 6) {
      return setError("Password must be at least 6 characters");
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const res = await api.post("/auth/register", {
        name,
        email,
        password,
        phone,
        role,
      });

      if (!res.data?.success) {
        throw new Error(res.data?.message || "Registration failed");
      }

      setSuccess("🎉 Account created successfully!");

      // ✅ redirect after success
      setTimeout(() => navigate("/login"), 1500);

    } catch (err) {
      console.log("🔥 REGISTER ERROR:", err);

      // ✅ FIXED ERROR HANDLING (MOST IMPORTANT)
      if (err.code === "ECONNABORTED") {
        setError("Server timeout. Try again.");
      } 
      else if (!err.response) {
        setError("Backend not reachable. Start server.");
      } 
      else {
        const status = err.response.status;

        if (status === 409) {
          setError("User already exists. Redirecting...");
          setTimeout(() => navigate("/login"), 1500);
        } 
        else if (status === 400) {
          setError(err.response.data?.message || "Invalid input");
        } 
        else if (status === 500) {
          setError("Server error. Please try again.");
        } 
        else {
          // ✅ FINAL SAFE FALLBACK
          setError(
            err.response?.data?.message ||
            err.message ||
            "Something went wrong"
          );
        }
      }

    } finally {
      setLoading(false);
    }
  };

  /* ================= UI ================= */
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500">
      <div className="backdrop-blur-xl bg-white/90 p-8 rounded-3xl shadow-2xl w-[400px] border border-white/40">

        <h2 className="text-3xl font-bold text-center text-gray-800 mb-2">
          Create Account 🚀
        </h2>
        <p className="text-center text-gray-500 text-sm mb-6">
          Join TransportX and start your journey
        </p>

        <div className="space-y-4">

          <select
            name="role"
            value={form.role}
            onChange={update}
            className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>

          <input
            name="name"
            placeholder="Full Name"
            value={form.name}
            onChange={update}
            className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
          />

          <input
            name="email"
            type="email"
            placeholder="Email Address"
            value={form.email}
            onChange={update}
            className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
          />

          <input
            name="phone"
            placeholder="Phone Number"
            value={form.phone}
            onChange={update}
            className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
          />

          <input
            name="password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={update}
            className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
          />

          <button
            onClick={handleRegister}
            disabled={loading}
            className={`w-full py-2 rounded-xl text-white font-semibold transition-all duration-300 ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg"
            }`}
          >
            {loading ? "Creating account..." : "Register"}
          </button>
        </div>

        {success && (
          <p className="text-green-500 text-sm mt-3 text-center">
            {success}
          </p>
        )}

        {error && (
          <p className="text-red-500 text-sm mt-3 text-center">
            {error}
          </p>
        )}

        <div className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <span
            onClick={() => navigate("/login")}
            className="text-indigo-600 font-semibold cursor-pointer hover:underline"
          >
            Login
          </span>
        </div>

      </div>
    </div>
  );
}