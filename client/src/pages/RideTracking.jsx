import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import api from "../utils/api";
import { motion } from "framer-motion";
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

/* ================= DRIVER ICON ================= */

const driverIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [35, 35],
  iconAnchor: [17, 35]
});

const nearbyDriverIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/854/854878.png",
  iconSize: [28, 28],
  iconAnchor: [14, 28]
});

/* ================= FIT MAP ================= */

const FitBounds = ({ points }) => {
  const map = useMap();

  useEffect(() => {
    if (points.length > 1)
      map.fitBounds(points, { padding: [60, 60] });
  }, [points, map]);

  return null;
};

/* ================= MAIN ================= */

export default function RideTracking() {

  const { rideId } = useParams();

  const socketRef = useRef(null);
  const pollRef = useRef(null);
  const peerRef = useRef(null);
  const streamRef = useRef(null);

  const [ride, setRide] = useState(null);
  const [driverPos, setDriverPos] = useState(null);
  const [nearbyDrivers, setNearbyDrivers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  const [incomingCall, setIncomingCall] = useState(null);
  const [callActive, setCallActive] = useState(false);

  /* ======================================================
  INIT MICROPHONE
  ====================================================== */

  useEffect(() => {

    const initMic = async () => {

      try {

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true
        });

        streamRef.current = stream;

      } catch (err) {

        console.error("Microphone permission denied:", err);

      }

    };

    initMic();

  }, []);

  /* ======================================================
  FETCH RIDE
  ====================================================== */

  const fetchRide = async () => {

    try {

      const res = await api.get(`/api/ride/${rideId}`);
      const data = res.data.ride;

      setRide(data);

      const c = data?.driverLocation?.coordinates;

      if (c) setDriverPos([c[1], c[0]]);

    } catch (err) {

      console.log("Fetch ride error:", err.message);

    } finally {

      setLoading(false);

    }

  };

  /* ======================================================
  POLLING
  ====================================================== */

  useEffect(() => {

    fetchRide();

    pollRef.current = setInterval(fetchRide, 10000);

    return () => clearInterval(pollRef.current);

  }, [rideId]);

  /* ======================================================
  SOCKET
  ====================================================== */

  useEffect(() => {

    const token = localStorage.getItem("token");
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket"],
      reconnection: true
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("joinRide", rideId);
    });

    socket.on("disconnect", () => setConnected(false));

    socket.on("driverMoved", data => {

      if (!data?.lat) return;

      setDriverPos(prev => {

        if (!prev) return [data.lat, data.lng];

        return [
          prev[0] + (data.lat - prev[0]) * 0.35,
          prev[1] + (data.lng - prev[1]) * 0.35
        ];

      });

    });

    socket.on("nearbyDrivers", setNearbyDrivers);

    /* ================= CALL EVENTS ================= */

    socket.on("incomingCall", ({ signal }) => {
      setIncomingCall(signal);
    });

    socket.on("callAccepted", signal => {
      peerRef.current?.signal(signal);
    });

    socket.on("callEnded", endCall);

    return () => socket.disconnect();

  }, [rideId]);

  /* ======================================================
  START CALL
  ====================================================== */

  const startCall = async () => {

    try {

      if (!streamRef.current) {

        streamRef.current =
          await navigator.mediaDevices.getUserMedia({ audio: true });

      }

      const peer = new Peer({
        initiator: true,
        trickle: false,
        stream: streamRef.current
      });

      peer.on("signal", signal => {

        socketRef.current.emit("callUser", {
          rideId,
          signal
        });

      });

      peer.on("stream", remoteStream => {

        const audio = new Audio();
        audio.srcObject = remoteStream;
        audio.play();

      });

      peer.on("error", err => {
        console.error("Peer error:", err);
      });

      peerRef.current = peer;
      setCallActive(true);

    } catch (err) {

      console.error("Call start failed:", err);

    }

  };

  /* ======================================================
  ACCEPT CALL
  ====================================================== */

  const acceptCall = () => {

    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: streamRef.current
    });

    peer.on("signal", signal => {

      socketRef.current.emit("acceptCall", {
        rideId,
        signal
      });

    });

    peer.on("stream", remoteStream => {

      const audio = new Audio();
      audio.srcObject = remoteStream;
      audio.play();

    });

    peer.signal(incomingCall);

    peerRef.current = peer;

    setIncomingCall(null);
    setCallActive(true);

  };

  /* ======================================================
  END CALL
  ====================================================== */

  const endCall = () => {

    if (peerRef.current) {

      peerRef.current.destroy();
      peerRef.current = null;

    }

    setCallActive(false);

    socketRef.current?.emit("endCall", rideId);

  };

  /* ======================================================
  UI STATES
  ====================================================== */

  if (loading) return <Skeleton />;
  if (!ride) return <Center>Ride not found</Center>;

  /* ======================================================
  COORDS
  ====================================================== */

  const pickup = [
    ride.pickupLocation.location.coordinates[1],
    ride.pickupLocation.location.coordinates[0]
  ];

  const drop = [
    ride.dropLocation.location.coordinates[1],
    ride.dropLocation.location.coordinates[0]
  ];

  const path = driverPos ? [driverPos, pickup] : [];

  const canCall =
    ride.status === "driver_assigned" ||
    ride.status === "accepted" ||
    ride.status === "ongoing";

  const statusText = {
    requested: "Searching Driver...",
    driver_assigned: "Driver Assigned",
    accepted: "Driver On The Way",
    ongoing: "Ride In Progress",
    completed: "Ride Completed"
  };

  /* ======================================================
  UI
  ====================================================== */

  return (

    <div className="h-screen w-full relative overflow-hidden">

      <MapContainer center={pickup} zoom={15} className="h-full w-full z-0">

        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>

        <Marker position={pickup}/>
        <Marker position={drop}/>

        {driverPos &&
          <Marker position={driverPos} icon={driverIcon}/>
        }

        {nearbyDrivers.map(d => (
          <Marker
            key={d.socketId}
            position={[d.lat, d.lng]}
            icon={nearbyDriverIcon}
          />
        ))}

        {path.length > 1 &&
          <Polyline
            positions={path}
            pathOptions={{ color: "#6366f1", weight: 4 }}
          />
        }

        <FitBounds points={[pickup, drop, ...(driverPos ? [driverPos] : [])]}/>

      </MapContainer>

      <div className="absolute top-0 w-full z-10 bg-gradient-to-b from-black/70 to-transparent p-5 text-white">

        <div className="flex justify-between">

          <h1 className="text-xl font-bold flex gap-2 items-center">
            <CheckCircle className="text-green-400"/>
            {statusText[ride.status]}
          </h1>

          {!connected &&
            <div className="flex items-center gap-1 text-xs bg-red-500 px-3 py-1 rounded-full">
              <WifiOff size={14}/> reconnecting
            </div>
          }

        </div>

      </div>

      {/* CALL POPUP */}

      {incomingCall && (

        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50">

          <div className="bg-white rounded-xl p-6 text-center space-y-4">

            <h2 className="text-lg font-semibold">
              Incoming Call
            </h2>

            <div className="flex gap-4 justify-center">

              <button
                onClick={acceptCall}
                className="bg-green-500 text-white px-5 py-2 rounded-lg"
              >
                Accept
              </button>

              <button
                onClick={()=>setIncomingCall(null)}
                className="bg-red-500 text-white px-5 py-2 rounded-lg"
              >
                Decline
              </button>

            </div>

          </div>

        </div>

      )}

      <motion.div
        initial={{ y:200 }}
        animate={{ y:0 }}
        className="absolute bottom-0 w-full z-10 bg-white rounded-t-3xl shadow-2xl p-6 space-y-4"
      >

        <div className="flex justify-between items-center">

          <div className="flex gap-4 items-center">

            <div className="w-14 h-14 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">
              {ride.driver?.name?.charAt(0) || "D"}
            </div>

            <div>
              <h2 className="font-semibold text-lg">
                {ride.driver?.name || "Assigning Driver..."}
              </h2>
              <p className="text-sm text-gray-500">
                ⭐ {ride.driver?.rating || "4.8"}
              </p>
            </div>

          </div>

          <div className="flex gap-2">

            {!callActive && canCall && (
              <button
                onClick={startCall}
                className="p-3 rounded-xl bg-green-500 hover:bg-green-600 text-white shadow"
              >
                <Phone size={18}/>
              </button>
            )}

            {callActive && (
              <button
                onClick={endCall}
                className="p-3 rounded-xl bg-red-500 hover:bg-red-600 text-white shadow"
              >
                <PhoneOff size={18}/>
              </button>
            )}

          </div>

        </div>

        <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm">

          <Row text={ride.pickupLocation.address}/>
          <Row text={ride.dropLocation.address}/>

        </div>

        <Progress status={ride.status}/>

      </motion.div>

    </div>

  );

}



const Progress = ({ status }) => {

  const steps = ["requested","driver_assigned","accepted","ongoing","completed"];
  const index = steps.indexOf(status);

  return (

    <div className="flex justify-between pt-2">

      {steps.map((s,i)=>(
        <div key={s} className="flex flex-col items-center text-xs">
          <div className={`w-6 h-6 rounded-full ${i<=index?"bg-indigo-600":"bg-gray-300"}`}/>
          <span className="mt-1">{s.replace("_"," ")}</span>
        </div>
      ))}

    </div>

  );

};

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