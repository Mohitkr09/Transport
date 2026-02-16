import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";

const API = "http://localhost:5000/api";

const Payment = () => {
  const { rideId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  // ================= FETCH RIDE =================
  useEffect(() => {
    const fetchRide = async () => {
      try {
        const res = await axios.get(`${API}/ride/${rideId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        setRide(res.data.ride);
      } catch (err) {
        setError("Ride not found or unauthorized");
      } finally {
        setLoading(false);
      }
    };

    fetchRide();
  }, [rideId]);

  // ================= PAYMENT =================
  const handlePayment = async () => {
    try {
      setPaying(true);

      const res = await axios.post(
        `${API}/payment/create-checkout-session`,
        {
          rideId,
          amount: ride.fare
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      window.location.href = res.data.url;

    } catch (err) {
      console.error(err);
      alert("Payment failed");
    } finally {
      setPaying(false);
    }
  };

  // ================= LOADING =================
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 text-lg animate-pulse">
          Loading payment details...
        </p>
      </div>
    );
  }

  // ================= ERROR =================
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow text-center">
          <p className="text-red-500 font-semibold">{error}</p>
          <button
            onClick={() => navigate("/")}
            className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // ================= UI =================
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-100 dark:from-gray-900 dark:to-gray-950">

      <div className="bg-white dark:bg-gray-800 p-10 rounded-3xl shadow-xl w-[420px]">

        {/* TITLE */}
        <h1 className="text-3xl font-bold mb-2 text-gray-800 dark:text-white text-center">
          Complete Payment
        </h1>

        <p className="text-gray-500 text-center mb-8">
          Secure checkout powered by Stripe
        </p>

        {/* RIDE DETAILS */}
        <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-xl mb-6 space-y-3">

          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-300">Pickup</span>
            <span className="font-semibold text-right">
              {ride.pickupLocation.address}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-300">Drop</span>
            <span className="font-semibold text-right">
              {ride.dropLocation.address}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-300">Vehicle</span>
            <span className="font-semibold capitalize">
              {ride.vehicleType}
            </span>
          </div>

          <hr />

          <div className="flex justify-between text-lg">
            <span className="font-semibold">Total Fare</span>
            <span className="font-bold text-indigo-600">
              ₹{ride.fare}
            </span>
          </div>

        </div>

        {/* PAY BUTTON */}
        <button
          onClick={handlePayment}
          disabled={paying}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-semibold transition disabled:opacity-50"
        >
          {paying ? "Redirecting..." : "Pay Securely"}
        </button>

        {/* TEST INFO */}
        <p className="text-xs text-gray-400 mt-4 text-center">
          Test Card: 4242 4242 4242 4242
        </p>

      </div>
    </div>
  );
};

export default Payment;
