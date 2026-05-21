{/* ======================================================
LIVE DRIVER CAR WITH PREMIUM TRACKING
====================================================== */}

<style>
  {`
    @keyframes pulse {

      0% {
        transform: scale(0.8);
        opacity: 1;
      }

      100% {
        transform: scale(1.6);
        opacity: 0;
      }
    }
  `}
</style>

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
  OverlayView,
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
          "#020617",
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
          "#0f172a",
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
    useState(
      document.documentElement.classList.contains(
        "dark"
      )
    );

  const [
    rideStatus,
    setRideStatus,
  ] = useState(
    "accepted"
  );

  /* ======================================================
  THEME LISTENER
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

          toast.error(
            "Unable to load ride"
          );

          console.log(
            err.message
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
  DRIVER ANIMATION
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

      progress += 0.008;

      if (
        progress > 1
      ) {
        progress = 1;
      }

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
            -100
          ),
          newPos,
        ]
      );

      setHeading(
        getBearing(
          start,
          end
        )
      );

      if (
        mapRef.current
      ) {

        mapRef.current.panTo(
          newPos
        );

        mapRef.current.setZoom(
          18
        );
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

    socket.on(
      "driverMoved",
      ({
        lat,
        lng,
      }) => {

        const newPos = {
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
  ROUTES
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

  if (
    !ride ||
    !isLoaded
  ) {

    return (
      <div
        className={`
        h-screen
        flex
        items-center
        justify-center

        text-2xl
        font-bold

        ${
          isDark
            ? "bg-black text-white"
            : "bg-white text-black"
        }
        `}
      >
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

  const steps = [
    "Accepted",
    "Arrived",
    "Started",
    "Completed",
    "Paid",
  ];

  const activeStep =
    steps.findIndex(
      (step) =>
        step.toLowerCase() ===
        rideStatus
    );

  return (
    <>
      <Toaster position="top-center" />
      

      {/* THEME TOGGLE */}

      {/*  */}

      <div
        className={`
        min-h-screen
        w-full

        transition-all
        duration-500

        ${
          isDark
            ? "bg-black"
            : "bg-gray-100"
        }
        `}
      >

        {/* MAP */}

        <div className="relative">

          <GoogleMap
            mapContainerStyle={{
              width:
                "100%",

              height:
                window.innerWidth <
                768
                  ? "58vh"
                  : "72vh",
            }}

            zoom={15}

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

              icon={{

                url:
                  "https://cdn-icons-png.flaticon.com/512/684/684908.png",

                scaledSize:
                  new window.google.maps.Size(
                    42,
                    42
                  ),
              }}
            />

            {/* DESTINATION */}

            <Marker
              position={
                drop
              }

              icon={{

                url:
                  "https://cdn-icons-png.flaticon.com/512/2776/2776067.png",

                scaledSize:
                  new window.google.maps.Size(
                    42,
                    42
                  ),
              }}
            />

            {/* DRIVER ROUTE */}

            {trail.length >
              1 && (

              <Polyline
                path={
                  trail
                }

                options={{

                  strokeColor:
                    "#2563eb",

                  strokeOpacity:
                    1,

                  strokeWeight:
                    window.innerWidth <
                    768
                      ? 6
                      : 8,

                  geodesic:
                    true,

                  zIndex:
                    99,

                  icons: [
                    {
                      icon: {

                        path:
                          window.google
                            .maps
                            .SymbolPath
                            .CIRCLE,

                        scale:
                          2.8,

                        fillColor:
                          "#60a5fa",

                        fillOpacity:
                          1,

                        strokeOpacity:
                          0,
                      },

                      offset:
                        "0",

                      repeat:
                        "18px",
                    },
                  ],
                }}
              />
            )}

            {/* MAIN ROUTE */}

            {routePath.length >
              1 && (

              <Polyline
                path={
                  routePath
                }

                options={{

                  strokeColor:
                    "#39ff14",

                  strokeOpacity:
                    1,

                  strokeWeight:
                    5,
                }}
              />
            )}

            {/* LIVE DRIVER CAR */}
{/* LIVE DRIVER CAR */}

