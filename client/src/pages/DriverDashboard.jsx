import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import api from "../utils/api";
import LiveMap from "../components/LiveMap";

export default function DriverDashboard() {

  const [online, setOnline] = useState(false);
  const [profile, setProfile] = useState(null);

  const [incomingRide, setIncomingRide] = useState(null);
  const [activeRide, setActiveRide] = useState(null);

  const [timer, setTimer] = useState(10);
  const [driverLocation, setDriverLocation] = useState(null);

  const [stats, setStats] = useState({
    totalRides: 0,
    totalEarnings: 0
  });

  const socketRef = useRef(null);
  const audioRef = useRef(null);

  /* ================= SOUND ================= */
  useEffect(() => {
    audioRef.current = new Audio("/sounds/ride-alert.mp3");
    audioRef.current.loop = true;
    audioRef.current.volume = 1;
  }, []);

  const playSound = () => {
    audioRef.current?.play().catch(() => {});
  };

  const stopSound = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
  };

  /* ================= PROFILE ================= */
  useEffect(() => {
    api.get("/driver/me").then(res => {
      setProfile(res.data.driver);
      setOnline(res.data.driver.isOnline);
    });
  }, []);

  /* ================= STATS ================= */
  const fetchStats = async () => {
    try {
      const res = await api.get("/driver/stats");
      setStats(res.data.stats || {});
    } catch {
      setStats({ totalRides: 0, totalEarnings: 0 });
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  /* ================= SOCKET ================= */
  useEffect(() => {
    if (!profile?._id) return;

    const socket = io(import.meta.env.VITE_SOCKET_URL, {
      auth: { userId: profile._id, role: "driver" }
    });

    socketRef.current = socket;

    socket.on("newRideRequest", (ride) => {
      setIncomingRide(ride);
      playSound();
    });

    socket.on("rideAccepted", (ride) => {
      setActiveRide(ride);
      setIncomingRide(null);
      stopSound();
      fetchStats();
    });

    return () => socket.disconnect();
  }, [profile]);

  /* ================= TIMER ================= */
  useEffect(() => {
    if (!incomingRide) return;

    setTimer(10);

    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          rejectRide(incomingRide._id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [incomingRide]);

  /* ================= LOCATION ================= */
  useEffect(() => {
    if (!online) return;

    const interval = setInterval(() => {
      navigator.geolocation.getCurrentPosition((pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        setDriverLocation({ lat, lng });

        api.put("/driver/location", {
          lat,
          lng,
          rideId: activeRide?._id
        });
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [online, activeRide]);

  /* ================= ACTIONS ================= */
  const toggleOnline = async () => {
    const newStatus = !online;
    await api.put("/driver/online", { isOnline: newStatus });
    setOnline(newStatus);
  };

  const acceptRide = async (id) => {
    const res = await api.put(`/ride/${id}/accept`);
    setActiveRide(res.data.ride);
    setIncomingRide(null);
    stopSound();
    fetchStats();
  };

  const rejectRide = async (id) => {
    await api.put(`/ride/${id}/reject`);
    setIncomingRide(null);
    stopSound();
  };

  /* ================= DATA ================= */
  const rideData = activeRide || incomingRide;

  const pickupAddress = rideData?.pickupLocation?.address || "";
  const dropAddress = rideData?.dropLocation?.address || "";
  const userName = rideData?.user?.name || "User";

  const pickupCoords = rideData?.pickupLocation?.location?.coordinates;
  const dropCoords = rideData?.dropLocation?.location?.coordinates;

  return (
    <div className="min-h-screen p-4 sm:p-6 
      bg-gray-100 dark:bg-gray-950 
      text-gray-900 dark:text-white">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6 
        bg-white/70 dark:bg-gray-900/80 backdrop-blur-xl
        p-4 rounded-2xl shadow-lg">

        <h1 className="text-xl sm:text-2xl font-bold">
          🚗 Driver Dashboard
        </h1>

        <div className="flex items-center gap-3">
          <span className={`w-3 h-3 rounded-full ${
            online ? "bg-green-500 animate-pulse" : "bg-gray-400"
          }`} />

          <button
            onClick={toggleOnline}
            className={`px-4 py-2 rounded-full text-white ${
              online ? "bg-green-600" : "bg-gray-500"
            }`}
          >
            {online ? "Online" : "Offline"}
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white p-4 rounded-2xl shadow">
          <p>Total Rides</p>
          <p className="text-2xl font-bold">{stats.totalRides}</p>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-4 rounded-2xl shadow">
          <p>Earnings</p>
          <p className="text-2xl font-bold">₹{stats.totalEarnings}</p>
        </div>
      </div>

      {/* MAP */}
      <div className="rounded-2xl overflow-hidden shadow-xl border border-gray-200 dark:border-gray-800">
        <LiveMap
          userLocation={pickupCoords ? { lat: pickupCoords[1], lng: pickupCoords[0] } : null}
          driverLocation={driverLocation}
          dropLocation={dropCoords ? { lat: dropCoords[1], lng: dropCoords[0] } : null}
        />
      </div>

      {/* RIDE POPUP */}
      {incomingRide && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

          <div className="relative w-full max-w-md 
            bg-white dark:bg-gray-900 
            rounded-t-3xl p-6 shadow-2xl animate-slideUp">

            <h3 className="text-lg font-bold mb-2 text-red-500">
              🚨 New Ride ({timer}s)
            </h3>

            <p>👤 {userName}</p>
            <p>📍 {pickupAddress}</p>
            <p className="mb-3">🏁 {dropAddress}</p>

            <div className="bg-indigo-100 dark:bg-indigo-900 
              text-center p-3 rounded-xl mb-4 font-bold">
              ₹{incomingRide?.fare}
            </div>

            <button
              onClick={() => acceptRide(incomingRide._id)}
              className="w-full bg-green-600 text-white py-3 rounded-xl mb-2 hover:scale-105"
            >
              Accept
            </button>

            <button
              onClick={() => rejectRide(incomingRide._id)}
              className="w-full bg-gray-200 dark:bg-gray-700 py-3 rounded-xl"
            >
              Reject
            </button>
          </div>
        </div>
      )}
    </div>
  );
}