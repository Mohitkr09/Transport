import React, { useEffect, useState, useRef } from "react";
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

  const [tab, setTab] = useState("notifications");
  const [notifications, setNotifications] = useState([]);
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");



  /* ======================================================
  LOAD DATA
  ====================================================== */
  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [nRes, rRes] = await Promise.all([
        api.get("/api/notifications"),   // ✅ fixed route
        api.get("/api/ride")             // ✅ fixed route
      ]);

      setNotifications(Array.isArray(nRes.data) ? nRes.data : []);
      setRides(rRes.data?.rides || []);

    } catch (err) {
      console.error("Load error:", err?.response?.data || err.message);
      setError("Failed to load activity");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);



  /* ======================================================
  SOCKET REALTIME
  ====================================================== */
  useEffect(() => {

    const token = localStorage.getItem("token");
    if (!token) return;

    socketRef.current = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1500
    });


    /* NEW NOTIFICATION */
    socketRef.current.on("notification", data => {
      setNotifications(prev => [data, ...prev]);
    });


    /* RIDE UPDATE */
    socketRef.current.on("rideStatusUpdate", ride => {
      setRides(prev =>
        prev.map(r => (r._id === ride._id ? ride : r))
      );
    });


    /* SOCKET ERROR */
    socketRef.current.on("connect_error", err => {
      console.log("Socket error:", err.message);
    });


    return () => socketRef.current?.disconnect();

  }, []);




  /* ======================================================
  MARK READ
  ====================================================== */
  const markRead = async id => {

    setNotifications(prev =>
      prev.map(n =>
        n._id === id ? { ...n, read: true } : n
      )
    );

    try {
      await api.put(`/api/notifications/${id}/read`);
    } catch {}
  };



  /* ======================================================
  STATUS BADGE
  ====================================================== */
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



  /* ======================================================
  LOADING
  ====================================================== */
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-indigo-600 border-t-transparent rounded-full"/>
      </div>
    );



  /* ======================================================
  UI
  ====================================================== */
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-white p-6">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">

        <h1 className="text-3xl font-bold">Activity Center</h1>

        <button
          onClick={loadData}
          className="flex items-center gap-2 text-sm bg-white dark:bg-gray-900 px-4 py-2 rounded-xl shadow hover:scale-105 transition"
        >
          <RefreshCcw size={16}/> Refresh
        </button>
      </div>



      {/* ERROR */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-100 text-red-600">
          {error}
        </div>
      )}



      {/* TABS */}
      <div className="flex gap-4 mb-8">

        <Tab
          active={tab==="notifications"}
          onClick={()=>setTab("notifications")}
        >
          Notifications ({notifications.filter(n=>!n.read).length})
        </Tab>

        <Tab
          active={tab==="rides"}
          onClick={()=>setTab("rides")}
        >
          Ride History
        </Tab>

      </div>




      {/* ======================================================
      NOTIFICATIONS
      ====================================================== */}
      {tab === "notifications" && (
        <div className="space-y-4">

          {notifications.length === 0 && (
            <Empty
              icon={<Bell size={40}/>}
              title="No notifications"
              desc="You're all caught up!"
            />
          )}

          {notifications.map(n=>(
            <div
              key={n._id}
              onClick={()=>markRead(n._id)}
              className={`p-5 rounded-2xl shadow flex gap-4 cursor-pointer transition
              ${n.read
                ? "bg-white dark:bg-gray-900"
                : "bg-indigo-50 dark:bg-gray-800 border border-indigo-200"}
              hover:scale-[1.01]`}
            >

              <div className="text-indigo-600 mt-1">
                <Bell/>
              </div>

              <div className="flex-1">
                <p className="font-semibold">{n.title}</p>
                <p className="text-sm text-gray-500">{n.message}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>

              {!n.read && (
                <span className="w-3 h-3 rounded-full bg-indigo-600 mt-2"/>
              )}
            </div>
          ))}

        </div>
      )}




      {/* ======================================================
      RIDES
      ====================================================== */}
      {tab === "rides" && (
        <div className="space-y-4">

          {rides.length === 0 && (
            <Empty
              icon={<Car size={40}/>}
              title="No rides yet"
              desc="Book your first ride now."
            />
          )}

          {rides.map(ride=>(
            <div
              key={ride._id}
              className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow flex justify-between items-center hover:scale-[1.01] transition"
            >

              <div>
                <p className="font-semibold">
                  {ride.pickupLocation?.address}
                </p>

                <p className="text-sm text-gray-500">
                  → {ride.dropLocation?.address}
                </p>

                <div className="flex gap-4 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock size={14}/>
                    {new Date(ride.createdAt).toLocaleDateString()}
                  </span>

                  <span>₹{ride.fare}</span>
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




/* ======================================================
TAB BUTTON
====================================================== */
const Tab = ({ children, active, onClick }) => (
  <button
    onClick={onClick}
    className={`px-5 py-2 rounded-xl font-semibold transition
      ${active
        ? "bg-indigo-600 text-white shadow"
        : "bg-white dark:bg-gray-900 hover:shadow"}
    `}
  >
    {children}
  </button>
);

const Empty = ({ icon, title, desc }) => (
  <div className="text-center py-20 text-gray-500">
    <div className="mx-auto mb-4 w-fit">{icon}</div>
    <p className="font-semibold">{title}</p>
    <p className="text-sm">{desc}</p>
  </div>
);