import React, {
  useEffect,
  useState,
  useRef,
} from "react";

import {
  useParams,
  useNavigate,
} from "react-router-dom";

import api from "../utils/api";

import { io } from "socket.io-client";

import { useGoogleMaps } from "../config/googleMaps";

import {
  GoogleMap,
  Marker,
  Polyline,
} from "@react-google-maps/api";

import toast, {
  Toaster,
} from "react-hot-toast";

const SOCKET_URL =
  import.meta.env
    .VITE_SOCKET_URL;

/* ======================================================
PREMIUM DARK MAP STYLE
====================================================== */

const darkMapStyle = [
  {
    elementType:
      "geometry",
    stylers: [
      {
        color:
          "#0f172a",
      },
    ],
  },

  {
    elementType:
      "labels.text.fill",
    stylers: [
      {
        color:
          "#94a3b8",
      },
    ],
  },

  {
    elementType:
      "labels.text.stroke",
    stylers: [
      {
        color:
          "#020617",
      },
    ],
  },

  {
    featureType:
      "road",
    elementType:
      "geometry",
    stylers: [
      {
        color:
          "#1e293b",
      },
    ],
  },

  {
    featureType:
      "water",
    elementType:
      "geometry",
    stylers: [
      {
        color:
          "#0ea5e9",
      },
    ],
  },
];

