import React, { useState, useEffect, useRef } from "react";
import api from "../utils/api";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import {
  MapPin,
  Navigation,
  ArrowUpDown,
  Loader2
} from "lucide-react";
import { motion } from "framer-motion";

/* CONFIG */
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

/* VEHICLES */
import bikeImg from "../assets/services/bike.png";
import autoImg from "../assets/services/auto.png";
import cabImg from "../assets/services/cab-economy.png";

const vehicles = [
  { id: "bike", label: "Bike", img: bikeImg, rate: 8 },
  { id: "auto", label: "Auto", img: autoImg, rate: 12 },
  { id: "car", label: "Cab", img: cabImg, rate: 18 }
];

export default function BookRide() {

  const navigate = useNavigate();

  const socketRef = useRef(null);
  const debounceRef = useRef(null);
  const abortRef = useRef(null);

  /* ================= AUTH PROTECTION ================= */

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token) {
      navigate("/login");
      return;
    }

    if (role === "driver") {
      // 🚨 BLOCK DRIVER
      navigate("/driver/dashboard");
    }

  }, [navigate]);

  /* ================= STATE ================= */

  const [pickup, setPickup] = useState("");
  const [drop, setDrop] = useState("");

  const [pickupCoords, setPickupCoords] = useState(null);
  const [dropCoords, setDropCoords] = useState(null);

  const [vehicleType, setVehicleType] = useState(null);
  const [vehiclePrices, setVehiclePrices] = useState([]);

  const [distance, setDistance] = useState(null);
  const [eta, setEta] = useState(null);

  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [dropSuggestions, setDropSuggestions] = useState([]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  /* ================= SOCKET ================= */

  useEffect(() => {
    socketRef.current = io(SOCKET_URL, {
      auth: {
        token: localStorage.getItem("token")
      }
    });

    return () => socketRef.current?.disconnect();
  }, []);

  /* ================= GPS ================= */

  const getUserLocation = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      setPickupCoords({ lat, lng });
      setPickup("Current Location");
    });
  };

  /* ================= SWAP ================= */

  const swapLocations = () => {
    setPickup(drop);
    setDrop(pickup);

    setPickupCoords(dropCoords);
    setDropCoords(pickupCoords);
  };

  /* ================= SEARCH ================= */

  const fetchSuggestions = (query, setter) => {
    if (!query || query.length < 3) return setter([]);

    clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        abortRef.current?.abort();
        abortRef.current = new AbortController();

        const res = await api.get(`/location/search?q=${query}`, {
          signal: abortRef.current.signal
        });

        setter(res.data?.results || []);

      } catch {
        setter([]);
      }
    }, 400);
  };

  /* ================= ROUTE ================= */

  const drawRoute = async (start, end) => {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=false`
    );

    const data = await res.json();

    const km = data.routes[0].distance / 1000;
    const mins = data.routes[0].duration / 60;

    setDistance(km.toFixed(1));
    setEta(mins.toFixed(0));

    const prices = vehicles.map(v => ({
      ...v,
      price: Math.round(km * v.rate)
    }));

    setVehiclePrices(prices);
  };

  useEffect(() => {
    if (pickupCoords && dropCoords) {
      drawRoute(pickupCoords, dropCoords);
    }
  }, [pickupCoords, dropCoords]);

  /* ================= BOOK ================= */

  const handleBookRide = async () => {
    if (!vehicleType) {
      setMessage("Select a vehicle");
      return;
    }

    try {
      setLoading(true);
      setMessage("Finding driver...");

      const res = await api.post("/ride", {
        pickupLocation: {
          address: pickup,
          location: {
            type: "Point",
            coordinates: [pickupCoords.lng, pickupCoords.lat]
          }
        },
        dropLocation: {
          address: drop,
          location: {
            type: "Point",
            coordinates: [dropCoords.lng, dropCoords.lat]
          }
        },
        vehicleType,
        distanceKm: distance
      });

      const rideId = res.data?.ride?._id;

      navigate(`/payment/${rideId}`);

    } catch {
      setMessage("No drivers available");
    } finally {
      setLoading(false);
    }
  };

  /* ================= UI ================= */

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gray-100">

      {/* MAP */}
      <div className="lg:w-2/3 h-[40vh] lg:h-screen">
        <iframe
          title="map"
          src="https://maps.google.com/maps?q=india&t=&z=5&output=embed"
          className="w-full h-full"
        />
      </div>

      {/* PANEL */}
      <motion.div
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="lg:w-1/3 bg-white p-6"
      >

        <h2 className="text-2xl font-bold mb-6">
          Book Your Ride
        </h2>

        <LocationInput
          icon={<MapPin size={18} />}
          label="Pickup"
          value={pickup}
          setValue={setPickup}
          suggestions={pickupSuggestions}
          setSuggestions={setPickupSuggestions}
          setCoords={setPickupCoords}
          fetchSuggestions={fetchSuggestions}
        />

        <button onClick={getUserLocation} className="text-sm text-indigo-600 mt-2">
          Use My Location
        </button>

        <LocationInput
          icon={<MapPin size={18} />}
          label="Drop"
          value={drop}
          setValue={setDrop}
          suggestions={dropSuggestions}
          setSuggestions={setDropSuggestions}
          setCoords={setDropCoords}
          fetchSuggestions={fetchSuggestions}
        />

        {distance && (
          <div className="mt-4 text-sm">
            Distance: {distance} km | ETA: {eta} min
          </div>
        )}

        <button
          onClick={handleBookRide}
          disabled={loading}
          className="mt-6 w-full py-3 bg-indigo-600 text-white rounded-lg"
        >
          {loading ? "Finding Driver..." : "Confirm Ride"}
        </button>

        {message && (
          <p className="text-center mt-3 text-indigo-600">
            {message}
          </p>
        )}

      </motion.div>
    </div>
  );
}

/* LOCATION INPUT */
const LocationInput = ({
  icon,
  label,
  value,
  setValue,
  suggestions,
  setSuggestions,
  setCoords,
  fetchSuggestions
}) => (
  <div className="relative mt-3">

    <div className="absolute left-3 top-4">{icon}</div>

    <input
      className="w-full pl-10 pr-4 py-3 border rounded-lg"
      placeholder={label}
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
        fetchSuggestions(e.target.value, setSuggestions);
      }}
    />

    {suggestions.length > 0 && (
      <div className="absolute bg-white border w-full mt-2 shadow">

        {suggestions.map((p, i) => (
          <div
            key={i}
            className="p-2 cursor-pointer"
            onClick={() => {
              setValue(p.display);
              setCoords({ lat: p.lat, lng: p.lng });
              setSuggestions([]);
            }}
          >
            {p.display}
          </div>
        ))}

      </div>
    )}

  </div>
);