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
  const [soundEnabled, setSoundEnabled] = useState(false);

  const socketRef = useRef(null);
  const audioRef = useRef(null);

  /* ================= SOUND ================= */
  useEffect(() => {
    audioRef.current = new Audio("/sounds/ride-alert.mp3");
    audioRef.current.loop = true;
  }, []);

  const enableSound = () => {
    audioRef.current.play()
      .then(() => {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setSoundEnabled(true);
      })
      .catch(() => {});
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

  /* ================= SOCKET ================= */
  useEffect(() => {
    if (!profile?._id) return;

    const socket = io(import.meta.env.VITE_SOCKET_URL, {
      auth: {
        userId: profile._id,
        role: "driver"
      }
    });

    socketRef.current = socket;

    socket.on("newRideRequest", (ride) => {
      console.log("🔥 NEW RIDE:", ride);

      setIncomingRide(ride);

      // 🔊 SOUND LOOP
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(()=>{});
      }
    });

    socket.on("rideAccepted", (ride) => {
      console.log("✅ ACCEPTED:", ride);

      setActiveRide(ride);
      setIncomingRide(null);
      stopSound();
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
        }).catch(()=>{});
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
    try {
      const res = await api.put(`/ride/${id}/accept`);

      setActiveRide(res.data.ride);
      setIncomingRide(null);
      stopSound();

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

  const pickupAddress =
    rideData?.pickupLocation?.address || "Pickup not available";

  const dropAddress =
    rideData?.dropLocation?.address || "Drop not available";

  const userName =
    rideData?.user?.name || "User";

  const pickupCoords =
    rideData?.pickupLocation?.location?.coordinates;

  const dropCoords =
    rideData?.dropLocation?.location?.coordinates;

  /* ================= UI ================= */

  return (
    <div className="min-h-screen bg-gray-100 p-6">

      {/* 🔊 ENABLE SOUND */}
      {!soundEnabled && (
        <button
          onClick={enableSound}
          className="mb-4 bg-indigo-600 text-white px-4 py-2 rounded"
        >
          🔊 Enable Sound
        </button>
      )}

      {/* HEADER */}
      <div className="flex justify-between mb-4">
        <h1 className="text-2xl font-bold">🚗 Driver Dashboard</h1>

        <button
          onClick={toggleOnline}
          className={`px-4 py-2 rounded text-white ${
            online ? "bg-green-600" : "bg-gray-500"
          }`}
        >
          {online ? "🟢 Online" : "⚫ Offline"}
        </button>
      </div>

      {/* MAP */}
      <LiveMap
        userLocation={
          pickupCoords
            ? { lat: pickupCoords[1], lng: pickupCoords[0] }
            : null
        }
        driverLocation={driverLocation}
        dropLocation={
          dropCoords
            ? { lat: dropCoords[1], lng: dropCoords[0] }
            : null
        }
        routePath={activeRide?.routePath || []}
      />

      {/* 🚗 POPUP */}
      {incomingRide && (
        <div className="fixed inset-0 flex items-end justify-center z-50">

          <div className="absolute inset-0 bg-black/40"></div>

          <div className="bg-white w-full max-w-md p-5 rounded-t-2xl animate-slideUp">

            <h3 className="font-bold text-lg">🚗 New Ride Request</h3>

            <p className="mt-2 font-semibold">👤 {userName}</p>

            <p className="mt-2">📍 {pickupAddress}</p>
            <p>🏁 {dropAddress}</p>

            <p className="text-indigo-600 font-bold mt-2">
              ₹{incomingRide?.fare}
            </p>

            <p className="text-red-500">⏳ {timer}s</p>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => acceptRide(incomingRide._id)}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg"
              >
                Accept
              </button>

              <button
                onClick={() => rejectRide(incomingRide._id)}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ ACTIVE RIDE INFO */}
      {activeRide && (
        <div className="mt-4 bg-white p-4 rounded shadow">

          <h3 className="font-bold text-lg">🚗 Active Ride</h3>

          <p>👤 {userName}</p>
          <p>📍 {pickupAddress}</p>
          <p>🏁 {dropAddress}</p>

          <p className="text-green-600 font-bold">
            ₹{activeRide?.fare}
          </p>
        </div>
      )}

    </div>
  );
}   