export default function RideTracking() {

  const { rideId } =
    useParams();

  const navigate =
    useNavigate();

  const socketRef =
    useRef(null);

  const mapRef =
    useRef(null);

  const animationRef =
    useRef(null);

  const {
    isLoaded,
  } = useGoogleMaps();

  const [ride, setRide] =
    useState(null);

  const [
    driverPos,
    setDriverPos,
  ] = useState(null);

  const [
    routePath,
    setRoutePath,
  ] = useState([]);

  const [trail, setTrail] =
    useState([]);

  const [heading, setHeading] =
    useState(0);

  const [eta, setEta] =
    useState("");

  const [isDark, setIsDark] =
    useState(false);

  const [
    rideStatus,
    setRideStatus,
  ] = useState(
    "accepted"
  );

  const steps = [
    {
      key: "accepted",
      label:
        "Accepted",
    },
    {
      key: "arrived",
      label:
        "Arrived",
    },
    {
      key: "started",
      label:
        "Started",
    },
    {
      key: "completed",
      label:
        "Completed",
    },
    {
      key: "paid",
      label:
        "Paid",
    },
  ];

  const activeIndex =
    steps.findIndex(
      (s) =>
        s.key ===
        rideStatus
    );

  /* ======================================================
  THEME
  ====================================================== */

  useEffect(() => {

    const updateTheme =
      () => {

        setIsDark(
          document.documentElement.classList.contains(
            "dark"
          )
        );
      };

    updateTheme();

    const observer =
      new MutationObserver(
        updateTheme
      );

    observer.observe(
      document.documentElement,
      {
        attributes:
          true,
        attributeFilter:
          ["class"],
      }
    );

    return () =>
      observer.disconnect();

  }, []);

  /* ======================================================
  FETCH RIDE
  ====================================================== */

  useEffect(() => {

    const fetchRide =
      async () => {

        try {

          const res =
            await api.get(
              `/ride/${rideId}`
            );

          setRide(
            res.data.ride
          );

          setRideStatus(
            res.data.ride
              .status ||
              "accepted"
          );

          /* ======================================================
          INITIAL DRIVER LOCATION
          ====================================================== */

          if (
            res.data.ride
              ?.driverLocation
              ?.coordinates
          ) {

            setDriverPos(
              {

                lat:
                  res.data
                    .ride
                    .driverLocation
                    .coordinates[1],

                lng:
                  res.data
                    .ride
                    .driverLocation
                    .coordinates[0],
              }
            );
          }

        } catch (err) {

          console.log(
            err.message
          );

          toast.error(
            "Unable to load ride"
          );
        }
      };

    fetchRide();

  }, [rideId]);

  /* ======================================================
  DRIVER ROTATION
  ====================================================== */

  const getBearing = (
    start,
    end
  ) => {

    const lat1 =
      (start.lat *
        Math.PI) /
      180;

    const lat2 =
      (end.lat *
        Math.PI) /
      180;

    const dLon =
      ((end.lng -
        start.lng) *
        Math.PI) /
      180;

    const y =
      Math.sin(
        dLon
      ) *
      Math.cos(lat2);

    const x =
      Math.cos(lat1) *
        Math.sin(
          lat2
        ) -
      Math.sin(lat1) *
        Math.cos(
          lat2
        ) *
        Math.cos(
          dLon
        );

    let brng =
      Math.atan2(y, x);

    brng =
      (brng * 180) /
      Math.PI;

    return (
      (brng + 360) %
      360
    );
  };

  /* ======================================================
  SMOOTH DRIVER ANIMATION
  ====================================================== */

  const animateDriver = (
    start,
    end
  ) => {

    let progress = 0;

    cancelAnimationFrame(
      animationRef.current
    );

    const step = () => {

      progress += 0.015;

      if (
        progress > 1
      )
        progress = 1;

      const lat =
        start.lat +
        (end.lat -
          start.lat) *
          progress;

      const lng =
        start.lng +
        (end.lng -
          start.lng) *
          progress;

      const newPos = {
        lat,
        lng,
      };

      setDriverPos(
        newPos
      );

      setTrail(
        (prev) => [
          ...prev.slice(
            -80
          ),
          newPos,
        ]
      );

      const angle =
        getBearing(
          start,
          end
        );

      setHeading(
        angle
      );

      if (
        mapRef.current
      ) {

        mapRef.current.panTo(
          newPos
        );

        const zoom =
          mapRef.current.getZoom();

        if (
          zoom < 17
        ) {

          mapRef.current.setZoom(
            17
          );
        }
      }

      if (
        progress < 1
      ) {

        animationRef.current =
          requestAnimationFrame(
            step
          );
      }
    };

    animationRef.current =
      requestAnimationFrame(
        step
      );
  };

  /* ======================================================
  SOCKET
  ====================================================== */

  useEffect(() => {

    const socket =
      io(
        SOCKET_URL,
        {
          auth: {
            token:
              localStorage.getItem(
                "token"
              ),
          },
        }
      );

    socketRef.current =
      socket;

    socket.emit(
      "joinRide",
      rideId
    );

    /* ======================================================
    LIVE DRIVER MOVEMENT
    ====================================================== */

    socket.on(
      "driverMoved",
      ({
        lat,
        lng,
      }) => {

        const newPos =
          {
            lat,
            lng,
          };

        setDriverPos(
          (
            prev
          ) => {

            if (
              !prev
            )
              return newPos;

            animateDriver(
              prev,
              newPos
            );

            return prev;
          }
        );
      }
    );

    socket.on(
      "rideAccepted",
      (
        rideData
      ) => {

        setRide(
          (
            prev
          ) => ({

            ...prev,

            ...rideData,
          })
        );

        setRideStatus(
          "accepted"
        );

        if (
          rideData
            ?.driverLocation
            ?.coordinates
        ) {

          setDriverPos(
            {

              lat:
                rideData
                  .driverLocation
                  .coordinates[1],

              lng:
                rideData
                  .driverLocation
                  .coordinates[0],
            }
          );
        }

        toast.success(
          `${rideData.driver?.name} accepted your ride`
        );
      }
    );

    socket.on(
      "driverArrived",
      () => {

        setRideStatus(
          "arrived"
        );

        toast.success(
          "Driver arrived"
        );
      }
    );

    socket.on(
      "rideStarted",
      () => {

        setRideStatus(
          "started"
        );

        toast.success(
          "Ride started"
        );
      }
    );

    socket.on(
      "rideCompleted",
      () => {

        setRideStatus(
          "completed"
        );

        toast.success(
          "Ride completed"
        );
      }
    );

    socket.on(
      "paymentDone",
      () => {

        setRideStatus(
          "paid"
        );
      }
    );

    socket.on(
      "rideCancelled",
      () => {

        toast.error(
          "Ride Cancelled"
        );

        navigate("/");
      }
    );

    return () => {

      socket.disconnect();
    };

  }, [rideId]);

  /* ======================================================
  LIVE ROUTES
  ====================================================== */

  useEffect(() => {

    if (
      !ride ||
      !window.google
    )
      return;

    const directionsService =
      new window.google.maps.DirectionsService();

    const pickup = {

      lat:
        ride
          .pickupLocation
          .location
          .coordinates[1],

      lng:
        ride
          .pickupLocation
          .location
          .coordinates[0],
    };

    const drop = {

      lat:
        ride
          .dropLocation
          .location
          .coordinates[1],

      lng:
        ride
          .dropLocation
          .location
          .coordinates[0],
    };

    if (
      driverPos
    ) {

      directionsService.route(
        {

          origin:
            driverPos,

          destination:
            pickup,

          travelMode:
            window.google
              .maps
              .TravelMode
              .DRIVING,
        },

        (
          result,
          status
        ) => {

          if (
            status ===
            "OK"
          ) {

            const driverRoute =
              result.routes[0].overview_path.map(
                (
                  p
                ) => ({

                  lat:
                    p.lat(),

                  lng:
                    p.lng(),
                })
              );

            setTrail(
              driverRoute
            );

            setEta(
              result
                .routes[0]
                .legs[0]
                .duration
                .text
            );
          }
        }
      );
    }

    directionsService.route(
      {

        origin:
          pickup,

        destination:
          drop,

        travelMode:
          window.google
            .maps
            .TravelMode
            .DRIVING,
      },

      (
        result,
        status
      ) => {

        if (
          status ===
          "OK"
        ) {

          const route =
            result.routes[0].overview_path.map(
              (
                p
              ) => ({

                lat:
                  p.lat(),

                lng:
                  p.lng(),
              })
            );

          setRoutePath(
            route
          );
        }
      }
    );

  }, [
    ride,
    driverPos,
  ]);

  /* ======================================================
  LOADING
  ====================================================== */

  if (
    !ride ||
    !isLoaded
  ) {

    return (
      <div className="h-screen flex items-center justify-center text-xl font-bold">
        Loading...
      </div>
    );
  }

  const pickup = {

    lat:
      ride
        .pickupLocation
        .location
        .coordinates[1],

    lng:
      ride
        .pickupLocation
        .location
        .coordinates[0],
  };

  const drop = {

    lat:
      ride
        .dropLocation
        .location
        .coordinates[1],

    lng:
      ride
        .dropLocation
        .location
        .coordinates[0],
  };

  return (
    <>
      <Toaster position="top-center" />

      <div
        className={`h-screen w-full relative ${
          isDark
            ? "bg-gray-900"
            : "bg-gray-100"
        }`}
      >

        {/* ======================================================
        GOOGLE MAP
        ====================================================== */}

        <GoogleMap
          mapContainerStyle={{
            width:
              "100%",
            height:
              "100%",
          }}

          zoom={16}

          center={
            driverPos ||
            pickup
          }

          onLoad={(
            map
          ) => {

            mapRef.current =
              map;
          }}

          options={{

            disableDefaultUI:
              true,

            zoomControl:
              true,

            streetViewControl:
              false,

            mapTypeControl:
              false,

            fullscreenControl:
              false,

            styles:
              isDark
                ? darkMapStyle
                : [],
          }}
        >

          {/* ======================================================
          PICKUP MARKER
          ====================================================== */}

          <Marker
            position={
              pickup
            }

            icon={{

              url:
                "https://cdn-icons-png.flaticon.com/512/684/684908.png",

              scaledSize:
                new window.google.maps.Size(
                  45,
                  45
                ),
            }}
          />

          {/* ======================================================
          DROP MARKER
          ====================================================== */}

          <Marker
            position={
              drop
            }

            icon={{

              url:
                "https://cdn-icons-png.flaticon.com/512/2776/2776067.png",

              scaledSize:
                new window.google.maps.Size(
                  45,
                  45
                ),
            }}
          />

          {/* ======================================================
          DRIVER ROUTE
          ====================================================== */}

          {trail.length >
            1 && (

            <Polyline
              path={
                trail
              }

              options={{

                strokeColor:
                  "#2563eb",

                strokeOpacity: 1,

                strokeWeight: 8,

                geodesic:
                  true,

                icons: [
                  {
                    icon: {
                      path:
                        window.google
                          .maps
                          .SymbolPath
                          .CIRCLE,

                      scale: 3,

                      fillColor:
                        "#60a5fa",

                      fillOpacity: 1,

                      strokeOpacity: 0,
                    },

                    offset:
                      "0",

                    repeat:
                      "20px",
                  },
                ],
              }}
            />
          )}

          {/* ======================================================
          DESTINATION ROUTE
          ====================================================== */}

          {routePath.length >
            1 && (

            <Polyline
              path={
                routePath
              }

              options={{

                strokeColor:
                  "#22c55e",

                strokeOpacity: 1,

                strokeWeight: 6,

                geodesic:
                  true,
              }}
            />
          )}

          {/* ======================================================
          DRIVER PULSE
          ====================================================== */}

          {driverPos && (

            <Marker
              position={
                driverPos
              }

              icon={{

                path:
                  window.google
                    .maps
                    .SymbolPath
                    .CIRCLE,

                scale: 18,

                fillColor:
                  "#3b82f6",

                fillOpacity: 0.25,

                strokeOpacity: 0,
              }}
            />
          )}

          {/* ======================================================
          LIVE MOVING VEHICLE
          ====================================================== */}

          {driverPos && (

            <Marker
              position={
                driverPos
              }

              zIndex={999}

              icon={{

                path:
                  window.google
                    .maps
                    .SymbolPath
                    .FORWARD_CLOSED_ARROW,

                scale: 6,

                fillColor:
                  "#2563eb",

                fillOpacity: 1,

                strokeColor:
                  "#ffffff",

                strokeWeight: 2,

                rotation:
                  heading,
              }}
            />
          )}
        </GoogleMap>

        {/* ======================================================
        BOTTOM PANEL
        ====================================================== */}

        <div
          className={`absolute bottom-0 w-full rounded-t-3xl p-5 backdrop-blur-xl border-t shadow-2xl
          ${
            isDark
              ? "bg-gray-900/90 border-indigo-500/30 text-white"
              : "bg-white/95 border-gray-200 text-gray-900"
          }`}
        >

          <div className="flex items-center justify-between mb-5">

            <div className="flex items-center gap-3">

              <img
                src={
                  ride.driver
                    ?.profilePic ||
                  "https://cdn-icons-png.flaticon.com/512/149/149071.png"
                }

                alt="driver"

                className="w-16 h-16 rounded-full border-2 border-green-500 object-cover shadow-md"
              />

              <div>

                <h2 className="font-bold text-lg">
                  {ride.driver
                    ?.name ||
                    "Driver"}
                </h2>

                <p className="text-sm opacity-70">
                  🚖 Your driver is arriving
                </p>

                <p className="text-sm font-medium mt-1">
                  📞{" "}
                  {ride.driver
                    ?.phone ||
                    "No Number"}
                </p>

                <p className="text-sm font-semibold mt-1 text-blue-500">
                  ⏱ ETA:
                  {" "}
                  {eta}
                </p>
              </div>
            </div>

            {ride.driver
              ?.phone && (

              <a
                href={`tel:${ride.driver.phone}`}

                className="bg-green-500 text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl shadow-lg active:scale-95 transition"
              >
                📞
              </a>
            )}
          </div>

          <div className="space-y-2">

            <p className="text-sm">
              📍{" "}
              {
                ride
                  .pickupLocation
                  .address
              }
            </p>

            <p className="text-sm">
              🏁{" "}
              {
                ride
                  .dropLocation
                  .address
              }
            </p>
          </div>

          <div className="flex justify-between items-center mt-5">

            <p className="text-green-500 font-bold text-2xl">
              ₹{" "}
              {
                ride.fare
              }
            </p>

            {rideStatus !==
              "completed" && (

              <button
                onClick={() => {

                  socketRef.current.emit(
                    "cancelRide",
                    {
                      rideId,
                    }
                  );

                  navigate("/");
                }}

                className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-xl shadow-lg"
              >
                Cancel Ride
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}