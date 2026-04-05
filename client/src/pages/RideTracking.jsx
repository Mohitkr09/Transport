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

  const { isLoaded } = useGoogleMaps();

  const [ride, setRide] = useState(null);
  const [driverPos, setDriverPos] = useState(null);
  const [routePath, setRoutePath] = useState([]);

  /* ================= FETCH ================= */
  useEffect(() => {
    api.get(`/ride/${rideId}`).then(res => {
      setRide(res.data.ride);
    });
  }, [rideId]);

  /* ================= SOCKET ================= */
  useEffect(() => {

    const socket = io(SOCKET_URL, {
      auth: { token: localStorage.getItem("token") }
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("joinRide", rideId);
    });

    socket.on("rideAccepted", (data) => {
      setRide(prev => ({
        ...prev,
        status: "accepted",
        driver: data.driver
      }));
    });

    socket.on("rideStarted", () => {
      setRide(prev => ({ ...prev, status: "ongoing" }));
    });

    socket.on("rideCompleted", () => {
      setRide(prev => ({ ...prev, status: "completed" }));
    });

    /* 🔥 LIVE DRIVER MOVEMENT (SMOOTH + FOLLOW) */
    socket.on("driverMoved", ({ lat, lng }) => {

      setDriverPos(prev => {
        if (!prev) return { lat, lng };

        return {
          lat: prev.lat + (lat - prev.lat) * 0.2,
          lng: prev.lng + (lng - prev.lng) * 0.2
        };
      });

      // store path
      setRoutePath(prev => {
        const newPath = [...prev, { lat, lng }];
        return newPath.slice(-100); // limit points
      });

      // 🔥 AUTO FOLLOW DRIVER
      if (mapRef.current) {
        mapRef.current.panTo({ lat, lng });
      }
    });

    return () => socket.disconnect();

  }, [rideId]);

  /* ================= STATIC ROUTE (ONLY ONCE) ================= */
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
          const path = result.routes[0].overview_path.map(p => ({
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
    <div className="h-screen w-full relative">

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
              url: "https://cdn-icons-png.flaticon.com/512/743/743922.png",
              scaledSize: new window.google.maps.Size(40, 40)
            }}
          />
        )}

        {routePath.length > 1 && (
          <Polyline
            path={routePath}
            options={{
              strokeColor: "#4f46e5",
              strokeWeight: 5
            }}
          />
        )}
      </GoogleMap>

      {/* STATUS BAR */}
      <div className="absolute top-0 w-full p-4 bg-black/60 text-white">
        {ride.status === "accepted" && "🚗 Driver is coming"}
        {ride.status === "ongoing" && "🛣 Ride in progress"}
        {ride.status === "completed" && "✅ Ride completed"}
      </div>

      {/* BOTTOM PANEL */}
      <div className="absolute bottom-0 w-full bg-white p-5 rounded-t-3xl shadow-xl">

        <h2 className="font-bold text-lg">
          {ride.driver?.name || "Finding Driver..."}
        </h2>

        <p className="text-gray-500 text-sm mt-1">
          📍 {ride.pickupLocation.address}
        </p>

        <p className="text-gray-500 text-sm">
          🏁 {ride.dropLocation.address}
        </p>

        <p className="mt-2 text-indigo-600 font-bold text-lg">
          ₹ {ride.fare}
        </p>

      </div>
    </div>
  );
}