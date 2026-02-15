import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMap
} from "react-leaflet";
import io from "socket.io-client";
import "leaflet/dist/leaflet.css";

// 🚗 Vehicle images
import bikeImg from "../assets/services/bike.png";
import autoImg from "../assets/services/auto.png";
import autoShareImg from "../assets/services/auto-share.png";
import parcelImg from "../assets/services/parcel.png";
import cabEcoImg from "../assets/services/cab-economy.png";
import cabPremiumImg from "../assets/services/cab-premium.png";

// 🔌 Socket
const socket = io("http://localhost:5000", {
  transports: ["websocket"]
});

// ===============================
// Auto-fit map to route
// ===============================
const FitBounds = ({ route }) => {
  const map = useMap();

  useEffect(() => {
    if (route.length > 0) map.fitBounds(route);
  }, [route, map]);

  return null;
};

// 🚘 Services list
const vehicles = [
  { id: "bike", label: "Bike", img: bikeImg },
  { id: "auto", label: "Auto", img: autoImg },
  { id: "auto-share", label: "Auto Share", img: autoShareImg },
  { id: "parcel", label: "Parcel", img: parcelImg },
  { id: "cab-economy", label: "Cab Economy", img: cabEcoImg },
  { id: "cab-premium", label: "Cab Premium", img: cabPremiumImg }
];

const BookRide = () => {
  const [pickup, setPickup] = useState("");
  const [drop, setDrop] = useState("");
  const [vehicleType, setVehicleType] = useState("auto");
  const [message, setMessage] = useState("");

  const [pickupCoords, setPickupCoords] = useState(null);
  const [dropCoords, setDropCoords] = useState(null);
  const [route, setRoute] = useState([]);

  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [dropSuggestions, setDropSuggestions] = useState([]);

  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);
  const [fare, setFare] = useState(null);

  const [driverPosition, setDriverPosition] = useState(null);

  // ===============================
  // SOCKET LISTENER
  // ===============================
  useEffect(() => {
    socket.on("receiveLocation", (data) => {
      setDriverPosition([data.lat, data.lng]);
    });

    return () => socket.off("receiveLocation");
  }, []);

  // ===============================
  // PLACE SEARCH
  // ===============================
  const fetchSuggestions = async (query, setter) => {
    if (!query || query.length < 3) return setter([]);

    const res = await axios.get(
      "https://nominatim.openstreetmap.org/search",
      { params: { q: query, format: "json", limit: 5 } }
    );

    setter(res.data);
  };

  // ===============================
  // ROUTE
  // ===============================
  const drawRoute = async (start, end) => {
    const res = await axios.get(
      `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}`,
      { params: { overview: "full", geometries: "geojson" } }
    );

    const data = res.data.routes[0];
    if (!data) return;

    const coords = data.geometry.coordinates.map(
      ([lng, lat]) => [lat, lng]
    );

    setRoute(coords);
    setDistance((data.distance / 1000).toFixed(2));
    setDuration((data.duration / 60).toFixed(1));
    setFare(Math.round((data.distance / 1000) * 12));
  };

  const handleBookRide = async () => {
    if (!pickupCoords || !dropCoords) {
      setMessage("❌ Select pickup & drop from suggestions");
      return;
    }

    await drawRoute(pickupCoords, dropCoords);
    setMessage("✅ Route calculated & waiting for driver 🚕");
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-100 dark:bg-gray-900 transition">

      {/* LEFT */}
      <div className="w-full md:w-1/2 p-6 bg-white dark:bg-gray-800 shadow">
        <h2 className="text-2xl font-bold mb-5">Book a Ride</h2>

        {/* PICKUP */}
        <input
          className="w-full p-3 rounded border dark:border-gray-700 bg-white dark:bg-gray-900"
          placeholder="Pickup location"
          value={pickup}
          onChange={(e) => {
            setPickup(e.target.value);
            fetchSuggestions(e.target.value, setPickupSuggestions);
          }}
        />

        {pickupSuggestions.map((p) => (
          <div
            key={p.place_id}
            className="p-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={() => {
              setPickup(p.display_name);
              setPickupCoords({ lat: +p.lat, lng: +p.lon });
              setPickupSuggestions([]);
            }}
          >
            {p.display_name}
          </div>
        ))}

        {/* DROP */}
        <input
          className="w-full p-3 mt-4 rounded border dark:border-gray-700 bg-white dark:bg-gray-900"
          placeholder="Drop location"
          value={drop}
          onChange={(e) => {
            setDrop(e.target.value);
            fetchSuggestions(e.target.value, setDropSuggestions);
          }}
        />

        {dropSuggestions.map((p) => (
          <div
            key={p.place_id}
            className="p-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={() => {
              setDrop(p.display_name);
              setDropCoords({ lat: +p.lat, lng: +p.lon });
              setDropSuggestions([]);
            }}
          >
            {p.display_name}
          </div>
        ))}

        {/* VEHICLES */}
        <h4 className="mt-4 mb-3 font-semibold">Our Services</h4>

        <div className="grid grid-cols-3 md:grid-cols-3 gap-4">
          {vehicles.map((v) => (
            <div
              key={v.id}
              onClick={() => setVehicleType(v.id)}
              className={`cursor-pointer rounded-2xl p-4 flex flex-col items-center transition border
                ${vehicleType === v.id
                  ? "border-indigo-600 bg-indigo-50 dark:bg-gray-700"
                  : "bg-gray-50 dark:bg-gray-900 hover:shadow"}`}
            >
              <img src={v.img} alt={v.label} className="h-30 mb-2" />
              <p className="font-semibold">{v.label}</p>
            </div>
          ))}
        </div>

        <button
          onClick={handleBookRide}
          className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-semibold"
        >
          Show Route
        </button>

        {distance && (
          <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <p>📏 Distance: <b>{distance} km</b></p>
            <p>⏱ Duration: <b>{duration} mins</b></p>
            <p>💰 Fare: <b>₹{fare}</b></p>
          </div>
        )}

        {message && <p className="mt-3 font-semibold">{message}</p>}
      </div>

      {/* RIGHT */}
      <div className="w-full md:w-1/2 h-[400px] md:h-auto">
        <MapContainer center={[23.0225, 72.5714]} zoom={6} className="h-full w-full">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          {pickupCoords && <Marker position={[pickupCoords.lat, pickupCoords.lng]} />}
          {dropCoords && <Marker position={[dropCoords.lat, dropCoords.lng]} />}
          {route.length > 0 && (
            <Polyline positions={route} pathOptions={{ color: "#4f46e5", weight: 5 }} />
          )}
          {driverPosition && <Marker position={driverPosition} />}
          <FitBounds route={route} />
        </MapContainer>
      </div>
    </div>
  );
};

export default BookRide;
