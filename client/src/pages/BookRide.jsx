import React, { useState, useEffect, useRef } from "react";
import api from "../utils/api";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";

import {
  GoogleMap,
  Marker,
  DirectionsRenderer,
  useJsApiLoader
} from "@react-google-maps/api";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;
const libraries = ["places"];

const containerStyle = {
  width: "100%",
  height: "100%"
};

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

  const [pickup, setPickup] = useState("");
  const [drop, setDrop] = useState("");

  const [pickupCoords, setPickupCoords] = useState(null);
  const [dropCoords, setDropCoords] = useState(null);

  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [dropSuggestions, setDropSuggestions] = useState([]);

  const [vehicleType, setVehicleType] = useState(null);
  const [vehiclePrices, setVehiclePrices] = useState([]);

  const [distance, setDistance] = useState(null);
  const [eta, setEta] = useState(null);

  const [directions, setDirections] = useState(null);
  const [drivers, setDrivers] = useState([]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY,
    libraries
  });

  /* ================= SOCKET ================= */
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"]
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ Socket connected");
    });

    return () => socket.disconnect();
  }, []);

  /* ================= LOCATION ================= */
  const handleCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      setPickupCoords({ lat, lng });

      const geocoder = new window.google.maps.Geocoder();

      geocoder.geocode({ location: { lat, lng } }, (res) => {
        if (res[0]) setPickup(res[0].formatted_address);
      });

    }, () => setMessage("Location permission denied"));
  };

  /* ================= AUTOCOMPLETE ================= */
  const fetchSuggestions = (query, setter) => {
    if (!query) return setter([]);

    clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const service = new window.google.maps.places.AutocompleteService();
      service.getPlacePredictions({ input: query }, (res) => {
        setter(res || []);
      });
    }, 300);
  };

  const getCoords = (placeId, setter) => {
    const geocoder = new window.google.maps.Geocoder();

    geocoder.geocode({ placeId }, (res) => {
      const loc = res[0].geometry.location;
      setter({ lat: loc.lat(), lng: loc.lng() });
    });
  };

  /* ================= ROUTE ================= */
  const calculateRoute = () => {
    const service = new window.google.maps.DirectionsService();

    service.route(
      {
        origin: pickupCoords,
        destination: dropCoords,
        travelMode: "DRIVING"
      },
      (result, status) => {
        if (status === "OK") {
          setDirections(result);

          const leg = result.routes[0].legs[0];
          const km = leg.distance.value / 1000;
          const mins = leg.duration.value / 60;

          setDistance(km.toFixed(1));
          setEta(Math.round(mins));

          setVehiclePrices(
            vehicles.map(v => ({
              ...v,
              price: Math.round(km * v.rate)
            }))
          );
        }
      }
    );
  };

  /* ================= FETCH DRIVERS ================= */
  const fetchNearbyDrivers = async () => {
    try {
      const res = await api.get("/driver/nearby", {
        params: {
          lat: pickupCoords.lat,
          lng: pickupCoords.lng
        }
      });

      setDrivers(res.data.drivers || []);
    } catch (err) {
      console.log("Driver error:", err);
    }
  };

  useEffect(() => {
    if (pickupCoords && dropCoords && isLoaded) {
      calculateRoute();
      fetchNearbyDrivers();
    }
  }, [pickupCoords, dropCoords, isLoaded]);

  /* ================= BOOK ================= */
  const handleBookRide = async () => {
    if (!vehicleType) return setMessage("Select vehicle");

    try {
      setLoading(true);

      const res = await api.post("/ride", {
        pickupLocation: { address: pickup, ...pickupCoords },
        dropLocation: { address: drop, ...dropCoords },
        vehicleType,
        distance
      });

      navigate(`/track/${res.data.ride._id}`);

    } catch {
      setMessage("Booking failed");
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded) return <p>Loading map...</p>;

  return (
    <div className="h-screen flex flex-col lg:flex-row">

      {/* MAP */}
      <div className="lg:w-2/3 h-[40vh] lg:h-screen">
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={pickupCoords || { lat: 28.6139, lng: 77.209 }}
          zoom={13}
        >

          {pickupCoords && <Marker position={pickupCoords} />}
          {dropCoords && <Marker position={dropCoords} />}

          {/* 🚗 DRIVER ICONS */}
          {drivers.map((d) => (
            <Marker
              key={d._id}
              position={{
                lat: d.location.coordinates[1],
                lng: d.location.coordinates[0]
              }}
              icon={{
                url: "https://cdn-icons-png.flaticon.com/512/744/744465.png",
                scaledSize: new window.google.maps.Size(40, 40)
              }}
            />
          ))}

          {directions && <DirectionsRenderer directions={directions} />}
        </GoogleMap>
      </div>

      {/* PANEL */}
      <div className="lg:w-1/3 bg-white p-6">

        <h2 className="text-2xl font-bold mb-4">🚗 Book Ride</h2>

        <button
          onClick={handleCurrentLocation}
          className="mb-3 w-full py-2 bg-gray-200 rounded-xl"
        >
          📍 Use Current Location
        </button>

        <InputBox {...{
          value: pickup,
          setValue: setPickup,
          suggestions: pickupSuggestions,
          setSuggestions: setPickupSuggestions,
          setCoords: setPickupCoords,
          fetchSuggestions,
          getCoords,
          placeholder: "Pickup"
        }} />

        <InputBox {...{
          value: drop,
          setValue: setDrop,
          suggestions: dropSuggestions,
          setSuggestions: setDropSuggestions,
          setCoords: setDropCoords,
          fetchSuggestions,
          getCoords,
          placeholder: "Drop"
        }} />

        {vehiclePrices.map(v => (
          <div
            key={v.id}
            onClick={() => setVehicleType(v.id)}
            className={`p-3 mb-2 border rounded-xl cursor-pointer ${
              vehicleType === v.id ? "bg-indigo-100 border-indigo-500" : ""
            }`}
          >
            <div className="flex justify-between">
              <span>{v.label} ({eta} min)</span>
              <span>₹{v.price}</span>
            </div>
          </div>
        ))}

        <button
          onClick={handleBookRide}
          className="w-full mt-3 py-3 bg-green-600 text-white rounded-xl"
        >
          {loading ? "Booking..." : "Confirm Booking"}
        </button>

        {message && <p className="text-red-500 mt-2">{message}</p>}
      </div>
    </div>
  );
}

/* INPUT */
const InputBox = ({
  value, setValue, suggestions, setSuggestions,
  setCoords, fetchSuggestions, getCoords, placeholder
}) => (
  <div className="relative mb-3">
    <input
      className="w-full p-3 border rounded-xl"
      placeholder={placeholder}
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
        fetchSuggestions(e.target.value, setSuggestions);
      }}
    />

    {suggestions.map((s, i) => (
      <div
        key={i}
        onClick={() => {
          setValue(s.description);
          getCoords(s.place_id, setCoords);
          setSuggestions([]);
        }}
        className="p-2 bg-white border cursor-pointer hover:bg-gray-100"
      >
        {s.description}
      </div>
    ))}
  </div>
);