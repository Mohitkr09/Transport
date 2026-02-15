import React, { useEffect, useState } from "react";
import axios from "axios";
import DriverGrowthChart from "../../components/DriverGrowthChart";

const API = "http://localhost:5000/api/admin";

const Dashboard = () => {
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

    // Auto refresh every 10 sec
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
      console.error("Dashboard fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-950">

      {/* HEADER */}
      <h1 className="text-4xl font-bold mb-10 text-gray-800 dark:text-white">
        Dashboard Overview
      </h1>

      {loading && (
        <p className="text-gray-500 mb-6">Loading live stats...</p>
      )}

      {/* KPI CARDS */}
      <div className="grid md:grid-cols-4 gap-6 mb-12">

        <StatCard
          title="Total Drivers"
          value={stats.total}
          bg="from-indigo-500 to-indigo-600"
        />

        <StatCard
          title="Approved"
          value={stats.approved}
          bg="from-green-500 to-green-600"
        />

        <StatCard
          title="Pending"
          value={stats.pending}
          bg="from-red-500 to-red-600"
        />

        <StatCard
          title="Online"
          value={stats.online}
          bg="from-yellow-500 to-orange-500"
        />

      </div>

      {/* CHART SECTION */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg mb-10">
        <h2 className="text-xl font-semibold mb-6">
          Driver Growth Analytics
        </h2>
        <DriverGrowthChart />
      </div>

      {/* QUICK INSIGHTS */}
      <div className="grid md:grid-cols-2 gap-8">

        <InsightCard
          title="Approval Rate"
          value={`${Math.round(
            (stats.approved / stats.total) * 100 || 0
          )}%`}
          color="green"
        />

        <InsightCard
          title="Driver Activity"
          value={`${stats.online} Online`}
          color="blue"
        />

      </div>

    </div>
  );
};

/* ================= REUSABLE COMPONENTS ================= */

const StatCard = ({ title, value, bg }) => (
  <div
    className={`p-6 rounded-2xl text-white bg-gradient-to-r ${bg} shadow-lg hover:scale-105 transition`}
  >
    <p className="opacity-90">{title}</p>
    <h2 className="text-4xl font-bold mt-2">{value}</h2>
  </div>
);

const InsightCard = ({ title, value, color }) => (
  <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
    <p className={`text-${color}-500 font-semibold`}>{title}</p>
    <h2 className="text-3xl font-bold mt-2">{value}</h2>
  </div>
);

export default Dashboard;
