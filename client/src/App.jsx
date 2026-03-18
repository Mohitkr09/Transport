import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, useRef, Suspense, lazy } from "react";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";

/* ================= LAZY PAGES ================= */

const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const BookRide = lazy(() => import("./pages/BookRide"));
const DriverDashboard = lazy(() => import("./pages/DriverDashboard"));
const DriverRequests = lazy(() => import("./pages/DriverRequests"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const Payment = lazy(() => import("./pages/Payment"));
const RideTracking = lazy(() => import("./pages/RideTracking"));
const Notifications = lazy(() => import("./pages/Notifications"));

/* ADMIN */

const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const Drivers = lazy(() => import("./pages/admin/Drivers"));
const Analytics = lazy(() => import("./pages/admin/Analytics"));
const Settings = lazy(() => import("./pages/admin/Settings"));
const SupportMessages = lazy(() => import("./pages/admin/SupportMessages"));

/* ======================================================
SCROLL RESTORE
====================================================== */

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return null;
}

/* ======================================================
BACKEND WAKEUP
====================================================== */

function BackendWakeup() {
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const url = import.meta.env.VITE_API_URL;
    if (!url) return;

    fetch(`${url}/health`).catch(() => {});
  }, []);

  return null;
}

/* ======================================================
ROLE REDIRECT (IMPROVED)
====================================================== */

function RoleRedirect() {
  const { pathname } = useLocation();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token || !role) return;

    // Prevent redirect loop
    if (pathname === "/login" || pathname === "/register") return;

    if (role === "driver" && !pathname.startsWith("/driver")) {
      window.location.replace("/driver/dashboard");
    }

    if (role === "admin" && !pathname.startsWith("/admin")) {
      window.location.replace("/admin/dashboard");
    }

    if (role === "user" && pathname.startsWith("/admin")) {
      window.location.replace("/");
    }
  }, [pathname]);

  return null;
}

/* ======================================================
PAGE TITLE
====================================================== */

function TitleManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    const map = {
      "/": "Home",
      "/book": "Book Ride",
      "/driver/dashboard": "Driver Dashboard",
      "/driver/requests": "Ride Requests",
      "/admin/dashboard": "Admin Panel",
      "/notifications": "Notifications"
    };

    document.title = (map[pathname] || "TransportX") + " • TransportX";
  }, [pathname]);

  return null;
}

/* ======================================================
LOADER
====================================================== */

function PageLoader() {
  return (
    <div className="h-screen flex items-center justify-center">
      <div className="h-14 w-14 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

/* ======================================================
LAYOUT
====================================================== */

function Layout({ children }) {
  const { pathname } = useLocation();
  const role = localStorage.getItem("role");

  const isAdmin = role === "admin";

  const hideLayout =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/payment") ||
    pathname.startsWith("/admin");

  return (
    <>
      {!hideLayout && !isAdmin && <Navbar />}

      <div className={!hideLayout ? "pt-16 min-h-screen flex flex-col" : ""}>
        <div className="flex-grow">{children}</div>
        {!hideLayout && !isAdmin && <Footer />}
      </div>
    </>
  );
}

/* ======================================================
404
====================================================== */

function NotFound() {
  return <Navigate to="/" replace />;
}

/* ======================================================
APP ROOT
====================================================== */

export default function App() {
  return (
    <div className="bg-gray-50 dark:bg-gray-900 transition-colors">
      <ScrollToTop />
      <BackendWakeup />
      <TitleManager />
      <RoleRedirect />

      <Layout>
        <Suspense fallback={<PageLoader />}>
          <Routes>

            {/* PUBLIC */}
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* USER */}
            <Route
              path="/book"
              element={
                <ProtectedRoute allowedRoles={["user"]}>
                  <BookRide />
                </ProtectedRoute>
              }
            />

            <Route
              path="/notifications"
              element={
                <ProtectedRoute allowedRoles={["user"]}>
                  <Notifications />
                </ProtectedRoute>
              }
            />

            <Route
              path="/track/:rideId"
              element={
                <ProtectedRoute allowedRoles={["user"]}>
                  <RideTracking />
                </ProtectedRoute>
              }
            />

            {/* DRIVER */}
            <Route
              path="/driver/dashboard"
              element={
                <ProtectedRoute allowedRoles={["driver"]}>
                  <DriverDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/driver/requests"
              element={
                <ProtectedRoute allowedRoles={["driver"]}>
                  <DriverRequests />
                </ProtectedRoute>
              }
            />

            {/* ADMIN */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="drivers" element={<Drivers />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="support" element={<SupportMessages />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* FALLBACK */}
            <Route path="*" element={<NotFound />} />

          </Routes>
        </Suspense>
      </Layout>
    </div>
  );
}