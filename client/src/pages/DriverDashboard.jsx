import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import api from "../utils/api";

export default function DriverDashboard() {

  const [rides, setRides] = useState([]);
  const [online, setOnline] = useState(false);
  const [profile, setProfile] = useState(null);
  const [loadingId, setLoadingId] = useState(null);
  const [newRide, setNewRide] = useState(null);

  const socketRef = useRef(null);
  const audioRef = useRef(null);

  /* ================= SOCKET ================= */
  useEffect(() => {

    const socket = io(import.meta.env.VITE_SOCKET_URL, {
      auth: {
        token: localStorage.getItem("token"),
      },
      transports: ["websocket", "polling"], // 🔥 important
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ Socket connected:", socket.id);
    });

    socket.on("connect_error", (err) => {
      console.log("❌ Socket error:", err.message);
    });

    /* 🔥 NEW RIDE */
    socket.on("newRideRequest", (ride) => {

      console.log("🔥 New Ride:", ride);

      audioRef.current?.play();
      setNewRide(ride);

      setRides((prev) => {
        if (prev.find((r) => r._id === ride._id)) return prev;
        return [ride, ...prev];
      });

      setTimeout(() => setNewRide(null), 7000);
    });

    /* REMOVE IF TAKEN */
    socket.on("rideTaken", (rideId) => {
      setRides((prev) => prev.filter((r) => r._id !== rideId));
    });

    /* ACCEPT CONFIRM */
    socket.on("rideAccepted", () => {
      setRides([]);
    });

    return () => socket.disconnect();
  }, []);

  /* ================= PROFILE ================= */
  const loadProfile = async () => {
    try {
      const res = await api.get("/driver/me");
      setProfile(res.data.driver);
      setOnline(res.data.driver.isOnline);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  /* ================= SEND LOCATION (VERY IMPORTANT) ================= */
  useEffect(() => {
    if (!online) return;

    const interval = setInterval(() => {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        try {
          await api.put("/driver/location", { lat, lng });
        } catch {}
      });
    }, 5000); // every 5 sec

    return () => clearInterval(interval);
  }, [online]);

  /* ================= FETCH RIDES ================= */
  const fetchRides = async () => {
    try {
      if (!profile?.location?.coordinates) return;

      const res = await api.get("/ride/nearby", {
        params: {
          lat: profile.location.coordinates[1],
          lng: profile.location.coordinates[0]
        }
      });

      setRides(res.data.rides || []);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    if (online && profile) fetchRides();
  }, [online, profile]);

  /* ================= ONLINE ================= */
  const toggleOnline = async () => {
    try {
      const newStatus = !online;

      await api.put("/driver/online", { isOnline: newStatus });

      setOnline(newStatus);

      if (!newStatus) setRides([]);

    } catch {
      alert("Error updating status");
    }
  };

  /* ================= ACCEPT ================= */
  const acceptRide = async (id) => {
    try {
      setLoadingId(id);

      await api.put(`/ride/${id}/accept`);

      socketRef.current.emit("driverAcceptRide", {
        rideId: id,
        driver: profile,
      });

      setRides([]);
      setNewRide(null);

    } catch {
      alert("Ride already taken");
    } finally {
      setLoadingId(null);
    }
  };

  /* ================= REJECT ================= */
  const rejectRide = async (id) => {
    try {
      await api.put(`/ride/${id}/reject`);
      setRides((prev) => prev.filter((r) => r._id !== id));
    } catch {
      alert("Error rejecting ride");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-6">

      {/* 🔊 SOUND */}
      <audio
        ref={audioRef}
        src="https://actions.google.com/sounds/v1/alarms/beep_short.ogg"
      />

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">🚗 Driver Dashboard</h1>

        <button
          onClick={toggleOnline}
          className={`px-5 py-2 rounded-full text-white ${
            online ? "bg-green-600" : "bg-gray-500"
          }`}
        >
          {online ? "🟢 Online" : "⚫ Offline"}
        </button>
      </div>

      {/* 🔥 POPUP */}
      {newRide && (
        <div className="fixed top-5 right-5 bg-white p-4 rounded-xl shadow-lg border-l-4 border-green-500 animate-bounce z-50">
          <p className="font-bold">🚨 New Ride Request</p>
          <p className="text-sm">{newRide.pickupLocation?.address}</p>
        </div>
      )}

      {/* RIDES */}
      {rides.length === 0 ? (
        <div className="text-center mt-20 text-gray-500">
          🚫 No rides available
        </div>
      ) : (
        <div className="grid gap-4">
          {rides.map((ride) => (
            <div
              key={ride._id}
              className="bg-white p-5 rounded-2xl shadow hover:shadow-xl"
            >
              <p className="font-semibold">📍 {ride.pickupLocation?.address}</p>
              <p className="text-sm text-gray-600 mb-2">
                ➡️ {ride.dropLocation?.address}
              </p>

              <div className="flex justify-between mb-3">
                <span>₹{ride.fare}</span>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => acceptRide(ride._id)}
                  disabled={loadingId === ride._id}
                  className="flex-1 bg-green-600 text-white py-2 rounded-xl"
                >
                  {loadingId === ride._id ? "..." : "Accept"}
                </button>

                <button
                  onClick={() => rejectRide(ride._id)}
                  className="flex-1 bg-red-500 text-white py-2 rounded-xl"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}