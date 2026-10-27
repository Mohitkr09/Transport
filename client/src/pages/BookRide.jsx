
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { io } from "socket.io-client";
import api from "../utils/api";
import { useGoogleMaps } from "../config/googleMaps";

import {
  GoogleMap,
  Marker,
  DirectionsRenderer,
} from "@react-google-maps/api";

import {
  MapPin,
  Navigation,
  LocateFixed,
  ArrowDownUp,
  Bike,
  CarFront,
  Clock3,
  Route,
  ShieldCheck,
  Wallet,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  ChevronRight,
  X,
  Search,
  Zap,
  Info,
} from "lucide-react";

import bikeImg from "../assets/services/bike.png";
import autoImg from "../assets/services/auto.png";
import cabImg from "../assets/services/cab-economy.png";

/* =========================================================
   CONFIGURATION
========================================================= */

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

const DEFAULT_CENTER = {
  lat: 28.6139,
  lng: 77.209,
};

const MAP_CONTAINER_STYLE = {
  width: "100%",
  height: "100%",
};

const vehicles = [
  {
    id: "bike",
    label: "Bike",
    description: "Quick solo rides",
    img: bikeImg,
    rate: 8,
    baseFare: 10,
    etaOffset: 0,
    capacity: "1 passenger",
    icon: Bike,
    color: "blue",
  },
  {
    id: "auto",
    label: "Auto",
    description: "Affordable city travel",
    img: autoImg,
    rate: 12,
    baseFare: 15,
    etaOffset: 3,
    capacity: "3 passengers",
    icon: Navigation,
    color: "amber",
  },
  {
    id: "car",
    label: "Cab Economy",
    description: "Comfortable everyday rides",
    img: cabImg,
    rate: 18,
    baseFare: 25,
    etaOffset: 5,
    capacity: "4 passengers",
    icon: CarFront,
    color: "violet",
  },
];

