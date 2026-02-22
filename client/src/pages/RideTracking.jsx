import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../utils/api";
import { motion } from "framer-motion";
import {
  CheckCircle,
  Car,
  MapPin,
  Phone,
  Star,
  Clock
} from "lucide-react";

const RideTracking = () => {
  const { rideId } = useParams();

  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [eta, setEta] = useState(180); // seconds

  // ================= FETCH RIDE =================
  const fetchRide = async () => {
    try {
      const res = await api.get(`/api/ride/${rideId}`);
      setRide(res.data.ride);
    } catch {
      console.log("Ride fetch error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRide();
    const interval = setInterval(fetchRide, 4000);
    return () => clearInterval(interval);
  }, []);

  // ================= ETA COUNTDOWN =================
  useEffect(() => {
    if (eta <= 0) return;
    const t = setInterval(() => setEta(s => s - 1), 1000);
    return () => clearInterval(t);
  }, [eta]);

  if (loading) return <Center>Loading ride...</Center>;
  if (!ride) return <Center>Ride not found</Center>;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col items-center pt-10">

      {/* SUCCESS HEADER */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="flex items-center gap-3 text-green-600 text-2xl font-bold mb-6"
      >
        <CheckCircle size={32}/>
        Ride Confirmed
      </motion.div>

      {/* MAP AREA */}
      <div className="w-[92%] md:w-[700px] h-[260px] bg-gradient-to-br from-indigo-200 to-blue-200 rounded-3xl shadow-inner flex items-center justify-center text-gray-700 text-lg font-semibold">
        Live Driver Location Map
      </div>

      {/* DRIVER CARD */}
      <motion.div
        initial={{ y:40, opacity:0 }}
        animate={{ y:0, opacity:1 }}
        className="bg-white dark:bg-gray-800 shadow-xl rounded-3xl p-6 mt-6 w-[92%] md:w-[700px]"
      >
        <div className="flex justify-between items-center">

          <div className="flex gap-4 items-center">
            <div className="bg-indigo-100 p-3 rounded-full">
              <Car/>
            </div>

            <div>
              <h2 className="font-bold text-lg">{ride.driver?.name}</h2>
              <p className="text-sm text-gray-500">
                ⭐ {ride.driver?.rating || "4.8"} Rating
              </p>
            </div>
          </div>

          <button className="bg-green-500 text-white px-4 py-2 rounded-xl flex gap-2 items-center">
            <Phone size={16}/>
            Call
          </button>

        </div>

        {/* ETA */}
        <div className="mt-6 flex justify-between text-sm">
          <span className="flex gap-2 items-center">
            <Clock size={16}/>
            Driver arriving in
          </span>
          <span className="font-bold text-indigo-600">
            {Math.floor(eta/60)}m {eta%60}s
          </span>
        </div>

        {/* ROUTE */}
        <div className="mt-5 space-y-3 text-sm">
          <RouteRow icon={<MapPin size={16}/>} text={ride.pickupLocation.address}/>
          <RouteRow icon={<MapPin size={16}/>} text={ride.dropLocation.address}/>
        </div>
      </motion.div>

      {/* STATUS PROGRESS */}
      <StatusTracker status={ride.status}/>
    </div>
  );
};

export default RideTracking;


// ================= COMPONENTS =================

const Center = ({ children }) => (
  <div className="h-screen flex items-center justify-center text-lg font-semibold">
    {children}
  </div>
);

const RouteRow = ({ icon, text }) => (
  <div className="flex gap-3 items-center">
    {icon}
    <span>{text}</span>
  </div>
);

const StatusTracker = ({ status }) => {
  const steps = ["requested","driver_assigned","arriving","started","completed"];
  const current = steps.indexOf(status);

  return (
    <div className="mt-10 w-[92%] md:w-[700px] flex justify-between">

      {steps.map((s,i)=>(
        <div key={s} className="flex flex-col items-center text-xs">

          <div className={`w-7 h-7 rounded-full
            ${i<=current ? "bg-indigo-600" : "bg-gray-300"}`} />

          <span className="mt-2 capitalize">{s}</span>
        </div>
      ))}
    </div>
  );
};