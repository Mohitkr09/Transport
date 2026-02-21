import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
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
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}


// ======================================================
// BACKEND WAKEUP
// ======================================================
function BackendWakeup() {
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/ride/health`)
      .catch(() => {});
  }, []);

  return null;
}


// ======================================================
// 404 PAGE
// ======================================================
function NotFound() {
  return (
    <div className="h-screen flex flex-col items-center justify-center text-center">
      <h1 className="text-6xl font-bold text-indigo-600">404</h1>
      <p className="text-xl mt-4">Page not found</p>
      <a href="/" className="mt-6 px-6 py-3 bg-indigo-600 text-white rounded-lg">
        Go Home
      </a>
    </div>
  );
}


// ======================================================
// APP
// ======================================================
function App() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">

      {/* UTILITIES */}
      <ScrollToTop />
      <BackendWakeup />

      {/* NAVBAR */}
      <Navbar />

      <div className="pt-16">
        <Routes>

          {/* ================= PUBLIC ================= */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />


          {/* ================= PAYMENT ================= */}
          {/* FIXED ROUTE */}
          <Route
            path="/payment/:rideId"
            element={
              <ProtectedRoute allowedRoles={["user"]}>
                <Payment />
              </ProtectedRoute>
            }
          />

          <Route
            path="/payment-success/:rideId"
            element={
              <div className="h-screen flex items-center justify-center text-3xl font-bold text-green-600">
                ✅ Payment Successful
              </div>
            }
          />

          <Route
            path="/payment-failed/:rideId"
            element={
              <div className="h-screen flex items-center justify-center text-3xl font-bold text-red-600">
                ❌ Payment Failed
              </div>
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
      </div>
    </div>
  );
}

export default App;