/* Dark map style follows the navbar theme. */
const darkMapStyle = [
  {
    elementType: "geometry",
    stylers: [{ color: "#172033" }],
  },
  {
    elementType: "labels.text.fill",
    stylers: [{ color: "#a8b5cc" }],
  },
  {
    elementType: "labels.text.stroke",
    stylers: [{ color: "#172033" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#293750" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0c1424" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#8496b2" }],
  },
];

const lightMapStyle = [
  {
    featureType: "poi",
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
};

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function BookRide() {
  const navigate = useNavigate();
  const { isLoaded, loadError } = useGoogleMaps();

  const socketRef = useRef(null);
  const debounceRef = useRef(null);
  const routeRequestRef = useRef(0);

  /* Theme is controlled by the existing navbar. */
  const [isDark, setIsDark] = useState(() =>
    typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : false
  );

  const [pickup, setPickup] = useState("");
  const [drop, setDrop] = useState("");

  const [pickupCoords, setPickupCoords] = useState(null);
  const [dropCoords, setDropCoords] = useState(null);

  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [dropSuggestions, setDropSuggestions] = useState([]);

  const [activeInput, setActiveInput] = useState(null);

  const [vehicleType, setVehicleType] = useState("bike");

  const [distance, setDistance] = useState(null);
  const [eta, setEta] = useState(null);
  const [directions, setDirections] = useState(null);
  const [vehiclePrices, setVehiclePrices] = useState([]);

  const [locationLoading, setLocationLoading] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error");

  const [paymentMethod] = useState("cash");

  /* =========================================================
     SYNC WITH NAVBAR DARK MODE
  ========================================================= */

  useEffect(() => {
    const root = document.documentElement;

    const updateTheme = () => {
      setIsDark(root.classList.contains("dark"));
    };

    updateTheme();

    const observer = new MutationObserver(updateTheme);

    observer.observe(root, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  /* =========================================================
     SOCKET CONNECTION
  ========================================================= */

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      autoConnect: false,
      auth: {
        token: localStorage.getItem("token"),
      },
      reconnection: true,
      reconnectionAttempts: 5,
      timeout: 10000,
    });

    socketRef.current = socket;
    socket.connect();

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  /* =========================================================
     CLEAN UP DEBOUNCE
  ========================================================= */

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  /* =========================================================
     HELPERS
  ========================================================= */

  const showMessage = useCallback((text, type = "error") => {
    setMessage(text);
    setMessageType(type);
  }, []);

  const geocodeAddress = useCallback((address) => {
    return new Promise((resolve, reject) => {
      if (!address || !window.google?.maps) {
        reject(new Error("Google Maps is not ready."));
        return;
      }

      const geocoder = new window.google.maps.Geocoder();

      geocoder.geocode({ address }, (results, status) => {
        if (
          status === "OK" &&
          results?.[0]?.geometry?.location
        ) {
          const location = results[0].geometry.location;

          resolve({
            lat: location.lat(),
            lng: location.lng(),
            address: results[0].formatted_address || address,
          });
        } else {
          reject(
            new Error(
              "We couldn't find that location. Please select a suggested address."
            )
          );
        }
      });
    });
  }, []);

  /* =========================================================
     AUTOCOMPLETE
  ========================================================= */

  const fetchSuggestions = useCallback((query, setter) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!query.trim() || !window.google?.maps?.places) {
      setter([]);
      return;
    }

    debounceRef.current = setTimeout(() => {
      const service =
        new window.google.maps.places.AutocompleteService();

      service.getPlacePredictions(
        {
          input: query,
          componentRestrictions: { country: "in" },
        },
        (results, status) => {
          if (
            status === window.google.maps.places.PlacesServiceStatus.OK
          ) {
            setter(results || []);
          } else {
            setter([]);
          }
        }
      );
    }, 300);
  }, []);

  const selectSuggestion = useCallback(
    async (suggestion, field) => {
      try {
        const geocoder = new window.google.maps.Geocoder();

        geocoder.geocode(
          { placeId: suggestion.place_id },
          (results, status) => {
            if (
              status !== "OK" ||
              !results?.[0]?.geometry?.location
            ) {
              showMessage("Couldn't load this location. Please try again.");
              return;
            }

            const result = results[0];
            const location = result.geometry.location;

            const coords = {
              lat: location.lat(),
              lng: location.lng(),
            };

            if (field === "pickup") {
              setPickup(result.formatted_address || suggestion.description);
              setPickupCoords(coords);
              setPickupSuggestions([]);
            } else {
              setDrop(result.formatted_address || suggestion.description);
              setDropCoords(coords);
              setDropSuggestions([]);
            }

            setActiveInput(null);
            setMessage("");
          }
        );
      } catch (error) {
        console.error("Location selection error:", error);
        showMessage("Unable to select this location.");
      }
    },
    [showMessage]
  );

  /* =========================================================
     INPUT HANDLERS
  ========================================================= */

  const handlePickupChange = (value) => {
    setPickup(value);
    setPickupCoords(null);
    setPickupSuggestions([]);
    setMessage("");

    fetchSuggestions(value, setPickupSuggestions);
  };

  const handleDropChange = (value) => {
    setDrop(value);
    setDropCoords(null);
    setDropSuggestions([]);
    setMessage("");

    fetchSuggestions(value, setDropSuggestions);
  };

  const swapLocations = () => {
    setPickup(drop);
    setDrop(pickup);

    setPickupCoords(dropCoords);
    setDropCoords(pickupCoords);

    setPickupSuggestions([]);
    setDropSuggestions([]);
    setMessage("");
  };

  const clearLocation = (field) => {
    if (field === "pickup") {
      setPickup("");
      setPickupCoords(null);
      setPickupSuggestions([]);
    } else {
      setDrop("");
      setDropCoords(null);
      setDropSuggestions([]);
    }

    setMessage("");
  };

  /* =========================================================
     CURRENT LOCATION
  ========================================================= */

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      showMessage("Location services are not supported by this browser.");
      return;
    }

    if (!window.isSecureContext) {
      showMessage(
        "Current location requires HTTPS or localhost. Open the app in a secure context."
      );
      return;
    }

    setLocationLoading(true);
    setMessage("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        const geocoder = new window.google.maps.Geocoder();

        geocoder.geocode(
          { location: coords },
          (results, status) => {
            setLocationLoading(false);

            if (status === "OK" && results?.[0]) {
              setPickup(results[0].formatted_address);
              setPickupCoords(coords);
              setPickupSuggestions([]);
              setActiveInput(null);
            } else {
              showMessage(
                "Your location was detected, but we couldn't find its address."
              );
            }
          }
        );
      },
      (error) => {
        setLocationLoading(false);

        if (error.code === error.PERMISSION_DENIED) {
          showMessage(
            "Location permission was denied. Enter your pickup address manually."
          );
        } else if (error.code === error.TIMEOUT) {
          showMessage("Location request timed out. Please try again.");
        } else {
          showMessage(
            "Unable to get your location. Please enter it manually."
          );
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30000,
      }
    );
  };

  /* =========================================================
     ROUTE AND FARE CALCULATION
  ========================================================= */

  useEffect(() => {
    if (!isLoaded || !pickupCoords || !dropCoords) {
      setDirections(null);
      setDistance(null);
      setEta(null);
      setVehiclePrices([]);
      setRouteLoading(false);
      return;
    }

    if (
      pickupCoords.lat === dropCoords.lat &&
      pickupCoords.lng === dropCoords.lng
    ) {
      setDirections(null);
      setDistance(null);
      setEta(null);
      setVehiclePrices([]);
      setRouteLoading(false);
      showMessage("Pickup and destination must be different.");
      return;
    }

    const requestId = ++routeRequestRef.current;

    setRouteLoading(true);
    setDirections(null);
    setDistance(null);
    setEta(null);
    setVehiclePrices([]);

    const service = new window.google.maps.DirectionsService();

    service.route(
      {
        origin: pickupCoords,
        destination: dropCoords,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (requestId !== routeRequestRef.current) return;

        setRouteLoading(false);

        if (status === "OK" && result?.routes?.[0]?.legs?.[0]) {
          const leg = result.routes[0].legs[0];

          const km = leg.distance.value / 1000;
          const minutes = Math.ceil(leg.duration.value / 60);

          setDirections(result);
          setDistance(Number(km.toFixed(1)));
          setEta(minutes);

          setVehiclePrices(
            vehicles.map((vehicle) => ({
              ...vehicle,
              price: Math.max(
                vehicle.baseFare,
                Math.round(km * vehicle.rate + vehicle.baseFare)
              ),
              estimatedEta: minutes + vehicle.etaOffset,
            }))
          );

          setMessage("");
        } else {
          setDirections(null);
          setDistance(null);
          setEta(null);
          setVehiclePrices([]);

          showMessage(
            "We couldn't calculate a driving route between these locations. Try different addresses."
          );
        }
      }
    );

    return () => {
      routeRequestRef.current++;
    };
  }, [isLoaded, pickupCoords, dropCoords, showMessage]);

  /* =========================================================
     MAP OPTIONS
  ========================================================= */

  const mapOptions = {
    styles: isDark ? darkMapStyle : lightMapStyle,
    disableDefaultUI: true,
    zoomControl: true,
    fullscreenControl: true,
    clickableIcons: false,
    gestureHandling: "greedy",
    mapTypeControl: false,
    streetViewControl: false,
  };

  const selectedVehicle = vehiclePrices.find(
    (vehicle) => vehicle.id === vehicleType
  );

  /* =========================================================
     BOOK RIDE
  ========================================================= */

  const handleBookRide = async () => {
    setMessage("");

    if (!localStorage.getItem("token")) {
      navigate("/login");
      return;
    }

    if (!pickup.trim() || !drop.trim()) {
      showMessage("Enter both pickup and destination locations.");
      return;
    }

    if (!pickupCoords || !dropCoords) {
      showMessage(
        "Select both locations from the suggestions to confirm their addresses."
      );
      return;
    }

    if (
      pickupCoords.lat === dropCoords.lat &&
      pickupCoords.lng === dropCoords.lng
    ) {
      showMessage("Pickup and destination must be different.");
      return;
    }

    if (routeLoading || distance === null || !selectedVehicle) {
      showMessage("Please wait until your route and fare are calculated.");
      return;
    }

    try {
      setLoading(true);

      /*
       * Keep this payload compatible with the existing backend.
       * If your backend expects additional fields, add them here.
       */
      const response = await api.post("/ride", {
        pickupLocation: {
          address: pickup,
          coordinates: [pickupCoords.lng, pickupCoords.lat],
        },
        dropLocation: {
          address: drop,
          coordinates: [dropCoords.lng, dropCoords.lat],
        },
        vehicleType,
        distance,
      });

      const rideId = response.data?.ride?._id;

      if (!rideId) {
        throw new Error(
          "The server did not return a ride ID. Please check your bookings before retrying."
        );
      }

      navigate(`/track/${rideId}`);
    } catch (error) {
      console.error("Ride booking error:", error);

      showMessage(
        error.response?.data?.message ||
          error.message ||
          "Unable to book your ride. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     LOADING STATES
  ========================================================= */

  if (loadError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-gray-50 px-5 dark:bg-gray-950">
        <div className="max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center dark:border-red-900 dark:bg-gray-900">
          <AlertCircle className="mx-auto mb-4 text-red-500" size={36} />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Map unavailable
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Google Maps could not be loaded. Check your API key, enabled APIs,
            and billing configuration.
          </p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <LoaderCircle
            size={36}
            className="mx-auto animate-spin text-indigo-600"
          />
          <p className="mt-4 font-semibold text-gray-700 dark:text-gray-300">
            Preparing your ride...
          </p>
        </div>
      </div>
    );
  }

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 transition-colors duration-300 dark:bg-gray-950 dark:text-white">
      <div className="grid min-h-[calc(100vh-76px)] grid-cols-1 lg:grid-cols-[minmax(0,1fr)_440px] xl:grid-cols-[minmax(0,1fr)_470px]">
        {/* =================================================
            MAP SECTION
        ================================================= */}
        <section className="relative order-2 min-h-[380px] overflow-hidden bg-gray-200 dark:bg-gray-900 lg:order-1 lg:min-h-[calc(100vh-76px)]">
          <GoogleMap
            mapContainerStyle={MAP_CONTAINER_STYLE}
            center={pickupCoords || DEFAULT_CENTER}
            zoom={pickupCoords ? 14 : 11}
            options={mapOptions}
          >
            {pickupCoords && (
              <Marker
                position={pickupCoords}
                title="Pickup location"
                label={{
                  text: "A",
                  color: "#ffffff",
                  fontWeight: "bold",
                }}
              />
            )}

            {dropCoords && (
              <Marker
                position={dropCoords}
                title="Destination"
                label={{
                  text: "B",
                  color: "#ffffff",
                  fontWeight: "bold",
                }}
              />
            )}

            {directions && (
              <DirectionsRenderer
                directions={directions}
                options={{
                  suppressMarkers: true,
                  polylineOptions: {
                    strokeColor: "#4f46e5",
                    strokeWeight: 6,
                    strokeOpacity: 0.9,
                  },
                }}
              />
            )}
          </GoogleMap>

          {/* Map status */}
          <div className="pointer-events-none absolute left-4 right-4 top-4 flex flex-wrap items-start justify-between gap-3 sm:left-6 sm:right-6 sm:top-6">
            <div className="rounded-2xl border border-white/50 bg-white/95 px-4 py-3 shadow-lg backdrop-blur-xl dark:border-gray-700 dark:bg-gray-900/95">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
                  <Navigation size={19} />
                </span>

                <div>
                  <p className="text-sm font-extrabold text-gray-900 dark:text-white">
                    TransportX
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Your next journey starts here
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-full border border-white/50 bg-white/95 px-3 py-2 text-xs font-semibold text-gray-700 shadow-lg backdrop-blur-xl dark:border-gray-700 dark:bg-gray-900/95 dark:text-gray-200">
              <span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-500" />
              {directions ? "Route ready" : "Choose your route"}
            </div>
          </div>

          {/* Route information card */}
          <AnimatePresence>
            {directions && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/60 bg-white/95 p-4 shadow-xl backdrop-blur-xl dark:border-gray-700 dark:bg-gray-900/95 sm:bottom-6 sm:left-6 sm:right-6 sm:p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                      <Route size={23} />
                    </div>

                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        Your route
                      </p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Estimated driving distance
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-5">
                    <div>
                      <p className="text-xl font-extrabold text-gray-900 dark:text-white">
                        {distance} km
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Distance
                      </p>
                    </div>

                    <div>
                      <p className="text-xl font-extrabold text-gray-900 dark:text-white">
                        {eta} min
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Travel time
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* =================================================
            BOOKING PANEL
        ================================================= */}
        <section className="order-1 border-b border-gray-200 bg-white transition-colors duration-300 dark:border-gray-800 dark:bg-gray-950 lg:order-2 lg:h-[calc(100vh-76px)] lg:overflow-y-auto lg:border-b-0 lg:border-l">
          <div className="mx-auto max-w-xl p-5 sm:p-7 lg:p-6 xl:p-8">
            {/* Header */}
            <motion.div
              initial="hidden"
              animate="show"
              variants={fadeUp}
              className="mb-7"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">
                    <Zap size={15} />
                    On-demand mobility
                  </div>

                  <h1 className="text-3xl font-black tracking-tight text-gray-950 dark:text-white sm:text-4xl">
                    Book a ride
                  </h1>

                  <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">
                    Where would you like to go today?
                  </p>
                </div>

                <div className="hidden h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 sm:flex">
                  <CarFront size={28} />
                </div>
              </div>
            </motion.div>

            {/* Location form */}
            <div className="relative rounded-2xl border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-900/70 sm:p-5">
              <div className="absolute bottom-[70px] left-[31px] top-[55px] border-l-2 border-dashed border-gray-300 dark:border-gray-600" />

              <div className="relative flex items-start gap-3">
                <div className="mt-3 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </div>

                <div className="min-w-0 flex-1">
                  <label
                    htmlFor="pickup-location"
                    className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400"
                  >
                    Pickup location
                  </label>

                  <div className="flex items-center gap-2">
                    <input
                      id="pickup-location"
                      value={pickup}
                      onFocus={() => setActiveInput("pickup")}
                      onChange={(event) =>
                        handlePickupChange(event.target.value)
                      }
                      placeholder="Enter pickup address"
                      autoComplete="off"
                      className="w-full min-w-0 bg-transparent py-2 text-sm font-medium text-gray-900 outline-none placeholder:font-normal placeholder:text-gray-400 dark:text-white dark:placeholder:text-gray-500"
                    />

                    {pickup && (
                      <button
                        type="button"
                        onClick={() => clearLocation("pickup")}
                        aria-label="Clear pickup location"
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-white"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>

                  <AnimatePresence>
                    {activeInput === "pickup" &&
                      pickupSuggestions.length > 0 && (
                        <SuggestionList
                          suggestions={pickupSuggestions}
                          onSelect={(suggestion) =>
                            selectSuggestion(suggestion, "pickup")
                          }
                          isDark={isDark}
                        />
                      )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="relative my-3 flex items-center justify-between pl-10">
                <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />

                <button
                  type="button"
                  onClick={swapLocations}
                  disabled={!pickup && !drop}
                  title="Swap pickup and destination"
                  aria-label="Swap pickup and destination"
                  className="ml-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400"
                >
                  <ArrowDownUp size={16} />
                </button>
              </div>

              <div className="relative flex items-start gap-3">
                <div className="mt-3 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400">
                  <MapPin size={17} />
                </div>

                <div className="min-w-0 flex-1">
                  <label
                    htmlFor="drop-location"
                    className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400"
                  >
                    Destination
                  </label>

                  <div className="flex items-center gap-2">
                    <input
                      id="drop-location"
                      value={drop}
                      onFocus={() => setActiveInput("drop")}
                      onChange={(event) =>
                        handleDropChange(event.target.value)
                      }
                      placeholder="Where are you going?"
                      autoComplete="off"
                      className="w-full min-w-0 bg-transparent py-2 text-sm font-medium text-gray-900 outline-none placeholder:font-normal placeholder:text-gray-400 dark:text-white dark:placeholder:text-gray-500"
                    />

                    {drop && (
                      <button
                        type="button"
                        onClick={() => clearLocation("drop")}
                        aria-label="Clear destination"
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-white"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>

                  <AnimatePresence>
                    {activeInput === "drop" &&
                      dropSuggestions.length > 0 && (
                        <SuggestionList
                          suggestions={dropSuggestions}
                          onSelect={(suggestion) =>
                            selectSuggestion(suggestion, "drop")
                          }
                          isDark={isDark}
                        />
                      )}
                  </AnimatePresence>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCurrentLocation}
                disabled={locationLoading}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-60 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/15"
              >
                {locationLoading ? (
                  <LoaderCircle size={17} className="animate-spin" />
                ) : (
                  <LocateFixed size={17} />
                )}

                {locationLoading
                  ? "Finding your location..."
                  : "Use my current location"}
              </button>
            </div>

            {/* Route status */}
            <AnimatePresence mode="wait">
              {routeLoading && (
                <motion.div
                  key="route-loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-sm text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300"
                >
                  <LoaderCircle size={18} className="animate-spin" />
                  Calculating route and estimated fares...
                </motion.div>
              )}

              {directions && !routeLoading && (
                <motion.div
                  key="route-ready"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/10"
                >
                  <CheckCircle2
                    size={19}
                    className="shrink-0 text-emerald-600 dark:text-emerald-400"
                  />

                  <div className="min-w-0">
                    <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                      Route calculated successfully
                    </p>
                    <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-400">
                      {distance} km · Approximately {eta} minutes
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Vehicle selection */}
            <div className="mt-8">
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-lg font-extrabold text-gray-950 dark:text-white">
                    Choose your ride
                  </h2>

                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Select the option that suits your journey.
                  </p>
                </div>

                <span className="shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400">
                  {vehiclePrices.length} options
                </span>
              </div>

              {!pickupCoords || !dropCoords ? (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-5 py-7 text-center dark:border-gray-700 dark:bg-gray-900/50">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-gray-500 shadow-sm dark:bg-gray-800 dark:text-gray-400">
                    <Search size={23} />
                  </div>

                  <p className="mt-3 text-sm font-bold text-gray-800 dark:text-gray-200">
                    Enter your route first
                  </p>

                  <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-gray-500 dark:text-gray-400">
                    Select a pickup and destination to see available ride
                    options and estimated fares.
                  </p>
                </div>
              ) : routeLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="h-[94px] animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-900"
                    />
                  ))}
                </div>
              ) : vehiclePrices.length > 0 ? (
                <div className="space-y-3">
                  {vehiclePrices.map((vehicle) => {
                    const selected = vehicleType === vehicle.id;
                    const Icon = vehicle.icon;

                    return (
                      <motion.button
                        key={vehicle.id}
                        type="button"
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => {
                          setVehicleType(vehicle.id);
                          setMessage("");
                        }}
                        aria-pressed={selected}
                        className={`relative flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-all duration-200 ${
                          selected
                            ? "border-indigo-500 bg-indigo-50/80 shadow-md shadow-indigo-500/10 ring-2 ring-indigo-500/10 dark:border-indigo-400 dark:bg-indigo-500/10 dark:ring-indigo-500/20"
                            : "border-gray-200 bg-white hover:border-indigo-200 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700 dark:hover:bg-gray-900/80"
                        }`}
                      >
                        <div className="flex h-[62px] w-[72px] shrink-0 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
                          <img
                            src={vehicle.img}
                            alt={vehicle.label}
                            className="h-[52px] w-[66px] object-contain"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">
                              {vehicle.label}
                            </h3>

                            {vehicle.id === "bike" && (
                              <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                                QUICK
                              </span>
                            )}
                          </div>

                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {vehicle.description}
                          </p>

                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                            <span className="inline-flex items-center gap-1">
                              <Clock3 size={13} />
                              {vehicle.estimatedEta} min
                            </span>

                            <span className="inline-flex items-center gap-1">
                              <Icon size={13} />
                              {vehicle.capacity}
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="text-lg font-black text-gray-950 dark:text-white">
                            ₹{vehicle.price}
                          </p>

                          <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                            Est. fare
                          </p>

                          <div
                            className={`ml-auto mt-2 flex h-5 w-5 items-center justify-center rounded-full border ${
                              selected
                                ? "border-indigo-600 bg-indigo-600 text-white dark:border-indigo-400 dark:bg-indigo-400 dark:text-gray-950"
                                : "border-gray-300 dark:border-gray-600"
                            }`}
                          >
                            {selected && <CheckCircle2 size={14} />}
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
                  <Info size={19} className="mb-2 text-amber-500" />
                  Choose different locations to calculate a route and display
                  available vehicle estimates.
                </div>
              )}
            </div>

            {/* Booking summary */}
            <div className="mt-7 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 sm:p-5">
              <div className="flex items-center gap-2">
                <Wallet size={19} className="text-indigo-600 dark:text-indigo-400" />
                <h2 className="font-extrabold text-gray-900 dark:text-white">
                  Ride summary
                </h2>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-start justify-between gap-3 text-sm">
                  <span className="text-gray-500 dark:text-gray-400">
                    Selected ride
                  </span>

                  <span className="text-right font-semibold text-gray-900 dark:text-gray-200">
                    {selectedVehicle?.label || "Choose a ride"}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-3 text-sm">
                  <span className="text-gray-500 dark:text-gray-400">
                    Distance
                  </span>

                  <span className="font-semibold text-gray-900 dark:text-gray-200">
                    {distance !== null ? `${distance} km` : "—"}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-3 text-sm">
                  <span className="text-gray-500 dark:text-gray-400">
                    Estimated duration
                  </span>

                  <span className="font-semibold text-gray-900 dark:text-gray-200">
                    {selectedVehicle
                      ? `${selectedVehicle.estimatedEta} min`
                      : eta !== null
                        ? `${eta} min`
                        : "—"}
                  </span>
                </div>

                <div className="border-t border-dashed border-gray-200 pt-3 dark:border-gray-700">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">
                        Estimated total
                      </p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Final fare may vary
                      </p>
                    </div>

                    <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                      {selectedVehicle ? `₹${selectedVehicle.price}` : "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment information */}
            <div className="mt-4 flex items-center gap-3 rounded-xl bg-gray-100 p-4 dark:bg-gray-900">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                <Wallet size={20} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  Payment method
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Cash / pay as supported by your service
                </p>
              </div>

              <span className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                Cash
              </span>
            </div>

            {/* Messages */}
            <AnimatePresence>
              {message && (
                <motion.div
                  role="alert"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className={`mt-4 flex items-start gap-3 rounded-xl border p-3 text-sm ${
                    messageType === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
                      : "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
                  }`}
                >
                  {messageType === "success" ? (
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  )}

                  <p>{message}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Confirm booking */}
            <button
              type="button"
              onClick={handleBookRide}
              disabled={
                loading ||
                routeLoading ||
                !pickupCoords ||
                !dropCoords ||
                distance === null ||
                !selectedVehicle
              }
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-4 font-extrabold text-white shadow-lg shadow-indigo-600/20 transition hover:-translate-y-0.5 hover:from-indigo-500 hover:to-blue-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/25 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {loading ? (
                <>
                  <LoaderCircle size={19} className="animate-spin" />
                  Confirming your ride...
                </>
              ) : (
                <>
                  Confirm booking
                  <ChevronRight size={20} />
                </>
              )}
            </button>

            <div className="mt-4 flex items-center justify-center gap-2 text-center text-xs leading-5 text-gray-500 dark:text-gray-400">
              <ShieldCheck
                size={16}
                className="shrink-0 text-emerald-600 dark:text-emerald-400"
              />
              Your booking is submitted securely through TransportX.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

/* =========================================================
   LOCATION SUGGESTIONS
========================================================= */

function SuggestionList({ suggestions, onSelect, isDark }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      className={`absolute left-0 right-0 top-full z-50 mt-2 max-h-64 overflow-y-auto rounded-xl border shadow-2xl ${
        isDark
          ? "border-gray-700 bg-gray-900 text-white"
          : "border-gray-200 bg-white text-gray-900"
      }`}
    >
      {suggestions.map((suggestion) => (
        <button
          key={suggestion.place_id}
          type="button"
          onClick={() => onSelect(suggestion)}
          className="flex w-full items-start gap-3 border-b border-gray-100 px-4 py-3 text-left transition last:border-b-0 hover:bg-indigo-50 dark:border-gray-800 dark:hover:bg-indigo-500/10"
        >
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            <MapPin size={16} />
          </span>

          <span className="min-w-0">
            <span className="block text-sm font-semibold">
              {suggestion.structured_formatting?.main_text ||
                suggestion.description}
            </span>

            {suggestion.structured_formatting?.secondary_text && (
              <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                {suggestion.structured_formatting.secondary_text}
              </span>
            )}
          </span>
        </button>
      ))}
    </motion.div>
  );
}
