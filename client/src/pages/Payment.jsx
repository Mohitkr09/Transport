import React, { useState } from "react";
import axios from "axios";

const Payment = () => {
  const [loading, setLoading] = useState(false);

  const amount = 199; // Example fare — replace with ride price

  const handlePayment = async () => {
    setLoading(true);

    try {
      const res = await axios.post(
        "http://localhost:5000/api/payment/create-checkout-session",
        { amount }
      );

      window.location.href = res.data.url;

    } catch (err) {
      alert("Payment failed");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-100">

      <div className="bg-white p-10 rounded-3xl shadow-xl w-[400px] text-center">

        <h1 className="text-3xl font-bold mb-4 text-gray-800">
          Complete Payment
        </h1>

        <p className="text-gray-500 mb-6">
          Secure payment powered by Stripe
        </p>

        {/* Ride Summary */}
        <div className="bg-gray-50 p-6 rounded-xl mb-6">
          <p className="text-gray-600">Ride Fare</p>
          <h2 className="text-4xl font-bold text-indigo-600">
            ₹{amount}
          </h2>
        </div>

        {/* Pay Button */}
        <button
          onClick={handlePayment}
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
        >
          {loading ? "Processing..." : "Pay Now"}
        </button>

        <p className="text-xs text-gray-400 mt-4">
          Test Card: 4242 4242 4242 4242
        </p>

      </div>
    </div>
  );
};

export default Payment;
