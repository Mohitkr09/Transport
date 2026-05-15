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
  import.meta.env.VITE_SOCKET_URL;

/* ======================================================
DARK MAP STYLE
====================================================== */

const darkMapStyle = [
  {
    elementType: "geometry",
    stylers: [
      { color: "#0f172a" },
    ],
  },

  {
    elementType:
      "labels.text.fill",
    stylers: [
      { color: "#cbd5e1" },
    ],
  },

  {
    elementType:
      "labels.text.stroke",
    stylers: [
      { color: "#020617" },
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

  const { isLoaded } =
    useGoogleMaps();

  const [ride, setRide] =
    useState(null);

  const [driverPos,
    setDriverPos] =
    useState(null);

  const [routePath,
    setRoutePath] =
    useState([]);

  const [trail,
    setTrail] =
    useState([]);

  const [heading,
    setHeading] =
    useState(0);

  const [rideStatus,
    setRideStatus] =
    useState("accepted");

  const [isDark,
    setIsDark] =
    useState(false);

  const steps = [
    {
      key: "accepted",
      label: "Accepted",
    },

    {
      key: "arrived",
      label: "Arrived",
    },

    {
      key: "started",
      label: "Started",
    },

    {
      key: "completed",
      label: "Completed",
    },

    {
      key: "paid",
      label: "Paid",
    },
  ];

  const activeIndex =
    steps.findIndex(
      (s) =>
        s.key === rideStatus
    );

  /* ======================================================
  THEME
  ====================================================== */

  useEffect(() => {

    const checkTheme = () => {

      setIsDark(
        document.documentElement.classList.contains(
          "dark"
        )
      );
    };

    checkTheme();

    const observer =
      new MutationObserver(
        checkTheme
      );

    observer.observe(
      document.documentElement,
      {
        attributes: true,
        attributeFilter: [
          "class",
        ],
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

          console.log(
            "🚖 Ride:",
            res.data.ride
          );

          setRide(
            res.data.ride
          );

          setRideStatus(
            res.data.ride
              .status ||
              "accepted"
          );

          /* DRIVER LOCATION */

          if (
            res.data.ride
              ?.driverLocation
              ?.coordinates
          ) {

            setDriverPos({
              lat:
                res.data.ride
                  .driverLocation
                  .coordinates[1],

              lng:
                res.data.ride
                  .driverLocation
                  .coordinates[0],
            });
          }

        } catch (err) {

          console.log(
            err.message
          );

          toast.error(
            "Failed to load ride"
          );
        }
      };

    fetchRide();

  }, [rideId]);

  /* ======================================================
  ROTATION
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
      Math.sin(dLon) *
      Math.cos(lat2);

    const x =
      Math.cos(lat1) *
        Math.sin(lat2) -
      Math.sin(lat1) *
        Math.cos(lat2) *
        Math.cos(dLon);

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
  ANIMATE DRIVER
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

      progress += 0.03;

      if (progress > 1)
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

      setDriverPos(newPos);

      setTrail(
        (prev) => [
          ...prev.slice(
            -40
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
        (prev) =>
          prev +
          (angle -
            prev) *
            0.15
      );

      mapRef.current?.panTo(
        newPos
      );

      if (progress < 1) {

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

    const socket = io(
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

    /* DRIVER MOVEMENT */

    socket.on(
      "driverMoved",
      ({ lat, lng }) => {

        setDriverPos(
          (prev) => {

            if (!prev)
              return {
                lat,
                lng,
              };

            animateDriver(
              prev,
              {
                lat,
                lng,
              }
            );

            return prev;
          }
        );
      }
    );

    /* STATUS */

    socket.on(
      "rideAccepted",
      (rideData) => {

        setRide(
          rideData
        );

        setRideStatus(
          "accepted"
        );
      }
    );

    socket.on(
      "driverArrived",
      () =>
        setRideStatus(
          "arrived"
        )
    );

    socket.on(
      "rideStarted",
      () =>
        setRideStatus(
          "started"
        )
    );

    socket.on(
      "rideCompleted",
      () =>
        setRideStatus(
          "completed"
        )
    );

    socket.on(
      "paymentDone",
      () =>
        setRideStatus(
          "paid"
        )
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

    return () =>
      socket.disconnect();

  }, [rideId]);

  /* ======================================================
  ROUTE
  ====================================================== */

  useEffect(() => {

    if (
      !ride ||
      !window.google
    )
      return;

    const pickup = {
      lat: ride
        .pickupLocation
        .location
        .coordinates[1],

      lng: ride
        .pickupLocation
        .location
        .coordinates[0],
    };

    const drop = {
      lat: ride
        .dropLocation
        .location
        .coordinates[1],

      lng: ride
        .dropLocation
        .location
        .coordinates[0],
    };

    const service =
      new window.google.maps.DirectionsService();

    service.route(
      {
        origin:
          pickup,

        destination:
          drop,

        travelMode:
          "DRIVING",
      },

      (
        result,
        status
      ) => {

        if (
          status ===
          "OK"
        ) {

          const path =
            result.routes[0].overview_path.map(
              (
                p
              ) => ({
                lat: p.lat(),
                lng: p.lng(),
              })
            );

          setRoutePath(
            path
          );
        }
      }
    );

  }, [ride]);

  /* ======================================================
  LOADING
  ====================================================== */

  if (
    !ride ||
    !isLoaded
  ) {

    return (
      <div className="h-screen flex items-center justify-center bg-black text-white text-xl font-bold">
        Loading Ride...
      </div>
    );
  }

  const pickup = {
    lat: ride
      .pickupLocation
      .location
      .coordinates[1],

    lng: ride
      .pickupLocation
      .location
      .coordinates[0],
  };

  const drop = {
    lat: ride
      .dropLocation
      .location
      .coordinates[1],

    lng: ride
      .dropLocation
      .location
      .coordinates[0],
  };

  return (
    <>
      <Toaster position="top-center" />

      <div className="h-screen w-full relative overflow-hidden">

        {/* ======================================================
        MAP
        ====================================================== */}

        <GoogleMap
          mapContainerStyle={{
            width: "100%",
            height: "100%",
          }}

          zoom={15}

          center={
            driverPos ||
            pickup
          }

          onLoad={(
            map
          ) =>
            (mapRef.current =
              map)
          }

          options={{
            disableDefaultUI: true,
            zoomControl: true,
            styles:
              isDark
                ? darkMapStyle
                : [],
          }}
        >

          {/* PICKUP */}

          <Marker
            position={
              pickup
            }
          />

          {/* DROP */}

          <Marker
            position={
              drop
            }
          />

          {/* DRIVER */}

          {driverPos && (

            <Marker
              position={
                driverPos
              }

              icon={{
                url: "https://cdn-icons-png.flaticon.com/512/744/744465.png",

                scaledSize:
                  new window.google.maps.Size(
                    60,
                    60
                  ),

                anchor:
                  new window.google.maps.Point(
                    30,
                    30
                  ),

                rotation:
                  heading,
              }}
            />
          )}

          {/* ROUTE */}

          {routePath.length >
            1 && (

            <Polyline
              path={
                routePath
              }

              options={{
                strokeColor:
                  "#16a34a",

                strokeWeight: 6,
              }}
            />
          )}

          {/* TRAIL */}

          {trail.length >
            1 && (

            <Polyline
              path={
                trail
              }

              options={{
                strokeColor:
                  "#2563eb",

                strokeWeight: 5,
              }}
            />
          )}
        </GoogleMap>

        {/* ======================================================
        GLASS PANEL
        ====================================================== */}

        <div className="absolute bottom-0 left-0 w-full z-50">

          <div className={`rounded-t-[35px] p-5 shadow-2xl border-t backdrop-blur-2xl
          ${
            isDark
              ? "bg-gray-900/95 border-indigo-500/30 text-white"
              : "bg-white/95 border-gray-200 text-gray-900"
          }`}>

            {/* DRIVER CARD */}

            <div className="flex items-center justify-between">

              <div className="flex items-center gap-4">

                <img
                  src={
                    ride
                      .driver
                      ?.profilePic ||
                    "https://cdn-icons-png.flaticon.com/512/149/149071.png"
                  }

                  alt="driver"

                  className="w-20 h-20 rounded-full border-4 border-green-500 shadow-xl object-cover"
                />

                <div>

                  <h2 className="text-2xl font-bold">
                    {ride
                      .driver
                      ?.name ||
                      "Driver"}
                  </h2>

                  <p className="text-sm opacity-70">
                    🚖 Driver is arriving
                  </p>

                  <div className="mt-2 font-medium text-sm">
                    📞{" "}
                    {ride
                      .driver
                      ?.phone ||
                      "No Number"}
                  </div>

                  {ride
                    .driver
                    ?.vehicle
                    ?.number && (

                    <div className="mt-1 text-xs opacity-80">
                      🚘{" "}
                      {
                        ride
                          .driver
                          .vehicle
                          .number
                      }
                    </div>
                  )}
                </div>
              </div>

              {/* CALL */}

              {ride.driver
                ?.phone && (

                <a
                  href={`tel:${ride.driver.phone}`}

                  className="bg-green-500 hover:bg-green-600 transition text-white w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-2xl"
                >
                  📞
                </a>
              )}
            </div>

            {/* ETA */}

            <div className="mt-5 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-4 text-white shadow-xl">

              <div className="flex justify-between items-center">

                <div>

                  <div className="text-sm opacity-80">
                    Estimated Arrival
                  </div>

                  <div className="text-2xl font-bold">
                    3 mins
                  </div>
                </div>

                <div className="text-right">

                  <div className="text-sm opacity-80">
                    Ride Fare
                  </div>

                  <div className="text-3xl font-bold">
                    ₹{ride.fare}
                  </div>
                </div>
              </div>
            </div>

            {/* STEP TRACKER */}

            <div className="flex items-center justify-between mt-6">

              {steps.map(
                (
                  step,
                  i
                ) => (

                  <div
                    key={
                      step.key
                    }

                    className="flex-1 flex flex-col items-center relative"
                  >

                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-lg
                    ${
                      i <=
                      activeIndex
                        ? "bg-green-500 text-white scale-110"
                        : "bg-gray-300 dark:bg-gray-700 text-white"
                    }`}>

                      {i + 1}
                    </div>

                    <span className="text-[11px] mt-2 text-center">
                      {
                        step.label
                      }
                    </span>

                    {i !==
                      steps.length -
                        1 && (

                      <div className={`absolute top-5 left-1/2 w-full h-[3px]
                      ${
                        i <
                        activeIndex
                          ? "bg-green-500"
                          : "bg-gray-300"
                      }`} />
                    )}
                  </div>
                )
              )}
            </div>

            {/* LOCATIONS */}

            <div className="mt-6 space-y-4">

              <div className="flex gap-3">

                <div className="text-pink-500 text-xl">
                  📍
                </div>

                <div>
                  <p className="text-xs opacity-70">
                    Pickup
                  </p>

                  <p className="font-medium">
                    {
                      ride
                        .pickupLocation
                        .address
                    }
                  </p>
                </div>
              </div>

              <div className="flex gap-3">

                <div className="text-green-500 text-xl">
                  🏁
                </div>

                <div>
                  <p className="text-xs opacity-70">
                    Destination
                  </p>

                  <p className="font-medium">
                    {
                      ride
                        .dropLocation
                        .address
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS */}

            <div className="flex gap-3 mt-6">

              <button
                onClick={() => {

                  socketRef.current.emit(
                    "cancelRide",
                    {
                      rideId,
                    }
                  );

                  toast.success(
                    "Ride Cancelled"
                  );

                  navigate(
                    "/"
                  );
                }}

                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-4 rounded-2xl font-bold shadow-xl transition"
              >
                Cancel Ride
              </button>

              {ride.driver
                ?.phone && (

                <a
                  href={`tel:${ride.driver.phone}`}

                  className="bg-green-500 hover:bg-green-600 text-white px-6 rounded-2xl flex items-center justify-center text-2xl shadow-xl"
                >
                  📞
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}