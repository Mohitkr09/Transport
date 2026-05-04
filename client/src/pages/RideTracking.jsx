import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../utils/api";
import { io } from "socket.io-client";
import { useGoogleMaps } from "../config/googleMaps";
import { GoogleMap, Marker, Polyline } from "@react-google-maps/api";
import toast, { Toaster } from "react-hot-toast";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#1e293b" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#cbd5f5" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#020617" }] }
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

  const [rideStatus, setRideStatus] = useState("accepted");

  const steps = [
    { key: "accepted", label: "Accepted" },
    { key: "arrived", label: "Arrived" },
    { key: "started", label: "Started" },
    { key: "completed", label: "Completed" },
    { key: "paid", label: "Paid" }
  ];

  const activeIndex = steps.findIndex((s) => s.key === rideStatus);

  /* ================= THEME ================= */
  useEffect(() => {
    const updateTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    updateTheme();

    const observer = new MutationObserver(updateTheme);
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
      setRideStatus(res.data.ride.status || "accepted");
    });
  }, [rideId]);

  /* ================= ROTATION ================= */
  const getBearing = (start, end) => {
    const lat1 = (start.lat * Math.PI) / 180;
    const lat2 = (end.lat * Math.PI) / 180;
    const dLon = ((end.lng - start.lng) * Math.PI) / 180;

    const y = Math.sin(dLon) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

    let brng = Math.atan2(y, x);
    brng = (brng * 180) / Math.PI;
    return (brng + 360) % 360;
  };

  /* ================= ANIMATION ================= */
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
      setTrail((prev) => [...prev.slice(-40), newPos]);

      const angle = getBearing(start, end);
      setHeading((prev) => prev + (angle - prev) * 0.15);

      mapRef.current?.panTo(newPos);
      mapRef.current?.setZoom(17);

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

    socket.emit("joinRide", rideId);

    socket.on("driverMoved", ({ lat, lng }) => {
      setDriverPos((prev) => {
        if (!prev) return { lat, lng };
        animateDriver(prev, { lat, lng });
        return prev;
      });
    });

    socket.on("rideAccepted", () => setRideStatus("accepted"));
    socket.on("driverArrived", () => setRideStatus("arrived"));
    socket.on("rideStarted", () => setRideStatus("started"));
    socket.on("rideCompleted", () => setRideStatus("completed"));
    socket.on("paymentDone", () => setRideStatus("paid"));

    socket.on("rideCancelled", () => navigate("/"));

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
      { origin: pickup, destination: drop, travelMode: "DRIVING" },
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

      <div className={`h-screen w-full relative ${isDark ? "bg-gray-900" : "bg-gray-100"}`}>

        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "100%" }}
          zoom={15}
          center={driverPos || pickup}
          onLoad={(map) => (mapRef.current = map)}
          options={{ disableDefaultUI: true, styles: isDark ? darkMapStyle : [] }}
        >
          <Marker position={pickup} />
          <Marker position={drop} />

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

          {routePath.length > 1 && (
            <Polyline path={routePath} options={{ strokeColor: "#22c55e", strokeWeight: 6 }} />
          )}

          {trail.length > 1 && (
            <Polyline path={trail} options={{ strokeColor: "#3b82f6", strokeWeight: 4 }} />
          )}
        </GoogleMap>

        {/* PANEL */}
        <div className={`absolute bottom-0 w-full rounded-t-3xl p-5 backdrop-blur-xl border-t
        ${isDark ? "bg-gray-900/80 border-indigo-500/40 text-white" : "bg-white/90 border-gray-200 text-gray-900"}`}>

          <h2 className="font-bold text-lg mb-4">{ride.driver?.name}</h2>

          {/* STEP TRACKER */}
          <div className="flex items-center justify-between mb-5">
            {steps.map((step, i) => (
              <div key={step.key} className="flex-1 flex flex-col items-center relative">

                <div className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold
                ${i <= activeIndex ? "bg-green-500 text-white scale-110" : "bg-yellow-300 text-white"}`}>
                  {i + 1}
                </div>

                <span className="text-[10px] mt-1 text-center w-16">
                  {step.label}
                </span>

                {i !== steps.length - 1 && (
                  <div className={`absolute top-4 left-1/2 w-full h-[2px]
                  ${i < activeIndex ? "bg-green-500" : "bg-gray-400"}`} />
                )}
              </div>
            ))}
          </div>

          <p className="text-sm">📍 {ride.pickupLocation.address}</p>
          <p className="text-sm">🏁 {ride.dropLocation.address}</p>

          <div className="flex justify-between items-center mt-4">
            <p className="text-green-400 font-bold text-xl">₹ {ride.fare}</p>

            {rideStatus !== "completed" && (
              <button
                onClick={() => {
                  socketRef.current.emit("cancelRide", { rideId });
                  navigate("/");
                }}
                className="bg-red-500 text-white px-4 py-2 rounded-xl"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}