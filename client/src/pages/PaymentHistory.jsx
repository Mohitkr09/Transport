import React, { useEffect, useState } from "react";
import api from "../utils/api";
import { CreditCard, RefreshCw, Calendar } from "lucide-react";

export default function PaymentHistory() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPayments = async () => {
    try {
      setRefreshing(true);
      const res = await api.get("/ride/payments");
      setPayments(res.data.payments || []);
    } catch (err) {
      console.error("Payment fetch error:", err);
      setPayments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center 
        bg-white dark:bg-black">
        <RefreshCw className="animate-spin text-indigo-600" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:px-10 pb-20 
      bg-gray-100 dark:bg-black 
      text-gray-900 dark:text-white transition">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-6 
        bg-white/70 dark:bg-gray-900/80 backdrop-blur-xl 
        p-4 rounded-2xl shadow">

        <h1 className="text-xl md:text-2xl font-bold">
          💳 Payments
        </h1>

        <button
          onClick={fetchPayments}
          className="p-2 rounded-full 
          bg-gray-200 dark:bg-gray-800 
          hover:scale-110 transition"
        >
          <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
        </button>
      </div>

      {/* EMPTY */}
      {payments.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-24 text-gray-500">
          <CreditCard size={60} />
          <p className="mt-4 text-lg font-medium">No payments yet</p>
          <p className="text-sm">Your transactions will appear here</p>
        </div>
      ) : (
        <div className="space-y-5 max-w-3xl mx-auto">

          {payments.map((p) => (
            <div
              key={p.rideId}
              className="bg-white dark:bg-gray-900 
              rounded-2xl p-5 shadow-lg 
              hover:shadow-xl hover:-translate-y-1 transition-all"
            >

              {/* TOP */}
              <div className="flex justify-between items-center">

                <div>
                  <p className="font-semibold text-sm md:text-base">
                    Ride #{p.rideId.slice(-6)}
                  </p>

                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                    <Calendar size={12} />
                    {new Date(p.date).toLocaleString()}
                  </div>
                </div>

                {/* STATUS */}
                <span
                  className={`text-xs px-3 py-1 rounded-full font-semibold ${
                    p.status === "paid"
                      ? "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400"
                      : "bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-400"
                  }`}
                >
                  {p.status}
                </span>
              </div>

              {/* DIVIDER */}
              <div className="my-4 border-t border-gray-200 dark:border-gray-700" />

              {/* AMOUNT */}
              <div className="flex justify-between items-center">

                <p className="text-sm text-gray-500">
                  Amount Paid
                </p>

                <p className="text-xl font-bold 
                  bg-gradient-to-r from-indigo-500 to-blue-500 
                  text-transparent bg-clip-text">
                  ₹{p.amount || 0}
                </p>

              </div>

            </div>
          ))}

        </div>
      )}
    </div>
  );
}