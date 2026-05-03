import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, Suspense, lazy } from "react";

/* GOOGLE MAPS */
import { GoogleMapsProvider } from "./config/googleMaps";

/* COMPONENTS */
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
const RideTracking = lazy(() => import("./pages/RideTracking"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Profile = lazy(() => import("./pages/Profile"));
const RideHistory = lazy(() => import("./pages/RideHistory"));
const PaymentHistory = lazy(() => import("./pages/PaymentHistory"));

/* ADMIN */
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const Drivers = lazy(() => import("./pages/admin/Drivers"));
const Analytics = lazy(() => import("./pages/admin/Analytics"));
const Settings = lazy(() => import("./pages/admin/Settings"));
const SupportMessages = lazy(() => import("./pages/admin/SupportMessages"));

/* ================= SCROLL ================= */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return null;
}

/* ================= BACKEND WAKEUP ================= */
function BackendWakeup() {
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const base = import.meta.env.VITE_API_URL;
    if (!base) return;

    const root = base.replace(/\/api$/, "");

    fetch(`${root}/api/health`).catch(() => {});
  }, []);

  return null;
}

/* ================= ROLE REDIRECT ================= */
function RoleRedirect() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token || !role) return;

    // ❌ Don't redirect on auth pages
    if (["/login", "/register", "/signup"].includes(pathname)) return;

    if (role === "driver" && !pathname.startsWith("/driver")) {
      navigate("/driver/dashboard", { replace: true });
    }

    if (role === "admin" && !pathname.startsWith("/admin")) {
      navigate("/admin/dashboard", { replace: true });
    }

  }, [pathname, navigate]);

  return null;
}

/* ================= LOADER ================= */
function PageLoader() {
  return (
    <div className="h-screen flex items-center justify-center">
      <div className="h-14 w-14 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

/* ================= LAYOUT ================= */
function Layout({ children }) {
  const { pathname } = useLocation();
  const role = localStorage.getItem("role");

  const hideLayout =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/admin");

  return (
    <>
      {!hideLayout && role !== "admin" && <Navbar />}

      <div className={!hideLayout ? "pt-16 min-h-screen flex flex-col" : ""}>
        <div className="flex-grow">{children}</div>
        {!hideLayout && role !== "admin" && <Footer />}
      </div>
    </>
  );
}

/* ================= APP ================= */
export default function App() {
  return (
    <GoogleMapsProvider>
      <ScrollToTop />
      <BackendWakeup />
      <RoleRedirect />

      <Layout>
        <Suspense fallback={<PageLoader />}>
          <Routes>

            {/* PUBLIC */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/signup" element={<Register />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />

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

            <Route
              path="/rides"
              element={
                <ProtectedRoute allowedRoles={["user", "driver"]}>
                  <RideHistory />
                </ProtectedRoute>
              }
            />

            <Route
              path="/payment"
              element={
                <ProtectedRoute allowedRoles={["user", "driver"]}>
                  <PaymentHistory />
                </ProtectedRoute>
              }
            />

            <Route
              path="/profile"
              element={
                <ProtectedRoute allowedRoles={["user", "driver"]}>
                  <Profile />
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
            <Route path="*" element={<Navigate to="/" replace />} />

          </Routes>
        </Suspense>
      </Layout>
    </GoogleMapsProvider>
  );
}