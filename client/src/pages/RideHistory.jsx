import React, { useEffect, useState } from "react";
import api from "../utils/api";
import { MapPin, RefreshCw, Bike } from "lucide-react";

export default function RideHistory() {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRides = async () => {
    try {
      setLoading(true);
      const res = await api.get("/ride/my");
      setRides(res.data.rides || []);
    } catch (err) {
      console.error("Ride fetch error:", err);
      setRides([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRides();
  }, []);

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <RefreshCw className="animate-spin text-indigo-600" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:px-10 pb-20">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">My Rides</h1>

        <button
          onClick={fetchRides}
          className="p-2 bg-white rounded-full shadow hover:bg-gray-100"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* EMPTY STATE */}
      {rides.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-20 text-gray-500">
          <Bike size={50} />
          <p className="mt-3 text-lg">No rides yet</p>
        </div>
      ) : (
        <div className="space-y-4">

          {rides.map((ride) => (
            <div
              key={ride._id}
              className="bg-white p-5 rounded-2xl shadow hover:shadow-md transition"
            >

              {/* TOP */}
              <div className="flex justify-between items-center">

                <div className="flex items-center gap-2">
                  <MapPin className="text-indigo-500" size={18} />
                  <p className="font-semibold text-gray-800">
                    {ride.pickup} → {ride.drop}
                  </p>
                </div>

                {/* STATUS */}
                <span
                  className={`text-xs px-3 py-1 rounded-full font-medium ${
                    ride.status === "completed"
                      ? "bg-green-100 text-green-600"
                      : ride.status === "cancelled"
                      ? "bg-red-100 text-red-600"
                      : "bg-yellow-100 text-yellow-600"
                  }`}
                >
                  {ride.status}
                </span>
              </div>

              {/* DATE */}
              <p className="text-sm text-gray-500 mt-2">
                {new Date(ride.createdAt).toLocaleString()}
              </p>

              {/* FOOTER */}
              <div className="flex justify-between items-center mt-4">

                <div>
                  <p className="text-xs text-gray-500">Fare</p>
                  <p className="text-lg font-bold text-green-600">
                    ₹{ride.fare}
                  </p>
                </div>

                {/* BUTTON */}
                <button
                  onClick={() => console.log("View Ride:", ride._id)}
                  className="text-sm text-indigo-600 font-semibold hover:underline"
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