import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

// ======================================================
// API CONFIG (AUTO ENV SAFE)
// ======================================================
const BASE =
  import.meta.env.VITE_API_URL ||
  "https://transport-mpb5.onrender.com";

const API = BASE.endsWith("/api") ? BASE : `${BASE}/api`;

const api = axios.create({
  baseURL: API,
  timeout: 20000
});

// ======================================================
// COMPONENT
// ======================================================
export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ======================================================
  // INPUT HANDLER
  // ======================================================
  const update = e =>
    setForm({ ...form, [e.target.name]: e.target.value });

  // ======================================================
  // REGISTER HANDLER
  // ======================================================
  const handleRegister = async () => {
    if (loading) return;

    if (!form.name || !form.email || !form.password)
      return setError("All fields are required");

    if (form.password.length < 6)
      return setError("Password must be at least 6 characters");

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const res = await api.post("/auth/register", {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: "user"
      });

      if (!res.data?.success)
        throw new Error(res.data?.message || "Registration failed");

      setSuccess("🎉 Account created successfully!");

      setTimeout(() => navigate("/"), 1500);

    } catch (err) {
      if (err.code === "ECONNABORTED")
        setError("Server timeout. Try again.");

      else if (!err.response)
        setError("Server unavailable. Please wait 30s.");

      else
        setError(err.response.data?.message || "Registration failed");

    } finally {
      setLoading(false);
    }
  };

  // ======================================================
  // UI
  // ======================================================
  return (
    <div className="min-h-screen flex items-center justify-center
                    bg-gradient-to-br from-indigo-500 to-purple-600
                    dark:from-gray-900 dark:to-gray-800">

      <div className="bg-white dark:bg-gray-900
                      p-8 rounded-2xl shadow-xl w-[350px]
                      text-gray-800 dark:text-gray-100">

        <h2 className="text-2xl font-bold mb-6 text-center">
          Create Account
        </h2>

        <div className="space-y-4">

          <input
            name="name"
            placeholder="Full Name"
            value={form.name}
            onChange={update}
            onKeyDown={e=>e.key==="Enter" && handleRegister()}
            className="w-full px-4 py-2 border rounded-lg
                       bg-white dark:bg-gray-800
                       border-gray-300 dark:border-gray-700
                       focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <input
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={update}
            onKeyDown={e=>e.key==="Enter" && handleRegister()}
            className="w-full px-4 py-2 border rounded-lg
                       bg-white dark:bg-gray-800
                       border-gray-300 dark:border-gray-700
                       focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <input
            name="password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={update}
            onKeyDown={e=>e.key==="Enter" && handleRegister()}
            className="w-full px-4 py-2 border rounded-lg
                       bg-white dark:bg-gray-800
                       border-gray-300 dark:border-gray-700
                       focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <button
            onClick={handleRegister}
            disabled={loading}
            className={`w-full py-2 rounded-lg font-semibold transition
              ${
                loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-indigo-600 text-white hover:bg-indigo-700"
              }`}
          >
            {loading ? "Creating account..." : "Register"}
          </button>
        </div>

        {/* SUCCESS */}
        {success && (
          <p className="text-green-500 text-sm mt-3 text-center">
            {success}
          </p>
        )}

        {/* ERROR */}
        {error && (
          <p className="text-red-500 text-sm mt-3 text-center">
            {error}
          </p>
        )}

        <p className="text-sm text-center text-gray-600 dark:text-gray-400 mt-4">
          Already have an account?
          <span
            onClick={()=>navigate("/")}
            className="text-indigo-600 dark:text-indigo-400
                       font-semibold cursor-pointer ml-1">
            Login
          </span>
        </p>

      </div>
    </div>
  );
}