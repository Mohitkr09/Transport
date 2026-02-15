import React, { useEffect, useState } from "react";
import axios from "axios";
import DriverGrowthChart from "../../components/DriverGrowthChart";

const API = "http://localhost:5000/api/admin";

const Analytics = () => {
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    online: 0,
  });

  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchStats();

    // 🔥 auto refresh every 10 sec
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);

      const [pendingRes, approvedRes] = await Promise.all([
        axios.get(`${API}/drivers/pending`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/drivers/approved`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
      ]);

      const pending = pendingRes.data.drivers || [];
      const approved = approvedRes.data.drivers || [];

      const online = approved.filter(d => d.isOnline).length;

      setStats({
        total: pending.length + approved.length,
        approved: approved.length,
        pending: pending.length,
        online
      });

    } catch (err) {
      console.error("Analytics fetch failed:", err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const approvalRate =
    stats.total === 0 ? 0 : Math.round((stats.approved / stats.total) * 100);

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-950">

      {/* HEADER */}
      <h1 className="text-4xl font-bold mb-10 text-gray-800 dark:text-white">
        TransportX Analytics
      </h1>

      {loading && (
        <p className="mb-6 text-gray-500">Updating live stats...</p>
      )}

      {/* KPI CARDS */}
      <div className="grid md:grid-cols-4 gap-6 mb-14">

        <StatCard title="Total Drivers" value={stats.total} color="indigo" />
        <StatCard title="Approved" value={stats.approved} color="green" />
        <StatCard title="Pending" value={stats.pending} color="red" />
        <StatCard title="Online Drivers" value={stats.online} color="yellow" />

      </div>

      {/* CHART */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg mb-12">
        <h2 className="text-xl font-semibold mb-6">
          Driver Growth Overview
        </h2>
        <DriverGrowthChart />
      </div>

      {/* PERFORMANCE */}
      <div className="grid md:grid-cols-2 gap-8">

        {/* Approval Rate */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
          <h2 className="text-lg font-semibold mb-4">
            Approval Success Rate
          </h2>

          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className="bg-green-500 h-4 rounded-full"
              style={{ width: `${approvalRate}%` }}
            />
          </div>

          <p className="mt-3 font-semibold text-green-600">
            {approvalRate}% Drivers Approved
          </p>
        </div>

        {/* Activity */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
          <h2 className="text-lg font-semibold mb-4">
            Driver Activity Status
          </h2>

          <p className="text-sm text-gray-500">
            {stats.online} online out of {stats.approved} approved drivers
          </p>
        </div>

      </div>
    </div>
  );
};

// ================= REUSABLE CARD =================
const StatCard = ({ title, value, color }) => (
  <div className={`p-6 rounded-2xl bg-${color}-500 text-white shadow-lg`}>
    <p>{title}</p>
    <h2 className="text-3xl font-bold mt-2">{value}</h2>
  </div>
);

export default Analytics;
