import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

const DriverGrowthChart = () => {
  const currentYear = new Date().getFullYear();

  const [year, setYear] = useState(currentYear);
  const [growthData, setGrowthData] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchGrowth();
  }, [year]);

  // ================= FETCH DATA =================
  const fetchGrowth = async () => {
    try {
      setLoading(true);

      const res = await axios.get(
        `http://localhost:5000/api/admin/analytics/driver-growth?year=${year}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setGrowthData(res.data.data || []);

    } catch (err) {
      console.error("Growth fetch failed:", err);
      setGrowthData([]);
    } finally {
      setLoading(false);
    }
  };

  // ================= CHART DATA =================
  const labels = growthData.map(d => d.month);
  const values = growthData.map(d => d.count);

  const data = {
    labels,
    datasets: [
      {
        label: `Driver Registrations (${year})`,
        data: values,
        borderColor: "#4f46e5",
        backgroundColor: "rgba(79,70,229,0.2)",
        tension: 0.4,
        fill: true
      }
    ]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        labels: { color: "#6b7280" }
      }
    }
  };

  // ================= YEARS LIST =================
  const years = [];
  for (let y = currentYear; y >= 2022; y--) {
    years.push(y);
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">

        <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
          Driver Growth Analytics
        </h3>

        {/* YEAR SELECTOR */}
        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="px-3 py-2 rounded-lg border dark:bg-gray-900"
        >
          {years.map(y => (
            <option key={y}>{y}</option>
          ))}
        </select>

      </div>

      {/* CHART */}
      {loading ? (
        <p className="text-gray-500">Loading chart...</p>
      ) : (
        <Line data={data} options={options} />
      )}

    </div>
  );
};

export default DriverGrowthChart;
