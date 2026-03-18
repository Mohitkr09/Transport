import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import api from "../utils/api";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, IndianRupee, Clock } from "lucide-react";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

export default function DriverRequestPanel() {
  const socketRef = useRef(null);

  const [ride, setRide] = useState(null);
  const [seconds, setSeconds] = useState(30);

  /* ================= SOCKET ================= */
  useEffect(() => {
    const token = localStorage.getItem("token");

    socketRef.current = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket"]
    });

    socketRef.current.on("newRideRequest", data => {
      setRide(data);
      setSeconds(30);

      // 🔔 sound alert
      const audio = new Audio("/alert.mp3");
      audio.play().catch(() => {});
    });

    return () => socketRef.current.disconnect();
  }, []);

  /* ================= TIMER ================= */
  useEffect(() => {
    if (!ride) return;

    if (seconds === 0) {
      setRide(null);
      return;
    }

    const t = setTimeout(() => setSeconds(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds, ride]);

  /* ================= ACCEPT ================= */
  const acceptRide = async () => {
    try {
      await api.put(`/api/ride/${ride.rideId}/accept`);
      setRide(null);
    } catch {
      alert("Failed to accept ride");
    }
  };

  /* ================= REJECT ================= */
  const rejectRide = () => {
    setRide(null);
  };

  /* ================= UI ================= */
  return (
    <AnimatePresence>
      {ride && (
        <motion.div
          initial={{ y: 200, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 200, opacity: 0 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[380px]"
        >
          <div className="bg-white rounded-3xl shadow-2xl p-6 border">

            {/* HEADER */}
            <div className="flex justify-between mb-4">
              <h3 className="font-bold text-lg">
                New Ride Request
              </h3>

              <span className="flex items-center gap-1 text-red-500 font-bold">
                <Clock size={16}/> {seconds}s
              </span>
            </div>

            {/* LOCATIONS */}
            <div className="space-y-3 text-sm">

              <Row text={ride.pickup}/>
              <Row text={ride.drop}/>

            </div>

            {/* PRICE */}
            <div className="flex justify-between mt-4 text-lg font-semibold">
              <span className="flex items-center gap-1">
                <IndianRupee size={18}/> {ride.fare}
              </span>

              <span className="text-gray-500 text-sm">
                {ride.distance} km
              </span>
            </div>

            {/* BUTTONS */}
            <div className="flex gap-3 mt-5">

              <button
                onClick={acceptRide}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-semibold transition"
              >
                Accept
              </button>

              <button
                onClick={rejectRide}
                className="flex-1 bg-gray-200 hover:bg-gray-300 py-3 rounded-xl font-semibold transition"
              >
                Reject
              </button>

            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ================= SMALL ROW ================= */
const Row = ({ text }) => (
  <div className="flex items-center gap-2 text-gray-700">
    <MapPin size={16}/>
    {text}
  </div>
);