import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

// ======================================================
// API CONFIG (AUTO ENV SUPPORT)
// ======================================================
const BASE =
  import.meta.env.VITE_API_URL ||
  "https://transport-mpb5.onrender.com";

const API = BASE.endsWith("/api") ? BASE : `${BASE}/api`;

const api = axios.create({
  baseURL: API,
  timeout: 15000
});

// ======================================================
// COMPONENT
// ======================================================
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  // ======================================================
  // AUTO REDIRECT IF ALREADY LOGGED IN
  // ======================================================
  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");

    if (token && user) {
      const role = JSON.parse(user).role;

      if (role === "admin") navigate("/admin");
      else if (role === "driver") navigate("/driver");
      else navigate("/book");
    }
  }, []);

  // ======================================================
  // LOGIN HANDLER
  // ======================================================
  const handleLogin = async () => {
    if (loading) return;

    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await api.post("/auth/login", {
        email,
        password
      });

      if (!res.data?.token)
        throw new Error("Invalid server response");

      // SAVE AUTH
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      const role = res.data.user?.role;

      // REDIRECT
      if (role === "admin") navigate("/admin");
      else if (role === "driver") navigate("/driver");
      else navigate("/book");

    } catch (err) {
      if (err.code === "ECONNABORTED")
        setError("Server timeout. Try again.");

      else if (!err.response)
        setError("Server unreachable. Wait 30s and retry.");

      else
        setError(err.response.data?.message || "Login failed");

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
          Welcome Back
        </h2>

        <div className="space-y-4">

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            className="w-full px-4 py-2 border rounded-lg
                       bg-white dark:bg-gray-800
                       border-gray-300 dark:border-gray-700
                       focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            className="w-full px-4 py-2 border rounded-lg
                       bg-white dark:bg-gray-800
                       border-gray-300 dark:border-gray-700
                       focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <button
            onClick={handleLogin}
            disabled={loading}
            className={`w-full py-2 rounded-lg font-semibold transition
              ${
                loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-indigo-600 text-white hover:bg-indigo-700"
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

        <p className="text-sm text-center text-gray-600 dark:text-gray-400 mt-4">
          Don’t have an account?
          <span
            onClick={() => navigate("/register")}
            className="text-indigo-600 dark:text-indigo-400
                       font-semibold cursor-pointer ml-1"
          >
            Register
          </span>
        </p>

      </div>
    </div>
  );
}