import React, { useEffect, useState } from "react";
import api from "../utils/api";

const DriverRequests = () => {

  const [rides, setRides] = useState([]);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await api.get("/rides/pending"); // adjust API if needed
      setRides(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  const handleAction = async (id, action) => {
    try {
      await api.post(`/rides/${id}/${action}`);
      fetchRequests();
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className="pt-20 px-6 max-w-4xl mx-auto">

      <h1 className="text-2xl font-bold mb-6">
        🚗 Ride Requests
      </h1>

      {rides.length === 0 ? (
        <p>No pending rides</p>
      ) : (
        rides.map((ride) => (
          <div
            key={ride._id}
            className="p-4 border rounded-lg mb-4 shadow-sm bg-white dark:bg-gray-800"
          >
            <p><b>Pickup:</b> {ride.pickup}</p>
            <p><b>Drop:</b> {ride.destination}</p>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => handleAction(ride._id, "accept")}
                className="bg-green-500 text-white px-4 py-1 rounded"
              >
                Accept
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