import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import api from "../utils/api";
import { io } from "socket.io-client";
import { CheckCircle, WifiOff } from "lucide-react";
import {
  GoogleMap,
  Marker,
  Polyline,
  useJsApiLoader
} from "@react-google-maps/api";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

export default function RideTracking() {

  const { rideId } = useParams();
  const socketRef = useRef(null);

  const [ride, setRide] = useState(null);
  const [driverPos, setDriverPos] = useState(null);
  const [routePath, setRoutePath] = useState([]);
  const [connected, setConnected] = useState(false);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY
  });

  /* ================= FETCH ================= */

  const fetchRide = async () => {
    try {
      const res = await api.get(`/ride/${rideId}`);
      const data = res.data.ride;

      setRide(data);

      const c = data?.driverLocation?.coordinates;
      if (c) {
        setDriverPos({ lat: c[1], lng: c[0] });
      }

    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    fetchRide();
  }, [rideId]);

  /* 🔥 AUTO SYNC */
  useEffect(() => {
    const interval = setInterval(fetchRide, 4000);
    return () => clearInterval(interval);
  }, []);

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

    /* ✅ FIXED ACCEPT EVENT */
    socket.on("rideAccepted", (data) => {
      console.log("✅ rideAccepted:", data);

      if (data.rideId === rideId) {
        setRide(prev => ({
          ...prev,
          status: "accepted",
          driver: data.driver
        }));
      }
    });

    socket.on("rideStarted", () => {
      setRide(prev => ({ ...prev, status: "ongoing" }));
    });

    socket.on("rideCompleted", () => {
      setRide(prev => ({ ...prev, status: "completed" }));
    });

    /* DRIVER LIVE LOCATION */
    socket.on("driverMoved", ({ lat, lng }) => {
      setDriverPos(prev => {
        if (!prev) return { lat, lng };

        return {
          lat: prev.lat + (lat - prev.lat) * 0.3,
          lng: prev.lng + (lng - prev.lng) * 0.3
        };
      });
    });

    return () => socket.disconnect();

  }, [rideId]);

  /* ================= ROUTE ================= */

  useEffect(() => {
    if (!driverPos || !ride) return;

    const pickup = {
      lat: ride.pickupLocation.location.coordinates[1],
      lng: ride.pickupLocation.location.coordinates[0]
    };

    const directionsService = new window.google.maps.DirectionsService();

    directionsService.route(
      {
        origin: driverPos,
        destination: pickup,
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

  }, [driverPos, ride]);

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

  const statusText = {
    searching_driver: "🔍 Finding nearby driver...",
    accepted: "🚗 Driver is coming",
    ongoing: "🛣 Ride started",
    completed: "✅ Ride completed"
  };

  return (
    <div className="h-screen w-full relative">

      {/* SEARCHING */}
      {ride.status === "searching_driver" && (
        <div className="absolute inset-0 bg-black/70 z-50 flex items-center justify-center text-white text-xl">
          🔍 Searching for driver...
        </div>
      )}

      <GoogleMap mapContainerStyle={{ width: "100%", height: "100%" }} zoom={14} center={pickup}>
        <Marker position={pickup} />
        <Marker position={drop} />

        {showDriver && driverPos && (
          <Marker
            position={driverPos}
            icon={{ url: "https://maps.google.com/mapfiles/ms/icons/cab.png" }}
          />
        )}

        {routePath.length > 0 && (
          <Polyline path={routePath} options={{ strokeColor: "#4f46e5", strokeWeight: 5 }} />
        )}
      </GoogleMap>

      {/* TOP BAR */}
      <div className="absolute top-0 w-full p-4 bg-black/60 text-white flex justify-between">
        <span className="flex items-center gap-2">
          <CheckCircle size={18} />
          {statusText[ride.status]}
        </span>
        {!connected && <WifiOff />}
      </div>

      {/* BOTTOM PANEL */}
      <div className="absolute bottom-0 w-full bg-white p-4 rounded-t-2xl shadow-lg">
        <h2 className="font-bold text-lg">
          {ride.driver?.name || "Assigning Driver..."}
        </h2>

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

/* HELPERS */
const Loader = () => (
  <div className="h-screen flex items-center justify-center">
    Loading tracking...
  </div>
);