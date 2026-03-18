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

      setNotifications(
        Array.isArray(nRes.data)
          ? nRes.data
          : nRes.data?.notifications || []
      );

      setRides(
        Array.isArray(rRes.data?.rides)
          ? rRes.data.rides
          : []
      );

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
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1500
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
  const markRead = async id => {
    setNotifications(prev =>
      prev.map(n => n._id === id ? { ...n, read: true } : n)
    );

    try {
      await api.put(`/api/notifications/${id}/read`);
    } catch {}
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
    <div className="min-h-screen p-6 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-gray-950 dark:to-gray-900">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">

        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Activity Center
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Track notifications and ride updates
          </p>
        </div>

        <button
          onClick={loadData}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white shadow hover:shadow-lg hover:scale-105 active:scale-95 transition"
        >
          <RefreshCcw size={16}/> Refresh
        </button>
      </div>



      {/* ERROR */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600">
          {error}
        </div>
      )}



      {/* TABS */}
      <div className="flex gap-8 border-b border-gray-200 dark:border-gray-800 mb-10">

        <Tab active={tab==="notifications"} onClick={()=>setTab("notifications")}>
          Notifications
          {notifications.filter(n=>!n.read).length > 0 && (
            <span className="ml-2 text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">
              {notifications.filter(n=>!n.read).length}
            </span>
          )}
        </Tab>

        <Tab active={tab==="rides"} onClick={()=>setTab("rides")}>
          Ride History
        </Tab>

      </div>



      {/* NOTIFICATIONS */}
      {tab === "notifications" && (
        <div className="grid gap-5">

          {notifications.length === 0 && (
            <Empty icon={<Bell size={42}/>} title="No notifications" desc="You're all caught up."/>
          )}

          {notifications.map(n=>(
            <div
              key={n._id}
              onClick={()=>markRead(n._id)}
              className={`relative group rounded-2xl p-5 flex gap-4 cursor-pointer border backdrop-blur-xl shadow-sm transition
              ${n.read
                ? "bg-white/70 dark:bg-gray-900/60 border-gray-200 dark:border-gray-800"
                : "bg-indigo-50/80 border-indigo-200 dark:bg-indigo-900/20"}
              hover:shadow-lg hover:-translate-y-[2px]`}
            >

              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 group-hover:scale-110 transition">
                <Bell/>
              </div>

              <div className="flex-1">
                <p className="font-semibold">{n.title}</p>
                <p className="text-sm text-gray-500">{n.message}</p>
                <p className="text-xs text-gray-400 mt-2">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>

              {!n.read && (
                <span className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"/>
              )}
            </div>
          ))}
        </div>
      )}



      {/* RIDES */}
      {tab === "rides" && (
        <div className="grid gap-5">

          {rides.length === 0 && (
            <Empty icon={<Car size={42}/>} title="No rides yet" desc="Book your first ride."/>
          )}

          {rides.map(ride=>(
            <div
              key={ride._id}
              className="group rounded-2xl p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-lg hover:-translate-y-[2px] transition flex justify-between items-center"
            >

              <div>
                <p className="font-semibold">{ride.pickupLocation?.address}</p>
                <p className="text-sm text-gray-500 mt-1">
                  → {ride.dropLocation?.address}
                </p>

                <div className="flex gap-4 mt-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock size={14}/>
                    {new Date(ride.createdAt).toLocaleDateString()}
                  </span>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    ₹{ride.fare}
                  </span>
                </div>
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
    className={`relative pb-3 font-semibold text-sm transition
    ${active ? "text-indigo-600" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
  >
    {children}
    {active && (
      <span className="absolute left-0 bottom-0 w-full h-[3px] bg-indigo-600 rounded-full"/>
    )}
  </button>
);



/* EMPTY */
const Empty = ({ icon, title, desc }) => (
  <div className="text-center py-24 text-gray-400">
    <div className="mx-auto mb-6 w-fit opacity-80">{icon}</div>
    <p className="font-semibold text-lg text-gray-600 dark:text-gray-300">{title}</p>
    <p className="text-sm mt-1">{desc}</p>
  </div>
);