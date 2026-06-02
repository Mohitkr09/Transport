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
        src="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBwgHBgkIBwgKCgkLDRYPDQwMDRsUFRAWIB0iIiAdHx8kKDQsJCYxJx8fLT0tMTU3Ojo6Iys/RD84QzQ5OjcBCgoKDQwNGg8PGjclHyU3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3N//AABEIAJQBBwMBEQACEQEDEQH/xAAcAAEAAQUBAQAAAAAAAAAAAAAAAQIDBAUGBwj/xABNEAABAwMABQYHDAYIBwAAAAABAAIDBAURBhIhMVEHExVBYZEiMlVxkrHRFBYXQlJTVIGCk6GyMzRydMHSNkNERWNzlOEjJDVig8Li/8QAGwEBAAIDAQEAAAAAAAAAAAAAAAEFAgMEBgf/xAA3EQACAQMCAwUGBQQCAwAAAAAAAQIDBBEFEiExURMUFUFSBiJCYXGhFjIzU4E0YpGxI8HR4fD/2gAMAwEAAhEDEQA/APcUAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAQgCAICUAQBAEAQBAEAQBAEBGsgYygCgEqQEAQBAEAQBAEAQBAEAQBAEBS54b1hAWH1kbDtcFGQWZbrTRDL5GNxxcFrlWpx5s2QpTmsxRiSaS21n9oDv2Wk+pcstStl8aOmOn135FA0ptvzrvrjcP4LWtWtc8ZGfhtx0KhpLbvpDO4rZ4lbetGt2FfoVDSO3ndURH7Sy8QtvWjF2df0k++Ci+fi9JZ99t/WjHulf0k9P0XzzO9Srui+UkO61lziT05SfOM9JZd4p+pGPYVPST03TfOM707en6kR2Uug6ap/lBZKtDqiOzl0J6apvlBT2keqI2S6E9MU/y2qe0j1I2MdMwfKb3pvXVDYx0xT/KHem9dRtZaqbszmHGCRnOY2Lmu6klSk6bWUbKUE5pS5GLRX15dzdWB2PCptP1pzn2dY669klHdBmx6Wp+tw716HtI45o4NkuhBvNI3xpWDzlYu4pr4kZqhUfkSLxSO8WVh+0EVxSfKSDozXkVi5wfLafrWSqRfmY7JdCoXGA/Hb3rLcY4LjayF257e9TkYLweHbiCiZBOVIJQBAEAQBAQSgLUkuqoyDS3K4iBpOfMtVSpGEd0jbGDm8ROKuN8uFbVuorU0CRuDLM7xYh7VT19Uio7/Ly+Z6G00ulTpqtcPnyXmW6eyuHh1lXPUSneS8tGfMFQVdQlN8OR3SulyhFJGxFGOA+vauHtmaHWZIpGDrb3LHtZEOqzCvNZQWSgNZXvc2MHA1WFxceAC67WjVuqmyBpq3fZrLOFquUdpkIorV4A3GeYBx+oA+tegpaBHbmczglqsvJFkco1R5Kp/vz/ACrb+H6fr+xj4tU6FQ5R5fJEH+oP8qw8Ah+59ifFZdCsco7vI7P9R/8AKx/D8f3PsR4q/SSOUZvkcffj+VR+H/7zLxX+0qHKPF5Hd9+PYo8Al+4PFP7SscpEHkeX75vsTwCf7g8UXpKhykUvkmp+qRvtTwKr+4PE4ekq+Eii8m1fps9qjwOt+5/snxOHpKxyj0BGy3V2fOzH5lPglf8Ac/2FqVN/CVs5RLc7Abb7gXcGtYf/AGWMtFrxXGojPxCn6TbQaVVFbTuFHYrk5+DqF8QDc9WTrLhlptOnL36qMlc7vyxNjb5qialY+50Qo5ceG0yNI+rByue4pqMttKTaOilVbjmawXYZaKaQxwTU8jxvax7SQuedKrBZlFo2qtTfJmR7nYfiDuWnezZvJEAG5oCyVaa5Mh4ZVqOHxz3raryuvjZrdOm/IuRvezGXEjz4Wynf14vLkzXO3pyXBG2t8pcf+WrjFJ83NtHeru11CVXhGeH0f/kra1vs4yjw+Ru6KukdIKasi5qfeOsPHYVb0blufZ1FiRx1KKUd8Hlf6NiNq7TQVIAgCAICiQ4UMGtrJcNJ4LFmSOTu0pfLjgqLW6mIRivNlrpkU5tswbJQe5qMa7fDkcXyE/GJOV5m7uN8uBb3NbfL6HMabaYT2uvdbrQGc+xoM0z25Azt1QOOMd6utL0mFan21Xl0Ka5vJRe2JzTNNdIRuq4z+3CD6iFcPRbOXOJy98qoy4NOr4DmQUb28OYcD+daJaDaeWV/P/ozjf1fkb7R7SapvdeKGso6YxvY5zztO4dYKr77S6dpT7WnJpnRb3TrS2SRuZNELFM4ySW6DWO/VyB3AqrWrXUeCmdLtqOfylPvLsHk6L0ne1T4xd+sju1D0ke8qweTou8+1PGLz1ju1HoPeVYPJ0XpO9qnxi89Y7tR6E+8rR/ybD3n2p4vd+sd1o9B7y7B5Oi73e1T4td+sd2o+ke8qweTYe93tTxa79Y7tR9I95Vg8nRd7vap8Vu/WO7UPSPeXYPJsPe72p4rd+sd1o+kpdorZaVj5IbZTlzWkjWBdtA7UWoXVSSjKbJ7vSisqJwx0nuUQIpYqClbk7IaQA95P8F6eOl0Wk5tv+SrdzKLaikjBqr/AHiozztzqSD1NdqY9HC6Iafaw5QRrdzWfxGqme+X9NJJL2yvL/WuqMIR/KkjU5SfNlqOWSlmjnpHc1NEcse3Yc8PN2JUgqkdkuKEZOL3I9q0dugvNnprgMAyMGu0dThsI714C+tuwryh0PQ0Kqq000bMHjhcRuwVDUPUhi8lXNNKEbmUvhJ3KeHMlT6m0oa0VELaWodqzx+FBI7iOor0NjexrQVKrwkuTK6vQ2S3w4p8zoqKf3RTxyjZkbRwPWF6W3qqpTTKycdssMyVvMAgCAIC1McKAaS5P2OCwZmjlqpxfUY7V5fXKnvxj/Jd6bDEJSM9gGAOA2rzXN/ybZPgzwS8VLqy93GocSedqZCP2Q4gfgAvpVrTVOhBLyS/0efqPdNtlli3mJeZuQg7Dk4hD7xPIRkRwEA+chUOvzxQS6lhp699s9JaNmF4qXMtmSoII2LPHEcSUAUgpe9sbC95DWt3knCzjFyeEQ3hcSx0jRDfVQ+mFt7Cp6THenyKo62llfzcM8T3ncGuyVLoVFxwN6L61fQzLc7dZpHEELOL95Mc1g8SqW6k8reD3D8V9FovNKP0R5yaxJ/UxXLYYlpyEll6IHoPJNVF1JcaEuJ5qYSsB6g4e0FeX9oKWJQqJFpps+DR3+F5stMjxRt9SEZySD2qWug+RUHlY4IwimQ5TLzklLBtdCbrHVyXG3guE1FM3XDutr25Dh2HavbaNGUbZZfMpL/Dq8Dq1bnEEAQBAY9QVBKNBc3+MsGZo5xvh1QHavFarU3XEvkehtltt0Zs8ghpJ5TuZG55PmCqaK3VIR+ZqqPEWz54p3OfG17jlxbkntK+n4xwPP5MliEl5iEHe8mcf6/J2Mb615n2hlxgiz05c2d4F5IsyVBBwWlM2lcOlUZtbqltqaIzIWNaWgZOtvHBensIWU7XFRLfxK2s6va5XI6623q23V72W6ugqXMGXCJ2cBU1ezrUFmpHB2wqwnyZnrlNpi3ED3O0EAjnWetdNu8N/Q11DYQ09O6CofLEzwNuSNymknKnJrma6snFpI1stXQVDYhQTwSuZOzW5s5xvSjSrU5t1Fjg+ZhvTZmLSuCOsEZcPOp8weJXMYuFW3hM8fivolq80Yv5HnqqxORguW9GstOQksvQHVclk2ppNUwDdLSa3ouHtVJrsc2qfRnbYPFXB6xtG1ePLls4nT92k7KikGjPujU1Dzgia07c7N6vtJVo4Pt0slfd9ru9w6C03u3VfM0bK+KWvEY5yIO8LWA8LIVfc2dWm3U2+6dFKtF4jnibbC4TpIcNhQJmu0alNHymQjWIjuNtexzeMkbwQfRJXr9CqKVu4dGVOpQ21U0eoq8K0IAgIKAxak4WJKOdujvGWDM0aOjGajPWASvAXkt1WT+bPSJYoxI0leYdGLxK3eyhmI8+oVhp8d11TT6o5Lh4ps8GiAaABuAwvo74vJRGQxCS8xCD0bkzaPcFc7/GaPwXlfaB/wDJFfIttP8Ays7TYvLFgEIOI0p00ltmkLbE2iY9tQxrTKZCCNfI3YXo7DS4VKCuHLiuP+CvrXLU9hm6IaEwaL1NRLDVyzmdgYQ9gGMHK59R1SV5BQccYZst7bspbsnVKnOwxbj+gb/ms9a6bdcX9DXUNnE7Voqtw1djSfC3buvsWdvHdCSZpr8Gjm6C5i5MaWUkdK2OWPLcAOedvhDHxeC6qlr2Dy57sp//AH1NNKak+Ru1XFgOsedAeLXsat4r8dU7/WvoVnxoR+h5+t+pI1rl0motOQksvQg6Hk4fq6Z0w+XBI31Kr1lZtH8sHXafrI9jXicF0cjpvpm/RWemjiomVHPsLsmTVxgq40zTIXkXNyawcdzculLBRo3oXDQ3ePSBtXK+WdpeYiwao1xnYVne6k50Xb44L/owoW+J9pk7LCozvII2FCUaFzuZ010VlGwmrliJ7HRO2d4XpPZ6WJTRxap+WLPW16cpggCAgoDEqliyUc5dPjLBmaNNRfrH1FfPbrhKX1PSv9JFnSv+iV7/AHGb8hWem/1lP6o4br9N/Q8LYvohSF9iEl5iEHpXJnjoqs/eB+VeS9oP1l9C2sPys63brYxsXmiwK1BBzOkF3sFPXPoqwxG5SRgM1o8nJ8XarqytruUVUjwhnr/k461Wknta4ms5PbJpFa6yrffZpJI3xgR685kwc7d66dWurStTSoLjnoa7WnVjL3zuV58sDFuP6Bv+az1rqt+b+hrqGzhcG0VW4tLg1pOqOvsU0FmnJGmvwaOZoLub04v9zRU7YJomBpdmQZ24dw8y7KtmrbC35yn9P4NNKopy5G9VaiwJ6wgPF79/1mv/AHhy+hWf9PH6Hnq36kjVuXSay05CSy9Ab3k9/prQY3aknqVdq2O6SOi0f/Mj2kYXhi8NDpBd7BbJoW33mtdzcs149bZnarGzt7mqm6Twjlr1KUX76Ob0Us+kEGk4uFVPIbU8SGOMzktDT4vg7grK9ubWVv2cUt65nPQp1FU3PkehrzhZEE7FAOcr8nSfRYjf0oPyOXofZ/8AVn9EcmqfpxPXl6opQgCAgoDEqQsWSc9c2+MsGZo0dJsqBngV4G/jtqzXzPSReaKZTpMwy6MXiJoyX0MwHn1CsNPltu6b+aOS4WabPCIyC0EdYC+jFEX2ISXmIQej8mbh0dWM6xOD+C8p7QL/AJIstrD8rOyC8sWBKkg5bSDRO119yN3qJZG1kLAWASADwdo2K8sdQrQpqhFZi3/s4q1CDe/PEwtAdKrrpDWVUVzpWQNijDmlrC3JJx1rbqun0bWmp03xMbavOo8SO2VCd5jXH9A3/NZ6102/N/Q11DYB7ordWyNGXMYXAdoC22sFOLi+pouODWDSQ1fuyCnllt8tNO58Rc97ANfzEb1m6bpzcVPcsPCNdOWXnBtFx5O8n4w86EM8VvTta71zuo1D/WvoVp/Tw+hQVv1Ga1y6TUWnISWXoDoeTaPW0ypyP6unkd6h/FVWsyxaP5nTZrNU9kyvFIu2c/pLota9Ip6d1ykkaYmlrdV4aMEqxsb+vbxaprKOWvQhUeZM0Gi2lF0q9JBZp6RjKKIPa2TmyCQ0bNu5WF9Y0YWzrrm/+zVQrTdTY+R3+V50sMEE7CoZODQhpn060XgaNoqJp3eZsZH8V6b2fjxnL+Dh1R+7FHra9MUwQBAEBjVAUEmhuTc6ywZmjnG+BUjPHC8Xq9PbcS+fEv7SW63x0MypjE1JUROGRJE5uPOMKpoy21Yv5mFVe4z55gaY2NY7xgA09hX07OVkoGsGSxAXmIQd7yZy7a+I8GO9a8x7Qr8jLPTnlSR3gXk3zLMlAcLpNohc7ppTDc6aqjjpmamtGXnJwclejs9UoUbV0pLjxK+rbTnV3J8DuQxrTlrWt8wwqGVRy/MztUUuRKxMjFuP6qHbcNkaTgbhldNv+Zo11C9HeKOOOaNxc7X3YYfYtsKU4waxxMJxU2mizPW09WKdlOSXiZp1dQjAGclaqNvOm5OXRkYMpauJ0EE4IUjB4lcHa1dVHjM8/ivolssUIr5I87WeZv6mE5bzAtOQksvQHW8lcGvpHV1A3Q0ur6Tv9lR69PFtGPVndYRzUyeqryCZcYON090WuWkE9K+3VTIREwtdl5BJz2K70zUKNtTamjhuredWWYnVUdPzFLBG8M5xjA1xA3kDqVVWq75uS5HVTgoxRkLQbCHnYhKRrtEojXcpcs2P+FbLbqHsklfn8oK9lodPZb7vUyn1Ge6ql0PUVdFeEAQBAWZxluVANJcGZz2rFmaOYrG6s2V5nXIYlGXyLrTX7sombG7XDSNxG9eXeUzfOPNM8GvdKaC+XGlcMc3UyAfsl2s38HBfSbSp2tCE10X+fM8/Ujtm0ywxdBgXmIQdhyczal3mjJ8eA484IKotfhm3T6M79OeJtHpLfFyvFPmXD5kqCAsiMBSTgIApRjgLIYRONpKlMYIUklud2o1x4NJWUFmaQ+HJ4jUO1pZHnre4/ivotJYpxXyR5yb95mM5bDEtOQksvQHo3JNRmO21ta5v6zPqxni1ox68ryvtBVTnGmvItdOg1FyZ3eV50syM52AJkFQY5MmLaKxHxKjJDkUOGu4MjaXOO4DeVnTjKc0ooncorLN3odboqRlZUthbHNUT5kcN78DG1ez0eNSNulU/gpL5xdT3TpFbnGEAQBAW5BkYUA1lZHrdSxaMkctdoi1+tjzqm1mhKpSUo+RZadVjGo0/M1dirdaJ9NKSJ6dxa5p3kZ2HuXmbuik1NcmXlzR24muTNbpVodT36YVkM3uas1Q0vxrNfjiF2adq8rSPZyWYlRXs1Ue5Ggh5OKv+tukH2YD/ADK0l7R0vKD/AMmhadLzZmR8nbB+kuUh/YjH+60S9o35QM1py9RmU9kteijxdKy4yNa3LAZAMEnqwBvWmpf19Sg6MYGcaNO2e9ssycpVpjk1GQVT2g+MGgZWK9nq8lltB6jSzyZT8Jtr+jVXohT+Ha3qRj4jS6MfCba/o1V3BPw9W6onxGn0Y+E21fRaruCn8PVuqHiNL5j4TbV9Fqu4J+Hq3qRHiNLox8Jtr+i1XohPw/W9SJ7/AE+gHKda/otX6IU/h6v1Q7/T6D4TrX9Fqu4J+Hq/qQ7/AA6Acptr+jVXcE8Ar+pDv0OhPwjWaoa6OVlVFrNLdbm84ypWh3EGpppk9+ptYOb6PsdUcUmkcTDvAqYSPq2YVwrq6pr36XD5HG6NGbzGZUdEq6UZo6qgqh1c3Pt7sFStVpp4nGS/gjukvJpmDVaM3ynJ17ZM5o+NGWuB/HK3w1K1l8ePqYStqq8jCp7HdK6rZSQUNQ2RxwXyRlrWDrJJ4cFnVvKNOG9yWCI0KknjB7HZ6CK122mooB4ELA3PE9ZXhbqu69V1H5l9Sp9nBRM4avWVzGfEqDmjcoI2sc+OpTgbCNaSU6jGlzuAGVlGnKTxFZZEnGCy2bdkPRtMBgOr59jRv1AV6a2tlawUedSX2RWVarrSyvyo39DTimpYoh1Db2lehpQ2RUSunLdLJkrYYhAEAQFLhlAY00XYoJRqK+i1wQW71rcU1hmUW0cldtHnSze6aSV1PVNGBI343Y7sXBVsKclhFzZ6tOkuzqrdExY5rtT+BW0bX/4kLt/aQQvP19MUH5otN1rVWaU/4Zme7R1lzewhVkrdp8iOzyS2ub8pYOjnyDpFqqfT1sDoKuGOWJwwWvbkLdSVWlLdTbTNU7eElhnMVegthqHl8QqKbi2F5x9QO5XNLV7yKw1n+DklptJ8U/uWhyf2Xqnrj9oexZ+L3fo+xh4bR9X3Khyf2XqfXn7Z9ieLX3p+w8Ooer7lTdALH1itP/kcp8U1D0/Yx7lber7lY0AsfzVX989PENSfw/ZE90tfUVDQGxfRqr79/tUd+1P0/Yjudn1KxoFYh/ZJ/v3+1T3vVPT9iO7WXUrGg9i+gy/ev9qd41T0/YdhZdSsaE2HyefvHe1T2uqen7DsrMrGhViH92N+txUdpqr8h2VmSNDbEP7piPnCxdXVEnuMlCzfBF8aHWSOBwhomQSOGA+MYLVXx1S6lUSzniZytqWOHAy7ZbW2qmZBAKh+q3GtI4uc7tK2XFC7rS3Shg2U50YLG4y+ceM+BIc/9pXHK1rrg4s6FOk/NAPf83J6JRWVd/Cw50+eSRzrv6tw+pbI6Zcv4Wa3cUV8RWGS/JK3LRrp+Rrd7RRcZDKTlzCR2LbDRK+feNU76njgbKnfVtHN0sLIc/GAy7vVzQsJ0liPunBUrxk8vibW0WxzJfdNS4vk4uK77e1hS4ri+pz1KrmsLkbrAXUaSUAQBAEAQFLhnegLMsQd1KCcmM+iB6lGCclro5nAdyxwgpYLbrVE7exh+ysHRpvmjYq01yZT0PB80z0Vj3el6TLvFTqOio/kt7lmqMF5GPbT6jotnyR3LLYuhjvfUnoxnAdybURvZHRbOA7lO1DcwbWw9QTA3MdFs4KNqIyOi2cB3KdqGR0WzgO5NoyOjG8Ao2jI6MbwHcp2jJPRbeCYG4pfag6MhmGuO44Wi5oyrUXCMsMzp1FGWWW6eyCM60jjI7zYC4LPR6dvLc+LOitdymsRRf6MZwVtg5Msno1nAdyjaSpYJ6NZwHcpwNz6k9Gs4BMEZZULc3gFOBuK2W5vyQm0ZMqKmazqUkZL4AG5SQSgCAIAgCAIAgCAjGUAwOCAYHBAMDggGBwQDVHBANUcEAwOCAYHBAMDggGBwQDA4IBgcEAwOCAYHBAMBAMBAMDggGBwQDA4IBgcEAwEBKAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCA//2Q=="

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