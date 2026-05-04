import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../utils/api";
import { io } from "socket.io-client";
import { useGoogleMaps } from "../config/googleMaps";
import { GoogleMap, Marker, Polyline } from "@react-google-maps/api";
import toast, { Toaster } from "react-hot-toast";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

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
  const [trail, setTrail] = useState([]);
  const [heading, setHeading] = useState(0);
  const [isDark, setIsDark] = useState(false);
  const [loadingCancel, setLoadingCancel] = useState(false);

  /* ================= THEME ================= */
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

  /* ================= ROTATION ================= */
  const getHeading = (start, end) => {
    const dx = end.lng - start.lng;
    const dy = end.lat - start.lat;
    return (Math.atan2(dy, dx) * 180) / Math.PI;
  };

  /* ================= SMOOTH ANIMATION ================= */
  const animateDriver = (start, end) => {
    let progress = 0;
    cancelAnimationFrame(animationRef.current);

    const step = () => {
      progress += 0.03;
      if (progress > 1) progress = 1;

      const lat = start.lat + (end.lat - start.lat) * progress;
      const lng = start.lng + (end.lng - start.lng) * progress;

      const newPos = { lat, lng };

      setDriverPos(newPos);

      // 🔥 Limited trail (no lag)
      setTrail(prev => {
        const updated = [...prev, newPos];
        return updated.slice(-50);
      });

      // 🔥 Smooth rotation
      const angle = getHeading(start, end);
      setHeading(prev => prev + (angle - prev) * 0.2);

      // 🔥 Smooth camera follow
      mapRef.current?.panTo(newPos);

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

    let lastUpdate = 0;

    socket.on("driverMoved", ({ lat, lng }) => {
      const now = Date.now();

      // 🔥 Throttle updates (smoothness)
      if (now - lastUpdate < 800) return;
      lastUpdate = now;

      setDriverPos((prev) => {
        if (!prev) return { lat, lng };
        animateDriver(prev, { lat, lng });
        return prev;
      });
    });

    socket.on("rideCancelled", () => navigate("/"));

    return () => socket.disconnect();
  }, [rideId]);

  /* ================= CANCEL ================= */
  const handleCancelRide = async () => {
    if (loadingCancel) return;

    try {
      setLoadingCancel(true);

      await api.put(`/ride/${rideId}/cancel`, {
        reason: "User cancelled"
      });

      socketRef.current.emit("cancelRide", { rideId });

      toast.success("Ride cancelled 🚫");

      setTimeout(() => navigate("/"), 1000);
    } catch {
      toast.error("Cancel failed ❌");
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
    return <div className="h-screen flex items-center justify-center">Loading...</div>;
  }

  const pickup = {
    lat: ride.pickupLocation.location.coordinates[1],
    lng: ride.pickupLocation.location.coordinates[0]
  };

  const drop = {
    lat: ride.dropLocation.location.coordinates[1],
    lng: ride.dropLocation.location.coordinates[0]
  };

  return (
    <>
      <Toaster position="top-center" />

      <div className={`h-screen w-full relative ${isDark ? "bg-black" : "bg-gray-100"}`}>

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

          {/* 🚗 DRIVER */}
          {driverPos && (
            <Marker
              position={driverPos}
              icon={{
                url: "https://cdn-icons-png.flaticon.com/512/744/744465.png",
                scaledSize: new window.google.maps.Size(50, 50),
                anchor: new window.google.maps.Point(25, 25),
                rotation: heading
              }}
            />
          )}

          {/* 🟢 ROUTE */}
          {routePath.length > 1 && (
            <Polyline path={routePath} options={{ strokeColor: "#22c55e", strokeWeight: 6 }} />
          )}

          {/* 🔥 LIVE TRAIL */}
          {trail.length > 1 && (
            <Polyline path={trail} options={{ strokeColor: "#3b82f6", strokeWeight: 4 }} />
          )}
        </GoogleMap>

        {/* PANEL */}
        <div className="absolute bottom-0 w-full rounded-t-3xl p-5 bg-white/80 backdrop-blur-xl shadow-2xl">
          <h2 className="font-bold text-lg">{ride.driver?.name}</h2>

          <p>📍 {ride.pickupLocation.address}</p>
          <p>🏁 {ride.dropLocation.address}</p>

          <div className="flex justify-between items-center mt-3">
            <p className="text-green-600 font-bold text-xl">₹ {ride.fare}</p>

            <button
              onClick={handleCancelRide}
              disabled={loadingCancel}
              className="bg-red-500 text-white px-4 py-2 rounded-xl"
            >
              {loadingCancel ? "Cancelling..." : "Cancel"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}