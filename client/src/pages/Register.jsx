import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";

/* ================= API ================= */
const BASE =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

const API = BASE.endsWith("/api") ? BASE : `${BASE}/api`;

const api = axios.create({
  baseURL: API,
});

/* ================= COMPONENT ================= */
export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "user",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const update = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  /* ================= PASSWORD STRENGTH ================= */
  const getStrength = () => {
    const pwd = form.password;
    let score = 0;

    if (pwd.length >= 6) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    return score;
  };

  const strength = getStrength();

  const strengthText = ["Weak", "Fair", "Good", "Strong"];
  const strengthColor = ["bg-red-400", "bg-yellow-400", "bg-blue-400", "bg-green-500"];

  /* ================= VALIDATION ================= */
  const isValidEmail = /\S+@\S+\.\S+/.test(form.email);
  const isValidPhone = /^[0-9]{10,15}$/.test(form.phone);

  /* ================= REGISTER ================= */
  const handleRegister = async () => {
    if (loading) return;

    if (!isValidEmail) return setError("Invalid email");
    if (!isValidPhone) return setError("Invalid phone number");
    if (strength < 1) return setError("Weak password");

    try {
      setLoading(true);
      setError("");

      const res = await api.post("/auth/register", form);
      const data = res.data;

      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role);
      localStorage.setItem("user", JSON.stringify(data.user));

      navigate("/");

    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  /* ================= INPUT COMPONENT ================= */
  const InputField = ({ name, label, type = "text" }) => {
    const value = form[name];

    return (
      <div className="relative">
        <input
          name={name}
          type={type}
          value={value}
          onChange={update}
          className="peer w-full px-4 pt-5 pb-2 rounded-xl border focus:ring-2 focus:ring-indigo-400 outline-none"
        />
        <label className="absolute left-3 top-2 text-sm text-gray-500 transition-all 
          peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400
          peer-focus:top-2 peer-focus:text-sm peer-focus:text-indigo-500">
          {label}
        </label>
      </div>
    );
  };

  /* ================= UI ================= */
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500">

      <div className="w-full max-w-md backdrop-blur-xl bg-white/80 rounded-3xl shadow-2xl p-6">

        <h2 className="text-2xl font-bold text-center mb-6">
          Create Account 🚀
        </h2>

        <div className="space-y-4">

          <select
            name="role"
            value={form.role}
            onChange={update}
            className="w-full px-4 py-3 rounded-xl border"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>

          <InputField name="name" label="Full Name" />
          
          {/* EMAIL WITH VALIDATION ICON */}
          <div className="relative">
            <input
              name="email"
              value={form.email}
              onChange={update}
              className="w-full px-4 py-3 rounded-xl border"
              placeholder="Email"
            />
            <div className="absolute right-3 top-3">
              {form.email && (
                isValidEmail
                  ? <CheckCircle className="text-green-500" size={20}/>
                  : <XCircle className="text-red-500" size={20}/>
              )}
            </div>
          </div>

          {/* PHONE */}
          <div className="relative">
            <input
              name="phone"
              value={form.phone}
              onChange={update}
              className="w-full px-4 py-3 rounded-xl border"
              placeholder="Phone"
            />
            <div className="absolute right-3 top-3">
              {form.phone && (
                isValidPhone
                  ? <CheckCircle className="text-green-500" size={20}/>
                  : <XCircle className="text-red-500" size={20}/>
              )}
            </div>
          </div>

          {/* PASSWORD */}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={form.password}
              onChange={update}
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

          {/* PASSWORD STRENGTH */}
          {form.password && (
            <div className="space-y-1">
              <div className="h-2 w-full bg-gray-200 rounded">
                <div
                  className={`h-2 rounded ${strengthColor[strength - 1]}`}
                  style={{ width: `${(strength / 4) * 100}%` }}
                />
              </div>
              <p className="text-xs text-gray-600">
                Strength: {strengthText[strength - 1] || "Weak"}
              </p>
            </div>
          )}

          <button
            onClick={handleRegister}
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold"
          >
            {loading ? "Creating..." : "Register"}
          </button>

        </div>

        {error && (
          <p className="text-red-500 text-sm mt-4 text-center">
            {error}
          </p>
        )}

        <p className="text-center text-sm mt-4">
          Already have an account?{" "}
          <span
            onClick={() => navigate("/login")}
            className="text-indigo-600 cursor-pointer"
          >
            Login
          </span>
        </p>

      </div>
    </div>
  );
}