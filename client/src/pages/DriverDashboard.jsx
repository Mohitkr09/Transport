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

/* ================= SOCKET (FIXED) ================= */
const socket = io("http://localhost:5000", {
  auth: {
    token: localStorage.getItem("token")
  },
  transports: ["websocket"] // 🔥 important for render
});

export default function DriverDashboard() {

  const navigate = useNavigate();

  const [rides, setRides] = useState([]);
  const [online, setOnline] = useState(false);
  const [loadingId, setLoadingId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [activeRide, setActiveRide] = useState(null);
  const [timer, setTimer] = useState(0);

  const timerRef = useRef(null);

  /* ================= AUTH ================= */
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token || role !== "driver") {
      navigate("/login?role=driver");
    }
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

  /* ================= FETCH RIDES (FALLBACK) ================= */
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

  /* ================= SOCKET ================= */
  useEffect(() => {
    if (!profile?._id) return;

    socket.emit("driverOnline", profile._id);

    /* NEW RIDE */
    socket.on("newRideRequest", (ride) => {
      if (!online) return;

      setRides(prev => {
        if (prev.find(r => r._id === ride._id)) return prev;
        return [ride, ...prev];
      });

      playSound();
      startTimer();
    });

    /* REMOVE IF TAKEN */
    socket.on("rideTaken", (rideId) => {
      setRides(prev => prev.filter(r => r._id !== rideId));
    });

    /* REMOVE IF REJECTED */
    socket.on("rideRejected", (rideId) => {
      setRides(prev => prev.filter(r => r._id !== rideId));
    });

    /* ACCEPTED (FIXED 🔥) */
    socket.on("rideAccepted", (ride) => {
      if (ride?.driver?._id === profile._id || ride?.driver === profile._id) {
        setActiveRide(ride);
        setRides([]);
        stopTimer();
      }
    });

    return () => {
      socket.off("newRideRequest");
      socket.off("rideTaken");
      socket.off("rideRejected");
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

      socket.emit("rideAccepted", res.data.ride);

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

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Driver Dashboard</h1>
          {profile && (
            <p className="text-gray-500 text-sm">
              Welcome {profile.name}
            </p>
          )}
        </div>

        <button
          onClick={toggleOnline}
          className={`px-4 py-2 rounded-lg text-white ${
            online ? "bg-green-600" : "bg-gray-500"
          }`}
        >
          {online ? "Online 🟢" : "Offline ⚫"}
        </button>
      </div>

      {/* ACTIVE RIDE */}
      {activeRide && (
        <div className="bg-white p-6 rounded-xl shadow mb-6">
          <h2 className="text-xl font-semibold mb-3">Active Ride</h2>

          <p>Pickup: {activeRide.pickupLocation?.address}</p>
          <p>Drop: {activeRide.dropLocation?.address}</p>

          <div className="flex gap-3 mt-4">
            {activeRide.status === "accepted" && (
              <button
                onClick={startRide}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg"
              >
                <PlayCircle size={18}/> Start Ride
              </button>
            )}

            {activeRide.status === "ongoing" && (
              <button
                onClick={completeRide}
                className="flex-1 bg-purple-600 text-white py-2 rounded-lg"
              >
                <StopCircle size={18}/> Complete Ride
              </button>
            )}
          </div>
        </div>
      )}

      {/* RIDE LIST */}
      {!activeRide && (
        <>
          <h2 className="text-xl font-semibold mb-4">
            Nearby Ride Requests
            {timer > 0 && (
              <span className="text-red-500 ml-2">
                ({timer}s)
              </span>
            )}
          </h2>

          {rides.length === 0 && (
            <div className="bg-white p-6 rounded-xl text-center text-gray-500">
              No nearby rides
            </div>
          )}

          {rides.map((ride) => (
            <div key={ride._id} className="bg-white p-4 mb-4 rounded-xl shadow">
              <p><b>Pickup:</b> {ride.pickupLocation?.address}</p>
              <p><b>Drop:</b> {ride.dropLocation?.address}</p>
              <p className="text-indigo-600 font-bold">₹{ride.fare}</p>

              <div className="flex gap-3 mt-3">
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
        </>
      )}
    </div>
  );
}