
import React, { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  UserRound,
  Mail,
  Phone,
  LockKeyhole,
  ArrowRight,
  CarFront,
  ShieldCheck,
  MapPin,
} from "lucide-react";

/* ================= API CONFIGURATION ================= */
const BASE = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const API = BASE.endsWith("/api") ? BASE : `${BASE}/api`;

const api = axios.create({
  baseURL: API,
  timeout: 20000,
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

  const update = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (error) setError("");
  };

  /* ================= VALIDATION ================= */
  const passwordChecks = [
    {
      label: "At least 8 characters",
      valid: form.password.length >= 8,
    },
    {
      label: "One uppercase letter",
      valid: /[A-Z]/.test(form.password),
    },
    {
      label: "One number",
      valid: /[0-9]/.test(form.password),
    },
    {
      label: "One special character",
      valid: /[^A-Za-z0-9]/.test(form.password),
    },
  ];

  const strength = passwordChecks.filter((item) => item.valid).length;

  const strengthInfo = [
    { label: "Very weak", color: "bg-red-500", text: "text-red-400" },
    { label: "Weak", color: "bg-orange-500", text: "text-orange-400" },
    { label: "Fair", color: "bg-yellow-500", text: "text-yellow-400" },
    { label: "Good", color: "bg-sky-500", text: "text-sky-400" },
    { label: "Strong", color: "bg-emerald-500", text: "text-emerald-400" },
  ];

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    form.email.trim()
  );

  const isValidPhone = /^[0-9]{10,15}$/.test(form.phone.trim());

  const isValidPassword = passwordChecks.every((item) => item.valid);

  /* ================= REGISTER ================= */
  const handleRegister = async (e) => {
    e.preventDefault();

    if (loading) return;

    if (!form.name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!isValidEmail) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!isValidPhone) {
      setError("Enter a valid phone number using 10–15 digits.");
      return;
    }

    if (!isValidPassword) {
      setError("Please meet all password requirements.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const payload = {
        ...form,
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
      };

      const res = await api.post("/auth/register", payload);
      const data = res.data;

      // Store authentication only if the API returns a token.
      if (data.token) {
        localStorage.setItem("token", data.token);
      }

      if (data.role) {
        localStorage.setItem("role", data.role);
      }

      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }

      // If the backend registers without logging the user in,
      // redirect to the login page instead.
      if (data.token) {
        navigate(
          data.role === "admin" ? "/admin/dashboard" : "/",
          { replace: true }
        );
      } else {
        navigate("/login", {
          replace: true,
          state: { registered: true },
        });
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          (err.code === "ECONNABORTED"
            ? "The server took too long to respond. Please try again."
            : "Registration failed. Please check your details and try again.")
      );
    } finally {
      setLoading(false);
    }
  };

  const currentStrength = strengthInfo[strength];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#080f20] px-4 py-8 text-white sm:px-6 lg:px-8">
      {/* Background decorations */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-20 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-3xl border border-white/10 bg-[#101a2e]/90 shadow-2xl shadow-black/30 lg:grid-cols-2">
          {/* Left promotional panel */}
          <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 p-10 lg:flex xl:p-12">
            <div className="absolute -right-20 top-24 h-72 w-72 rounded-full border border-white/10" />
            <div className="absolute -right-10 top-34 h-52 w-52 rounded-full border border-white/10" />
            <div className="absolute bottom-16 right-10 h-40 w-40 rounded-full bg-cyan-400/10 blur-2xl" />

            <div className="relative z-10">
              <Link to="/" className="inline-flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
                  <CarFront size={27} />
                </div>
                <span className="text-2xl font-bold tracking-tight">
                  Transport<span className="text-cyan-300">X</span>
                </span>
              </Link>

              <div className="mt-20">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-indigo-100">
                  <MapPin size={15} />
                  Your journey starts here
                </span>

                <h1 className="mt-7 max-w-md text-4xl font-bold leading-tight xl:text-5xl">
                  Move smarter.
                  <br />
                  Travel better.
                </h1>

                <p className="mt-5 max-w-md leading-7 text-indigo-100/80">
                  Create your TransportX account to book rides, discover
                  convenient routes, and manage your journeys in one place.
                </p>
              </div>
            </div>

            <div className="relative z-10 mt-12 rounded-2xl border border-white/15 bg-white/[0.07] p-5 backdrop-blur-sm">
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-emerald-400/15 p-3 text-emerald-300">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 className="font-semibold">Your journey, your control</h3>
                  <p className="mt-1 text-sm leading-6 text-indigo-100/75">
                    A simple way to get started with your next trip.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Registration form */}
          <div className="p-6 sm:p-9 lg:p-10 xl:p-12">
            <div className="mb-8 flex items-center justify-between lg:hidden">
              <Link to="/" className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
                  <CarFront size={24} />
                </div>
                <span className="text-xl font-bold">
                  Transport<span className="text-cyan-400">X</span>
                </span>
              </Link>
              <span className="text-xs text-slate-400">Create account</span>
            </div>

            <div className="mb-7">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-indigo-300">
                Get started
              </p>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Create your account
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Enter your details below to join TransportX.
              </p>
            </div>

            <form onSubmit={handleRegister} className="space-y-5">
              {/* Role */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Register as
                </label>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: "user", label: "Rider", icon: UserRound },
                    { value: "admin", label: "Admin", icon: ShieldCheck },
                  ].map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({ ...prev, role: value }))
                      }
                      className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                        form.role === value
                          ? "border-indigo-400 bg-indigo-500/15 text-white ring-1 ring-indigo-400/30"
                          : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-white"
                      }`}
                    >
                      <Icon size={18} />
                      {label}
                    </button>
                  ))}
                </div>

                <p className="mt-2 text-xs text-slate-500">
                  Choose the account type supported by your service.
                </p>
              </div>

              {/* Full name */}
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Full name
                </label>
                <div className="relative">
                  <UserRound
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    value={form.name}
                    onChange={update}
                    placeholder="Enter your full name"
                    required
                    className="w-full rounded-xl border border-white/10 bg-[#0b1426] py-3.5 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Email address
                </label>
                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={update}
                    placeholder="you@example.com"
                    required
                    className="w-full rounded-xl border border-white/10 bg-[#0b1426] py-3.5 pl-11 pr-11 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
                  />
                  {form.email && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2">
                      {isValidEmail ? (
                        <CheckCircle2 size={18} className="text-emerald-400" />
                      ) : (
                        <XCircle size={18} className="text-rose-400" />
                      )}
                    </span>
                  )}
                </div>
              </div>

              {/* Phone */}
              <div>
                <label
                  htmlFor="phone"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Phone number
                </label>
                <div className="relative">
                  <Phone
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    value={form.phone}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 15);
                      setForm((prev) => ({ ...prev, phone: digits }));
                      if (error) setError("");
                    }}
                    placeholder="Enter phone number"
                    required
                    className="w-full rounded-xl border border-white/10 bg-[#0b1426] py-3.5 pl-11 pr-11 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
                  />
                  {form.phone && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2">
                      {isValidPhone ? (
                        <CheckCircle2 size={18} className="text-emerald-400" />
                      ) : (
                        <XCircle size={18} className="text-rose-400" />
                      )}
                    </span>
                  )}
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Password
                </label>
                <div className="relative">
                  <LockKeyhole
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={form.password}
                    onChange={update}
                    placeholder="Create a strong password"
                    required
                    className="w-full rounded-xl border border-white/10 bg-[#0b1426] py-3.5 pl-11 pr-12 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-white"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {form.password && (
                  <div className="mt-3">
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`h-1.5 flex-1 rounded-full transition ${
                            strength >= level
                              ? currentStrength.color
                              : "bg-white/10"
                          }`}
                        />
                      ))}
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span className={`text-xs ${currentStrength.text}`}>
                        {currentStrength.label} password
                      </span>
                      <span className="text-xs text-slate-500">
                        {strength}/4 requirements
                      </span>
                    </div>

                    <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {passwordChecks.map((check) => (
                        <li
                          key={check.label}
                          className={`flex items-center gap-2 text-xs ${
                            check.valid ? "text-emerald-400" : "text-slate-500"
                          }`}
                        >
                          {check.valid ? (
                            <CheckCircle2 size={14} />
                          ) : (
                            <XCircle size={14} />
                          )}
                          {check.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Error */}
              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300"
                >
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 py-3.5 font-semibold text-white shadow-lg shadow-indigo-900/30 transition hover:from-indigo-400 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-[#101a2e] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Creating account...
                  </>
                ) : (
                  <>
                    Create account
                    <ArrowRight
                      size={18}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </>
                )}
              </button>

              <p className="text-center text-xs leading-5 text-slate-500">
                By creating an account, you agree to use TransportX responsibly.
              </p>
            </form>

            <div className="mt-7 border-t border-white/10 pt-6 text-center text-sm text-slate-400">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-semibold text-indigo-300 transition hover:text-indigo-200"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
