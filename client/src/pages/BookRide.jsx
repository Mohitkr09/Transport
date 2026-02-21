import React, { useState, useEffect, useRef } from "react";
import api from "../utils/api";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMap
} from "react-leaflet";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import "leaflet/dist/leaflet.css";

/* ======================================================
CONFIG
====================================================== */
const BASE = import.meta.env.VITE_API_URL;
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

/* ======================================================
VEHICLES
====================================================== */
import bikeImg from "../assets/services/bike.png";
import autoImg from "../assets/services/auto.png";
import cabImg from "../assets/services/cab-economy.png";

const vehicles = [
  { id: "bike", label: "Bike", img: bikeImg },
  { id: "auto", label: "Auto", img: autoImg },
  { id: "car", label: "Cab", img: cabImg }
];

/* ======================================================
MAP FIT
====================================================== */
const FitBounds = ({ route }) => {
  const map = useMap();
  useEffect(() => {
    if (route.length) map.fitBounds(route, { padding: [50, 50] });
  }, [route]);
  return null;
};

/* ======================================================
COMPONENT
====================================================== */
export default function BookRide() {

  const navigate = useNavigate();
  const socketRef = useRef(null);
  const debounceRef = useRef(null);
  const abortRef = useRef(null);

  const [pickup, setPickup] = useState("");
  const [drop, setDrop] = useState("");
  const [vehicleType, setVehicleType] = useState("auto");

  const [pickupCoords, setPickupCoords] = useState(null);
  const [dropCoords, setDropCoords] = useState(null);

  const [route, setRoute] = useState([]);
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);
  const [fare, setFare] = useState(null);

  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [dropSuggestions, setDropSuggestions] = useState([]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [driverPosition, setDriverPosition] = useState(null);

  /* ======================================================
  WAKE BACKEND (RENDER SLEEP FIX)
  ====================================================== */
  useEffect(() => {
    fetch(`${BASE}/api/ride/health`).catch(() => {});
  }, []);

  /* ======================================================
  SOCKET
  ====================================================== */
  useEffect(() => {
    socketRef.current = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1500
    });

    socketRef.current.on("connect", () =>
      console.log("🟢 socket connected")
    );

    socketRef.current.on("receiveLocation", data => {
      if (data?.lat && data?.lng)
        setDriverPosition([data.lat, data.lng]);
    });

    return () => socketRef.current?.disconnect();
  }, []);

  /* ======================================================
  SEARCH SUGGESTIONS
  ====================================================== */
  const fetchSuggestions = (query, setter) => {

    if (query.length < 3) return setter([]);

    clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {

        abortRef.current?.abort();
        abortRef.current = new AbortController();

        const res = await api.get(`/api/location/search?q=${query}`, {
          signal: abortRef.current.signal
        });

        setter(res.data || []);

      } catch {
        setter([]);
      }
    }, 350);
  };

  /* ======================================================
  ROUTE CALCULATION
  ====================================================== */
  const drawRoute = async (start, end) => {
    try {
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`
      );

      const data = await res.json();
      const r = data.routes?.[0];
      if (!r) return null;

      const coords = r.geometry.coordinates.map(([lng, lat]) => [lat, lng]);

      const km = r.distance / 1000;
      const mins = r.duration / 60;

      setRoute(coords);
      setDistance(km.toFixed(2));
      setDuration(mins.toFixed(1));
      setFare(Math.round(km * 15));

      return km;

    } catch {
      return null;
    }
  };

  /* ======================================================
  BOOK RIDE
  ====================================================== */
  const handleBookRide = async () => {

    if (loading) return;

    if (!localStorage.getItem("token"))
      return setMessage("Please login first");

    if (!pickupCoords || !dropCoords)
      return setMessage("Select valid locations");

    try {
      setLoading(true);
      setMessage("Calculating route...");

      const km = await drawRoute(pickupCoords, dropCoords);
      if (!km) return setMessage("Route calculation failed");

      setMessage("Finding nearby driver...");

      const res = await api.post("/api/ride", {
        pickupLocation: { address: pickup, ...pickupCoords },
        dropLocation: { address: drop, ...dropCoords },
        vehicleType,
        distance: km
      });

      if (!res.data?.success)
        return setMessage(res.data?.message || "Ride failed");

      const rideId = res.data.ride?._id;

      if (!rideId)
        return setMessage("Ride creation failed");

      setMessage("Driver assigned 🚖");

      setTimeout(() => navigate(`/payment/${rideId}`), 1200);

    } catch (err) {

      if (err.response?.status === 404)
        setMessage("No drivers nearby. Retrying...");

      else
        setMessage(err.response?.data?.message || "Server busy");

    } finally {
      setLoading(false);
    }
  };

  /* ======================================================
  UI
  ====================================================== */
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-100">

      {/* LEFT PANEL */}
      <div className="w-full md:w-1/2 p-6 bg-white shadow">

        <h2 className="text-2xl font-bold mb-5">Book a Ride</h2>

        {/* PICKUP */}
        <input
          className="w-full p-3 rounded border"
          placeholder="Pickup location"
          value={pickup}
          onChange={e=>{
            setPickup(e.target.value);
            fetchSuggestions(e.target.value,setPickupSuggestions);
          }}
        />

        {pickupSuggestions.map(p=>(
          <div key={p.place_id}
            className="p-2 cursor-pointer hover:bg-gray-100"
            onClick={()=>{
              setPickup(p.display_name);
              setPickupCoords({lat:+p.lat,lng:+p.lon});
              setPickupSuggestions([]);
            }}>
            {p.display_name}
          </div>
        ))}

        {/* DROP */}
        <input
          className="w-full p-3 mt-4 rounded border"
          placeholder="Drop location"
          value={drop}
          onChange={e=>{
            setDrop(e.target.value);
            fetchSuggestions(e.target.value,setDropSuggestions);
          }}
        />

        {dropSuggestions.map(p=>(
          <div key={p.place_id}
            className="p-2 cursor-pointer hover:bg-gray-100"
            onClick={()=>{
              setDrop(p.display_name);
              setDropCoords({lat:+p.lat,lng:+p.lon});
              setDropSuggestions([]);
            }}>
            {p.display_name}
          </div>
        ))}

        {/* VEHICLES */}
        <h4 className="mt-4 mb-3 font-semibold">Select Vehicle</h4>

        <div className="grid grid-cols-3 gap-4">
          {vehicles.map(v=>(
            <div key={v.id}
              onClick={()=>setVehicleType(v.id)}
              className={`cursor-pointer rounded-xl p-3 border text-center ${
                vehicleType===v.id
                  ?"border-indigo-600 bg-indigo-50"
                  :"bg-gray-50"
              }`}>
              <img src={v.img} className="h-16 mx-auto mb-2"/>
              <p className="text-sm font-semibold">{v.label}</p>
            </div>
          ))}
        </div>

        {/* BUTTON */}
        <button
          onClick={handleBookRide}
          disabled={loading}
          className="w-full mt-6 bg-indigo-600 text-white py-3 rounded-xl"
        >
          {loading ? "Processing..." : "Book Ride & Pay"}
        </button>

        {/* INFO */}
        {distance && (
          <div className="mt-4 p-4 bg-gray-100 rounded-lg">
            <p>Distance: {distance} km</p>
            <p>Duration: {duration} mins</p>
            <p className="font-bold text-indigo-600">Fare: ₹{fare}</p>
          </div>
        )}

        {message && <p className="mt-3 font-semibold">{message}</p>}
      </div>

      {/* MAP */}
      <div className="w-full md:w-1/2 h-[400px] md:h-auto">
        <MapContainer center={[23.0225,72.5714]} zoom={6} className="h-full w-full">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>

          {pickupCoords && <Marker position={[pickupCoords.lat,pickupCoords.lng]}/>}
          {dropCoords && <Marker position={[dropCoords.lat,dropCoords.lng]}/>}
          {driverPosition && <Marker position={driverPosition}/>}

          {route.length>0 &&
            <Polyline positions={route} pathOptions={{color:"#4f46e5",weight:5}}/>
          }

          <FitBounds route={route}/>
        </MapContainer>
      </div>

    </div>
  );
}