{driverPos && (
  <OverlayView
    position={driverPos}

    mapPaneName={
      OverlayView.FLOAT_PANE
    }
  >
    <div
      style={{

        position:
          "absolute",

        left: 0,
        top: 0,

        transform:
          `translate(-50%, -50%) rotate(${heading}deg)`,

        transition:
          "transform 0.15s linear",

        width:
          window.innerWidth < 768
            ? "48px"
            : "72px",

        height:
          window.innerWidth < 768
            ? "48px"
            : "72px",

        display:
          "flex",

        alignItems:
          "center",

        justifyContent:
          "center",

        zIndex:
          999999999,
      }}
    >

      {/* GLOW */}

      <div
        style={{

          position:
            "absolute",

          width:
            window.innerWidth < 768
              ? "70px"
              : "100px",

          height:
            window.innerWidth < 768
              ? "70px"
              : "100px",

          borderRadius:
            "999px",

          background:
            "rgba(59,130,246,0.35)",

          filter:
            "blur(20px)",

          zIndex:
            1,
        }}
      />

      {/* CAR */}

      <img
        src="https://cdn-icons-png.flaticon.com/512/3774/3774278.png"

        alt="driver-car"

        style={{

          width:
            window.innerWidth < 768
              ? "42px"
              : "64px",

          height:
            window.innerWidth < 768
              ? "42px"
              : "64px",

          objectFit:
            "contain",

          position:
            "relative",

          zIndex:
            999,

          filter:
            "drop-shadow(0 10px 18px rgba(0,0,0,0.45))",
        }}
      />

      {/* PULSE */}

      <div
        style={{

          position:
            "absolute",

          width:
            window.innerWidth < 768
              ? "65px"
              : "95px",

          height:
            window.innerWidth < 768
              ? "65px"
              : "95px",

          border:
            "2px solid rgba(59,130,246,0.45)",

          borderRadius:
            "999px",

          animation:
            "pulse 2s infinite",

          zIndex:
            0,
        }}
      />
    </div>
  </OverlayView>
)}
          </GoogleMap>
        </div>

        {/* BOTTOM PANEL */}

        <div
          className={`
          w-full

          px-3
          md:px-5

          mt-3
          md:mt-5

          pb-6
          `}
        >

          <div
            className={`
            rounded-[32px]

            p-4
            md:p-6

            shadow-2xl

            backdrop-blur-2xl

            transition-all

            ${
              isDark
                ? `
                  bg-[#0f172ae6]
                  border border-blue-500/20
                  text-white
                `
                : `
                  bg-white/90
                  border border-gray-200
                  text-gray-900
                `
            }
            `}
          >

            {/* DRIVER INFO */}

            <div
              className="
              flex
              flex-col
              lg:flex-row

              items-center
              justify-between

              gap-5
              "
            >

              <div
                className="
                flex
                items-center
                gap-4

                w-full
                "
              >

                <img
                  src={
                    ride.driver
                      ?.profilePic ||
                    "https://cdn-icons-png.flaticon.com/512/149/149071.png"
                  }

                  alt="driver"

                  className="
                  w-16 h-16
                  md:w-20 md:h-20

                  rounded-full

                  border-4
                  border-green-400

                  object-cover

                  shadow-2xl
                  "
                />

                <div className="min-w-0">

                  <h2
                    className="
                    text-2xl
                    md:text-3xl

                    font-bold

                    truncate
                    "
                  >
                    {ride.driver
                      ?.name ||
                      "Driver"}
                  </h2>

                  <p
                    className={`
                    mt-1

                    text-sm
                    md:text-base

                    ${
                      isDark
                        ? "text-gray-400"
                        : "text-gray-600"
                    }
                    `}
                  >
                    🚖 Your driver is arriving
                  </p>

                  <p
                    className="
                    mt-2

                    text-lg
                    md:text-xl

                    font-semibold
                    "
                  >
                    📞{" "}
                    {ride.driver
                      ?.phone ||
                      "No Number"}
                  </p>

                  <p
                    className="
                    mt-2

                    text-lg
                    md:text-xl

                    font-bold

                    text-blue-500
                    "
                  >
                    ⏱ ETA:
                    {" "}
                    {eta}
                  </p>
                </div>
              </div>

              {/* VEHICLE */}

              <div
                className={`
                rounded-2xl

                px-4 py-3

                flex
                items-center

                gap-3

                w-full
                lg:w-auto

                justify-center

                ${
                  isDark
                    ? "bg-black/20 border border-white/10"
                    : "bg-gray-100 border border-gray-200"
                }
                `}
              >

                <img
                  src="https://cdn-icons-png.flaticon.com/512/744/744465.png"

                  alt="car"

                  className="
                  w-20
                  md:w-28
                  "
                />

                <div>

                  <p
                    className={`
                    text-sm

                    ${
                      isDark
                        ? "text-gray-400"
                        : "text-gray-500"
                    }
                    `}
                  >
                    Vehicle
                  </p>

                  <h3
                    className="
                    text-xl
                    md:text-2xl

                    font-bold
                    "
                  >
                    Swift Dzire
                  </h3>

                  <div
                    className="
                    bg-white
                    text-black

                    px-4 py-2

                    rounded-xl

                    mt-2

                    font-bold

                    inline-block
                    "
                  >
                    UP32 AB 1234
                  </div>
                </div>
              </div>

              {/* CALL */}

              {ride.driver
                ?.phone && (

                <a
                  href={`tel:${ride.driver.phone}`}

                  className="
                  bg-green-500
                  hover:bg-green-600

                  w-16 h-16
                  md:w-24 md:h-24

                  rounded-full

                  flex
                  items-center
                  justify-center

                  text-3xl
                  md:text-5xl

                  shadow-2xl

                  transition

                  active:scale-95
                  "
                >
                  📞
                </a>
              )}
            </div>

            {/* ADDRESS */}

            <div
              className={`
              mt-6

              space-y-4

              pt-5

              border-t

              ${
                isDark
                  ? "border-white/10"
                  : "border-gray-200"
              }
              `}
            >

              <p className="text-base md:text-xl break-words">
                📍{" "}
                {
                  ride
                    .pickupLocation
                    .address
                }
              </p>

              <p className="text-base md:text-xl break-words">
                🏁{" "}
                {
                  ride
                    .dropLocation
                    .address
                }
              </p>
            </div>

            {/* STATUS TRACKER */}

            <div
              className="
              mt-8

              grid
              grid-cols-5

              gap-2
              md:gap-4
              "
            >

              {steps.map(
                (
                  step,
                  index
                ) => {

                  const active =
                    index <=
                    activeStep;

                  return (

                    <div
                      key={step}

                      className="
                      flex
                      flex-col
                      items-center

                      relative
                      "
                    >

                      {index !==
                        steps.length -
                          1 && (

                        <div
                          className={`
                          absolute
                          top-5
                          md:top-7

                          left-1/2

                          w-full
                          h-[2px]

                          ${
                            active
                              ? "bg-blue-500"
                              : "bg-gray-400"
                          }
                          `}
                        />
                      )}

                      <div
                        className={`
                        z-10

                        w-10 h-10
                        md:w-14 md:h-14

                        rounded-full

                        flex
                        items-center
                        justify-center

                        border-2

                        text-sm
                        md:text-xl

                        ${
                          active
                            ? "bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/50"
                            : isDark
                            ? "border-gray-500 text-gray-400 bg-black"
                            : "border-gray-300 text-gray-400 bg-white"
                        }
                        `}
                      >

                        {active
                          ? "✓"
                          : "○"}

                      </div>

                      <p
                        className={`
                        mt-3

                        text-[11px]
                        md:text-sm

                        font-medium

                        text-center

                        ${
                          active
                            ? "text-blue-500"
                            : "text-gray-400"
                        }
                        `}
                      >
                        {step}
                      </p>
                    </div>
                  );
                }
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}