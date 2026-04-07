import React, { useEffect, useState } from "react";
import api from "../utils/api";
import { MapPin, RefreshCw, Bike, Calendar } from "lucide-react";

export default function RideHistory() {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRides = async () => {
    try {
      setRefreshing(true);
      const res = await api.get("/ride/my");
      setRides(res.data.rides || []);
    } catch (err) {
      console.error("Ride fetch error:", err);
      setRides([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRides();
  }, []);

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center 
        bg-white dark:bg-black">
        <RefreshCw className="animate-spin text-indigo-600" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:px-10 pb-20 
      bg-gray-100 dark:bg-black 
      text-gray-900 dark:text-white transition">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-6 
        bg-white/70 dark:bg-gray-900/80 backdrop-blur-xl 
        p-4 rounded-2xl shadow">

        <h1 className="text-xl md:text-2xl font-bold">
          🚗 My Rides
        </h1>

        <button
          onClick={fetchRides}
          className="p-2 rounded-full 
          bg-gray-200 dark:bg-gray-800 
          hover:scale-110 transition"
        >
          <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
        </button>
      </div>

      {/* EMPTY */}
      {rides.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-24 text-gray-500">
          <Bike size={60} />
          <p className="mt-4 text-lg font-medium">No rides yet</p>
          <p className="text-sm">Start your first ride 🚀</p>
        </div>
      ) : (
        <div className="space-y-5 max-w-3xl mx-auto">

          {rides.map((ride) => (
            <div
              key={ride._id}
              className="bg-white dark:bg-gray-900 
              rounded-2xl p-5 shadow-lg 
              hover:shadow-xl hover:-translate-y-1 transition-all"
            >

              {/* TOP */}
              <div className="flex justify-between items-start gap-3">

                <div className="flex items-start gap-2">
                  <MapPin className="text-indigo-500 mt-1" size={18} />

                  <div>
                    <p className="font-semibold text-sm md:text-base">
                      {ride.pickupLocation?.address || "Pickup"} 
                      <span className="mx-1">→</span>
                      {ride.dropLocation?.address || "Drop"}
                    </p>

                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                      <Calendar size={12} />
                      {new Date(ride.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* STATUS */}
                <span
                  className={`text-xs px-3 py-1 rounded-full font-semibold ${
                    ride.status === "completed"
                      ? "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400"
                      : ride.status === "cancelled"
                      ? "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400"
                      : "bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-400"
                  }`}
                >
                  {ride.status}
                </span>
              </div>

              {/* DIVIDER */}
              <div className="my-4 border-t border-gray-200 dark:border-gray-700" />

              {/* FOOTER */}
              <div className="flex justify-between items-center">

                <div>
                  <p className="text-xs text-gray-500">Fare</p>
                  <p className="text-lg font-bold text-green-600">
                    ₹{ride.fare || 0}
                  </p>
                </div>

                <button
                  onClick={() => console.log("View Ride:", ride._id)}
                  className="text-sm font-semibold 
                  text-indigo-600 dark:text-indigo-400 
                  hover:underline"
                >
                  View Details →
                </button>

              </div>
            </div>
          ))}

        </div>
      )}
    </div>
  );
}