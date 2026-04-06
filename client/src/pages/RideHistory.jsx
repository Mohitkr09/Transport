import React, { useEffect, useState } from "react";
import api from "../utils/api";

export default function RideHistory() {
  const [rides, setRides] = useState([]);

  useEffect(() => {
    const fetchRides = async () => {
      try {
        const res = await api.get("/ride/my");
        setRides(res.data.rides);
      } catch (err) {
        console.error(err);
      }
    };

    fetchRides();
  }, []);

  return (
    <div className="p-4 md:px-10">
      <h1 className="text-2xl font-bold mb-4">My Rides</h1>

      {rides.length === 0 ? (
        <p className="text-gray-500">No rides yet</p>
      ) : (
        <div className="space-y-4">
          {rides.map((ride) => (
            <div
              key={ride._id}
              className="bg-white p-4 rounded-xl shadow"
            >
              <p className="font-semibold">
                📍 {ride.pickup} → {ride.drop}
              </p>
              <p className="text-sm text-gray-500">
                {new Date(ride.createdAt).toLocaleString()}
              </p>
              <p className="text-green-600 font-bold mt-2">
                ₹{ride.fare}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}