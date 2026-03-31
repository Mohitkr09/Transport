import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import api from "../utils/api";

export default function DriverDashboard() {

  const [rides, setRides] = useState([]);
  const [online, setOnline] = useState(false);
  const [profile, setProfile] = useState(null);
  const [loadingId, setLoadingId] = useState(null);

  const socketRef = useRef(null);

  /* ================= SOCKET ================= */
  useEffect(() => {
    const socket = io(io(import.meta.env.VITE_API_URL || "http://localhost:5000"), {
      auth: {
        token: localStorage.getItem("token")
      },
      transports: ["websocket"]
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ Socket connected:", socket.id);
    });

    /* 🔥 REAL-TIME RIDE */
    socket.on("newRideRequest", (ride) => {
      console.log("🔥 New Ride:", ride);

      setRides(prev => {
        if (prev.find(r => r._id === ride._id)) return prev;
        return [ride, ...prev];
      });
    });

    socket.on("rideTaken", (rideId) => {
      setRides(prev => prev.filter(r => r._id !== rideId));
    });

    return () => socket.disconnect();
  }, []);

  /* ================= LOAD PROFILE ================= */
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

  /* ================= FETCH RIDES (FALLBACK) ================= */
  const fetchRides = async () => {
    try {
      const res = await api.get("/ride/nearby");
      setRides(res.data.rides || []);
    } catch {}
  };

  useEffect(() => {
    if (online) fetchRides();
  }, [online]);

  /* ================= GO ONLINE ================= */
  const toggleOnline = async () => {
    try {
      const newStatus = !online;

      await api.put("/driver/online", { isOnline: newStatus });

      setOnline(newStatus);

      if (newStatus && socketRef.current) {
        socketRef.current.emit("driverOnline", profile._id);
      }

      if (!newStatus) setRides([]);

    } catch {
      alert("Error updating status");
    }
  };

  /* ================= ACCEPT ================= */
  const acceptRide = async (id) => {
    try {
      setLoadingId(id);

      const res = await api.put(`/ride/${id}/accept`);

      socketRef.current.emit("rideAccepted", res.data.ride);

      setRides([]);
      alert("Ride Accepted ✅");

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
      setRides(prev => prev.filter(r => r._id !== id));
    } catch {
      alert("Error rejecting ride");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">

      <h1 className="text-2xl font-bold mb-4">
        Driver Dashboard
      </h1>

      {/* ONLINE BUTTON */}
      <button
        onClick={toggleOnline}
        className={`px-4 py-2 mb-4 text-white rounded ${
          online ? "bg-green-600" : "bg-gray-500"
        }`}
      >
        {online ? "Online 🟢" : "Offline ⚫"}
      </button>

      {/* NO RIDES */}
      {rides.length === 0 && (
        <p>No nearby rides</p>
      )}

      {/* RIDE CARDS */}
      {rides.map((ride) => (
        <div
          key={ride._id}
          className="bg-white p-4 mb-4 rounded shadow"
        >
          <p><b>Pickup:</b> {ride.pickupLocation?.address}</p>
          <p><b>Drop:</b> {ride.dropLocation?.address}</p>
          <p><b>Fare:</b> ₹{ride.fare}</p>

          <div className="mt-3 flex gap-3">
            <button
              onClick={() => acceptRide(ride._id)}
              disabled={loadingId === ride._id}
              className="bg-green-600 text-white px-4 py-2 rounded"
            >
              {loadingId === ride._id ? "..." : "Accept"}
            </button>

            <button
              onClick={() => rejectRide(ride._id)}
              className="bg-red-600 text-white px-4 py-2 rounded"
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}