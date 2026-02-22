import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../utils/api";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import {
  MapPin,
  Car,
  CreditCard,
  Loader2,
  User,
  Clock,
  CheckCircle
} from "lucide-react";

const Payment = () => {
  const { rideId } = useParams();
  const navigate = useNavigate();

  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(120);
  const [paid, setPaid] = useState(false);

  // ================= FETCH RIDE =================
  useEffect(() => {
    const fetchRide = async () => {
      try {
        const res = await api.get(`/api/ride/${rideId}`);
        setRide(res.data.ride);
      } catch (err) {
        setError("Ride not found");
      } finally {
        setLoading(false);
      }
    };
    fetchRide();
  }, [rideId]);

  // ================= COUNTDOWN =================
  useEffect(() => {
    if (!ride || paid) return;

    if (secondsLeft <= 0) {
      alert("Payment session expired");
      navigate("/");
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft(s => s - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [ride, secondsLeft, paid]);

  // ================= PAYMENT =================
  const handlePayment = async () => {
    if (!ride || paying) return;

    try {
      setPaying(true);

      const res = await api.post("/api/payment/create-checkout-session", {
        rideId,
        amount: ride.fare
      });

      if (!res.data?.url) throw new Error("Payment failed");

      setPaid(true);

      // 🎉 Confetti
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });

      setTimeout(() => {
        window.location.href = res.data.url;
      }, 1500);

    } catch (err) {
      alert("Payment failed");
    } finally {
      setPaying(false);
    }
  };

  // ================= LOADING =================
  if (loading) {
    return (
      <Center>
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </Center>
    );
  }

  // ================= ERROR =================
  if (error || !ride) {
    return (
      <Center>
        <Card>
          <p className="text-red-500 font-semibold">{error}</p>
          <Button onClick={() => navigate("/")}>Go Home</Button>
        </Card>
      </Center>
    );
  }

  // ================= SUCCESS SCREEN =================
  if (paid) {
    return (
      <Center>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="bg-white p-10 rounded-3xl shadow-xl text-center"
        >
          <CheckCircle className="mx-auto text-green-500 mb-4" size={70}/>
          <h1 className="text-2xl font-bold">Payment Successful 🎉</h1>
          <p className="text-gray-500 mt-2">Redirecting to gateway...</p>
        </motion.div>
      </Center>
    );
  }

  // ================= UI =================
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-100 dark:from-gray-900 dark:to-gray-950">

      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl w-[430px]"
      >

        {/* HEADER */}
        <div className="text-center mb-6">
          <CreditCard className="mx-auto text-indigo-600 mb-2" size={42}/>
          <h1 className="text-3xl font-bold">Complete Payment</h1>
          <Timer seconds={secondsLeft}/>
        </div>

        {/* PROGRESS TRACKER */}
        <Progress status={ride.status}/>

        {/* RIDE INFO */}
        <Info icon={<MapPin size={18}/>} label="Pickup" value={ride.pickupLocation?.address}/>
        <Info icon={<MapPin size={18}/>} label="Drop" value={ride.dropLocation?.address}/>
        <Info icon={<Car size={18}/>} label="Vehicle" value={ride.vehicleType}/>

        {/* DRIVER CARD */}
        {ride.driver && (
          <div className="bg-indigo-50 dark:bg-gray-700 p-4 rounded-xl mt-5">
            <div className="flex items-center gap-3">
              <User/>
              <div>
                <p className="font-semibold">{ride.driver.name}</p>
                <p className="text-sm text-gray-500">
                  ⭐ {ride.driver.rating || "New Driver"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* PRICE */}
        <div className="flex justify-between mt-6 text-lg font-semibold">
          <span>Total Fare</span>
          <span className="text-indigo-600">₹{ride.fare}</span>
        </div>

        {/* BUTTON */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.02 }}
          onClick={handlePayment}
          disabled={paying}
          className="mt-6 w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {paying ? <Loader2 className="animate-spin"/> : "Pay Securely"}
        </motion.button>

      </motion.div>
    </div>
  );
};

export default Payment;

/* ================= COMPONENTS ================= */

const Center = ({ children }) => (
  <div className="min-h-screen flex items-center justify-center">{children}</div>
);

const Card = ({ children }) => (
  <div className="bg-white p-8 rounded-2xl shadow text-center">{children}</div>
);

const Button = ({ children, ...props }) => (
  <button {...props} className="mt-5 px-6 py-2 bg-indigo-600 text-white rounded-lg">
    {children}
  </button>
);

const Info = ({ icon, label, value }) => (
  <div className="flex justify-between mt-3 text-sm">
    <span className="flex items-center gap-2 text-gray-600">{icon}{label}</span>
    <span className="font-semibold capitalize">{value}</span>
  </div>
);

const Timer = ({ seconds }) => (
  <div className="flex items-center justify-center gap-2 text-sm text-orange-600 font-medium">
    <Clock size={16}/>
    Session expires in {seconds}s
  </div>
);

const Progress = ({ status }) => {
  const steps = ["requested","driver_assigned","paid","ongoing"];
  const current = steps.indexOf(status);

  return (
    <div className="flex justify-between mb-6 mt-4">
      {steps.map((s,i)=>(
        <div key={s} className="flex flex-col items-center text-xs">
          <div className={`w-6 h-6 rounded-full ${i<=current?"bg-indigo-600":"bg-gray-300"}`}/>
          <span className="mt-1 capitalize">{s.replace("_"," ")}</span>
        </div>
      ))}
    </div>
  );
};