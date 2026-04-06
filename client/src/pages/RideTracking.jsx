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

  const [rideStep, setRideStep] = useState(0);

  /* ================= FETCH ================= */
  useEffect(() => {
    api.get(`/ride/${rideId}`).then((res) => {
      setRide(res.data.ride);
    });
  }, [rideId]);

  /* ================= SOCKET ================= */
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("joinRide", rideId);
    });

    socket.on("rideAccepted", (data) => {
      setRide((prev) => ({
        ...prev,
        status: "accepted",
        driver: data.driver
      }));
      setRideStep(1);
    });

    socket.on("driverArrived", () => {
      setRideStep(2);
    });

    socket.on("rideStarted", () => {
      setRide((prev) => ({ ...prev, status: "ongoing" }));
      setRideStep(3);
    });

    socket.on("rideCompleted", () => {
      setRide((prev) => ({ ...prev, status: "completed" }));
      setRideStep(4);
    });

    socket.on("paymentDone", () => {
      setRideStep(5);
    });

    /* 🔥 LIVE DRIVER MOVEMENT */
    socket.on("driverMoved", ({ lat, lng }) => {
      setDriverPos((prev) => {
        if (!prev) return { lat, lng };

        return {
          lat: prev.lat + (lat - prev.lat) * 0.2,
          lng: prev.lng + (lng - prev.lng) * 0.2
        };
      });

      setRoutePath((prev) => [...prev, { lat, lng }]);

      if (mapRef.current) {
        mapRef.current.panTo({ lat, lng });
      }
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

  const steps = [
    "Driver Assigned",
    "Driver Arrived",
    "Ride Started",
    "Ride Completed",
    "Payment Done"
  ];

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

      {/* TOP STATUS */}
      <div className="absolute top-0 w-full p-4 bg-black/60 text-white text-center font-semibold">
        {steps[rideStep - 1] || "Finding Driver..."}
      </div>

      {/* STEP PROGRESS */}
      <div className="absolute top-16 w-full flex justify-center">
        <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-full shadow-lg">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center">
              <div
                className={`w-4 h-4 rounded-full ${
                  rideStep > index ? "bg-green-500" : "bg-gray-300"
                }`}
              />
              {index < steps.length - 1 && (
                <div className="w-8 h-[2px] bg-gray-300" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* BOTTOM PANEL */}
      <div className="absolute bottom-0 w-full bg-white p-5 rounded-t-3xl shadow-xl">
        <h2 className="font-bold text-lg">
          {ride.driver?.name || "Searching Driver..."}
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