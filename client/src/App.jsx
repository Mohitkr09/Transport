import { Routes, Route, Navigate } from "react-router-dom";
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


function App() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">

      {/* GLOBAL NAVBAR */}
      <Navbar />

      <div className="pt-16">
        <Routes>

          {/* ================================================= */}
          {/* PUBLIC ROUTES */}
          {/* ================================================= */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />


          {/* ================================================= */}
          {/* PAYMENT ROUTES */}
          {/* ================================================= */}
          <Route
            path="/payment"
            element={
              <ProtectedRoute allowedRoles={["user"]}>
                <Payment />
              </ProtectedRoute>
            }
          />

          <Route
            path="/payment-success"
            element={
              <div className="h-screen flex items-center justify-center text-3xl font-bold text-green-600">
                ✅ Payment Successful
              </div>
            }
          />

          <Route
            path="/payment-failed"
            element={
              <div className="h-screen flex items-center justify-center text-3xl font-bold text-red-600">
                ❌ Payment Failed
              </div>
            }
          />


          {/* ================================================= */}
          {/* USER ROUTE */}
          {/* ================================================= */}
          <Route
            path="/book"
            element={
              <ProtectedRoute allowedRoles={["user"]}>
                <BookRide />
              </ProtectedRoute>
            }
          />


          {/* ================================================= */}
          {/* DRIVER ROUTE */}
          {/* ================================================= */}
          <Route
            path="/driver"
            element={
              <ProtectedRoute allowedRoles={["driver"]}>
                <DriverDashboard />
              </ProtectedRoute>
            }
          />


          {/* ================================================= */}
          {/* ADMIN ROUTES */}
          {/* ================================================= */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            {/* DEFAULT ADMIN PAGE */}
            <Route index element={<Navigate to="dashboard" />} />

            <Route path="dashboard" element={<Dashboard />} />
            <Route path="drivers" element={<Drivers />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="support" element={<SupportMessages />} />
            <Route path="settings" element={<Settings />} />
          </Route>


          {/* ================================================= */}
          {/* 404 FALLBACK */}
          {/* ================================================= */}
          <Route path="*" element={<Navigate to="/" />} />

        </Routes>
      </div>
    </div>
  );
}

export default App;
