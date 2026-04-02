import React, { useEffect, useState, useRef, useCallback } from "react";
import api from "../utils/api";
import { io } from "socket.io-client";
import { Bell, RefreshCcw } from "lucide-react";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

export default function Notifications() {

  const socketRef = useRef(null);
  const loadedRef = useRef(false);

  const [tab, setTab] = useState("notifications");
  const [notifications, setNotifications] = useState([]);
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ================= LOAD DATA ================= */
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const nRes = await api.get("/notifications");

      console.log("NOTIFICATIONS API:", nRes.data);

      setNotifications(
        Array.isArray(nRes.data.notifications)
          ? nRes.data.notifications
          : []
      );

      /* OPTIONAL RIDES */
      try {
        const rRes = await api.get("/ride/my");
        setRides(rRes.data.rides || []);
      } catch {
        setRides([]);
      }

    } catch (err) {
      console.error("LOAD ERROR:", err.response || err.message);

      if (err.response?.status === 401) {
        setError("Session expired. Please login again.");
      } else if (err.response?.status === 404) {
        setError("API route not found");
      } else {
        setError("Failed to load activity");
      }

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

    socket.on("connect", () => {
      console.log("🟢 Socket connected");
    });

    socket.on("disconnect", () => {
      console.log("🔴 Socket disconnected");
    });

    socket.on("newNotification", (data) => {
      setNotifications(prev => [data, ...prev]);
    });

    socket.on("rideAccepted", (data) => {
      setRides(prev =>
        prev.map(r =>
          r._id === data.rideId
            ? { ...r, status: "accepted" }
            : r
        )
      );
    });

    socket.on("rideCompleted", (data) => {
      setRides(prev =>
        prev.map(r =>
          r._id === data.rideId
            ? { ...r, status: "completed" }
            : r
        )
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

      await api.patch(`/notifications/read/${id}`);

    } catch (err) {
      console.error("MARK READ ERROR:", err);
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
          <p className="text-gray-500 text-sm">
            Real-time updates ⚡
          </p>
        </div>

        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl"
        >
          <RefreshCcw size={16}/> Refresh
        </button>
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

          {notifications.length === 0 && (
            <Empty title="No notifications" />
          )}

          {notifications.map(n => (
            <div
              key={n._id}
              onClick={() => markRead(n._id)}
              className={`p-4 rounded-xl border cursor-pointer ${
                n.read ? "bg-white dark:bg-gray-800" : "bg-indigo-50 dark:bg-gray-700"
              }`}
            >
              <div className="flex gap-3">
                <Bell />
                <div>
                  <p className="font-semibold">{n.title}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-300">
                    {n.message}
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

          {rides.length === 0 && (
            <Empty title="No rides yet" />
          )}

          {rides.map(r => (
            <div key={r._id} className="p-4 border rounded-xl dark:bg-gray-800">
              <p>{r.pickupLocation?.address}</p>
              <p className="text-sm text-gray-500 dark:text-gray-300">
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
      active
        ? "border-b-2 border-indigo-600 text-indigo-600"
        : "text-gray-500"
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