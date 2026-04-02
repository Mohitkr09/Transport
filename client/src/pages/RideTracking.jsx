import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import api from "../utils/api";
import { io } from "socket.io-client";

import { useGoogleMaps } from "../config/googleMaps";

import {
  GoogleMap,
  Marker,
  Polyline
} from "@react-google-maps/api";

import { CheckCircle, WifiOff } from "lucide-react";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

export default function RideTracking() {

  const { rideId } = useParams();
  const socketRef = useRef(null);

  const { isLoaded, loadError } = useGoogleMaps();

  const [ride, setRide] = useState(null);
  const [driverPos, setDriverPos] = useState(null);
  const [routePath, setRoutePath] = useState([]);
  const [connected, setConnected] = useState(false);

  /* ================= FETCH (ONLY ONCE) ================= */

  const fetchRide = async () => {
    try {
      const res = await api.get(`/ride/${rideId}`);
      const data = res.data.ride;

      setRide(data);

      if (data?.driverLocation?.coordinates) {
        const [lng, lat] = data.driverLocation.coordinates;
        setDriverPos({ lat, lng });
      }

    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    fetchRide();
  }, [rideId]);

  /* ================= SOCKET ================= */

  useEffect(() => {

    const socket = io(SOCKET_URL, {
      auth: { token: localStorage.getItem("token") },
      transports: ["websocket", "polling"]
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("joinRide", rideId);
    });

    socket.on("disconnect", () => setConnected(false));

    /* 🔥 DRIVER ACCEPTED */
    socket.on("rideAccepted", (data) => {
      if (data.rideId !== rideId) return;

      setRide(prev => ({
        ...prev,
        status: "accepted",
        driver: data.driver
      }));
    });

    /* 🔥 RIDE START */
    socket.on("rideStarted", () => {
      setRide(prev => ({ ...prev, status: "ongoing" }));
    });

    /* 🔥 RIDE COMPLETE */
    socket.on("rideCompleted", () => {
      setRide(prev => ({ ...prev, status: "completed" }));
    });

    /* 🔥 LIVE DRIVER MOVEMENT */
    socket.on("driverMoved", ({ lat, lng }) => {

      setDriverPos(prev => {
        if (!prev) return { lat, lng };

        // smooth animation
        return {
          lat: prev.lat + (lat - prev.lat) * 0.3,
          lng: prev.lng + (lng - prev.lng) * 0.3
        };
      });

      // 🔥 store path (polyline)
      setRoutePath(prev => [...prev, { lat, lng }]);
    });

    return () => socket.disconnect();

  }, [rideId]);

  /* ================= GOOGLE ROUTE (OPTIONAL SMOOTH) ================= */

  useEffect(() => {
    if (!driverPos || !ride || !window.google) return;

    const pickup = {
      lat: ride.pickupLocation.location.coordinates[1],
      lng: ride.pickupLocation.location.coordinates[0]
    };

    const drop = {
      lat: ride.dropLocation.location.coordinates[1],
      lng: ride.dropLocation.location.coordinates[0]
    };

    const destination =
      ride.status === "ongoing" ? drop : pickup;

    const service = new window.google.maps.DirectionsService();

    service.route(
      {
        origin: driverPos,
        destination,
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

  }, [driverPos, ride?.status]);

  /* ================= UI ================= */

  if (loadError) return <p className="text-red-500">Map failed to load</p>;
  if (!ride || !isLoaded) return <Loader />;

  const pickup = {
    lat: ride.pickupLocation.location.coordinates[1],
    lng: ride.pickupLocation.location.coordinates[0]
  };

  const drop = {
    lat: ride.dropLocation.location.coordinates[1],
    lng: ride.dropLocation.location.coordinates[0]
  };

  const showDriver = ["accepted", "ongoing", "completed"].includes(ride.status);

  return (
    <div className="h-screen w-full relative">

      {/* 🔥 SEARCH OVERLAY (FIXED) */}
      {ride.status === "searching" && (
        <div className="absolute inset-0 bg-black/70 z-50 flex items-center justify-center text-white text-xl">
          🔍 Finding nearest driver...
        </div>
      )}

      {/* MAP */}
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        zoom={14}
        center={driverPos || pickup}
      >
        <Marker position={pickup} />
        <Marker position={drop} />

        {showDriver && driverPos && (
          <Marker
            position={driverPos}
            icon={{
              url: "https://maps.google.com/mapfiles/ms/icons/cab.png"
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

      {/* TOP BAR */}
      <div className="absolute top-0 w-full p-4 bg-black/60 text-white flex justify-between">
        <span className="flex items-center gap-2">
          <CheckCircle size={18} />
          {ride.status === "accepted" && "Driver is coming 🚗"}
          {ride.status === "ongoing" && "Ride in progress 🛣"}
          {ride.status === "completed" && "Ride completed ✅"}
        </span>
        {!connected && <WifiOff />}
      </div>

      {/* DRIVER PANEL */}
      <div className="absolute bottom-0 w-full bg-white p-4 rounded-t-2xl shadow-lg">
        <h2 className="font-bold text-lg">
          {ride.driver?.name || "Assigning Driver..."}
        </h2>

        {ride.status === "accepted" && (
          <p className="text-green-600 text-sm">
            ✔ Driver accepted your ride
          </p>
        )}

        <p className="text-sm text-gray-500 mt-1">
          📍 {ride.pickupLocation.address}
        </p>

        <p className="text-sm text-gray-500">
          🏁 {ride.dropLocation.address}
        </p>

        <p className="mt-2 text-indigo-600 font-semibold">
          ₹ {ride.fare}
        </p>
      </div>

    </div>
  );
}

/* ================= LOADER ================= */

const Loader = () => (
  <div className="h-screen flex items-center justify-center">
    Loading tracking...
  </div>
);