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
MAP FIT BOUNDS
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

  /* ================= STATE ================= */
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
  WAKE SERVER (RENDER FIX)
  ====================================================== */
  useEffect(() => {
    fetch(`${BASE}/api/ride/health`).catch(() => {});
  }, []);

  /* ======================================================
  SOCKET CONNECTION
  ====================================================== */
  useEffect(() => {
    socketRef.current = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1500
    });

    socketRef.current.on("receiveLocation", data => {
      if (data?.lat && data?.lng)
        setDriverPosition([data.lat, data.lng]);
    });

    return () => socketRef.current?.disconnect();
  }, []);

  /* ======================================================
  LOCATION SEARCH (SAFE + DEBOUNCED)
  ====================================================== */
  const fetchSuggestions = (query, setter) => {
    if (!query || query.length < 3) return setter([]);

    clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        abortRef.current?.abort();
        abortRef.current = new AbortController();

        const res = await api.get(`/api/location/search?q=${query}`, {
          signal: abortRef.current.signal
        });

        setter(Array.isArray(res.data?.results) ? res.data.results : []);
      } catch {
        setter([]);
      }
    }, 400);
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
      setMessage(
        err.response?.data?.message ||
        (err.response?.status === 404
          ? "No drivers nearby"
          : "Server busy")
      );
    } finally {
      setLoading(false);
    }
  };

  /* ======================================================
  UI
  ====================================================== */
  return (
    <div className="h-screen w-full relative overflow-hidden">

      {/* ================= MAP ================= */}
      <MapContainer
        center={[23.0225,72.5714]}
        zoom={6}
        className="absolute inset-0 z-0"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {pickupCoords && <Marker position={[pickupCoords.lat,pickupCoords.lng]} />}
        {dropCoords && <Marker position={[dropCoords.lat,dropCoords.lng]} />}
        {driverPosition && <Marker position={driverPosition} />}

        {route.length>0 &&
          <Polyline positions={route} pathOptions={{color:"#4f46e5",weight:5}}/>
        }

        <FitBounds route={route}/>
      </MapContainer>


      {/* ================= BOOKING CARD ================= */}
      <div className="absolute left-6 top-6 z-10 w-[360px] max-w-[92%]">

        <div className="bg-white/90 backdrop-blur-xl shadow-2xl rounded-3xl p-6 border">

          <h2 className="text-2xl font-bold mb-6">Book Ride</h2>

          {/* PICKUP */}
          <LocationInput
            label="Pickup location"
            value={pickup}
            setValue={setPickup}
            suggestions={pickupSuggestions}
            setSuggestions={setPickupSuggestions}
            setCoords={setPickupCoords}
            fetchSuggestions={fetchSuggestions}
          />

          {/* DROP */}
          <LocationInput
            label="Drop location"
            value={drop}
            setValue={setDrop}
            suggestions={dropSuggestions}
            setSuggestions={setDropSuggestions}
            setCoords={setDropCoords}
            fetchSuggestions={fetchSuggestions}
          />

          {/* VEHICLES */}
          <h4 className="mt-6 mb-3 font-semibold text-gray-700">
            Choose Vehicle
          </h4>

          <div className="grid grid-cols-3 gap-3">
            {vehicles.map(v=>(
              <div
                key={v.id}
                onClick={()=>setVehicleType(v.id)}
                className={`cursor-pointer rounded-xl p-3 text-center border transition-all
                ${vehicleType===v.id
                  ? "border-indigo-600 bg-indigo-50 scale-105 shadow"
                  : "bg-gray-50 hover:scale-105"}`}
              >
                <img src={v.img} className="h-14 mx-auto mb-2"/>
                <p className="text-sm font-semibold">{v.label}</p>
              </div>
            ))}
          </div>

          {/* BUTTON */}
          <button
            onClick={handleBookRide}
            disabled={loading}
            className="mt-6 w-full py-4 rounded-xl font-semibold text-white
              bg-gradient-to-r from-indigo-600 to-blue-600
              hover:scale-[1.02] transition disabled:opacity-50"
          >
            {loading ? "Finding Driver..." : "Book Ride"}
          </button>

          {/* MESSAGE */}
          {message &&
            <p className="mt-4 text-sm text-center font-medium text-indigo-600">
              {message}
            </p>
          }
        </div>
      </div>


      {/* ================= FARE PANEL ================= */}
      {distance &&
        <div className="absolute bottom-0 left-0 right-0 z-20 mb-6">
          <div className="mx-auto max-w-3xl">

            <div className="bg-white shadow-2xl rounded-3xl p-6 flex justify-between">

              <Stat label="Distance" value={`${distance} km`} />
              <Stat label="Duration" value={`${duration} min`} />
              <Stat label="Fare" value={`₹${fare}`} highlight />

            </div>

          </div>
        </div>
      }
    </div>
  );
}

/* ======================================================
SUB COMPONENTS
====================================================== */

const Stat = ({label,value,highlight})=>(
<div>
<p className="text-gray-500 text-sm">{label}</p>
<p className={`font-bold text-lg ${highlight?"text-indigo-600":""}`}>
{value}
</p>
</div>
);


const LocationInput = ({
label,
value,
setValue,
suggestions,
setSuggestions,
setCoords,
fetchSuggestions
}) => (
<div className="relative mt-3">

<input
className="peer w-full p-4 rounded-xl border outline-none focus:ring-2 focus:ring-indigo-500"
placeholder=" "
value={value}
onChange={e=>{
setValue(e.target.value);
fetchSuggestions(e.target.value,setSuggestions);
}}
/>

<label className="absolute left-3 top-1 text-sm text-gray-500 transition-all
peer-placeholder-shown:top-4 peer-placeholder-shown:text-base
peer-focus:-top-2 peer-focus:text-xs peer-focus:text-indigo-600
bg-white px-1">
{label}
</label>

{suggestions.length>0 &&
<div className="absolute z-50 bg-white border w-full max-h-52 overflow-y-auto shadow rounded mt-2">

{suggestions.map((p,i)=>(
<div
key={i}
className="p-3 hover:bg-indigo-50 cursor-pointer text-sm"
onClick={()=>{
setValue(p.display);
setCoords({lat:p.lat,lng:p.lng});
setSuggestions([]);
}}
>
📍 {p.display}
</div>
))}

</div>}
</div>
);