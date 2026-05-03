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

  /* ================= SOCKET ================= */
  useEffect(() => {
    const socket = io(SOCKET_URL);
    socketRef.current = socket;
    return () => socket.disconnect();
  }, []);

  /* ================= GEO CODE (🔥 FIX) ================= */
  const geocodeAddress = (address, setter) => {
    return new Promise((resolve) => {
      if (!address || !window.google) return resolve(null);

      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address }, (res) => {
        if (res?.[0]) {
          const loc = res[0].geometry.location;
          const coords = { lat: loc.lat(), lng: loc.lng() };
          setter(coords);
          resolve(coords);
        } else {
          resolve(null);
        }
      });
    });
  };

  /* ================= CURRENT LOCATION ================= */
  const handleCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setPickupCoords({ lat, lng });

      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (res) => {
        if (res?.[0]) setPickup(res[0].formatted_address);
      });
    });
  };

  /* ================= AUTOCOMPLETE ================= */
  const fetchSuggestions = (query, setter) => {
    if (!query || !window.google) return setter([]);

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
      if (!res?.[0]) return;
      const loc = res[0].geometry.location;
      setter({ lat: loc.lat(), lng: loc.lng() });
    });
  };

  /* ================= ROUTE ================= */
  const calculateRoute = () => {
    if (!pickupCoords || !dropCoords || !window.google) return;

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
    calculateRoute();
  }, [pickupCoords, dropCoords]);

  /* ================= BOOK RIDE ================= */
  const handleBookRide = async () => {
    setMessage("");

    // 🔥 AUTO FIX (convert typed address → coords)
    if (!pickupCoords) await geocodeAddress(pickup, setPickupCoords);
    if (!dropCoords) await geocodeAddress(drop, setDropCoords);

    if (!pickupCoords || !dropCoords) {
      return setMessage("Please select valid locations");
    }

    if (!vehicleType) {
      return setMessage("Select vehicle");
    }

    try {
      setLoading(true);

      const res = await api.post("/ride", {
        pickupLocation: {
          address: pickup,
          coordinates: [pickupCoords.lng, pickupCoords.lat]
        },
        dropLocation: {
          address: drop,
          coordinates: [dropCoords.lng, dropCoords.lat]
        },
        vehicleType,
        distance
      });

      navigate(`/track/${res.data.ride._id}`);

    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.message || "Booking failed");
    } finally {
      setLoading(false);
    }
  };

  /* ================= STATES ================= */
  if (loadError)
    return <p className="text-center mt-10 text-red-500">Map failed</p>;

  if (!isLoaded)
    return <p className="text-center mt-10">Loading map...</p>;

  return (
    <div className="flex flex-col lg:flex-row min-h-screen">

      {/* MAP */}
      <div className="w-full lg:w-2/3 h-[40vh] lg:h-screen">
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
      <div className="w-full lg:w-1/3 p-4 sm:p-6 bg-white overflow-y-auto">

        <h2 className="text-xl font-bold mb-4">🚗 Book Ride</h2>

        <button
          onClick={handleCurrentLocation}
          className="w-full mb-3 py-3 rounded-xl bg-gray-200"
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

        <p className="text-xs text-gray-500 mb-2">
          Select from suggestions for best results
        </p>

        {/* VEHICLES */}
        <div className="mt-3 space-y-3">
          {vehiclePrices.map((v) => (
            <div
              key={v.id}
              onClick={() => setVehicleType(v.id)}
              className={`flex justify-between p-4 rounded-xl cursor-pointer ${
                vehicleType === v.id ? "bg-indigo-100" : "bg-gray-100"
              }`}
            >
              <div className="flex gap-3">
                <img src={v.img} className="w-12" />
                <div>
                  <p>{v.label}</p>
                  <p className="text-sm">{eta} min</p>
                </div>
              </div>
              <p>₹{v.price}</p>
            </div>
          ))}
        </div>

        <button
          onClick={handleBookRide}
          disabled={!pickup || !drop || !vehicleType}
          className={`w-full mt-4 py-3 rounded-xl text-white ${
            pickup && drop && vehicleType
              ? "bg-green-500"
              : "bg-gray-400 cursor-not-allowed"
          }`}
        >
          {loading ? "Booking..." : "Confirm Booking"}
        </button>

        {message && (
          <p className="text-red-500 mt-2">{message}</p>
        )}
      </div>
    </div>
  );
}

/* ================= INPUT ================= */
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
      className="w-full p-3 rounded-xl border"
      placeholder={placeholder}
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
        fetchSuggestions(e.target.value, setSuggestions);
      }}
    />

    {suggestions.length > 0 && (
      <div className="absolute w-full bg-white border rounded-xl mt-1 z-50 max-h-40 overflow-y-auto">
        {suggestions.map((s, i) => (
          <div
            key={i}
            onClick={() => {
              setValue(s.description);
              getCoords(s.place_id, setCoords);
              setSuggestions([]);
            }}
            className="p-2 cursor-pointer hover:bg-gray-100"
          >
            {s.description}
          </div>
        ))}
      </div>
    )}
  </div>
);