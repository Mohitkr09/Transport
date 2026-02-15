import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleRegister = async () => {
    if (!name || !email || !password) {
      setError("All fields are required");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);
      setError("");

      await axios.post("http://localhost:5000/api/auth/register", {
        name,
        email,
        password,
        role: "user" // default role
      });

      alert("🎉 Registered successfully!");
      navigate("/");

    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center
                    bg-gradient-to-br from-indigo-500 to-purple-600
                    dark:from-gray-900 dark:to-gray-800 transition">

      <div className="bg-white dark:bg-gray-900
                      p-8 rounded-2xl shadow-xl w-[350px]
                      text-gray-800 dark:text-gray-100 transition">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">
            Create Account
          </h2>
        </div>

        {/* FORM */}
        <div className="space-y-4">

          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRegister()}
            className="w-full px-4 py-2 border rounded-lg
                       bg-white dark:bg-gray-800
                       border-gray-300 dark:border-gray-700
                       focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRegister()}
            className="w-full px-4 py-2 border rounded-lg
                       bg-white dark:bg-gray-800
                       border-gray-300 dark:border-gray-700
                       focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRegister()}
            className="w-full px-4 py-2 border rounded-lg
                       bg-white dark:bg-gray-800
                       border-gray-300 dark:border-gray-700
                       focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <button
            onClick={handleRegister}
            disabled={loading}
            className={`w-full py-2 rounded-lg font-semibold transition
              ${loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-indigo-600 text-white hover:bg-indigo-700"}`}
          >
            {loading ? "Creating account..." : "Register"}
          </button>

        </div>

        {/* ERROR */}
        {error && (
          <p className="text-red-500 text-sm mt-3 text-center">
            {error}
          </p>
        )}

        {/* FOOTER */}
        <p className="text-sm text-center text-gray-600 dark:text-gray-400 mt-4">
          Already have an account?
          <span
            onClick={() => navigate("/")}
            className="text-indigo-600 dark:text-indigo-400
                       font-semibold cursor-pointer ml-1"
          >
            Login
          </span>
        </p>

      </div>
    </div>
  );
};

export default Register;
