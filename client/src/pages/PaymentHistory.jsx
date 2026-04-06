import React, { useEffect, useState } from "react";
import api from "../utils/api";

export default function PaymentHistory() {
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const res = await api.get("/ride/payments");
        setPayments(res.data.payments);
      } catch (err) {
        console.error(err);
      }
    };

    fetchPayments();
  }, []);

  return (
    <div className="p-4 md:px-10">
      <h1 className="text-2xl font-bold mb-4">Payments</h1>

      {payments.length === 0 ? (
        <p className="text-gray-500">No payments yet</p>
      ) : (
        <div className="space-y-4">
          {payments.map((p) => (
            <div key={p._id} className="bg-white p-4 rounded-xl shadow">
              <p className="font-semibold">Ride ID: {p.rideId}</p>
              <p className="text-sm text-gray-500">
                {new Date(p.date).toLocaleString()}
              </p>
              <p className="text-indigo-600 font-bold mt-2">
                ₹{p.amount}
              </p>
              <p className="text-green-500 text-sm">{p.status}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}