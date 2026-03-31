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
  RefreshCcw
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



  /* ================= LOAD DATA ================= */
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [nRes, rRes] = await Promise.all([
        api.get("/api/notifications"),
        api.get("/api/ride/my")
      ]);

      // ✅ FIXED (important)
      setNotifications(nRes.data.notifications || []);

      setRides(rRes.data.rides || []);

    } catch (err) {
      console.error(err?.response?.data || err.message);

      if (err?.response?.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "/login";
        return;
      }

      setError("Failed to load activity");
    } finally {
      setLoading(false);
    }
  }, []);



  /* ================= INITIAL LOAD ================= */
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
      transports: ["websocket"],
      reconnection: true
    });

    socketRef.current = socket;

    // 🔔 REAL-TIME NOTIFICATION
    socket.on("notification", data => {
      setNotifications(prev => [data, ...prev]);

      // optional sound 🔊
      const audio = new Audio("/notification.mp3");
      audio.play().catch(()=>{});
    });

    // 🚗 REAL-TIME RIDE UPDATE
    socket.on("rideStatusUpdate", ride => {
      setRides(prev =>
        prev.map(r => (r._id === ride._id ? ride : r))
      );
    });

    return () => socket.disconnect();
  }, []);




  /* ================= MARK READ ================= */
  const markRead = async (id) => {

    // optimistic UI
    setNotifications(prev =>
      prev.map(n => n._id === id ? { ...n, read: true } : n)
    );

    try {
      await api.put(`/api/notifications/${id}/read`);
    } catch (err) {
      console.log(err.message);
    }
  };



  /* ================= STATUS BADGE ================= */
  const Status = ({ status }) => {

    const map = {
      completed: ["bg-green-100 text-green-600", <CheckCircle size={14}/>],
      cancelled: ["bg-red-100 text-red-600", <XCircle size={14}/>],
      ongoing: ["bg-blue-100 text-blue-600", <RefreshCcw size={14}/>],
      confirmed: ["bg-indigo-100 text-indigo-600", <CheckCircle size={14}/>],
      requested: ["bg-yellow-100 text-yellow-700", <Clock size={14}/>]
    };

    const [style, icon] =
      map[status] || ["bg-gray-100 text-gray-600", <Info size={14}/>];

    return (
      <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${style}`}>
        {icon} {status}
      </span>
    );
  };



  /* ================= LOADING ================= */
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-indigo-600 border-t-transparent rounded-full"/>
      </div>
    );



  /* ================= UI ================= */
  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-slate-50 via-white to-slate-100">

      {/* HEADER */}
      <div className="flex justify-between mb-10">
        <div>
          <h1 className="text-4xl font-bold text-indigo-600">
            Activity Center
          </h1>
          <p className="text-gray-500 text-sm">
            Real-time updates ⚡
          </p>
        </div>

        <button
          onClick={loadData}
          className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 text-white"
        >
          <RefreshCcw size={16}/> Refresh
        </button>
      </div>



      {/* ERROR */}
      {error && (
        <div className="mb-6 p-3 bg-red-100 text-red-600 rounded">
          {error}
        </div>
      )}



      {/* TABS */}
      <div className="flex gap-6 border-b mb-6">

        <Tab active={tab==="notifications"} onClick={()=>setTab("notifications")}>
          Notifications ({notifications.filter(n=>!n.read).length})
        </Tab>

        <Tab active={tab==="rides"} onClick={()=>setTab("rides")}>
          Rides
        </Tab>

      </div>



      {/* NOTIFICATIONS */}
      {tab === "notifications" && (
        <div className="space-y-4">

          {notifications.length === 0 && (
            <p>No notifications</p>
          )}

          {notifications.map(n => (
            <div
              key={n._id}
              onClick={()=>markRead(n._id)}
              className={`p-4 rounded-lg border cursor-pointer ${
                n.read ? "bg-white" : "bg-indigo-50"
              }`}
            >
              <p className="font-semibold">{n.title}</p>
              <p className="text-sm text-gray-500">{n.message}</p>
              <p className="text-xs text-gray-400">
                {new Date(n.createdAt).toLocaleString()}
              </p>
            </div>
          ))}

        </div>
      )}



      {/* RIDES */}
      {tab === "rides" && (
        <div className="space-y-4">

          {rides.length === 0 && <p>No rides</p>}

          {rides.map(ride => (
            <div key={ride._id} className="p-4 border rounded-lg flex justify-between">
              <div>
                <p>{ride.pickupLocation?.address}</p>
                <p className="text-sm text-gray-500">
                  → {ride.dropLocation?.address}
                </p>
                <p className="text-xs">
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
    className={active ? "text-indigo-600 font-semibold" : "text-gray-500"}
  >
    {children}
  </button>
);