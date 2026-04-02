import React, { useEffect, useState, useRef, useCallback } from "react";
import api from "../utils/api";
import { io } from "socket.io-client";
import {
  Bell,
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

  /* ================= THEME ================= */
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
        api.get("/notifications"), // ✅ FIXED
        api.get("/ride/my")
      ]);

      setNotifications(nRes.data.notifications || []);
      setRides(rRes.data.rides || []);

    } catch (err) {
      console.error(err);
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
      transports: ["websocket", "polling"]
    });

    socketRef.current = socket;

    /* 🔥 FIXED EVENT NAME */
    socket.on("newNotification", data => {
      setNotifications(prev => [data, ...prev]);
    });

    socket.on("rideAccepted", data => {
      setRides(prev =>
        prev.map(r => r._id === data.rideId ? { ...r, status: "accepted" } : r)
      );
    });

    socket.on("rideCompleted", data => {
      setRides(prev =>
        prev.map(r => r._id === data.rideId ? { ...r, status: "completed" } : r)
      );
    });

    return () => socket.disconnect();
  }, []);

  /* ================= MARK READ ================= */
  const markRead = async (id) => {
    try {
      setNotifications(prev =>
        prev.map(n =>
          n._id === id ? { ...n, read: true } : n
        )
      );

      await api.patch(`/notifications/read/${id}`); // ✅ FIXED

    } catch (err) {
      console.error(err);
    }
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
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 to-white dark:from-gray-900 dark:to-gray-950">

      {/* HEADER */}
      <div className="flex justify-between mb-6">

        <div>
          <h1 className="text-3xl font-bold text-indigo-600">
            Activity Center
          </h1>
          <p className="text-gray-500 text-sm">Real-time updates ⚡</p>
        </div>

        <div className="flex gap-3">

          <button
            onClick={() => setDark(!dark)}
            className="p-2 rounded-xl bg-gray-200 dark:bg-gray-800"
          >
            {dark ? <Sun size={18}/> : <Moon size={18}/>}
          </button>

          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl"
          >
            <RefreshCcw size={16}/> Refresh
          </button>

        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-600 rounded">
          {error}
        </div>
      )}

      {/* TABS */}
      <div className="flex gap-6 border-b mb-6">

        <Tab active={tab==="notifications"} onClick={()=>setTab("notifications")}>
          🔔 Notifications
        </Tab>

        <Tab active={tab==="rides"} onClick={()=>setTab("rides")}>
          🚗 Rides
        </Tab>

      </div>

      {/* NOTIFICATIONS */}
      {tab === "notifications" && (
        <div className="grid gap-4">

          {notifications.length === 0 && <Empty title="No notifications" />}

          {notifications.map(n => (
            <div
              key={n._id}
              onClick={() => markRead(n._id)}
              className={`p-4 rounded-xl border cursor-pointer ${
                n.read ? "bg-white" : "bg-indigo-50"
              }`}
            >
              <div className="flex gap-3">
                <Bell />
                <div>
                  <p className="font-semibold">{n.title}</p>
                  <p className="text-sm text-gray-500">{n.message}</p>
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

          {rides.map(r => (
            <div key={r._id} className="p-4 border rounded-xl">
              <p>{r.pickupLocation?.address}</p>
              <p className="text-sm text-gray-500">
                → {r.dropLocation?.address}
              </p>
              <p className="text-indigo-600 font-semibold">
                ₹{r.fare}
              </p>
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
    className={`pb-2 ${
      active ? "border-b-2 border-indigo-600 text-indigo-600" : "text-gray-500"
    }`}
  >
    {children}
  </button>
);

/* EMPTY */
const Empty = ({ title }) => (
  <div className="text-center py-16 text-gray-400">
    {title}
  </div>
);