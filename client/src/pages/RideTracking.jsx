import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import api from "../utils/api";
import { io } from "socket.io-client";
import { useGoogleMaps } from "../config/googleMaps";
import { GoogleMap, Marker, Polyline } from "@react-google-maps/api";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

export default function RideTracking() {
  const { rideId } = useParams();

  const socketRef = useRef(null);
  const mapRef = useRef(null);
  const animationRef = useRef(null);

  const { isLoaded } = useGoogleMaps();

  const [ride, setRide] = useState(null);
  const [driverPos, setDriverPos] = useState(null);
  const [routePath, setRoutePath] = useState([]);

  /* ================= FETCH ================= */
  useEffect(() => {
    api.get(`/ride/${rideId}`).then((res) => {
      setRide(res.data.ride);
    });
  }, [rideId]);

  /* ================= SMOOTH DRIVER ================= */
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
    const socket = io(SOCKET_URL);
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

    return () => socket.disconnect();
  }, [rideId]);

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

  /* ================= STATUS TEXT ================= */
  const getStatus = () => {
    switch (ride.status) {
      case "searching": return "🔍 Searching Driver...";
      case "accepted": return "🚗 Driver is on the way";
      case "ongoing": return "🛣️ Ride in progress";
      case "completed": return "🎉 Ride Completed";
      default: return "Loading...";
    }
  };

  return (
    <div className="h-screen w-full relative 
    bg-gray-100 dark:bg-black transition">

      {/* MAP */}
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        zoom={15}
        center={driverPos || pickup}
        onLoad={(map) => (mapRef.current = map)}
        options={{ disableDefaultUI: true }}
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

      {/* 🔥 TOP STATUS */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 
        px-6 py-2 rounded-full 
        bg-white/70 dark:bg-gray-900/80 
        backdrop-blur-xl shadow text-sm font-semibold">

        {getStatus()}
      </div>

      {/* 🔥 BOTTOM PANEL */}
      <div className="absolute bottom-0 w-full 
        bg-white dark:bg-gray-900 
        rounded-t-3xl p-6 shadow-2xl">

        <h2 className="font-bold text-lg text-gray-900 dark:text-white">
          {ride.driver?.name || "Finding Driver..."}
        </h2>

        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <p>📍 {ride.pickupLocation.address}</p>
          <p>🏁 {ride.dropLocation.address}</p>
        </div>

        <div className="mt-4 flex justify-between items-center">
          <p className="text-green-600 text-xl font-bold">
            ₹ {ride.fare}
          </p>

          <button className="bg-red-500 hover:bg-red-600 
            text-white px-4 py-2 rounded-xl transition">
            Cancel
          </button>
        </div>

      </div>

    </div>
  );
}