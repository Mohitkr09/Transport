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
const libraries = ["places"];

const containerStyle = {
  width: "100%",
  height: "100vh"
};

export default function RideTracking() {

  const { rideId } = useParams();
  const socketRef = useRef(null);

  const [ride, setRide] = useState(null);
  const [driverPos, setDriverPos] = useState(null);
  const [routePath, setRoutePath] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY,
    libraries
  });

  /* ================= FETCH ================= */

  const fetchRide = async () => {
    try {
      const res = await api.get(`/ride/${rideId}`);
      const data = res.data.ride;

      setRide(data);

      const c = data?.driverLocation?.coordinates;
      if (c) {
        setDriverPos({
          lat: c[1],
          lng: c[0]
        });
      }

    } catch (err) {
      console.error(err);
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

    socket.on("driverMoved", (data) => {
      setDriverPos(prev => {
        if (!prev) return data;

        return {
          lat: prev.lat + (data.lat - prev.lat) * 0.2,
          lng: prev.lng + (data.lng - prev.lng) * 0.2
        };
      });
    });

    socket.on("rideAccepted", (data) => {
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

    return () => socket.disconnect();

  }, [rideId]);

  /* ================= ROUTES API ================= */

  const decodePolyline = (encoded) => {
    let points = [];
    let index = 0, lat = 0, lng = 0;

    while (index < encoded.length) {
      let b, shift = 0, result = 0;

      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      lat += ((result & 1) ? ~(result >> 1) : (result >> 1));

      shift = 0;
      result = 0;

      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      lng += ((result & 1) ? ~(result >> 1) : (result >> 1));

      points.push({
        lat: lat / 1e5,
        lng: lng / 1e5
      });
    }

    return points;
  };

  const fetchRoute = async (origin, destination) => {
    try {
      const res = await fetch(
        "https://routes.googleapis.com/directions/v2:computeRoutes",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": import.meta.env.VITE_GOOGLE_MAPS_KEY,
            "X-Goog-FieldMask":
              "routes.polyline.encodedPolyline"
          },
          body: JSON.stringify({
            origin: {
              location: {
                latLng: {
                  latitude: origin.lat,
                  longitude: origin.lng
                }
              }
            },
            destination: {
              location: {
                latLng: {
                  latitude: destination.lat,
                  longitude: destination.lng
                }
              }
            },
            travelMode: "DRIVE"
          })
        }
      );

      const data = await res.json();

      if (!data.routes || !data.routes.length) return;

      const encoded = data.routes[0].polyline.encodedPolyline;

      setRoutePath(decodePolyline(encoded));

    } catch (err) {
      console.error("Route error:", err);
    }
  };

  useEffect(() => {
    if (driverPos && ride) {
      const pickup = {
        lat: ride.pickupLocation.location.coordinates[1],
        lng: ride.pickupLocation.location.coordinates[0]
      };

      fetchRoute(driverPos, pickup);
    }
  }, [driverPos]);

  /* ================= LOADING ================= */

  if (loading || !isLoaded) return <Loader />;
  if (!ride) return <Center>Ride not found</Center>;

  const pickup = {
    lat: ride.pickupLocation.location.coordinates[1],
    lng: ride.pickupLocation.location.coordinates[0]
  };

  const drop = {
    lat: ride.dropLocation.location.coordinates[1],
    lng: ride.dropLocation.location.coordinates[0]
  };

  const showDriver = ride.status !== "searching_driver";

  const statusText = {
    searching_driver: "🔍 Searching Driver...",
    accepted: "🚗 Driver On The Way",
    ongoing: "🛣 Ride In Progress",
    completed: "✅ Ride Completed"
  };

  /* ================= UI ================= */

  return (
    <div className="h-screen w-full relative">

      {ride.status === "searching_driver" && (
        <div className="absolute inset-0 bg-black/70 z-50 flex flex-col items-center justify-center text-white">
          <h2 className="text-2xl font-bold animate-pulse">
            🔍 Searching for driver...
          </h2>
        </div>
      )}

      <GoogleMap
        mapContainerStyle={containerStyle}
        center={pickup}
        zoom={14}
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

        {/* ✅ REAL ROAD ROUTE */}
        {routePath.length > 0 && (
          <Polyline
            path={routePath}
            options={{
              strokeColor: "#4f46e5",
              strokeWeight: 5
            }}
          />
        )}

      </GoogleMap>

      <div className="absolute top-0 w-full p-4 bg-black/60 text-white flex justify-between">
        <span className="flex items-center gap-2">
          <CheckCircle size={18} />
          {statusText[ride.status]}
        </span>
        {!connected && <WifiOff />}
      </div>

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

const Center = ({ children }) => (
  <div className="h-screen flex items-center justify-center">{children}</div>
);

const Loader = () => (
  <div className="h-screen flex items-center justify-center">
    Loading tracking...
  </div>
);