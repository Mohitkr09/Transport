import React, { useEffect, useState } from "react";
import api from "../utils/api";
import { CreditCard, RefreshCw } from "lucide-react";

export default function PaymentHistory() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await api.get("/ride/payments");
      setPayments(res.data.payments || []);
    } catch (err) {
      console.error("Payment fetch error:", err);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <RefreshCw className="animate-spin text-indigo-600" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:px-10 pb-20">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Payments</h1>

        <button
          onClick={fetchPayments}
          className="p-2 bg-white rounded-full shadow hover:bg-gray-100"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* EMPTY STATE */}
      {payments.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-20 text-gray-500">
          <CreditCard size={50} />
          <p className="mt-3 text-lg">No payments yet</p>
        </div>
      ) : (
        <div className="space-y-4">

          {payments.map((p) => (
            <div
              key={p.rideId}  // ✅ FIXED HERE
              className="bg-white p-4 rounded-2xl shadow hover:shadow-md transition"
            >

              {/* TOP ROW */}
              <div className="flex justify-between items-center">
                <p className="font-semibold text-gray-800">
                  Ride #{p.rideId.slice(-6)}
                </p>

                <span
                  className={`text-xs px-3 py-1 rounded-full font-medium ${
                    p.status === "paid"
                      ? "bg-green-100 text-green-600"
                      : "bg-yellow-100 text-yellow-600"
                  }`}
                >
                  {p.status}
                </span>
              </div>

              {/* DATE */}
              <p className="text-sm text-gray-500 mt-1">
                {new Date(p.date).toLocaleString()}
              </p>

              {/* AMOUNT */}
              <div className="flex justify-between items-center mt-3">
                <p className="text-gray-500 text-sm">Amount</p>
                <p className="text-lg font-bold text-indigo-600">
                  ₹{p.amount}
                </p>
              </div>

            </div>
          ))}

        </div>
      )}
    </div>
  );
}