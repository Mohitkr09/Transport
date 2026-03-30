import React, { useEffect, useState } from "react";
import api from "../utils/api";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000", {
  auth: {
    token: localStorage.getItem("token")
  }
});

const DriverRequests = () => {

  const [rides, setRides] = useState([]);
  const [loadingId, setLoadingId] = useState(null);

  /* ================= FETCH RIDES ================= */
  const fetchRequests = async () => {
    try {
      const res = await api.get("/ride/nearby"); // ✅ correct API
      setRides(res.data.rides || []);
    } catch (err) {
      console.log("❌ fetch error:", err);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  /* ================= SOCKET ================= */
  useEffect(() => {

    // 🔥 NEW RIDE
    socket.on("newRideRequest", (ride) => {
      setRides(prev => {
        if (prev.find(r => r._id === ride._id)) return prev;
        return [ride, ...prev];
      });
    });

    // 🔥 REMOVE IF TAKEN
    socket.on("rideTaken", (rideId) => {
      setRides(prev => prev.filter(r => r._id !== rideId));
    });

    // 🔥 REMOVE IF REJECTED
    socket.on("rideRejected", (rideId) => {
      setRides(prev => prev.filter(r => r._id !== rideId));
    });

    return () => {
      socket.off("newRideRequest");
      socket.off("rideTaken");
      socket.off("rideRejected");
    };

  }, []);

  /* ================= ACTION ================= */
  const handleAction = async (id, action) => {
    try {
      setLoadingId(id);

      if (action === "accept") {
        const res = await api.put(`/ride/${id}/accept`);

        socket.emit("rideAccepted", res.data.ride);

        // clear list after accept
        setRides([]);

      } else {
        await api.put(`/ride/${id}/reject`);

        setRides(prev => prev.filter(r => r._id !== id));
      }

    } catch (err) {
      console.log("❌ action error:", err);
      alert("Action failed");
    } finally {
      setLoadingId(null);
    }
  };

  /* ================= UI ================= */
  return (
    <div className="pt-20 px-6 max-w-4xl mx-auto">

      <h1 className="text-2xl font-bold mb-6">
        🚗 Ride Requests
      </h1>

      {rides.length === 0 ? (
        <p className="text-gray-500">No pending rides</p>
      ) : (
        rides.map((ride) => (
          <div
            key={ride._id}
            className="p-4 border rounded-lg mb-4 shadow-sm bg-white dark:bg-gray-800"
          >

            <p><b>Pickup:</b> {ride.pickupLocation?.address}</p>
            <p><b>Drop:</b> {ride.dropLocation?.address}</p>

            <p className="text-indigo-600 font-semibold mt-2">
              ₹{ride.fare}
            </p>

            <div className="flex gap-3 mt-4">

              <button
                onClick={() => handleAction(ride._id, "accept")}
                disabled={loadingId === ride._id}
                className="bg-green-500 text-white px-4 py-1 rounded"
              >
                {loadingId === ride._id ? "..." : "Accept"}
              </button>

              <button
                onClick={() => handleAction(ride._id, "reject")}
                className="bg-red-500 text-white px-4 py-1 rounded"
              >
                Reject
              </button>

            </div>

          </div>
        ))
      )}

    </div>
  );
};

export default DriverRequests;