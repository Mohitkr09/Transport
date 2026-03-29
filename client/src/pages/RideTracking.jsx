import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import api from "../utils/api";
import { io } from "socket.io-client";
import { CheckCircle, MapPin, Phone, WifiOff, PhoneOff } from "lucide-react";
import Peer from "simple-peer/simplepeer.min.js";

import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMap
} from "react-leaflet";

import L from "leaflet";
import "leaflet/dist/leaflet.css";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

/* ================= ICONS ================= */

const driverIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [35, 35]
});

const nearbyDriverIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/854/854878.png",
  iconSize: [28, 28]
});

/* ================= MAP FIT ================= */

const FitBounds = ({ points }) => {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) map.fitBounds(points, { padding: [60, 60] });
  }, [points]);
  return null;
};

/* ================= MAIN ================= */

export default function RideTracking() {

  const { rideId } = useParams();

  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const streamRef = useRef(null);

  const [ride, setRide] = useState(null);
  const [driverPos, setDriverPos] = useState(null);
  const [nearbyDrivers, setNearbyDrivers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  const [incomingCall, setIncomingCall] = useState(null);
  const [callActive, setCallActive] = useState(false);

  /* ================= FETCH RIDE ================= */

  const fetchRide = async () => {
    try {
      const res = await api.get(`/ride/${rideId}`); // ✅ FIXED
      const data = res.data.ride;

      setRide(data);

      const c = data?.driverLocation?.coordinates;
      if (c) setDriverPos([c[1], c[0]]);

    } catch (err) {
      console.log(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRide();
  }, [rideId]);

  /* ================= SOCKET ================= */

  useEffect(() => {

    const token = localStorage.getItem("token");

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket"]
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("joinRide", rideId);
    });

    socket.on("disconnect", () => setConnected(false));

    /* 🔥 DRIVER MOVEMENT */
    socket.on("driverMoved", data => {
      if (!data?.lat) return;

      setDriverPos(prev => {
        if (!prev) return [data.lat, data.lng];
        return [
          prev[0] + (data.lat - prev[0]) * 0.3,
          prev[1] + (data.lng - prev[1]) * 0.3
        ];
      });
    });

    /* 🔥 DRIVER ACCEPTED */
    socket.on("rideAccepted", data => {
      if (data.rideId === rideId) {
        setRide(prev => ({
          ...prev,
          status: "accepted",
          driver: data.driver
        }));
      }
    });

    /* 🔥 RIDE START */
    socket.on("rideStarted", () => {
      setRide(prev => ({ ...prev, status: "ongoing" }));
    });

    /* 🔥 COMPLETE */
    socket.on("rideCompleted", () => {
      setRide(prev => ({ ...prev, status: "completed" }));
    });

    socket.on("nearbyDrivers", setNearbyDrivers);

    return () => socket.disconnect();

  }, [rideId]);

  /* ================= UI STATES ================= */

  if (loading) return <Skeleton />;
  if (!ride) return <Center>Ride not found</Center>;

  /* ================= COORDS ================= */

  const pickup = [
    ride.pickupLocation.location.coordinates[1],
    ride.pickupLocation.location.coordinates[0]
  ];

  const drop = [
    ride.dropLocation.location.coordinates[1],
    ride.dropLocation.location.coordinates[0]
  ];

  const path = driverPos ? [driverPos, pickup] : [];

  /* ================= STATUS FIXED ================= */

  const statusText = {
    searching_driver: "🔍 Searching Driver...",
    accepted: "🚗 Driver On The Way",
    ongoing: "🛣 Ride In Progress",
    completed: "✅ Ride Completed"
  };

  const canCall =
    ride.status === "accepted" || ride.status === "ongoing";

  /* ================= UI ================= */

  return (
    <div className="h-screen w-full relative">

      <MapContainer center={pickup} zoom={15} className="h-full">

        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>

        <Marker position={pickup}/>
        <Marker position={drop}/>

        {driverPos && <Marker position={driverPos} icon={driverIcon}/>}

        {nearbyDrivers.map(d => (
          <Marker key={d.socketId} position={[d.lat, d.lng]} icon={nearbyDriverIcon}/>
        ))}

        {path.length > 1 && <Polyline positions={path}/>}

        <FitBounds points={[pickup, drop, ...(driverPos ? [driverPos] : [])]}/>

      </MapContainer>

      <div className="absolute top-0 w-full p-4 text-white bg-black/60 flex justify-between">

        <h1 className="font-bold">
          <CheckCircle/> {statusText[ride.status]}
        </h1>

        {!connected && <WifiOff/>}

      </div>

      <div className="absolute bottom-0 w-full bg-white p-4 rounded-t-2xl">

        <h2 className="font-bold text-lg">
          {ride.driver?.name || "Assigning Driver..."}
        </h2>

        <p>{ride.pickupLocation.address}</p>
        <p>{ride.dropLocation.address}</p>

      </div>

    </div>
  );
}

/* ================= UI HELPERS ================= */

const Center = ({ children }) => (
  <div className="h-screen flex items-center justify-center">{children}</div>
);

const Skeleton = () => (
  <div className="h-screen flex items-center justify-center">
    Loading...
  </div>
);