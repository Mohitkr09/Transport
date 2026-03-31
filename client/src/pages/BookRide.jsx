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

/* ✅ FIX (DO NOT CHANGE THIS) */
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

  const [step, setStep] = useState(1);

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

  /* ================= MAP ================= */

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY,
    libraries
  });

  /* ================= SOCKET ================= */

  useEffect(() => {
    socketRef.current = io(SOCKET_URL, { transports: ["websocket"] });
    return () => socketRef.current?.disconnect();
  }, []);

  /* ================= 📍 CURRENT LOCATION ================= */

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      return setMessage("Geolocation not supported");
    }

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      setPickupCoords({ lat, lng });

      // reverse geocode
      const geocoder = new window.google.maps.Geocoder();

      geocoder.geocode({ location: { lat, lng } }, (res) => {
        if (res[0]) {
          setPickup(res[0].formatted_address);
        }
      });

    }, () => {
      setMessage("Location permission denied");
    });
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

  useEffect(() => {
    if (pickupCoords && dropCoords && isLoaded) {
      calculateRoute();
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

      const rideId = res.data?.ride?._id;

      navigate(`/track/${rideId}`, { replace: true });

    } catch (err) {
      console.error(err);
      setMessage("❌ Booking failed");
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
          center={pickupCoords || { lat: 28.6139, lng: 77.2090 }}
          zoom={13}
        >
          {pickupCoords && <Marker position={pickupCoords} />}
          {dropCoords && <Marker position={dropCoords} />}
          {directions && <DirectionsRenderer directions={directions} />}
        </GoogleMap>
      </div>

      {/* PANEL */}
      <div className="lg:w-1/3 bg-white p-6">

        <h2 className="text-2xl font-bold mb-4">Book Ride</h2>

        {/* STEP 1 */}
        {step === 1 && (
          <>
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

            <button
              onClick={() => {
                if (!pickupCoords || !dropCoords) {
                  return setMessage("Enter locations");
                }
                setStep(2);
              }}
              className="w-full mt-4 py-3 bg-indigo-600 text-white rounded-xl"
            >
              Confirm Ride
            </button>
          </>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <>
            <button onClick={() => setStep(1)}>← Change</button>

            {vehiclePrices.map(v => (
              <div
                key={v.id}
                onClick={() => setVehicleType(v.id)}
                className={`p-4 mb-3 border rounded-xl cursor-pointer ${
                  vehicleType === v.id ? "border-indigo-600 bg-indigo-50" : ""
                }`}
              >
                <div className="flex justify-between">
                  <div className="flex gap-3">
                    <img src={v.img} className="h-10" />
                    <div>
                      <p>{v.label}</p>
                      <p className="text-xs">{eta} min</p>
                    </div>
                  </div>
                  <p>₹{v.price}</p>
                </div>
              </div>
            ))}

            <button
              onClick={handleBookRide}
              className="w-full py-3 bg-green-600 text-white rounded-xl"
            >
              {loading ? "Booking..." : "Confirm Booking"}
            </button>
          </>
        )}

        {message && <p className="mt-2 text-red-500">{message}</p>}
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