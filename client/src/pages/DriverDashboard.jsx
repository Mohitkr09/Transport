import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import {
  MapPin,
  CheckCircle,
  XCircle,
  Navigation,
  PlayCircle,
  StopCircle
} from "lucide-react";

export default function DriverDashboard() {

  const navigate = useNavigate();

  const [rides, setRides] = useState([]);
  const [online, setOnline] = useState(true);
  const [loadingId, setLoadingId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [activeRide, setActiveRide] = useState(null);

  /* ======================================================
  AUTH CHECK
  ====================================================== */

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token || role !== "driver") {
      navigate("/login?role=driver");
    }
  }, []);

  /* ======================================================
  GET PROFILE
  ====================================================== */

  const loadProfile = async () => {
    try {
      const res = await api.get("/driver/me", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });

      setProfile(res.data.driver);
      setOnline(res.data.driver?.isOnline);

    } catch (err) {
      console.log("❌ Profile fetch failed");
    }
  };

  /* ======================================================
  LIVE LOCATION (REAL-TIME)
  ====================================================== */

  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        try {
          await api.put(
            "/driver/location",
            {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude
            },
            {
              headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
            }
          );
        } catch (err) {
          console.log("❌ Location update failed");
        }
      },
      (err) => console.log(err),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  /* ======================================================
  FETCH RIDES
  ====================================================== */

  const fetchRides = async () => {
    try {
      const res = await api.get("/ride/nearby", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });

      setRides(res.data?.rides || []);

    } catch (err) {
      console.log("❌ Ride fetch failed");
    }
  };

  /* ======================================================
  ACCEPT RIDE
  ====================================================== */

  const acceptRide = async (id) => {
    try {
      setLoadingId(id);

      const res = await api.put(
        `/driver/ride/${id}/accept`,
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        }
      );

      setActiveRide(res.data.ride);
      setRides([]);

    } catch (err) {
      alert("Failed to accept ride");
    } finally {
      setLoadingId(null);
    }
  };

  /* ======================================================
  REJECT RIDE
  ====================================================== */

  const rejectRide = async (id) => {
    try {
      await api.put(
        `/driver/ride/${id}/reject`,
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        }
      );

      setRides((prev) => prev.filter((r) => r._id !== id));

    } catch (err) {
      alert("Failed to reject ride");
    }
  };

  /* ======================================================
  START RIDE
  ====================================================== */

  const startRide = async () => {
    try {
      const res = await api.put(
        `/driver/ride/${activeRide._id}/start`,
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        }
      );

      setActiveRide(res.data.ride);

    } catch (err) {
      alert("Failed to start ride");
    }
  };

  /* ======================================================
  COMPLETE RIDE
  ====================================================== */

  const completeRide = async () => {
    try {
      await api.put(
        `/driver/ride/${activeRide._id}/complete`,
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        }
      );

      alert("Ride completed 🎉");
      setActiveRide(null);
      fetchRides();

    } catch (err) {
      alert("Failed to complete ride");
    }
  };

  /* ======================================================
  TOGGLE ONLINE
  ====================================================== */

  const toggleOnline = async () => {
    try {
      const newStatus = !online;

      await api.put(
        "/driver/online",
        { isOnline: newStatus },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        }
      );

      setOnline(newStatus);

    } catch (err) {
      alert("Status update failed");
    }
  };

  /* ======================================================
  INITIAL LOAD
  ====================================================== */

  useEffect(() => {
    loadProfile();
    fetchRides();

    const interval = setInterval(fetchRides, 8000);
    return () => clearInterval(interval);
  }, []);

  /* ======================================================
  UI
  ====================================================== */

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-black p-6">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">

        <div>
          <h1 className="text-2xl font-bold">Driver Dashboard</h1>
          {profile && (
            <p className="text-gray-500 text-sm">
              Welcome {profile.name}
            </p>
          )}
        </div>

        <button
          onClick={toggleOnline}
          className={`px-4 py-2 rounded-lg text-white ${
            online ? "bg-green-600" : "bg-gray-500"
          }`}
        >
          {online ? "Online" : "Offline"}
        </button>

      </div>

      {/* ACTIVE RIDE */}
      {activeRide && (
        <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow mb-6">

          <h2 className="text-xl font-semibold mb-3">
            Active Ride
          </h2>

          <p>Pickup: {activeRide.pickup}</p>
          <p>Drop: {activeRide.destination}</p>

          <div className="flex gap-3 mt-4">

            {activeRide.status === "accepted" && (
              <button
                onClick={startRide}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg flex items-center justify-center gap-2"
              >
                <PlayCircle size={18}/> Start Ride
              </button>
            )}

            {activeRide.status === "ongoing" && (
              <button
                onClick={completeRide}
                className="flex-1 bg-purple-600 text-white py-2 rounded-lg flex items-center justify-center gap-2"
              >
                <StopCircle size={18}/> Complete Ride
              </button>
            )}

          </div>

        </div>
      )}

      {/* RIDE LIST */}
      {!activeRide && (
        <>
          <h2 className="text-xl font-semibold mb-4">
            Nearby Ride Requests
          </h2>

          {rides.length === 0 && (
            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl text-center text-gray-500">
              No nearby rides available
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">

            {rides.map((ride) => (
              <div
                key={ride._id}
                className="bg-white dark:bg-gray-900 rounded-xl shadow p-5"
              >

                <p className="flex gap-2">
                  <MapPin size={16}/> {ride.pickup}
                </p>

                <p className="flex gap-2">
                  <Navigation size={16}/> {ride.destination}
                </p>

                <p className="font-semibold text-indigo-600">
                  ₹{ride.fare}
                </p>

                <div className="flex gap-3 mt-4">

                  <button
                    onClick={() => acceptRide(ride._id)}
                    disabled={loadingId === ride._id}
                    className="flex-1 bg-green-600 text-white py-2 rounded-lg"
                  >
                    {loadingId === ride._id ? "..." : "Accept"}
                  </button>

                  <button
                    onClick={() => rejectRide(ride._id)}
                    className="flex-1 bg-red-600 text-white py-2 rounded-lg"
                  >
                    Reject
                  </button>

                </div>

              </div>
            ))}

          </div>
        </>
      )}

    </div>
  );
}