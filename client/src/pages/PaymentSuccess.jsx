import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { CheckCircle, Car } from "lucide-react";

export default function PaymentSuccess() {
  const { rideId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    // 🎉 Celebration animation
    confetti({
      particleCount: 180,
      spread: 120,
      origin: { y: 0.6 }
    });

    // redirect to tracking
    const timer = setTimeout(() => {
      navigate(`/track/${rideId}`);
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="bg-white p-12 rounded-3xl shadow-2xl text-center w-[380px]"
      >
        <CheckCircle className="mx-auto text-green-500 mb-4" size={80}/>

        <h1 className="text-3xl font-bold text-gray-800">
          Payment Confirmed
        </h1>

        <p className="text-gray-500 mt-2">
          Your driver is on the way 🚗
        </p>

        <div className="mt-6 flex items-center justify-center gap-2 text-green-600 font-semibold">
          <Car size={18}/>
          Preparing live tracking...
        </div>

        <div className="mt-5 text-xs text-gray-400">
          Redirecting automatically
        </div>
      </motion.div>
    </div>
  );
}