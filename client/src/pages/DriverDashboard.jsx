import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { io } from "socket.io-client";
import {
  MapPin,
  Navigation,
  PlayCircle,
  StopCircle
} from "lucide-react";

/* ================= SOCKET ================= */
const socket = io("http://localhost:5000", {
  auth: {
    token: localStorage.getItem("token")
  }
});

export default function DriverDashboard() {

  const navigate = useNavigate();

  const [rides, setRides] = useState([]);
  const [online, setOnline] = useState(true);
  const [loadingId, setLoadingId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [activeRide, setActiveRide] = useState(null);

  /* ================= AUTH ================= */
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token || role !== "driver") {
      navigate("/login?role=driver");
    }
  }, []);

  /* ================= PROFILE ================= */
  const loadProfile = async () => {
    try {
      const res = await api.get("/driver/me");
      setProfile(res.data.driver);
      setOnline(res.data.driver?.isOnline);
    } catch (err) {
      console.log("❌ Profile error", err);
    }
  };

  /* ================= SOCKET CONNECT ================= */
  useEffect(() => {
    if (profile?._id) {
      socket.emit("driverOnline", profile._id);
    }
  }, [profile]);

  /* ================= RECEIVE RIDES ================= */
  useEffect(() => {

    socket.on("newRideRequest", (ride) => {
      console.log("🚗 New Ride:", ride);

      setRides(prev => [ride, ...prev]);
    });

    return () => socket.off("newRideRequest");

  }, []);

  /* ================= LOCATION ================= */
  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        try {
          await api.put("/driver/location", {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
        } catch (err) {
          console.log("❌ Location error", err);
        }
      },
      (err) => console.log(err),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  /* ================= INITIAL LOAD ================= */
  useEffect(() => {
    loadProfile();
  }, []);

  /* ================= ACCEPT ================= */
  const acceptRide = async (id) => {
    try {
      setLoadingId(id);

      const res = await api.put(`/ride/${id}/accept`);
      setActiveRide(res.data.ride);

      /* REMOVE FROM LIST */
      setRides([]);

    } catch (err) {
      alert("Ride already taken");
    } finally {
      setLoadingId(null);
    }
  };

  /* ================= REJECT ================= */
  const rejectRide = async (id) => {
    try {
      await api.put(`/ride/${id}/reject`);

      setRides(prev => prev.filter(r => r._id !== id));

    } catch {
      alert("Reject failed");
    }
  };

  /* ================= START ================= */
  const startRide = async () => {
    try {
      const res = await api.put(`/ride/${activeRide._id}/start`);
      setActiveRide(res.data.ride);
    } catch {
      alert("Start failed");
    }
  };

  /* ================= COMPLETE ================= */
  const completeRide = async () => {
    try {
      await api.put(`/ride/${activeRide._id}/complete`);

      alert("Ride Completed 🎉");

      setActiveRide(null);

    } catch {
      alert("Complete failed");
    }
  };

  /* ================= ONLINE ================= */
  const toggleOnline = async () => {
    try {
      const newStatus = !online;

      await api.put("/driver/online", { isOnline: newStatus });

      setOnline(newStatus);

    } catch {
      alert("Failed");
    }
  };

  /* ================= UI ================= */
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

          <p>Pickup: {activeRide.pickupLocation?.address}</p>
          <p>Drop: {activeRide.dropLocation?.address}</p>

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
            <div className="bg-white p-6 rounded-xl text-center text-gray-500">
              No nearby rides
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">

            {rides.map((ride) => (
              <div
                key={ride._id}
                className="bg-white rounded-xl shadow p-5"
              >

                <p className="flex gap-2">
                  <MapPin size={16}/> {ride.pickupLocation?.address}
                </p>

                <p className="flex gap-2">
                  <Navigation size={16}/> {ride.dropLocation?.address}
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