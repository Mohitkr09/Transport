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
    audioRef.current.play().then(() => {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setSoundEnabled(true);
    }).catch(()=>{});
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
    });
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

      audioRef.current?.play().catch(()=>{});
    });

    socket.on("rideAccepted", (ride) => {
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

  const pickupAddress = rideData?.pickupLocation?.address || "Pickup not available";
  const dropAddress = rideData?.dropLocation?.address || "Drop not available";
  const userName = rideData?.user?.name || "User";

  const pickupCoords = rideData?.pickupLocation?.location?.coordinates;
  const dropCoords = rideData?.dropLocation?.location?.coordinates;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-4">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-4 bg-white p-4 rounded-xl shadow">
        <h1 className="text-xl font-bold">🚗 Driver Dashboard</h1>

        <button
          onClick={toggleOnline}
          className={`px-4 py-2 rounded-full font-semibold transition ${
            online
              ? "bg-green-600 text-white"
              : "bg-gray-400 text-white"
          }`}
        >
          {online ? "🟢 Online" : "⚫ Offline"}
        </button>
      </div>

      {/* MAP */}
      <div className="rounded-xl overflow-hidden shadow-lg">
        <LiveMap
          userLocation={pickupCoords ? { lat: pickupCoords[1], lng: pickupCoords[0] } : null}
          driverLocation={driverLocation}
          dropLocation={dropCoords ? { lat: dropCoords[1], lng: dropCoords[0] } : null}
          routePath={activeRide?.routePath || []}
        />
      </div>

      {/* 🔔 RIDE REQUEST UI */}
      {incomingRide && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">

          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

          <div className="relative w-full max-w-md bg-white rounded-t-3xl p-5 shadow-2xl animate-slideUp">

            <div className="flex justify-between mb-2">
              <h3 className="text-lg font-bold">🚗 New Ride</h3>
              <span className="text-red-500 font-bold animate-pulse">
                {timer}s
              </span>
            </div>

            <div className="bg-gray-100 p-3 rounded-xl mb-3">
              <p className="text-sm text-gray-500">Passenger</p>
              <p className="font-semibold text-lg">👤 {userName}</p>
            </div>

            <div className="space-y-2 mb-4">
              <p>📍 {pickupAddress}</p>
              <p>🏁 {dropAddress}</p>
            </div>

            <div className="bg-indigo-100 text-center p-3 rounded-xl mb-4">
              <p className="text-xl font-bold text-indigo-600">
                ₹{incomingRide?.fare}
              </p>
            </div>

            <button
              onClick={() => acceptRide(incomingRide._id)}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl text-lg font-bold mb-2"
            >
              Accept Ride
            </button>

            <button
              onClick={() => rejectRide(incomingRide._id)}
              className="w-full bg-gray-200 hover:bg-gray-300 py-3 rounded-xl"
            >
              Reject
            </button>

          </div>
        </div>
      )}

      {/* ACTIVE RIDE */}
      {activeRide && (
        <div className="mt-4 bg-white p-4 rounded-xl shadow-lg">
          <h3 className="font-bold text-lg mb-2">🚗 Active Ride</h3>

          <p>👤 {userName}</p>
          <p>📍 {pickupAddress}</p>
          <p>🏁 {dropAddress}</p>

          <p className="text-green-600 font-bold text-lg mt-2">
            ₹{activeRide?.fare}
          </p>
        </div>
      )}

    </div>
  );
}