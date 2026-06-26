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
import taxi_image from "../assets/services/taxi_image.png"
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
  src={taxi_image}
  alt="driver-car"
  style={{
    width: window.innerWidth < 768 ? "42px" : "64px",
    height: window.innerWidth < 768 ? "42px" : "64px",
    objectFit: "contain",
    position: "relative",
    zIndex: 999,
    filter: "drop-shadow(0 10px 18px rgba(0,0,0,0.45))",
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

         {/* DRIVER INFO - IMPROVED RESPONSIVE */}
<div className="flex flex-col xl:flex-row items-center justify-between gap-4 md:gap-6">
  
  {/* Left Section: Driver Avatar & Details */}
  <div className="flex items-center gap-3 sm:gap-4 md:gap-5 w-full">
    
    {/* Driver Avatar */}
    <img
      src={ride.driver?.profilePic || "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
      alt="driver"
      className="
        w-12 h-12 sm:w-14 sm:h-14 
        md:w-16 md:h-16 
        lg:w-20 lg:h-20
        rounded-full 
        border-4 border-green-400 
        object-cover shadow-2xl 
        flex-shrink-0
      "
    />

    {/* Driver Details */}
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold truncate">
          {ride.driver?.name || "Driver"}
        </h2>
        
        {/* Vehicle Badge */}
        <span className="
          px-2 sm:px-3 py-0.5 sm:py-1 
          text-xs sm:text-sm font-semibold 
          bg-blue-500/20 rounded-full 
          border border-blue-500/30 
          whitespace-nowrap
        ">
          🚗 {ride.driver?.vehicle?.type || "Sedan"}
        </span>
      </div>

      <p className={`
        mt-0.5 sm:mt-1 
        text-xs sm:text-sm md:text-base
        ${isDark ? "text-gray-400" : "text-gray-600"}
      `}>
        🚖 Your driver is arriving
      </p>

      {/* Contact & ETA - Grouped for better responsiveness */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1 sm:mt-2">
        <p className="text-sm sm:text-base md:text-lg font-semibold">
          📞 {ride.driver?.phone || "No Number"}
        </p>
        <span className="hidden xs:inline text-gray-400">•</span>
        <p className="text-sm sm:text-base md:text-lg font-bold text-blue-500">
          ⏱ ETA: {eta || "Calculating..."}
        </p>
      </div>
    </div>
  </div>

  {/* Right Section: Call Button - Improved Touch Target */}
  {ride.driver?.phone && (
    <a
      href={`tel:${ride.driver.phone}`}
      className="
        bg-green-500 hover:bg-green-600 active:scale-95
        w-12 h-12 sm:w-14 sm:h-14 
        md:w-16 md:h-16 
        lg:w-20 lg:h-20
        rounded-full flex items-center justify-center
        text-2xl sm:text-3xl md:text-4xl lg:text-5xl
        shadow-2xl transition-all duration-200
        hover:shadow-green-500/30
        flex-shrink-0
      "
      aria-label="Call driver"
    >
      📞
    </a>
  )}
</div>

{/* ADDRESSES - IMPROVED RESPONSIVE */}
<div className={`
  mt-4 sm:mt-5 md:mt-6 
  space-y-3 sm:space-y-4 
  pt-4 sm:pt-5 
  border-t 
  ${isDark ? "border-white/10" : "border-gray-200"}
`}>
  
  {/* Pickup Address */}
  <div className="flex items-start gap-2 sm:gap-3">
    <span className="text-lg sm:text-xl md:text-2xl flex-shrink-0 mt-0.5">📍</span>
    <p className="text-sm sm:text-base md:text-lg lg:text-xl break-words flex-1">
      {ride.pickupLocation.address}
    </p>
  </div>
  
  {/* Drop-off Address */}
  <div className="flex items-start gap-2 sm:gap-3">
    <span className="text-lg sm:text-xl md:text-2xl flex-shrink-0 mt-0.5">🏁</span>
    <p className="text-sm sm:text-base md:text-lg lg:text-xl break-words flex-1">
      {ride.dropLocation.address}
    </p>
  </div>
</div>

{/* STATUS TRACKER - HIGHLY RESPONSIVE */}
<div className="mt-6 sm:mt-7 md:mt-8">
  
  {/* Desktop/Tablet View */}
  <div className="hidden sm:grid grid-cols-5 gap-2 md:gap-3 lg:gap-4">
    {steps.map((step, index) => {
      const active = index <= activeStep;
      const isCurrent = index === activeStep;
      
      return (
        <div key={step} className="flex flex-col items-center relative status-step">
          
          {/* Progress Line */}
          {index !== steps.length - 1 && (
            <div className={`
              absolute top-4 sm:top-5 md:top-6 lg:top-7 
              left-1/2 
              w-full h-[2px] md:h-[3px] 
              transition-all duration-500
              ${active ? "bg-blue-500" : "bg-gray-400"}
            `} />
          )}

          {/* Step Circle */}
          <div className={`
            z-10
            w-8 h-8 sm:w-10 sm:h-10 
            md:w-12 md:h-12 
            lg:w-14 lg:h-14
            rounded-full flex items-center justify-center
            border-2 md:border-3
            text-xs sm:text-sm md:text-lg lg:text-2xl
            transition-all duration-500
            ${active 
              ? "bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/50" 
              : isDark 
                ? "border-gray-500 text-gray-400 bg-black" 
                : "border-gray-300 text-gray-400 bg-white"
            }
            ${isCurrent ? "ring-2 md:ring-4 ring-blue-400/50 scale-110" : ""}
          `}>
            {active ? "✓" : "○"}
          </div>

          {/* Step Label */}
          <p className={`
            mt-2 sm:mt-2.5 md:mt-3
            text-[10px] sm:text-xs md:text-sm lg:text-base
            font-medium text-center
            transition-all duration-300
            ${active 
              ? "text-blue-500 font-bold" 
              : isDark 
                ? "text-gray-500" 
                : "text-gray-400"
            }
            ${isCurrent ? "scale-105 sm:scale-110" : ""}
          `}>
            {step}
          </p>
          
          {/* Current Step Indicator */}
          {isCurrent && (
            <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 md:w-2 md:h-2 rounded-full bg-blue-500 mt-1 animate-pulse" />
          )}
        </div>
      );
    })}
  </div>

  {/* Mobile View - Compact Status Tracker */}
  <div className="sm:hidden">
    <div className="flex items-center justify-between gap-1 mb-3">
      {steps.map((step, index) => {
        const active = index <= activeStep;
        const isCurrent = index === activeStep;
        
        return (
          <div key={step} className="flex flex-col items-center flex-1">
            <div className={`
              w-7 h-7 rounded-full flex items-center justify-center
              text-xs font-bold transition-all duration-300
              ${active 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" 
                : isDark 
                  ? "bg-gray-700 text-gray-500" 
                  : "bg-gray-200 text-gray-400"
              }
              ${isCurrent ? "ring-2 ring-blue-400 scale-110" : ""}
            `}>
              {index + 1}
            </div>
            <p className={`
              text-[8px] mt-1 font-medium text-center
              ${active ? "text-blue-500" : isDark ? "text-gray-500" : "text-gray-400"}
              ${isCurrent ? "font-bold" : ""}
            `}>
              {step}
            </p>
          </div>
        );
      })}
    </div>
    
    {/* Mobile Progress Bar */}
    <div className="w-full h-1 bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden">
      <div 
        className="h-full bg-blue-500 transition-all duration-500 rounded-full"
        style={{ width: `${(activeStep / (steps.length - 1)) * 100}%` }}
      />
    </div>
  </div>
</div>

{/* STATUS MESSAGE - Always visible */}
<div className="mt-3 sm:mt-4 md:mt-5 text-center">
  <p className={`
    text-xs sm:text-sm md:text-base font-medium
    ${rideStatus === "completed" || rideStatus === "paid"
      ? "text-green-500"
      : "text-blue-500"
    }
    animate-pulse
  `}>
    {rideStatus === "accepted" && "🔄 Driver is heading to your location"}
    {rideStatus === "arrived" && "📍 Driver has arrived at your location"}
    {rideStatus === "started" && "🚗 Ride in progress"}
    {rideStatus === "completed" && "✅ Ride completed successfully"}
    {rideStatus === "paid" && "💳 Payment confirmed"}
  </p>
</div>
          </div>
        </div>
      </div>
    </>
  );
}