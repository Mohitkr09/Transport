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
  const unlockedRef = useRef(false); // 🔥 FIX

  /* ================= 🔊 UNLOCK AUDIO ================= */
  useEffect(() => {
    const unlock = () => {
      if (!audioRef.current) return;

      audioRef.current.play()
        .then(() => {
          audioRef.current.pause();
          unlockedRef.current = true;
          console.log("🔊 Audio unlocked");
        })
        .catch(() => {});

      window.removeEventListener("click", unlock);
    };

    window.addEventListener("click", unlock);
  }, []);

  /* ================= 🔊 SOUND ================= */
  useEffect(() => {
    const audio = new Audio("/sounds/ride-alert.mp3");
    audio.loop = true;
    audio.volume = 1;
    audioRef.current = audio;
  }, []);

  const playSound = () => {
    if (!audioRef.current || !unlockedRef.current) return;

    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {
      console.log("❌ Sound blocked");
    });
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
      auth: {
        token: localStorage.getItem("token"),
        userId: profile._id,
        role: "driver"
      },
      transports: ["websocket"],
      reconnection: true
    });

    socketRef.current = socket;

    socket.on("newRideRequest", (ride) => {
      setIncomingRide(ride);
      playSound(); // 🔊 FIXED
    });

    socket.on("rideAccepted", (ride) => {
      setActiveRide(ride);
      setIncomingRide(null);
      stopSound();
      fetchStats();
    });

    return () => socket.disconnect();
  }, [profile]);

  /* ================= FALLBACK ================= */
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await api.get("/driver/rides");

        if (res.data.rides?.length > 0 && !incomingRide) {
          setIncomingRide(res.data.rides[0]);
          playSound();
        }
      } catch {}
    }, 5000);

    return () => clearInterval(interval);
  }, [incomingRide]);

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

  /* ================= MAP ================= */
  const rideData = activeRide || incomingRide;

  const pickupCoords = rideData?.pickupLocation?.location?.coordinates;
  const dropCoords = rideData?.dropLocation?.location?.coordinates;

  const pickupLatLng = pickupCoords
    ? { lat: pickupCoords[1], lng: pickupCoords[0] }
    : null;

  const dropLatLng = dropCoords
    ? { lat: dropCoords[1], lng: dropCoords[0] }
    : null;

  /* ================= UI ================= */
  return (
    <div className="min-h-screen p-4 bg-gray-100 dark:bg-gray-950 text-gray-900 dark:text-white">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold">🚗 Driver Dashboard</h1>

        <button
          onClick={toggleOnline}
          className={`px-4 py-2 rounded-full text-white ${
            online ? "bg-green-600" : "bg-gray-500"
          }`}
        >
          {online ? "Online" : "Offline"}
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-indigo-500 text-white p-4 rounded-xl">
          {stats.totalRides} Rides
        </div>
        <div className="bg-green-500 text-white p-4 rounded-xl">
          ₹{stats.totalEarnings}
        </div>
      </div>

      {/* MAP */}
      <div className="h-[400px] rounded-xl overflow-hidden">
        <LiveMap
          driverLocation={driverLocation}
          userLocation={pickupLatLng}
          dropLocation={dropLatLng}
        />
      </div>

      {/* 🚨 IMPROVED POPUP */}
      {incomingRide && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">

          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>

          <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-t-3xl p-6 shadow-2xl">

            <h3 className="text-lg font-bold text-red-500 animate-pulse">
              🚨 New Ride ({timer}s)
            </h3>

            <div className="mt-3 text-sm space-y-1">
              <p><b>📍 Pickup:</b> {rideData?.pickupLocation?.address}</p>
              <p><b>🏁 Drop:</b> {rideData?.dropLocation?.address}</p>
            </div>

            <div className="text-2xl font-bold text-green-600 mt-3">
              ₹{rideData?.fare}
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => acceptRide(incomingRide._id)}
                className="flex-1 bg-green-600 text-white py-3 rounded-xl"
              >
                Accept
              </button>

              <button
                onClick={() => rejectRide(incomingRide._id)}
                className="flex-1 bg-gray-300 dark:bg-gray-700 py-3 rounded-xl"
              >
                Reject
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}