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

  useEffect(() => {
    const socket = io(SOCKET_URL);
    socketRef.current = socket;
    return () => socket.disconnect();
  }, []);

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
    if (pickupCoords && dropCoords && isLoaded) calculateRoute();
  }, [pickupCoords, dropCoords, isLoaded]);

  const handleBookRide = async () => {
    if (!vehicleType) return setMessage("Select vehicle");

    try {
      setLoading(true);
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
    } catch {
      setMessage("Booking failed");
    } finally {
      setLoading(false);
    }
  };

  if (loadError) return <p>Error loading map</p>;
  if (!isLoaded) return <p>Loading...</p>;

  return (
    <div className="h-screen flex flex-col lg:flex-row bg-gray-100 dark:bg-gray-950 text-gray-900 dark:text-white">

      {/* MAP */}
      <div className="lg:w-2/3 h-[40vh] lg:h-screen">
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "100%" }}
          center={pickupCoords || { lat: 28.6139, lng: 77.209 }}
          zoom={13}
        >
          {pickupCoords && <Marker position={pickupCoords} />}
          {dropCoords && <Marker position={dropCoords} />}
          {directions && <DirectionsRenderer directions={directions} />}
        </GoogleMap>
      </div>

      {/* PANEL */}
      <div className="lg:w-1/3 w-full p-4 sm:p-6 
        bg-white/80 dark:bg-gray-900/90 backdrop-blur-xl 
        border-l border-gray-200 dark:border-gray-800
        shadow-2xl rounded-t-3xl lg:rounded-none overflow-y-auto">

        <h2 className="text-2xl font-bold mb-4">🚗 Book Ride</h2>

        <button
          onClick={handleCurrentLocation}
          className="w-full mb-3 py-3 rounded-xl 
          bg-gray-200 dark:bg-gray-800 
          text-gray-800 dark:text-white"
        >
          📍 Use Current Location
        </button>

        <InputBox {...{
          value: pickup, setValue: setPickup,
          suggestions: pickupSuggestions, setSuggestions: setPickupSuggestions,
          setCoords: setPickupCoords, fetchSuggestions, getCoords,
          placeholder: "Pickup Location"
        }} />

        <InputBox {...{
          value: drop, setValue: setDrop,
          suggestions: dropSuggestions, setSuggestions: setDropSuggestions,
          setCoords: setDropCoords, fetchSuggestions, getCoords,
          placeholder: "Drop Location"
        }} />

        {/* VEHICLES */}
        <div className="mt-4 space-y-3">
          {vehiclePrices.map((v) => (
            <div
              key={v.id}
              onClick={() => setVehicleType(v.id)}
              className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition
              ${vehicleType === v.id
                ? "bg-indigo-100 dark:bg-indigo-900 border border-indigo-500"
                : "bg-white dark:bg-gray-800 hover:shadow-lg"
              }`}
            >
              <div className="flex items-center gap-4">
                <img src={v.img} className="w-14" />
                <div>
                  <h3 className="font-semibold">{v.label}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {eta} min
                  </p>
                </div>
              </div>
              <p className="font-bold text-indigo-600 dark:text-indigo-400">
                ₹{v.price}
              </p>
            </div>
          ))}
        </div>

        <button
          onClick={handleBookRide}
          className="w-full mt-5 py-4 rounded-2xl font-semibold text-white
          bg-gradient-to-r from-green-500 to-emerald-600"
        >
          {loading ? "Booking..." : "Confirm Booking"}
        </button>

        {message && (
          <p className="text-red-500 dark:text-red-400 mt-2">{message}</p>
        )}
      </div>
    </div>
  );
}

/* INPUT BOX */
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
      className="w-full p-3 rounded-xl border 
      bg-white dark:bg-gray-800 
      text-gray-900 dark:text-white
      placeholder-gray-500 dark:placeholder-gray-400
      border-gray-300 dark:border-gray-700"
      placeholder={placeholder}
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
        fetchSuggestions(e.target.value, setSuggestions);
      }}
    />

    {suggestions.length > 0 && (
      <div className="absolute w-full bg-white dark:bg-gray-800 border rounded-xl mt-1 z-50 shadow-lg max-h-40 overflow-y-auto">
        {suggestions.map((s, i) => (
          <div
            key={i}
            onClick={() => {
              setValue(s.description);
              getCoords(s.place_id, setCoords);
              setSuggestions([]);
            }}
            className="p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {s.description}
          </div>
        ))}
      </div>
    )}
  </div>
);