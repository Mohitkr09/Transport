import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { io } from "socket.io-client";
import {
  MapPin,
  Navigation,
  PlayCircle,
  StopCircle,
  Clock
} from "lucide-react";

export default function DriverDashboard() {

  const navigate = useNavigate();

  const [rides, setRides] = useState([]);
  const [online, setOnline] = useState(false);
  const [loadingId, setLoadingId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [activeRide, setActiveRide] = useState(null);
  const [timer, setTimer] = useState(0);

  const timerRef = useRef(null);
  const socketRef = useRef(null);

  /* ================= AUTH ================= */
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token || role !== "driver") {
      navigate("/login?role=driver");
    }
  }, []);

  /* ================= SOCKET INIT (FIXED 🔥) ================= */
  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL || "http://localhost:5000", {
      auth: {
        token: localStorage.getItem("token")
      },
      transports: ["websocket"]
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ Socket connected:", socket.id);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  /* ================= PROFILE ================= */
  const loadProfile = async () => {
    try {
      const res = await api.get("/driver/me");
      setProfile(res.data.driver);
      setOnline(res.data.driver?.isOnline);
    } catch (err) {
      console.log("❌ Profile error", err);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  /* ================= FETCH RIDES ================= */
  const fetchNearbyRides = async () => {
    try {
      const res = await api.get("/ride/nearby");
      setRides(res.data.rides || []);
    } catch (err) {
      console.log("❌ Fetch rides error:", err);
    }
  };

  useEffect(() => {
    if (online) fetchNearbyRides();
  }, [online]);

  /* ================= SOCKET EVENTS ================= */
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !profile?._id) return;

    /* 🔥 REGISTER DRIVER */
    socket.emit("driverOnline", profile._id);

    /* 🔥 NEW RIDE */
    socket.on("newRideRequest", (ride) => {
      console.log("🔥 Ride received:", ride);

      setRides(prev => {
        if (prev.find(r => r._id === ride._id)) return prev;
        return [ride, ...prev];
      });

      playSound();
      startTimer();
    });

    /* 🔥 REMOVE IF TAKEN */
    socket.on("rideTaken", (rideId) => {
      setRides(prev => prev.filter(r => r._id !== rideId));
    });

    /* 🔥 ACCEPTED */
    socket.on("rideAccepted", (ride) => {
      if (ride?.driver === profile._id || ride?.driver?._id === profile._id) {
        setActiveRide(ride);
        setRides([]);
        stopTimer();
      }
    });

    return () => {
      socket.off("newRideRequest");
      socket.off("rideTaken");
      socket.off("rideAccepted");
    };

  }, [profile, online]);

  /* ================= SOUND ================= */
  const playSound = () => {
    const audio = new Audio("/notification.mp3");
    audio.play().catch(() => {});
  };

  /* ================= TIMER ================= */
  const startTimer = () => {
    clearInterval(timerRef.current);
    setTimer(10);

    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setRides([]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopTimer = () => {
    clearInterval(timerRef.current);
    setTimer(0);
  };

  /* ================= ONLINE ================= */
  const toggleOnline = async () => {
    try {
      const newStatus = !online;

      await api.put("/driver/online", { isOnline: newStatus });

      setOnline(newStatus);

      if (!newStatus) {
        setRides([]);
        setActiveRide(null);
      }

    } catch {
      alert("Failed to change status");
    }
  };

  /* ================= ACCEPT ================= */
  const acceptRide = async (id) => {
    try {
      setLoadingId(id);

      const res = await api.put(`/ride/${id}/accept`);

      socketRef.current.emit("rideAccepted", res.data.ride);

      setActiveRide(res.data.ride);
      setRides([]);
      stopTimer();

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
      alert("Reject failed");
    }
  };

  /* ================= START ================= */
  const startRide = async () => {
    try {
      const res = await api.put(`/ride/${activeRide._id}/start`);
      setActiveRide(res.data.ride);
    } catch {
      alert("Start failed");
    }
  };

  /* ================= COMPLETE ================= */
  const completeRide = async () => {
    try {
      await api.put(`/ride/${activeRide._id}/complete`);
      alert("🎉 Ride Completed");
      setActiveRide(null);
    } catch {
      alert("Complete failed");
    }
  };

  /* ================= UI ================= */
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-black p-6">

      <h1 className="text-2xl font-bold mb-4">Driver Dashboard</h1>

      <button
        onClick={toggleOnline}
        className={`mb-4 px-4 py-2 text-white rounded ${
          online ? "bg-green-600" : "bg-gray-500"
        }`}
      >
        {online ? "Online 🟢" : "Offline ⚫"}
      </button>

      {rides.length === 0 && !activeRide && (
        <p>No nearby rides</p>
      )}

      {rides.map(ride => (
        <div key={ride._id} className="bg-white p-4 mb-4 rounded shadow">
          <p>{ride.pickupLocation?.address}</p>
          <p>{ride.dropLocation?.address}</p>

          <button onClick={() => acceptRide(ride._id)}>Accept</button>
          <button onClick={() => rejectRide(ride._id)}>Reject</button>
        </div>
      ))}

    </div>
  );
}