import React, {
  useEffect,
  useState,
  useRef,
} from "react";

import { io } from "socket.io-client";

import api from "../utils/api";

import LiveMap from "../components/LiveMap";

export default function DriverDashboard() {

  const [online, setOnline] =
    useState(false);

  const [profile, setProfile] =
    useState(null);

  const [incomingRide, setIncomingRide] =
    useState(null);

  const [activeRide, setActiveRide] =
    useState(null);

  const [timer, setTimer] =
    useState(15);

  const [driverLocation, setDriverLocation] =
    useState(null);

  const [stats, setStats] = useState({
    totalRides: 0,
    totalEarnings: 0,
  });

  const [isDark, setIsDark] =
    useState(false);

  const socketRef = useRef(null);

  const audioRef = useRef(null);

  /* ======================================================
  DARK MODE
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
      new MutationObserver(checkTheme);

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
  NOTIFICATION PERMISSION
  ====================================================== */

  useEffect(() => {

    if ("Notification" in window) {

      Notification.requestPermission();
    }

  }, []);

  /* ======================================================
  AUDIO
  ====================================================== */

  useEffect(() => {

    const audio = new Audio(
      "/sounds/ride-alert.mp3"
    );

    audio.loop = true;

    audioRef.current = audio;

  }, []);

  const playSound = () => {

    if (!audioRef.current) return;

    audioRef.current.currentTime = 0;

    audioRef.current.play().catch(() => {});
  };

  const stopSound = () => {

    if (!audioRef.current) return;

    audioRef.current.pause();

    audioRef.current.currentTime = 0;
  };

  /* ======================================================
  PROFILE
  ====================================================== */

  useEffect(() => {

    const fetchProfile = async () => {

      try {

        const res =
          await api.get("/driver/me");

        setProfile(res.data.driver);

        setOnline(
          res.data.driver.isOnline
        );

      } catch (err) {

        console.log(
          "❌ Profile Error:",
          err.message
        );
      }
    };

    fetchProfile();

  }, []);

  /* ======================================================
  STATS
  ====================================================== */

  const fetchStats = async () => {

    try {

      const res =
        await api.get("/driver/stats");

      setStats(res.data.stats || {});

    } catch {

      setStats({
        totalRides: 0,
        totalEarnings: 0,
      });
    }
  };

  useEffect(() => {

    fetchStats();

  }, []);

  /* ======================================================
  SOCKET CONNECTION
  ====================================================== */

  useEffect(() => {

    if (!profile?._id) return;

    console.log(
      "🚗 Connecting driver socket..."
    );

    const socket = io(
      import.meta.env.VITE_SOCKET_URL,
      {

        transports: ["websocket"],

        upgrade: false,

        reconnection: true,

        reconnectionAttempts: Infinity,

        reconnectionDelay: 1000,

        timeout: 20000,

        forceNew: true,

        auth: {
          token:
            localStorage.getItem("token"),

          userId: profile._id,

          role: "driver",
        },
      }
    );

    socketRef.current = socket;

    /* ======================================================
    SOCKET DEBUG
    ====================================================== */

    socket.on("connect", () => {

      console.log(
        "✅ SOCKET CONNECTED:",
        socket.id
      );
    });

    socket.on("disconnect", () => {

      console.log(
        "❌ SOCKET DISCONNECTED"
      );
    });

    socket.on(
      "connect_error",
      (err) => {

        console.log(
          "❌ SOCKET ERROR:",
          err.message
        );
      }
    );

    /* ======================================================
    NEW RIDE REQUEST
    ====================================================== */

    socket.on(
      "newRideRequest",
      (ride) => {

        console.log(
          "🚨 NEW RIDE:",
          ride
        );

        setIncomingRide(ride);

        playSound();

        /* MOBILE VIBRATION */

        if (navigator.vibrate) {

          navigator.vibrate([
            300,
            200,
            300,
          ]);
        }

        /* PUSH NOTIFICATION */

        if (
          Notification.permission ===
          "granted"
        ) {

          new Notification(
            "🚖 New Ride Request",
            {
              body: `₹${ride.fare} • ${ride.pickupLocation.address}`,

              icon: "/logo192.png",
            }
          );
        }
      }
    );

    /* ======================================================
    RIDE ACCEPTED
    ====================================================== */

    socket.on(
      "rideAccepted",
      (ride) => {

        setActiveRide(ride);

        setIncomingRide(null);

        stopSound();

        fetchStats();
      }
    );

    /* ======================================================
    RIDE CANCELLED
    ====================================================== */

    socket.on(
      "rideCancelled",
      () => {

        setIncomingRide(null);

        setActiveRide(null);

        stopSound();
      }
    );

    return () => {

      socket.disconnect();
    };

  }, [profile]);

  /* ======================================================
  HEARTBEAT KEEPALIVE
  ====================================================== */

  useEffect(() => {

    if (!socketRef.current) return;

    const interval = setInterval(() => {

      socketRef.current.emit(
        "driverPing"
      );

    }, 10000);

    return () =>
      clearInterval(interval);

  }, [socketRef.current]);

  /* ======================================================
  TIMER
  ====================================================== */

  useEffect(() => {

    if (!incomingRide) return;

    setTimer(15);

    const interval = setInterval(() => {

      setTimer((prev) => {

        if (prev <= 1) {

          rejectRide(
            incomingRide._id
          );

          return 0;
        }

        return prev - 1;
      });

    }, 1000);

    return () =>
      clearInterval(interval);

  }, [incomingRide]);

  /* ======================================================
  DRIVER LOCATION
  ====================================================== */

  useEffect(() => {

    if (!online) return;

    const interval = setInterval(() => {

      navigator.geolocation.getCurrentPosition(
        (pos) => {

          const lat =
            pos.coords.latitude;

          const lng =
            pos.coords.longitude;

          setDriverLocation({
            lat,
            lng,
          });

          api.put(
            "/driver/location",
            {
              lat,
              lng,
              rideId:
                activeRide?._id,
            }
          );

          /* LIVE SOCKET UPDATE */

          if (
            socketRef.current &&
            activeRide?._id
          ) {

            socketRef.current.emit(
              "driverLocationUpdate",
              {
                rideId:
                  activeRide._id,

                lat,
                lng,
              }
            );
          }
        }
      );

    }, 3000);

    return () =>
      clearInterval(interval);

  }, [online, activeRide]);

  /* ======================================================
  ACTIONS
  ====================================================== */

  const toggleOnline = async () => {

    try {

      const newStatus = !online;

      await api.put(
        "/driver/online",
        {
          isOnline: newStatus,
        }
      );

      setOnline(newStatus);

    } catch (err) {

      console.log(
        "❌ Online Error:",
        err.message
      );
    }
  };

  const acceptRide = async (id) => {

    try {

      const res =
        await api.put(
          `/ride/${id}/accept`
        );

      setActiveRide(res.data.ride);

      setIncomingRide(null);

      stopSound();

      fetchStats();

    } catch (err) {

      console.log(
        "❌ Accept Error:",
        err.message
      );
    }
  };

  const rejectRide = async (id) => {

    try {

      await api.put(
        `/ride/${id}/reject`
      );

      setIncomingRide(null);

      stopSound();

    } catch (err) {

      console.log(
        "❌ Reject Error:",
        err.message
      );
    }
  };

  /* ======================================================
  MAP DATA
  ====================================================== */

  const rideData =
    activeRide || incomingRide;

  const pickupCoords =
    rideData?.pickupLocation
      ?.location?.coordinates;

  const dropCoords =
    rideData?.dropLocation
      ?.location?.coordinates;

  const pickupLatLng = pickupCoords
    ? {
        lat: pickupCoords[1],
        lng: pickupCoords[0],
      }
    : null;

  const dropLatLng = dropCoords
    ? {
        lat: dropCoords[1],
        lng: dropCoords[0],
      }
    : null;

  /* ======================================================
  UI
  ====================================================== */

  return (
    <div className="min-h-screen p-4 bg-gray-100 dark:bg-gray-950 text-gray-900 dark:text-white">

      {/* HEADER */}

      <div className="flex justify-between items-center mb-6">

        <h1 className="text-xl font-bold">
          🚗 Driver Dashboard
        </h1>

        <button
          onClick={toggleOnline}
          className={`px-4 py-2 rounded-full text-white ${
            online
              ? "bg-green-600"
              : "bg-gray-500"
          }`}
        >
          {online
            ? "Online"
            : "Offline"}
        </button>
      </div>

      {/* STATS */}

      <div className="grid grid-cols-2 gap-4 mb-4">

        <div className="bg-indigo-500 text-white p-4 rounded-xl">
          {stats.totalRides} Rides
        </div>

        <div className="bg-green-500 text-white p-4 rounded-xl">
          ₹{stats.totalEarnings}
        </div>
      </div>

      {/* MAP */}

      <div className="h-[400px] rounded-xl overflow-hidden">

        <LiveMap
          driverLocation={
            driverLocation
          }
          pickupLocation={
            pickupLatLng
          }
          dropLocation={
            dropLatLng
          }
          showRoute={true}
          isDark={isDark}
        />
      </div>

      {/* ACTIVE RIDE */}

      {activeRide && (

        <div className="mt-4 bg-white dark:bg-gray-900 p-5 rounded-xl shadow-lg">

          <h3 className="text-lg font-bold mb-3">
            📋 Ride Details
          </h3>

          <p>
            <b>👤 User:</b>{" "}
            {activeRide?.user?.name ||
              "N/A"}
          </p>

          <p>
            <b>📞 Phone:</b>{" "}
            {activeRide?.user?.phone ||
              "N/A"}
          </p>

          {activeRide?.user?.phone && (

            <a
              href={`tel:${activeRide.user.phone}`}
              className="inline-block mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              📞 Call User
            </a>
          )}

          <p className="mt-3">
            <b>📍 Pickup:</b>{" "}
            {
              activeRide
                ?.pickupLocation
                ?.address
            }
          </p>

          <p>
            <b>🏁 Drop:</b>{" "}
            {
              activeRide
                ?.dropLocation
                ?.address
            }
          </p>

          <p className="mt-2 text-green-600 font-bold text-lg">
            ₹ {activeRide?.fare}
          </p>
        </div>
      )}

      {/* INCOMING RIDE */}

      {incomingRide && (

        <div className="fixed inset-0 z-50 flex items-end justify-center">

          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>

          <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-t-3xl p-6 shadow-2xl">

            <h3 className="text-lg font-bold text-red-500 animate-pulse">
              🚨 New Ride Request ({timer}s)
            </h3>

            <p className="mt-3">
              📍 {
                rideData
                  ?.pickupLocation
                  ?.address
              }
            </p>

            <p>
              🏁 {
                rideData
                  ?.dropLocation
                  ?.address
              }
            </p>

            <div className="text-2xl font-bold text-green-600 mt-3">
              ₹{rideData?.fare}
            </div>

            <div className="flex gap-3 mt-5">

              <button
                onClick={() =>
                  acceptRide(
                    incomingRide._id
                  )
                }
                className="flex-1 bg-green-600 text-white py-3 rounded-xl"
              >
                Accept
              </button>

              <button
                onClick={() =>
                  rejectRide(
                    incomingRide._id
                  )
                }
                className="flex-1 bg-gray-300 dark:bg-gray-700 py-3 rounded-xl"
              >
                Reject
              </button>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}