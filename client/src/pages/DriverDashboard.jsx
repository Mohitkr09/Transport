import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import api from "../utils/api";
import LiveMap from "../components/LiveMap"; // ✅ ADD THIS

export default function DriverDashboard() {

  const [rides, setRides] = useState([]);
  const [online, setOnline] = useState(false);
  const [profile, setProfile] = useState(null);
  const [loadingId, setLoadingId] = useState(null);
  const [newRide, setNewRide] = useState(null);
  const [activeRide, setActiveRide] = useState(null); // ✅ NEW
  const [timer, setTimer] = useState(10);
  const [driverLocation, setDriverLocation] = useState(null);

  const socketRef = useRef(null);
  const audioRef = useRef(null);

  /* ================= SOUND ================= */
  useEffect(() => {
    audioRef.current = new Audio("/ride-alert.mp3");
    audioRef.current.loop = true;
  }, []);

  const stopSound = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
  };

  /* ================= DISTANCE ================= */
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;

    const a =
      Math.sin(dLat/2) ** 2 +
      Math.cos(lat1 * Math.PI/180) *
      Math.cos(lat2 * Math.PI/180) *
      Math.sin(dLng/2) ** 2;

    return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(2);
  };

  /* ================= SOCKET ================= */
  useEffect(() => {

    const socket = io(import.meta.env.VITE_SOCKET_URL, {
      auth: { token: localStorage.getItem("token") },
    });

    socketRef.current = socket;

    socket.on("newRideRequest", (ride) => {
      setNewRide(ride);
      audioRef.current.play().catch(()=>{});
    });

    socket.on("rideAccepted", (data) => {
      setActiveRide(data);
      setNewRide(null);
      stopSound();
    });

    return () => socket.disconnect();
  }, []);

  /* ================= AUTO REJECT ================= */
  useEffect(() => {
    if (!newRide) return;

    setTimer(10);

    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          rejectRide(newRide._id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [newRide]);

  /* ================= LOCATION ================= */
  useEffect(() => {
    if (!online) return;

    const interval = setInterval(() => {
      navigator.geolocation.getCurrentPosition((pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        setDriverLocation({ lat, lng });

        api.put("/driver/location", { lat, lng }).catch(()=>{});
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [online]);

  /* ================= PROFILE ================= */
  useEffect(() => {
    api.get("/driver/me").then(res => {
      setProfile(res.data.driver);
      setOnline(res.data.driver.isOnline);
    });
  }, []);

  /* ================= ACTIONS ================= */
  const toggleOnline = async () => {
    const newStatus = !online;
    await api.put("/driver/online", { isOnline: newStatus });
    setOnline(newStatus);
  };

  const acceptRide = async (id) => {
    try {
      setLoadingId(id);

      await api.put(`/ride/${id}/accept`);

      const ride = newRide;
      setActiveRide(ride);
      setNewRide(null);
      stopSound();

      socketRef.current.emit("driverAcceptRide", {
        rideId: id,
        driver: profile
      });

    } catch {
      alert("Ride already taken");
    } finally {
      setLoadingId(null);
    }
  };

  const rejectRide = async (id) => {
    await api.put(`/ride/${id}/reject`).catch(()=>{});
    setNewRide(null);
    stopSound();
  };

  /* ================= DISTANCE ================= */
  const distance = newRide && driverLocation
    ? calculateDistance(
        driverLocation.lat,
        driverLocation.lng,
        newRide.pickupLocation.location.coordinates[1],
        newRide.pickupLocation.location.coordinates[0]
      )
    : null;

  return (
    <div className="min-h-screen bg-gray-100 p-6">

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

      {/* 🗺 MAP */}
      <LiveMap
        userLocation={
          activeRide
            ? {
                lat: activeRide.pickupLocation.location.coordinates[1],
                lng: activeRide.pickupLocation.location.coordinates[0]
              }
            : null
        }
        driverLocation={driverLocation}
        dropLocation={
          activeRide
            ? {
                lat: activeRide.dropLocation.location.coordinates[1],
                lng: activeRide.dropLocation.location.coordinates[0]
              }
            : null
        }
      />

      {/* 🚨 NEW RIDE */}
      {newRide && (
        <div className="fixed bottom-5 left-5 right-5 bg-white p-4 rounded-xl shadow-xl">

          <p>📍 {newRide.pickupLocation.address}</p>
          <p>🏁 {newRide.dropLocation.address}</p>
          <p>₹{newRide.fare}</p>

          {distance && <p>📍 {distance} km away</p>}

          <p className="text-red-500">⏳ {timer}s</p>

          <div className="flex gap-2 mt-2">
            <button onClick={() => acceptRide(newRide._id)} className="bg-green-600 text-white px-3 py-2 rounded">
              Accept
            </button>
            <button onClick={() => rejectRide(newRide._id)} className="bg-red-600 text-white px-3 py-2 rounded">
              Reject
            </button>
          </div>
        </div>
      )}

    </div>
  );
}