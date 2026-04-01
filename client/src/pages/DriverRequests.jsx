import React, { useEffect, useState, useRef } from "react";
import api from "../utils/api";
import { io } from "socket.io-client";

export default function DriverRequests() {

  const [rides, setRides] = useState([]);
  const [loadingId, setLoadingId] = useState(null);
  const [newRide, setNewRide] = useState(null);
  const [coords, setCoords] = useState(null);

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
      console.log("✅ Connected:", socket.id);
    });

    socket.on("connect_error", (err) => {
      console.log("❌ Socket error:", err.message);
    });

    /* 🔥 NEW RIDE */
    socket.on("newRideRequest", (ride) => {

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

    return () => socket.disconnect();
  }, []);

  /* ================= GET DRIVER LOCATION ================= */
  useEffect(() => {
    navigator.geolocation.getCurrentPosition((pos) => {
      setCoords({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      });
    });
  }, []);

  /* ================= SEND LOCATION (IMPORTANT) ================= */
  useEffect(() => {
    if (!coords) return;

    const interval = setInterval(async () => {
      try {
        await api.put("/driver/location", coords);
      } catch {}
    }, 5000);

    return () => clearInterval(interval);
  }, [coords]);

  /* ================= FETCH RIDES ================= */
  const fetchRequests = async () => {
    try {
      if (!coords) return;

      const res = await api.get("/ride/nearby", {
        params: coords
      });

      setRides(res.data.rides || []);
    } catch (err) {
      console.log("❌ fetch error:", err);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [coords]);

  /* ================= ACTION ================= */
  const handleAction = async (id, action) => {
    try {
      setLoadingId(id);

      if (action === "accept") {

        await api.put(`/ride/${id}/accept`);

        socketRef.current.emit("driverAcceptRide", {
          rideId: id
        });

        setRides([]);
        setNewRide(null);

      } else {

        await api.put(`/ride/${id}/reject`);

        setRides((prev) => prev.filter((r) => r._id !== id));
      }

    } catch (err) {
      console.log("❌ action error:", err);
      alert("Action failed");
    } finally {
      setLoadingId(null);
    }
  };

  /* ================= UI ================= */
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-6">

      {/* 🔊 SOUND */}
      <audio
        ref={audioRef}
        src="https://actions.google.com/sounds/v1/alarms/beep_short.ogg"
      />

      {/* HEADER */}
      <h1 className="text-3xl font-bold mb-6 text-center">
        🚗 Ride Requests
      </h1>

      {/* 🔥 POPUP */}
      {newRide && (
        <div className="fixed top-5 right-5 bg-white p-4 rounded-xl shadow-lg border-l-4 border-green-500 animate-bounce z-50">
          <p className="font-bold">🚨 New Ride!</p>
          <p className="text-sm">{newRide.pickupLocation?.address}</p>
        </div>
      )}

      {/* NO RIDES */}
      {rides.length === 0 ? (
        <div className="text-center mt-20 text-gray-500">
          🚫 No pending rides
        </div>
      ) : (
        <div className="grid gap-5 max-w-3xl mx-auto">
          {rides.map((ride) => (
            <div
              key={ride._id}
              className="bg-white rounded-2xl p-5 shadow-md hover:shadow-xl transition"
            >
              <div className="flex justify-between mb-2">
                <span className="text-gray-600 text-sm">Ride</span>
                <span className="font-bold text-green-600">
                  ₹{ride.fare}
                </span>
              </div>

              <p className="text-gray-800 mb-1">
                📍 {ride.pickupLocation?.address}
              </p>

              <p className="text-gray-600 text-sm mb-3">
                ➡️ {ride.dropLocation?.address}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => handleAction(ride._id, "accept")}
                  disabled={loadingId === ride._id}
                  className="flex-1 bg-green-600 text-white py-2 rounded-xl"
                >
                  {loadingId === ride._id ? "Accepting..." : "Accept"}
                </button>

                <button
                  onClick={() => handleAction(ride._id, "reject")}
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