import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../utils/api";
import { io } from "socket.io-client";
import { useGoogleMaps } from "../config/googleMaps";
import { GoogleMap, Marker, Polyline } from "@react-google-maps/api";
import toast, { Toaster } from "react-hot-toast";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

/* 🌙 DARK MAP STYLE */
const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#1d2c4d" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8ec3b9" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a3646" }] }
];

export default function RideTracking() {
  const { rideId } = useParams();
  const navigate = useNavigate();

  const socketRef = useRef(null);
  const mapRef = useRef(null);
  const animationRef = useRef(null);

  const { isLoaded } = useGoogleMaps();

  const [ride, setRide] = useState(null);
  const [driverPos, setDriverPos] = useState(null);
  const [routePath, setRoutePath] = useState([]);
  const [isDark, setIsDark] = useState(false);

  const [loadingCancel, setLoadingCancel] = useState(false);
  const [isCancellingUI, setIsCancellingUI] = useState(false);

  /* 🌙 THEME */
  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };

    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"]
    });

    return () => observer.disconnect();
  }, []);

  /* ================= FETCH ================= */
  useEffect(() => {
    api.get(`/ride/${rideId}`).then((res) => {
      setRide(res.data.ride);
    });
  }, [rideId]);

  /* ================= DRIVER ANIMATION ================= */
  const animateDriver = (start, end) => {
    let progress = 0;
    cancelAnimationFrame(animationRef.current);

    const step = () => {
      progress += 0.02;

      const lat = start.lat + (end.lat - start.lat) * progress;
      const lng = start.lng + (end.lng - start.lng) * progress;

      setDriverPos({ lat, lng });
      mapRef.current?.panTo({ lat, lng });

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(step);
      }
    };

    animationRef.current = requestAnimationFrame(step);
  };

  /* ================= SOCKET ================= */
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      auth: { token: localStorage.getItem("token") }
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("joinRide", rideId);
    });

    socket.on("driverMoved", ({ lat, lng }) => {
      setDriverPos((prev) => {
        if (!prev) return { lat, lng };
        animateDriver(prev, { lat, lng });
        return prev;
      });
    });

    /* 🔴 CANCEL EVENT */
    socket.on("rideCancelled", () => {
      toast("Ride cancelled ❌");
      setIsCancellingUI(true);

      setTimeout(() => {
        navigate("/");
      }, 1200);
    });

    return () => socket.disconnect();
  }, [rideId]);

  /* ================= CANCEL ================= */
  const handleCancelRide = async () => {
    if (!window.confirm("Cancel this ride?")) return;

    try {
      setLoadingCancel(true);
      setIsCancellingUI(true);

      await api.put(`/ride/${rideId}/cancel`, {
        reason: "User cancelled"
      });

      socketRef.current.emit("cancelRide", { rideId });

      toast.success("Ride cancelled 🚫");

      setTimeout(() => {
        navigate("/");
      }, 1200);

    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Cancel failed");
      setIsCancellingUI(false);
    } finally {
      setLoadingCancel(false);
    }
  };

  /* ================= ROUTE ================= */
  useEffect(() => {
    if (!ride || !window.google) return;

    const pickup = {
      lat: ride.pickupLocation.location.coordinates[1],
      lng: ride.pickupLocation.location.coordinates[0]
    };

    const drop = {
      lat: ride.dropLocation.location.coordinates[1],
      lng: ride.dropLocation.location.coordinates[0]
    };

    const service = new window.google.maps.DirectionsService();

    service.route(
      {
        origin: pickup,
        destination: drop,
        travelMode: "DRIVING"
      },
      (result, status) => {
        if (status === "OK") {
          const path = result.routes[0].overview_path.map((p) => ({
            lat: p.lat(),
            lng: p.lng()
          }));
          setRoutePath(path);
        }
      }
    );
  }, [ride]);

  if (!ride || !isLoaded) {
    return (
      <div className="h-screen flex items-center justify-center 
      bg-white dark:bg-black text-black dark:text-white">
        Loading...
      </div>
    );
  }

  const pickup = {
    lat: ride.pickupLocation.location.coordinates[1],
    lng: ride.pickupLocation.location.coordinates[0]
  };

  const drop = {
    lat: ride.dropLocation.location.coordinates[1],
    lng: ride.dropLocation.location.coordinates[0]
  };

  const getStatus = () => {
    switch (ride.status) {
      case "searching": return "🔍 Searching Driver...";
      case "accepted": return "🚗 Driver is on the way";
      case "ongoing": return "🛣️ Ride in progress";
      case "completed": return "🎉 Ride Completed";
      case "cancelled": return "❌ Ride Cancelled";
      default: return "Loading...";
    }
  };

  return (
    <>
      {/* 🍞 TOASTER */}
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "#111",
            color: "#fff",
            borderRadius: "12px",
            padding: "12px 16px"
          }
        }}
      />

      <div className={`h-screen w-full relative transition-all duration-500
        ${isDark ? "bg-black" : "bg-gray-100"}
        ${isCancellingUI ? "opacity-0 scale-95 blur-sm" : "opacity-100"}
      `}>

        {/* MAP */}
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "100%" }}
          zoom={15}
          center={driverPos || pickup}
          onLoad={(map) => (mapRef.current = map)}
          options={{
            disableDefaultUI: true,
            styles: isDark ? darkMapStyle : []
          }}
        >
          <Marker position={pickup} />
          <Marker position={drop} />

          {driverPos && (
            <Marker
              position={driverPos}
              icon={{
                url: "https://cdn-icons-png.flaticon.com/512/744/744465.png",
                scaledSize: new window.google.maps.Size(50, 50)
              }}
            />
          )}

          {routePath.length > 1 && (
            <Polyline
              path={routePath}
              options={{
                strokeColor: "#22c55e",
                strokeWeight: 6
              }}
            />
          )}
        </GoogleMap>

        {/* STATUS */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 
          px-6 py-2 rounded-full bg-white/60 dark:bg-gray-900/70 
          backdrop-blur-xl shadow-lg text-sm font-semibold">
          {getStatus()}
        </div>

        {/* PANEL */}
        <div className="absolute bottom-0 w-full 
          rounded-t-3xl p-5 bg-white/80 dark:bg-gray-900/80 
          backdrop-blur-xl shadow-2xl">

          <h2 className="font-bold text-lg text-gray-900 dark:text-white">
            {ride.driver?.name || "Finding Driver..."}
          </h2>

          <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            <p>📍 {ride.pickupLocation.address}</p>
            <p>🏁 {ride.dropLocation.address}</p>
          </div>

          <div className="mt-4 flex justify-between items-center">
            <p className="text-green-500 text-xl font-bold">
              ₹ {ride.fare}
            </p>

            <button
              onClick={handleCancelRide}
              disabled={loadingCancel}
              className="bg-red-500 hover:bg-red-600 
              disabled:opacity-50 disabled:cursor-not-allowed
              text-white px-4 py-2 rounded-xl transition"
            >
              {loadingCancel ? "Cancelling..." : "Cancel"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}