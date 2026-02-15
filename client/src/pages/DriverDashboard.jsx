import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

// 🔌 Socket (singleton using ref)
const socket = io("http://localhost:5000", {
  transports: ["websocket"]
});

const DriverDashboard = () => {
  const [isOnline, setIsOnline] = useState(false);
  const intervalRef = useRef(null);

  // ===============================
  // START SENDING LIVE LOCATION
  // ===============================
  const startSharingLocation = () => {
    let lat = 23.0225; // demo start
    let lng = 72.5714;

    intervalRef.current = setInterval(() => {
      lat += 0.0001;
      lng += 0.0001;

      socket.emit("sendLocation", { lat, lng });
      console.log("📡 Sent location:", lat, lng);
    }, 2000);
  };

  // ===============================
  // STOP SENDING LOCATION
  // ===============================
  const stopSharingLocation = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // ===============================
  // TOGGLE ONLINE / OFFLINE
  // ===============================
  const toggleOnlineStatus = () => {
    if (!isOnline) {
      startSharingLocation();
    } else {
      stopSharingLocation();
    }
    setIsOnline((prev) => !prev);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSharingLocation();
      socket.disconnect();
    };
  }, []);

  return (
    <div className="min-h-screen p-6
                    bg-gray-100 dark:bg-gray-900
                    text-gray-900 dark:text-gray-100 transition">

      {/* HEADER */}
      <div className="bg-white dark:bg-gray-800
                      p-4 rounded-xl shadow mb-6
                      flex justify-between items-center transition">

        <div>
          <h2 className="text-2xl font-bold">
            Driver Dashboard
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isOnline ? "🟢 You are online" : "🔴 You are offline"}
          </p>
        </div>

        <div className="flex items-center gap-3">
        

          <button
            onClick={toggleOnlineStatus}
            className={`px-4 py-2 rounded-lg
              text-white font-semibold transition
              ${isOnline
                ? "bg-red-500 hover:bg-red-600"
                : "bg-green-500 hover:bg-green-600"}`}
          >
            {isOnline ? "Go Offline" : "Go Online"}
          </button>
        </div>
      </div>

      {/* RIDE REQUESTS */}
      <div className="bg-white dark:bg-gray-800
                      p-6 rounded-xl shadow transition">

        <h3 className="text-xl font-semibold mb-4">
          Ride Requests
        </h3>

        {/* Placeholder for next step */}
        <div className="text-gray-400 dark:text-gray-500 text-sm">
          Incoming ride requests will appear here.
        </div>

      </div>
    </div>
  );
};

export default DriverDashboard;
