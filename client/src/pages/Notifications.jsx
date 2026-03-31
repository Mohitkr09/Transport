import React, { useEffect, useState, useRef, useCallback } from "react";
import api from "../utils/api";
import { io } from "socket.io-client";
import {
  Bell,
  Car,
  Clock,
  CheckCircle,
  XCircle,
  Info,
  RefreshCcw,
  Moon,
  Sun
} from "lucide-react";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

export default function Notifications() {

  const socketRef = useRef(null);
  const loadedRef = useRef(false);

  const [tab, setTab] = useState("notifications");
  const [notifications, setNotifications] = useState([]);
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [dark, setDark] = useState(
    localStorage.getItem("theme") === "dark"
  );

  /* ================= THEME TOGGLE ================= */
  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);



  /* ================= LOAD DATA ================= */
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [nRes, rRes] = await Promise.all([
        api.get("/api/notifications"),
        api.get("/api/ride/my")
      ]);

      setNotifications(nRes.data.notifications || []);
      setRides(rRes.data.rides || []);

    } catch (err) {
      setError("Failed to load activity");
    } finally {
      setLoading(false);
    }
  }, []);



  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadData();
  }, [loadData]);



  /* ================= SOCKET ================= */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket"]
    });

    socketRef.current = socket;

    socket.on("notification", data => {
      setNotifications(prev => [data, ...prev]);
    });

    socket.on("rideStatusUpdate", ride => {
      setRides(prev =>
        prev.map(r => (r._id === ride._id ? ride : r))
      );
    });

    return () => socket.disconnect();
  }, []);



  /* ================= MARK READ ================= */
  const markRead = async (id) => {
    setNotifications(prev =>
      prev.map(n => n._id === id ? { ...n, read: true } : n)
    );

    await api.put(`/api/notifications/${id}/read`);
  };



  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-gray-900">
        <div className="animate-spin h-12 w-12 border-4 border-indigo-600 border-t-transparent rounded-full"/>
      </div>
    );
  }



  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 to-white dark:from-gray-900 dark:to-gray-950 transition-all">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:justify-between gap-4 mb-8">

        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-indigo-600">
            Activity Center
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Real-time updates ⚡
          </p>
        </div>

        <div className="flex gap-3">

          {/* DARK MODE TOGGLE */}
          <button
            onClick={() => setDark(!dark)}
            className="p-2 rounded-xl bg-gray-200 dark:bg-gray-800 hover:scale-105 transition"
          >
            {dark ? <Sun size={18}/> : <Moon size={18}/>}
          </button>

          {/* REFRESH */}
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white hover:scale-105 transition"
          >
            <RefreshCcw size={16}/> Refresh
          </button>

        </div>
      </div>



      {/* ERROR */}
      {error && (
        <div className="mb-4 p-3 rounded bg-red-100 text-red-600">
          {error}
        </div>
      )}



      {/* TABS */}
      <div className="flex gap-6 border-b mb-6 dark:border-gray-700">

        <Tab active={tab==="notifications"} onClick={()=>setTab("notifications")}>
          🔔 Notifications
          {notifications.filter(n=>!n.read).length > 0 && (
            <span className="ml-2 bg-indigo-600 text-white text-xs px-2 rounded-full">
              {notifications.filter(n=>!n.read).length}
            </span>
          )}
        </Tab>

        <Tab active={tab==="rides"} onClick={()=>setTab("rides")}>
          🚗 Rides
        </Tab>

      </div>



      {/* NOTIFICATIONS */}
      {tab === "notifications" && (
        <div className="grid gap-4">

          {notifications.length === 0 && (
            <Empty title="No notifications" />
          )}

          {notifications.map(n => (
            <div
              key={n._id}
              onClick={()=>markRead(n._id)}
              className={`p-4 rounded-2xl border cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1
              ${n.read
                ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                : "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200"}`}
            >
              <div className="flex gap-3 items-start">
                <Bell className="text-indigo-600"/>

                <div className="flex-1">
                  <p className="font-semibold dark:text-white">{n.title}</p>
                  <p className="text-sm text-gray-500">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))}

        </div>
      )}



      {/* RIDES */}
      {tab === "rides" && (
        <div className="grid gap-4">

          {rides.length === 0 && <Empty title="No rides yet" />}

          {rides.map(ride => (
            <div
              key={ride._id}
              className="p-4 rounded-2xl border bg-white dark:bg-gray-800 dark:border-gray-700 flex flex-col md:flex-row md:justify-between gap-3 hover:shadow-lg transition"
            >
              <div>
                <p className="font-semibold dark:text-white">
                  {ride.pickupLocation?.address}
                </p>
                <p className="text-sm text-gray-500">
                  → {ride.dropLocation?.address}
                </p>
                <p className="text-xs mt-1 text-gray-400">
                  ₹{ride.fare}
                </p>
              </div>

              <Status status={ride.status}/>
            </div>
          ))}

        </div>
      )}

    </div>
  );
}



/* TAB */
const Tab = ({ children, active, onClick }) => (
  <button
    onClick={onClick}
    className={`pb-2 text-sm font-semibold transition ${
      active
        ? "text-indigo-600 border-b-2 border-indigo-600"
        : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
    }`}
  >
    {children}
  </button>
);



/* STATUS */
const Status = ({ status }) => {
  const map = {
    completed: "text-green-600",
    cancelled: "text-red-600",
    ongoing: "text-blue-600",
    confirmed: "text-indigo-600",
    requested: "text-yellow-600"
  };

  return (
    <span className={`text-sm font-semibold ${map[status] || "text-gray-500"}`}>
      {status}
    </span>
  );
};



/* EMPTY */
const Empty = ({ title }) => (
  <div className="text-center py-16 text-gray-400">
    <p className="text-lg">{title}</p>
  </div>
);