
import React, { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  MapPin,
  Navigation,
  CarFront,
  ShieldCheck,
  Clock3,
  ArrowRight,
  Route,
  UserRound,
  Car,
  Shield,
  LoaderCircle,
} from "lucide-react";

/* ================= API CONFIGURATION ================= */

const BASE_URL =
  import.meta.env.VITE_API_URL ||
  "https://transport-mpb5.onrender.com";

const NORMALIZED_BASE_URL = BASE_URL.replace(/\/+$/, "");

const API_URL = NORMALIZED_BASE_URL.endsWith("/api")
  ? NORMALIZED_BASE_URL
  : `${NORMALIZED_BASE_URL}/api`;

const api = axios.create({
  baseURL: API_URL,
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
  },
});

/* ================= ROLE CONFIGURATION ================= */

const roles = [
  { value: "user", label: "Rider", icon: UserRound },
  { value: "driver", label: "Driver", icon: Car },
  { value: "admin", label: "Admin", icon: Shield },
];

/* ================= LOGIN COMPONENT ================= */

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

  /* ================= REDIRECT BY ROLE ================= */

  const redirectUser = (role) => {
    switch (String(role || "").toLowerCase()) {
      case "admin":
        navigate("/admin/dashboard", { replace: true });
        break;

      case "driver":
        navigate("/driver/dashboard", { replace: true });
        break;

      case "user":
        navigate("/book", { replace: true });
        break;

      default:
        navigate("/", { replace: true });
    }
  };

  /* ================= FORM HANDLING ================= */

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (error) {
      setError("");
    }
  };

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    form.email.trim()
  );

  /* ================= LOGIN REQUEST ================= */

  const handleLogin = async (event) => {
    event.preventDefault();

    if (loading) return;

    const email = form.email.trim().toLowerCase();
    const password = form.password;
    const selectedRole = form.role.toLowerCase();

    if (!email || !isValidEmail) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await api.post("/auth/login", {
        email,
        password,
        role: selectedRole,
      });

      const data = response.data;

      if (!data?.token || !data?.role) {
        setError(
          "The server returned an incomplete login response. Please try again."
        );
        return;
      }

      const actualRole = String(data.role).toLowerCase();

      if (actualRole !== selectedRole) {
        setError(
          "The account role does not match your selection. Please choose the correct role."
        );
        return;
      }

      // Save authentication details after successful login.
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", actualRole);

      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      } else {
        localStorage.removeItem("user");
      }

      redirectUser(actualRole);
    } catch (err) {
      const status = err.response?.status;
      const serverMessage = err.response?.data?.message;

      if (status === 400) {
        setError(
          serverMessage || "Please check the information you entered."
        );
      } else if (status === 401) {
        setError(
          serverMessage ||
            "Invalid email or password. Also check that you selected the correct account role."
        );
      } else if (status === 403) {
        setError(
          serverMessage ||
            "Access denied. Your account may require approval."
        );
      } else if (status === 404) {
        setError(
          serverMessage ||
            "The login endpoint was not found. Please check your backend API URL."
        );
      } else if (status >= 500) {
        setError(
          serverMessage ||
            "A server error occurred. Please try again later."
        );
      } else if (err.code === "ECONNABORTED") {
        setError(
          "The server took too long to respond. Please try again."
        );
      } else if (!err.response) {
        setError(
          "Unable to connect to TransportX. Check your internet connection and try again."
        );
      } else {
        setError(serverMessage || "Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  /* ================= USER INTERFACE ================= */

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#07111f] text-white">
      {/* BACKGROUND EFFECTS */}

      <div className="pointer-events-none absolute -left-40 top-20 h-80 w-80 rounded-full bg-indigo-600/20 blur-[100px] sm:h-96 sm:w-96 sm:blur-[120px]" />

      <div className="pointer-events-none absolute -right-40 bottom-0 h-80 w-80 rounded-full bg-cyan-500/15 blur-[100px] sm:h-96 sm:w-96 sm:blur-[120px]" />

      {/* TOP NAVIGATION */}

      <header className="relative z-10 flex items-center justify-between gap-3 px-4 py-4 sm:px-8 sm:py-5 lg:px-16">
        <Link
          to="/"
          className="flex min-w-0 items-center gap-2.5 sm:gap-3"
          aria-label="TransportX home"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500 shadow-lg shadow-indigo-500/30 sm:h-12 sm:w-12 sm:rounded-2xl">
            <CarFront size={25} />
          </div>

          <div>
            <span className="text-lg font-extrabold tracking-tight sm:text-xl">
              Transport<span className="text-indigo-400">X</span>
            </span>

            <p className="text-[9px] uppercase tracking-[0.2em] text-slate-400 sm:text-[10px] sm:tracking-[0.24em]">
              Move smarter
            </p>
          </div>
        </Link>

        <Link
          to="/"
          className="shrink-0 rounded-full border border-white/10 px-3 py-2 text-xs text-slate-300 transition hover:border-indigo-400 hover:text-white sm:px-4 sm:text-sm"
        >
          Back to home
        </Link>
      </header>

      {/* MAIN CONTENT */}

      <section className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-8 px-4 pb-8 pt-5 sm:px-8 sm:pb-12 sm:pt-8 lg:min-h-[calc(100vh-88px)] lg:grid-cols-2 lg:gap-16 lg:px-16 lg:py-10 xl:gap-20">
        {/* LEFT: BRANDING PANEL */}

        <div className="hidden lg:block">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Your journey starts here
          </div>

          <h1 className="max-w-xl text-5xl font-black leading-[1.15] tracking-tight xl:text-6xl">
            Every journey,
            <span className="mt-2 block bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-300 bg-clip-text text-transparent">
              a better experience.
            </span>
          </h1>

          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-400">
            Your city, your destination, your ride. Sign in to book
            rides, follow your journey, and get where you need to be.
          </p>

          {/* TRANSPORT VISUAL */}

          <div className="relative mt-10 overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-slate-800/90 via-[#111d32] to-indigo-950/80 p-6 shadow-2xl shadow-indigo-950/30 xl:p-8">
            <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl" />

            <div className="relative flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-400">
                  Your city. Connected.
                </p>

                <h2 className="mt-1 text-xl font-bold">
                  The smarter way to move
                </h2>
              </div>

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-300">
                <Navigation size={24} />
              </div>
            </div>

            {/* ROUTE CARD */}

            <div className="relative mt-7 rounded-2xl border border-white/10 bg-[#091423]/80 p-5">
              <div className="absolute bottom-12 left-[29px] top-12 border-l-2 border-dashed border-indigo-400/70" />

              <div className="relative flex items-center gap-4">
                <div className="z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-[#07111f]">
                  <MapPin size={15} />
                </div>

                <div className="min-w-0">
                  <p className="text-xs text-slate-500">PICKUP</p>
                  <p className="break-words font-semibold">
                    Your current location
                  </p>
                </div>
              </div>

              <div className="relative my-5 flex items-center gap-4">
                <div className="z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white">
                  <Navigation size={14} />
                </div>

                <div className="min-w-0">
                  <p className="text-xs text-slate-500">DESTINATION</p>
                  <p className="break-words font-semibold">
                    Wherever life takes you
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Route size={17} className="text-indigo-400" />
                  Smart route experience
                </div>

                <CarFront size={28} className="text-indigo-300" />
              </div>
            </div>

            {/* FEATURE CARDS */}

            <div className="relative mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <div className="rounded-2xl bg-white/5 p-4">
                <ShieldCheck
                  className="mb-2 text-emerald-400"
                  size={23}
                />

                <p className="font-semibold">Secure access</p>

                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Protected account workflows
                </p>
              </div>

              <div className="rounded-2xl bg-white/5 p-4">
                <Clock3 className="mb-2 text-cyan-300" size={23} />

                <p className="font-semibold">Ride with ease</p>

                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Convenient ride booking
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: LOGIN FORM */}

        <div className="mx-auto w-full max-w-md">
          {/* MOBILE AND TABLET BRANDING */}

          <div className="mb-6 text-center lg:hidden">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500 shadow-lg shadow-indigo-500/30 sm:h-14 sm:w-14">
              <CarFront size={28} />
            </div>

            <h1 className="text-2xl font-extrabold sm:text-3xl">
              Welcome to TransportX
            </h1>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-400">
              Your next ride is just a sign-in away.
            </p>
          </div>

          {/* LOGIN CARD */}

          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/20 backdrop-blur-2xl sm:rounded-[2rem] sm:p-8 md:p-9">
            <div className="mb-6 sm:mb-7">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300 sm:text-sm">
                Welcome back
              </p>

              <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                Sign in
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Enter your details to access your TransportX account.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {/* ROLE SELECTOR */}

              <fieldset>
                <legend className="mb-3 text-sm font-medium text-slate-300">
                  Continue as
                </legend>

                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {roles.map(({ value, label, icon: Icon }) => {
                    const selected = form.role === value;

                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          setForm((previous) => ({
                            ...previous,
                            role: value,
                          }));

                          setError("");
                        }}
                        aria-pressed={selected}
                        className={`flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-xl border px-1.5 py-3 transition duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 sm:min-h-[84px] sm:rounded-2xl sm:px-2 ${
                          selected
                            ? "border-indigo-400 bg-indigo-500/15 text-indigo-200 ring-1 ring-indigo-400/40"
                            : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/25 hover:bg-white/[0.06] hover:text-white"
                        }`}
                      >
                        <Icon size={21} />

                        <span className="text-xs font-semibold sm:text-sm">
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              {/* EMAIL */}

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Email address
                </label>

                <div className="relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    required
                    className="min-h-12 w-full rounded-xl border border-white/10 bg-[#091423]/80 px-4 py-3.5 pr-11 text-base text-white outline-none transition placeholder:text-slate-600 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 sm:text-sm"
                  />

                  {form.email && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {isValidEmail ? (
                        <CheckCircle
                          size={19}
                          className="text-emerald-400"
                        />
                      ) : (
                        <XCircle
                          size={19}
                          className="text-rose-400"
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* PASSWORD */}

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Password
                </label>

                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    required
                    className="min-h-12 w-full rounded-xl border border-white/10 bg-[#091423]/80 px-4 py-3.5 pr-12 text-base text-white outline-none transition placeholder:text-slate-600 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 sm:text-sm"
                  />

                  <button
                    type="button"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    aria-pressed={showPassword}
                    onClick={() =>
                      setShowPassword((previous) => !previous)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    {showPassword ? (
                      <EyeOff size={20} />
                    ) : (
                      <Eye size={20} />
                    )}
                  </button>
                </div>
              </div>

              {/* ERROR MESSAGE */}

              {error && (
                <div
                  role="alert"
                  aria-live="polite"
                  className="break-words rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm leading-6 text-rose-300"
                >
                  {error}
                </div>
              )}

              {/* SUBMIT BUTTON */}

              <button
                type="submit"
                disabled={loading}
                className="group flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-3.5 font-bold text-white shadow-lg shadow-indigo-950/40 transition duration-200 hover:from-indigo-400 hover:to-violet-500 focus:outline-none focus:ring-4 focus:ring-indigo-400/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <LoaderCircle
                      size={20}
                      className="animate-spin"
                    />
                    Signing you in...
                  </>
                ) : (
                  <>
                    Sign in to TransportX
                    <ArrowRight
                      size={19}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </>
                )}
              </button>
            </form>

            {/* REGISTER LINK */}

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />

              <span className="whitespace-nowrap text-[10px] text-slate-500 sm:text-xs">
                NEW TO TRANSPORTX?
              </span>

              <div className="h-px flex-1 bg-white/10" />
            </div>

            <p className="text-center text-sm leading-6 text-slate-400">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="font-semibold text-indigo-300 transition hover:text-indigo-200 hover:underline"
              >
                Create an account
              </Link>
            </p>

            {/* SECURITY FOOTER */}

            <div className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-slate-500 sm:mt-7">
              <ShieldCheck size={15} className="shrink-0" />
              <span>Secure sign-in to your TransportX account</span>
            </div>
          </div>

          <p className="mt-5 px-2 text-center text-xs leading-5 text-slate-500">
            © 2026 TransportX · Smart mobility for modern cities
          </p>
        </div>
      </section>
    </main>
  );
}
