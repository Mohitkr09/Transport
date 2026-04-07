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
      auth: { token: localStorage.getItem("token") },
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("newRideRequest", (ride) => {
      audioRef.current?.play().catch(() => {});
      setNewRide(ride);

      setRides((prev) => {
        if (prev.find((r) => r._id === ride._id)) return prev;
        return [ride, ...prev];
      });

      setTimeout(() => setNewRide(null), 5000);
    });

    socket.on("rideTaken", (rideId) => {
      setRides((prev) => prev.filter((r) => r._id !== rideId));
    });

    return () => socket.disconnect();
  }, []);

  /* ================= LOCATION ================= */
  useEffect(() => {
    navigator.geolocation.getCurrentPosition((pos) => {
      setCoords({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      });
    });
  }, []);

  useEffect(() => {
    if (!coords) return;

    const interval = setInterval(() => {
      api.put("/driver/location", coords).catch(() => {});
    }, 4000);

    return () => clearInterval(interval);
  }, [coords]);

  /* ================= FETCH ================= */
  const fetchRequests = async () => {
    try {
      if (!coords) return;

      const res = await api.get("/ride/nearby", {
        params: coords,
      });

      setRides(res.data.rides || []);
    } catch {}
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
          rideId: id,
        });

        setRides([]);
        setNewRide(null);

      } else {
        await api.put(`/ride/${id}/reject`);
        setRides((prev) => prev.filter((r) => r._id !== id));
      }

    } catch {
      alert("Action failed");
    } finally {
      setLoadingId(null);
    }
  };

  /* ================= UI ================= */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 p-6">

      {/* 🔊 SOUND */}
      <audio
        ref={audioRef}
        src="https://actions.google.com/sounds/v1/alarms/beep_short.ogg"
      />

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">🚗 Ride Requests</h1>
        <span className="text-gray-500 text-sm">
          {rides.length} available
        </span>
      </div>

      {/* 🔥 NEW RIDE POPUP */}
      {newRide && (
        <div className="fixed top-5 right-5 z-50 animate-slideIn">
          <div className="bg-white shadow-xl rounded-2xl p-4 border-l-4 border-green-500 w-72">
            <p className="font-bold text-green-600">🚨 New Ride</p>
            <p className="text-sm mt-1">
              {newRide.pickupLocation?.address}
            </p>
          </div>
        </div>
      )}

      {/* EMPTY STATE */}
      {rides.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-24 text-gray-500">
          <div className="text-6xl mb-3">🚫</div>
          <p className="text-lg">No ride requests nearby</p>
        </div>
      ) : (
        <div className="grid gap-6 max-w-3xl mx-auto">

          {rides.map((ride) => (
            <div
              key={ride._id}
              className="bg-white/80 backdrop-blur-lg border rounded-2xl p-5 shadow-md hover:shadow-xl transition"
            >

              {/* TOP */}
              <div className="flex justify-between items-center mb-3">
                <div>
                  <p className="text-gray-500 text-sm">Ride</p>
                  <p className="font-semibold text-lg">
                    {ride.vehicleType?.toUpperCase()}
                  </p>
                </div>

                <p className="text-xl font-bold text-green-600">
                  ₹{ride.fare}
                </p>
              </div>

              {/* LOCATIONS */}
              <div className="space-y-2 mb-4">
                <p className="flex items-start gap-2 text-gray-800">
                  <span>📍</span>
                  {ride.pickupLocation?.address}
                </p>

                <p className="flex items-start gap-2 text-gray-600">
                  <span>🏁</span>
                  {ride.dropLocation?.address}
                </p>
              </div>

              {/* ACTIONS */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleAction(ride._id, "accept")}
                  disabled={loadingId === ride._id}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-xl font-semibold shadow hover:scale-105 transition"
                >
                  {loadingId === ride._id ? "Accepting..." : "Accept"}
                </button>

                <button
                  onClick={() => handleAction(ride._id, "reject")}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 py-3 rounded-xl font-semibold transition"
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