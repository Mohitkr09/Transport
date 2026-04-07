import React, { useEffect, useState, useRef } from "react";
import api from "../utils/api";
import { io } from "socket.io-client";

export default function DriverRequests() {

  const [rides, setRides] = useState([]);
  const [loadingId, setLoadingId] = useState(null);
  const [newRide, setNewRide] = useState(null);
  const [coords, setCoords] = useState(null);

  const [filter, setFilter] = useState("all");
  const [history, setHistory] = useState([]);

  const socketRef = useRef(null);
  const audioRef = useRef(null);

  /* ================= SOCKET ================= */
  useEffect(() => {
    const socket = io(import.meta.env.VITE_SOCKET_URL, {
      auth: { token: localStorage.getItem("token") }
    });

    socketRef.current = socket;

    socket.on("newRideRequest", (ride) => {
      audioRef.current?.play().catch(() => {});
      setNewRide(ride);

      setRides(prev => [ride, ...prev]);

      // save history
      setHistory(prev => [
        { ...ride, status: "new", time: Date.now() },
        ...prev
      ]);

      setTimeout(() => setNewRide(null), 4000);
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

  /* ================= FETCH ================= */
  const fetchRequests = async () => {
    try {
      const res = await api.get("/ride/nearby");
      setRides(res.data.rides || []);
    } catch {}
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  /* ================= ACTION ================= */
  const handleAction = async (id, action) => {
    try {
      setLoadingId(id);

      if (action === "accept") {
        await api.put(`/ride/${id}/accept`);

        setHistory(prev => [
          { _id: id, status: "accepted", time: Date.now() },
          ...prev
        ]);

      } else {
        await api.put(`/ride/${id}/reject`);

        setHistory(prev => [
          { _id: id, status: "missed", time: Date.now() },
          ...prev
        ]);
      }

      setRides(prev => prev.filter(r => r._id !== id));

    } catch {
      alert("Action failed");
    } finally {
      setLoadingId(null);
    }
  };

  /* ================= FILTER ================= */
  const last24h = Date.now() - 24 * 60 * 60 * 1000;

  const filteredHistory = history.filter(h => h.time >= last24h);

  const stats = {
    new: filteredHistory.filter(h => h.status === "new").length,
    accepted: filteredHistory.filter(h => h.status === "accepted").length,
    missed: filteredHistory.filter(h => h.status === "missed").length
  };

  const displayedRides =
    filter === "all"
      ? rides
      : filter === "new"
      ? rides
      : [];

  /* ================= UI ================= */
  return (
    <div className="min-h-screen p-4 sm:p-6 
      bg-gray-100 dark:bg-gray-950 
      text-gray-900 dark:text-white transition">

      <audio
        ref={audioRef}
        src="https://actions.google.com/sounds/v1/alarms/beep_short.ogg"
      />

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between mb-6 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">🚗 Ride Requests</h1>

        <div className="flex gap-3 text-sm">
          <Stat label="New" value={stats.new} />
          <Stat label="Accepted" value={stats.accepted} />
          <Stat label="Missed" value={stats.missed} />
        </div>
      </div>

      {/* FILTER */}
      <div className="flex gap-2 mb-5 overflow-x-auto">
        {["all", "new"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl capitalize ${
              filter === f
                ? "bg-indigo-600 text-white"
                : "bg-gray-200 dark:bg-gray-800"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* NEW RIDE POPUP */}
      {newRide && (
        <div className="fixed top-5 right-5 z-50">
          <div className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow-xl border-l-4 border-green-500">
            🚨 New Ride
          </div>
        </div>
      )}

      {/* RIDES */}
      {displayedRides.length === 0 ? (
        <div className="text-center mt-20 text-gray-500">
          No rides available
        </div>
      ) : (
        <div className="grid gap-5 max-w-3xl mx-auto">

          {displayedRides.map((ride) => (
            <div key={ride._id}
              className="bg-white dark:bg-gray-900 
              p-5 rounded-2xl shadow hover:shadow-xl transition">

              <div className="flex justify-between mb-3">
                <h3 className="font-semibold">
                  {ride.vehicleType}
                </h3>
                <p className="text-green-600 font-bold">
                  ₹{ride.fare}
                </p>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400">
                📍 {ride.pickupLocation?.address}
              </p>

              <p className="text-sm mb-3 text-gray-500">
                🏁 {ride.dropLocation?.address}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => handleAction(ride._id, "accept")}
                  className="flex-1 bg-green-600 text-white py-2 rounded-xl"
                >
                  Accept
                </button>

                <button
                  onClick={() => handleAction(ride._id, "reject")}
                  className="flex-1 bg-gray-200 dark:bg-gray-700 py-2 rounded-xl"
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

/* STAT */
const Stat = ({ label, value }) => (
  <div className="bg-white dark:bg-gray-900 px-3 py-2 rounded-xl shadow text-center">
    <p className="text-xs">{label}</p>
    <p className="font-bold">{value}</p>
  </div>
);