import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import api from "../utils/api";
import { motion } from "framer-motion";
import { io } from "socket.io-client";
import {
  CheckCircle,
  MapPin,
  Phone,
  Clock,
  WifiOff,
  Navigation
} from "lucide-react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMap
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

// ================= FIT MAP =================
const FitBounds = ({ points }) => {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) map.fitBounds(points, { padding: [60, 60] });
  }, [points]);
  return null;
};

// ================= MAIN =================
export default function RideTracking() {
  const { rideId } = useParams();
  const socketRef = useRef();

  const [ride, setRide] = useState(null);
  const [driverPos, setDriverPos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  // ================= FETCH RIDE =================
  const fetchRide = async () => {
    try {
      const res = await api.get(`/api/ride/${rideId}`);
      setRide(res.data.ride);

      const c = res.data.ride?.driverLocation?.coordinates;
      if (c) setDriverPos([c[1], c[0]]);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchRide();
    const i = setInterval(fetchRide, 7000);
    return () => clearInterval(i);
  }, []);

  // ================= SOCKET =================
  useEffect(() => {
    socketRef.current = io(SOCKET_URL);

    socketRef.current.on("connect", () => setConnected(true));
    socketRef.current.on("disconnect", () => setConnected(false));

    socketRef.current.on("receiveLocation", d => {
      if (d?.lat) setDriverPos([d.lat, d.lng]);
    });

    return () => socketRef.current.disconnect();
  }, []);

  // ================= ETA =================
  const eta =
    driverPos && ride
      ? Math.max(
          1,
          Math.round(
            getDistance(
              driverPos[0],
              driverPos[1],
              ride.pickupLocation.location.coordinates[1],
              ride.pickupLocation.location.coordinates[0]
            ) / 0.4
          )
        )
      : null;

  if (loading) return <Skeleton />;
  if (!ride) return <Center>Ride not found</Center>;

  const pickup = [
    ride.pickupLocation.location.coordinates[1],
    ride.pickupLocation.location.coordinates[0]
  ];
  const drop = [
    ride.dropLocation.location.coordinates[1],
    ride.dropLocation.location.coordinates[0]
  ];

  const path = driverPos ? [driverPos, pickup] : [];

  return (
    <div className="h-screen w-full relative overflow-hidden">

      {/* MAP */}
      <MapContainer center={pickup} zoom={15} className="h-full w-full z-0">
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>

        <Marker position={pickup}/>
        <Marker position={drop}/>
        {driverPos && <Marker position={driverPos}/>}

        {path.length>1 && <Polyline positions={path}/>}
        <FitBounds points={[pickup, drop, ...(driverPos?[driverPos]:[])]}/>
      </MapContainer>

      {/* HEADER */}
      <div className="absolute top-0 w-full z-10 bg-gradient-to-b from-black/60 to-transparent p-5 text-white">
        <div className="flex justify-between">

          <div>
            <h1 className="text-xl font-bold flex gap-2 items-center">
              <CheckCircle className="text-green-400"/>
              Ride Confirmed
            </h1>
            <p className="text-sm opacity-80">
              {eta ? `Driver arriving in ${eta} min` : "Finding route..."}
            </p>
          </div>

          {!connected && (
            <div className="flex items-center gap-1 text-xs bg-red-500/80 px-3 py-1 rounded-full">
              <WifiOff size={14}/>
              reconnecting
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM SHEET */}
      <motion.div
        initial={{ y:200 }}
        animate={{ y:0 }}
        className="absolute bottom-0 w-full z-10 bg-white rounded-t-3xl shadow-2xl p-6 space-y-4"
      >

        {/* DRIVER */}
        <div className="flex justify-between items-center">

          <div className="flex gap-4 items-center">

            <div className="relative">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                {ride.driver?.name?.charAt(0)}
              </div>

              <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"/>
            </div>

            <div>
              <h2 className="font-semibold text-lg">{ride.driver?.name}</h2>
              <p className="text-sm text-gray-500">
                ⭐ {ride.driver?.rating || "4.8"} Rating
              </p>
            </div>

          </div>

          <button className="bg-green-500 text-white p-3 rounded-xl shadow">
            <Phone size={18}/>
          </button>
        </div>

        {/* ROUTE */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm">
          <Row text={ride.pickupLocation.address}/>
          <Row text={ride.dropLocation.address}/>
        </div>

        {/* PROGRESS */}
        <Progress status={ride.status}/>
      </motion.div>
    </div>
  );
}

// ================= PROGRESS =================
const Progress = ({ status }) => {
  const steps = ["requested","driver_assigned","accepted","ongoing","completed"];
  const index = steps.indexOf(status);

  return (
    <div className="flex justify-between pt-2">
      {steps.map((s,i)=>(
        <div key={s} className="flex flex-col items-center text-xs">
          <div className={`w-6 h-6 rounded-full ${
            i<=index ? "bg-indigo-600" : "bg-gray-300"
          }`}/>
          <span className="mt-1">{s.replace("_"," ")}</span>
        </div>
      ))}
    </div>
  );
};

// ================= UI SMALL =================
const Row = ({ text }) => (
  <div className="flex gap-3 items-center">
    <MapPin size={16}/>
    <span>{text}</span>
  </div>
);

const Center = ({ children }) => (
  <div className="h-screen flex items-center justify-center text-lg">
    {children}
  </div>
);

const Skeleton = () => (
  <div className="h-screen flex items-center justify-center text-gray-400 animate-pulse">
    Loading ride interface...
  </div>
);

// ================= DISTANCE =================
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2-lat1)*Math.PI/180;
  const dLon = (lon2-lon1)*Math.PI/180;

  const a =
    Math.sin(dLat/2)**2 +
    Math.cos(lat1*Math.PI/180)*
    Math.cos(lat2*Math.PI/180)*
    Math.sin(dLon/2)**2;

  return R * (2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)));
}