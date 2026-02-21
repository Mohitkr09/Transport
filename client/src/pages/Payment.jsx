import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../utils/api"; // <-- use your axios instance

const Payment = () => {
  const { rideId } = useParams();
  const navigate = useNavigate();

  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  // ======================================================
  // VALIDATION
  // ======================================================
  useEffect(() => {
    if (!rideId) {
      setError("Invalid ride ID");
      setLoading(false);
      return;
    }

    if (!localStorage.getItem("token")) {
      navigate("/login");
      return;
    }
  }, [rideId, navigate]);

  // ======================================================
  // FETCH RIDE
  // ======================================================
  useEffect(() => {
    const fetchRide = async () => {
      try {
        const res = await api.get(`/api/ride/${rideId}`);
        setRide(res.data.ride);
      } catch (err) {
        console.error(err);
        setError(
          err.response?.data?.message ||
          "Ride not found or unauthorized"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchRide();
  }, [rideId]);

  // ======================================================
  // PAYMENT
  // ======================================================
  const handlePayment = async () => {
    if (paying) return;

    try {
      setPaying(true);

      const res = await api.post("/api/payment/create-checkout-session", {
        rideId,
        amount: ride.fare
      });

      if (!res.data?.url) {
        throw new Error("Payment session failed");
      }

      window.location.href = res.data.url;

    } catch (err) {
      console.error(err);

      alert(
        err.response?.data?.message ||
        "Payment failed. Please try again."
      );
    } finally {
      setPaying(false);
    }
  };

  // ======================================================
  // LOADING STATE
  // ======================================================
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-500 text-lg">
          Loading payment details...
        </div>
      </div>
    );
  }

  // ======================================================
  // ERROR STATE
  // ======================================================
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow text-center max-w-sm">
          <p className="text-red-500 font-semibold">{error}</p>

          <button
            onClick={() => navigate("/")}
            className="mt-5 px-6 py-2 bg-indigo-600 text-white rounded-lg"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // ======================================================
  // UI
  // ======================================================
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
              {ride.pickupLocation?.address}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-300">Drop</span>
            <span className="font-semibold text-right">
              {ride.dropLocation?.address}
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

        {/* TEST CARD */}
        <p className="text-xs text-gray-400 mt-4 text-center">
          Test Card: 4242 4242 4242 4242
        </p>

      </div>
    </div>
  );
};

export default Payment;