import React, { useState, useEffect, useRef } from "react";
import api from "../utils/api";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { useGoogleMaps } from "../config/googleMaps";
import {
  GoogleMap,
  Marker,
  DirectionsRenderer
} from "@react-google-maps/api";

/* VEHICLES */
import bikeImg from "../assets/services/bike.png";
import autoImg from "../assets/services/auto.png";
import cabImg from "../assets/services/cab-economy.png";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

const containerStyle = {
  width: "100%",
  height: "100%"
};

const vehicles = [
  { id: "bike", label: "Bike", img: bikeImg, rate: 8 },
  { id: "auto", label: "Auto", img: autoImg, rate: 12 },
  { id: "car", label: "Cab", img: cabImg, rate: 18 }
];

export default function BookRide() {
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const debounceRef = useRef(null);

  const { isLoaded, loadError } = useGoogleMaps();

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

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  /* SOCKET */
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true
    });

    socketRef.current = socket;
    return () => socket.disconnect();
  }, []);

  /* CURRENT LOCATION */
  const handleCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      setPickupCoords({ lat, lng });

      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (res) => {
        if (res[0]) setPickup(res[0].formatted_address);
      });
    });
  };

  /* AUTOCOMPLETE */
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

  /* ROUTE */
  const calculateRoute = () => {
    if (!pickupCoords || !dropCoords) return;

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
            vehicles.map((v) => ({
              ...v,
              price: Math.round(km * v.rate)
            }))
          );
        }
      }
    );
  };

  useEffect(() => {
    if (pickupCoords && dropCoords && isLoaded) {
      calculateRoute();
    }
  }, [pickupCoords, dropCoords, isLoaded]);

  /* ✅ FIXED BOOK FUNCTION */
  const handleBookRide = async () => {
    if (!vehicleType) return setMessage("Select vehicle");
    if (!pickupCoords || !dropCoords)
      return setMessage("Select valid locations");

    try {
      setLoading(true);
      setMessage("");

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
        distance
      });

      navigate(`/track/${res.data.ride._id}`);
    } catch (err) {
      console.error("API ERROR:", err.response?.data || err.message);
      setMessage(
        err.response?.data?.message || "Booking failed. Try again."
      );
    } finally {
      setLoading(false);
    }
  };

  if (loadError) return <p>Error loading map</p>;
  if (!isLoaded) return <p>Loading...</p>;

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
          {directions && <DirectionsRenderer directions={directions} />}
        </GoogleMap>
      </div>

      {/* PANEL */}
      <div className="lg:w-1/3 bg-white/90 backdrop-blur-xl p-6 shadow-2xl rounded-l-3xl">
        <h2 className="text-2xl font-bold mb-4">🚗 Book Ride</h2>

        <button
          onClick={handleCurrentLocation}
          className="w-full mb-3 py-2 bg-gray-200 rounded-xl"
        >
          📍 Use Current Location
        </button>

        <InputBox
          value={pickup}
          setValue={setPickup}
          suggestions={pickupSuggestions}
          setSuggestions={setPickupSuggestions}
          setCoords={setPickupCoords}
          fetchSuggestions={fetchSuggestions}
          getCoords={getCoords}
          placeholder="Pickup"
        />

        <InputBox
          value={drop}
          setValue={setDrop}
          suggestions={dropSuggestions}
          setSuggestions={setDropSuggestions}
          setCoords={setDropCoords}
          fetchSuggestions={fetchSuggestions}
          getCoords={getCoords}
          placeholder="Drop"
        />

        {/* VEHICLES */}
        <div className="mt-4 space-y-3">
          {vehiclePrices.map((v) => (
            <div
              key={v.id}
              onClick={() => setVehicleType(v.id)}
              className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition
              ${
                vehicleType === v.id
                  ? "bg-indigo-50 border border-indigo-500"
                  : "bg-white hover:shadow-lg"
              }`}
            >
              <div className="flex items-center gap-4">
                <img src={v.img} className="w-14" />
                <div>
                  <h3 className="font-semibold">{v.label}</h3>
                  <p className="text-sm text-gray-500">{eta} min</p>
                </div>
              </div>

              <p className="font-bold text-indigo-600">₹{v.price}</p>
            </div>
          ))}
        </div>

        <button
          onClick={handleBookRide}
          className="w-full mt-4 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl"
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
  value,
  setValue,
  suggestions,
  setSuggestions,
  setCoords,
  fetchSuggestions,
  getCoords,
  placeholder
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