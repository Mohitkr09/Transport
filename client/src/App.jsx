import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";
import Navbar from "./components/Navbar";

/* ================= PAGES ================= */
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import BookRide from "./pages/BookRide";
import DriverDashboard from "./pages/DriverDashboard";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Payment from "./pages/Payment";
import RideTracking from "./pages/RideTracking";

/* ================= ADMIN ================= */
import AdminLayout from "./pages/admin/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import Drivers from "./pages/admin/Drivers";
import Analytics from "./pages/admin/Analytics";
import Settings from "./pages/admin/Settings";
import SupportMessages from "./pages/admin/SupportMessages";

/* ================= AUTH ================= */
import ProtectedRoute from "./components/ProtectedRoute";


// ======================================================
// SCROLL TO TOP
// ======================================================
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}


// ======================================================
// BACKEND WAKEUP (Render Cold Start Fix)
// ======================================================
function BackendWakeup() {
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const url = import.meta.env.VITE_API_URL;
    if (!url) return;

    fetch(`${url}/api/ride/health`).catch(() => {});
  }, []);

  return null;
}


// ======================================================
// CONDITIONAL NAVBAR
// ======================================================
function Layout({ children }) {
  const { pathname } = useLocation();

  const hideNavbar =
    pathname.includes("/login") ||
    pathname.includes("/register") ||
    pathname.includes("/payment");

  return (
    <>
      {!hideNavbar && <Navbar />}
      <div className={!hideNavbar ? "pt-16" : ""}>{children}</div>
    </>
  );
}


// ======================================================
// 404 PAGE
// ======================================================
function NotFound() {
  return <Navigate to="/" replace />;
}


// ======================================================
// PAYMENT FAILED PAGE
// ======================================================
function PaymentFailed() {
  return (
    <div className="h-screen flex flex-col items-center justify-center text-center">
      <div className="bg-white p-10 rounded-3xl shadow-xl">
        <h1 className="text-4xl font-bold text-red-500 mb-3">Payment Failed</h1>
        <p className="text-gray-500 mb-6">
          Something went wrong while processing payment.
        </p>

        <a
          href="/book"
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl"
        >
          Try Again
        </a>
      </div>
    </div>
  );
}


// ======================================================
// APP
// ======================================================
function App() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">

      <ScrollToTop />
      <BackendWakeup />

      <Layout>
        <Routes>

          {/* ================= PUBLIC ================= */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />


          {/* ================= PAYMENT ================= */}
          <Route
            path="/payment/:rideId"
            element={
              <ProtectedRoute allowedRoles={["user"]}>
                <Payment />
              </ProtectedRoute>
            }
          />

          {/* SUCCESS → TRACK DRIVER PAGE */}
          <Route
            path="/payment-success/:rideId"
            element={
              <ProtectedRoute allowedRoles={["user"]}>
                <RideTracking />
              </ProtectedRoute>
            }
          />

          {/* FAILED */}
          <Route
            path="/payment-failed/:rideId"
            element={
              <ProtectedRoute allowedRoles={["user"]}>
                <PaymentFailed />
              </ProtectedRoute>
            }
          />


          {/* ================= USER ================= */}
          <Route
            path="/book"
            element={
              <ProtectedRoute allowedRoles={["user"]}>
                <BookRide />
              </ProtectedRoute>
            }
          />


          {/* ================= DRIVER ================= */}
          <Route
            path="/driver"
            element={
              <ProtectedRoute allowedRoles={["driver"]}>
                <DriverDashboard />
              </ProtectedRoute>
            }
          />


          {/* ================= ADMIN ================= */}
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


          {/* ================= 404 ================= */}
          <Route path="*" element={<NotFound />} />

        </Routes>
      </Layout>

    </div>
  );
}

export default App;