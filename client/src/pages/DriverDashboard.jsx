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

  const [soundEnabled, setSoundEnabled] = useState(false);

  const socketRef = useRef(null);
  const audioRef = useRef(null);

  /* ================= SOUND ================= */
  useEffect(() => {
    audioRef.current = new Audio("/sounds/ride-alert.mp3");
    audioRef.current.preload = "auto";
    audioRef.current.volume = 1;
  }, []);

  const enableSound = () => {
    if (!audioRef.current) return;

    audioRef.current.play()
      .then(() => {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setSoundEnabled(true);
      })
      .catch(() => {
        alert("Click again to enable sound");
      });
  };

  const playSound = () => {
    if (!audioRef.current) return;

    audioRef.current.currentTime = 0;
    audioRef.current.play().catch((err) => {
      console.log("Sound blocked:", err.message);
    });
  };

  const stopSound = () => {
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
  };

  /* ================= PROFILE ================= */
  useEffect(() => {
    api.get("/driver/me").then(res => {
      setProfile(res.data.driver);
      setOnline(res.data.driver.isOnline);
    }).catch(() => {});
  }, []);

  /* ================= STATS ================= */
  const fetchStats = async () => {
    try {
      const res = await api.get("/driver/stats");
      setStats(res.data.stats || {});
    } catch {}
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

      if (soundEnabled) playSound(); // ✅ FIX
    });

    socket.on("rideAccepted", (ride) => {
      setActiveRide(ride);
      setIncomingRide(null);
      stopSound();
      fetchStats();
    });

    return () => socket.disconnect();
  }, [profile, soundEnabled]);

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
        }).catch(()=>{});
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [online, activeRide]);

  /* ================= ACTIONS ================= */
  const toggleOnline = async () => {
    try {
      const newStatus = !online;
      await api.put("/driver/online", { isOnline: newStatus });
      setOnline(newStatus);
    } catch {
      alert("Failed to update status");
    }
  };

  const acceptRide = async (id) => {
    try {
      const res = await api.put(`/ride/${id}/accept`);
      setActiveRide(res.data.ride);
      setIncomingRide(null);
      stopSound();
      fetchStats();
    } catch {
      alert("Ride already taken");
    }
  };

  const rejectRide = async (id) => {
    await api.put(`/ride/${id}/reject`).catch(()=>{});
    setIncomingRide(null);
    stopSound();
  };

  /* ================= DATA ================= */
  const rideData = activeRide || incomingRide;

  const pickupAddress = rideData?.pickupLocation?.address || "Pickup not available";
  const dropAddress = rideData?.dropLocation?.address || "Drop not available";
  const userName = rideData?.user?.name || "User";

  const pickupCoords = rideData?.pickupLocation?.location?.coordinates;
  const dropCoords = rideData?.dropLocation?.location?.coordinates;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-4">

      {/* 🔊 ENABLE SOUND BUTTON */}
      {!soundEnabled && (
        <button
          onClick={enableSound}
          className="fixed bottom-5 right-5 bg-blue-600 text-white px-4 py-2 rounded-full shadow z-50"
        >
          🔊 Enable Sound
        </button>
      )}

      {/* HEADER */}
      <div className="flex justify-between items-center mb-4 bg-white p-4 rounded-xl shadow">
        <h1 className="text-xl font-bold">🚗 Driver Dashboard</h1>

        <button
          onClick={toggleOnline}
          className={`px-4 py-2 rounded-full ${
            online
              ? "bg-green-600 text-white"
              : "bg-gray-400 text-white"
          }`}
        >
          {online ? "🟢 Online" : "⚫ Offline"}
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white p-4 rounded-xl shadow text-center">
          <p>Total Rides</p>
          <p className="text-2xl font-bold">{stats.totalRides || 0}</p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow text-center">
          <p>Total Earnings</p>
          <p className="text-2xl font-bold text-green-600">
            ₹{stats.totalEarnings || 0}
          </p>
        </div>
      </div>

      {/* MAP */}
      <div className="rounded-xl overflow-hidden shadow-lg">
        <LiveMap
          userLocation={pickupCoords ? { lat: pickupCoords[1], lng: pickupCoords[0] } : null}
          driverLocation={driverLocation}
          dropLocation={dropCoords ? { lat: dropCoords[1], lng: dropCoords[0] } : null}
        />
      </div>

      {/* RIDE REQUEST */}
      {incomingRide && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

          <div className="relative w-full max-w-md bg-white rounded-t-3xl p-5 shadow-2xl">
            <h3>🚗 New Ride ({timer}s)</h3>
            <p>👤 {userName}</p>
            <p>📍 {pickupAddress}</p>
            <p>🏁 {dropAddress}</p>

            <div className="bg-indigo-100 text-center p-3 rounded-xl my-3">
              ₹{incomingRide?.fare}
            </div>

            <button
              onClick={() => acceptRide(incomingRide._id)}
              className="w-full bg-green-600 text-white py-3 rounded-xl mb-2"
            >
              Accept
            </button>

            <button
              onClick={() => rejectRide(incomingRide._id)}
              className="w-full bg-gray-200 py-3 rounded-xl"
            >
              Reject
            </button>
          </div>
        </div>
      )}

    </div>
  );
}