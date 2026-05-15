import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../utils/api";
import { io } from "socket.io-client";
import { useGoogleMaps } from "../config/googleMaps";
import { GoogleMap, Marker, Polyline } from "@react-google-maps/api";
import toast, { Toaster } from "react-hot-toast";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#1e293b" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#cbd5f5" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#020617" }] }
];

export default function RideTracking() {

  const { rideId } = useParams();

  const navigate = useNavigate();

  const socketRef = useRef(null);

  const mapRef = useRef(null);

  const animationRef = useRef(null);

  const { isLoaded } = useGoogleMaps();

  const [ride, setRide] = useState(null);

  const [driverPos, setDriverPos] = useState(null);

  const [routePath, setRoutePath] = useState([]);

  const [trail, setTrail] = useState([]);

  const [heading, setHeading] = useState(0);

  const [isDark, setIsDark] = useState(false);

  const [rideStatus, setRideStatus] =
    useState("accepted");

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
      (s) => s.key === rideStatus
    );

  /* ======================================================
  THEME
  ====================================================== */

  useEffect(() => {

    const updateTheme = () => {

      setIsDark(
        document.documentElement.classList.contains(
          "dark"
        )
      );
    };

    updateTheme();

    const observer =
      new MutationObserver(updateTheme);

    observer.observe(
      document.documentElement,
      {
        attributes: true,
        attributeFilter: ["class"],
      }
    );

    return () => observer.disconnect();

  }, []);

  /* ======================================================
  FETCH RIDE
  ====================================================== */

  useEffect(() => {

    const fetchRide = async () => {

      try {

        const res =
          await api.get(
            `/ride/${rideId}`
          );

        setRide(res.data.ride);

        setRideStatus(
          res.data.ride.status ||
            "accepted"
        );

      } catch (err) {

        console.log(
          "Ride Fetch Error:",
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
      (start.lat * Math.PI) / 180;

    const lat2 =
      (end.lat * Math.PI) / 180;

    const dLon =
      ((end.lng - start.lng) *
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

    let brng = Math.atan2(y, x);

    brng = (brng * 180) / Math.PI;

    return (brng + 360) % 360;
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

      progress += 0.03;

      if (progress > 1)
        progress = 1;

      const lat =
        start.lat +
        (end.lat - start.lat) *
          progress;

      const lng =
        start.lng +
        (end.lng - start.lng) *
          progress;

      const newPos = {
        lat,
        lng,
      };

      setDriverPos(newPos);

      setTrail((prev) => [
        ...prev.slice(-40),
        newPos,
      ]);

      const angle = getBearing(
        start,
        end
      );

      setHeading(
        (prev) =>
          prev +
          (angle - prev) * 0.15
      );

      mapRef.current?.panTo(
        newPos
      );

      mapRef.current?.setZoom(17);

      if (progress < 1) {

        animationRef.current =
          requestAnimationFrame(
            step
          );
      }
    };

    animationRef.current =
      requestAnimationFrame(step);
  };

  /* ======================================================
  SOCKET
  ====================================================== */

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

  /* JOIN RIDE ROOM */

  socket.emit(
    "joinRide",
    rideId
  );

  /* ======================================================
  DRIVER MOVEMENT
  ====================================================== */

  socket.on(
    "driverMoved",
    ({ lat, lng }) => {

      setDriverPos(
        (prev) => {

          /* FIRST LOCATION */

          if (!prev) {

            return {
              lat,
              lng,
            };
          }

          /* ANIMATION */

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

  /* ======================================================
  RIDE ACCEPTED
  ====================================================== */

  socket.on(
    "rideAccepted",
    (rideData) => {

      console.log(
        "✅ Ride Accepted:",
        rideData
      );

      /* ======================================================
      UPDATE FULL RIDE
      ====================================================== */

      setRide(
        (prev) => ({

          ...prev,

          ...rideData,

          driver:
            rideData.driver,

          status:
            rideData.status,
        })
      );

      /* ======================================================
      UPDATE STATUS
      ====================================================== */

      setRideStatus(
        "accepted"
      );

      /* ======================================================
      INSTANT DRIVER LOCATION
      ====================================================== */

      if (
        rideData?.driverLocation
          ?.coordinates
      ) {

        setDriverPos({

          lat:
            rideData
              .driverLocation
              .coordinates[1],

          lng:
            rideData
              .driverLocation
              .coordinates[0],
        });
      }

      /* ======================================================
      SUCCESS TOAST
      ====================================================== */

      toast.success(
        `${rideData.driver?.name} accepted your ride`
      );
    }
  );

  /* ======================================================
  DRIVER ARRIVED
  ====================================================== */

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

  /* ======================================================
  RIDE STARTED
  ====================================================== */

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

  /* ======================================================
  RIDE COMPLETED
  ====================================================== */

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

  /* ======================================================
  PAYMENT DONE
  ====================================================== */

  socket.on(
    "paymentDone",
    () => {

      setRideStatus(
        "paid"
      );
    }
  );

  /* ======================================================
  RIDE CANCELLED
  ====================================================== */

  socket.on(
    "rideCancelled",
    () => {

      toast.error(
        "Ride Cancelled"
      );

      navigate("/");
    }
  );

  /* ======================================================
  CLEANUP
  ====================================================== */

  return () => {

    socket.off(
      "driverMoved"
    );

    socket.off(
      "rideAccepted"
    );

    socket.off(
      "driverArrived"
    );

    socket.off(
      "rideStarted"
    );

    socket.off(
      "rideCompleted"
    );

    socket.off(
      "paymentDone"
    );

    socket.off(
      "rideCancelled"
    );

    socket.disconnect();
  };

}, [rideId]);


/* ======================================================
LIVE DRIVER ROUTE
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

  /* ======================================================
  DRIVER -> USER ROUTE
  ====================================================== */

  if (driverPos) {

    directionsService.route(

      {

        origin:
          driverPos,

        destination:
          pickup,

        travelMode:
          window.google.maps.TravelMode.DRIVING,
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
        }
      }
    );
  }

  /* ======================================================
  USER -> DESTINATION ROUTE
  ====================================================== */

  directionsService.route(

    {

      origin:
        pickup,

      destination:
        drop,

      travelMode:
        window.google.maps.TravelMode.DRIVING,
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

              lat:
                p.lat(),

              lng:
                p.lng(),
            })
          );

        setRoutePath(
          path
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

  if (!ride || !isLoaded) {

    return (
      <div className="h-screen flex items-center justify-center text-xl font-bold">
        Loading...
      </div>
    );
  }

  const pickup = {
    lat: ride
      .pickupLocation.location
      .coordinates[1],

    lng: ride
      .pickupLocation.location
      .coordinates[0],
  };

  const drop = {
    lat: ride
      .dropLocation.location
      .coordinates[1],

    lng: ride
      .dropLocation.location
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
        MAP
        ====================================================== */}

        {/* ======================================================
MAP
====================================================== */}

<GoogleMap
  mapContainerStyle={{
    width: "100%",
    height: "100%",
  }}

  zoom={16}

  center={
    driverPos || pickup
  }

  onLoad={(map) =>
    (mapRef.current = map)
  }

  options={{
    disableDefaultUI: true,

    zoomControl: true,

    styles: isDark
      ? darkMapStyle
      : [],
  }}
>

  {/* ======================================================
  PICKUP
  ====================================================== */}

  <Marker
    position={pickup}

    icon={{
      url: "https://cdn-icons-png.flaticon.com/512/684/684908.png",

      scaledSize:
        new window.google.maps.Size(
          45,
          45
        ),
    }}
  />

  {/* ======================================================
  DROP LOCATION
  ====================================================== */}

  <Marker
    position={drop}

    icon={{
      url: "https://cdn-icons-png.flaticon.com/512/2776/2776067.png",

      scaledSize:
        new window.google.maps.Size(
          45,
          45
        ),
    }}
  />

  {/* ======================================================
  DRIVER TO USER LIVE ROUTE
  ====================================================== */}

  {trail.length > 1 && (

    <Polyline
      path={trail}

      options={{

        strokeColor:
          "#2563eb",

        strokeOpacity: 1,

        strokeWeight: 6,
      }}
    />
  )}

  {/* ======================================================
  USER TO DESTINATION ROUTE
  ====================================================== */}

  {routePath.length >
    1 && (

    <Polyline
      path={routePath}

      options={{

        strokeColor:
          "#22c55e",

        strokeOpacity: 1,

        strokeWeight: 6,
      }}
    />
  )}

  {/* ======================================================
  MOVING VEHICLE
  ====================================================== */}

  {driverPos && (

    <Marker
      position={
        driverPos
      }

      icon={{

        url:
          ride?.driver
            ?.vehicleType ===
          "bike"

            ? "https://cdn-icons-png.flaticon.com/512/2972/2972185.png"

            : ride?.driver
                ?.vehicleType ===
              "auto"

            ? "https://cdn-icons-png.flaticon.com/512/2554/2554936.png"

            : "https://cdn-icons-png.flaticon.com/512/744/744465.png",

        scaledSize:
          new window.google.maps.Size(
            70,
            70
          ),

        anchor:
          new window.google.maps.Point(
            35,
            35
          ),

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

          {/* ======================================================
          DRIVER CARD
          ====================================================== */}

          <div className="flex items-center justify-between mb-5">

            <div className="flex items-center gap-3">

              {/* DRIVER IMAGE */}

              <img
                src={
                  ride.driver
                    ?.profilePic ||
                  "https://cdn-icons-png.flaticon.com/512/149/149071.png"
                }
                alt="driver"
                className="w-16 h-16 rounded-full border-2 border-green-500 object-cover shadow-md"
              />

              {/* DRIVER DETAILS */}

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
              </div>
            </div>

            {/* CALL BUTTON */}

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

          {/* ======================================================
          STEP TRACKER
          ====================================================== */}

          <div className="flex items-center justify-between mb-5">

            {steps.map(
              (step, i) => (

                <div
                  key={
                    step.key
                  }
                  className="flex-1 flex flex-col items-center relative"
                >

                  <div
                    className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold
                    ${
                      i <=
                      activeIndex
                        ? "bg-green-500 text-white scale-110"
                        : "bg-gray-300 dark:bg-gray-700 text-white"
                    }`}
                  >
                    {i + 1}
                  </div>

                  <span className="text-[10px] mt-1 text-center w-16">
                    {
                      step.label
                    }
                  </span>

                  {i !==
                    steps.length -
                      1 && (

                    <div
                      className={`absolute top-4 left-1/2 w-full h-[2px]
                      ${
                        i <
                        activeIndex
                          ? "bg-green-500"
                          : "bg-gray-400"
                      }`}
                    />
                  )}
                </div>
              )
            )}
          </div>

          {/* ======================================================
          LOCATION DETAILS
          ====================================================== */}

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

          {/* ======================================================
          PRICE + CANCEL
          ====================================================== */}

          <div className="flex justify-between items-center mt-5">

            <p className="text-green-500 font-bold text-2xl">
              ₹ {ride.fare}
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