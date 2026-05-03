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

  const isValidEmail = /\S+@\S+\.\S+/.test(form.email);
  const isValidPhone = /^[0-9]{10,15}$/.test(form.phone);

  /* ================= REGISTER ================= */
  const handleRegister = async () => {
    if (loading) return;

    if (!form.name) return setError("Enter full name");
    if (!isValidEmail) return setError("Invalid email");
    if (!isValidPhone) return setError("Invalid phone");
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

  /* ================= UI ================= */
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500">

      <div className="w-full max-w-md sm:max-w-lg backdrop-blur-xl bg-white/90 rounded-3xl shadow-2xl p-6 sm:p-8">

        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-6">
          Create Account 🚀
        </h2>

        <div className="space-y-4">

          {/* ROLE */}
          <select
            name="role"
            value={form.role}
            onChange={update}
            className="w-full px-4 py-3 rounded-xl border"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>

          {/* FULL NAME (FIXED) */}
          <input
            name="name"
            value={form.name}
            onChange={update}
            placeholder="Full Name"
            className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-indigo-400 outline-none"
          />

          {/* EMAIL */}
          <div className="relative">
            <input
              name="email"
              value={form.email}
              onChange={update}
              placeholder="Email"
              className="w-full px-4 py-3 rounded-xl border"
            />
            <div className="absolute right-3 top-3">
              {form.email &&
                (isValidEmail
                  ? <CheckCircle className="text-green-500" size={20}/>
                  : <XCircle className="text-red-500" size={20}/>)}
            </div>
          </div>

          {/* PHONE */}
          <div className="relative">
            <input
              name="phone"
              value={form.phone}
              onChange={update}
              placeholder="Phone"
              className="w-full px-4 py-3 rounded-xl border"
            />
            <div className="absolute right-3 top-3">
              {form.phone &&
                (isValidPhone
                  ? <CheckCircle className="text-green-500" size={20}/>
                  : <XCircle className="text-red-500" size={20}/>)}
            </div>
          </div>

          {/* PASSWORD */}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={form.password}
              onChange={update}
              placeholder="Password"
              className="w-full px-4 py-3 rounded-xl border pr-10"
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
            <div>
              <div className="h-2 bg-gray-200 rounded">
                <div
                  className={`h-2 rounded ${strengthColor[strength - 1]}`}
                  style={{ width: `${(strength / 4) * 100}%` }}
                />
              </div>
              <p className="text-xs mt-1">
                Strength: {strengthText[strength - 1] || "Weak"}
              </p>
            </div>
          )}

          {/* BUTTON */}
          <button
            onClick={handleRegister}
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
          >
            {loading ? "Creating..." : "Register"}
          </button>

        </div>

        {error && (
          <p className="text-red-500 mt-4 text-center">{error}</p>
        )}

      </div>
    </div>
  );
}