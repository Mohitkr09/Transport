import React, { useEffect, useState } from "react";
import axios from "axios";
import DriverGrowthChart from "../components/DriverGrowthChart";

const API = "http://localhost:5000/api/admin";

const AdminDashboard = () => {
  const [pendingDrivers, setPendingDrivers] = useState([]);
  const [approvedDrivers, setApprovedDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      setError("");

      const [pendingRes, approvedRes] = await Promise.all([
        axios.get(`${API}/pending-drivers`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/approved-drivers`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setPendingDrivers(pendingRes.data?.drivers || []);
      setApprovedDrivers(approvedRes.data?.drivers || []);

    } catch {
      setError("Failed to load drivers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const approveDriver = async (id) => {
    await axios.put(`${API}/approve/${id}`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    fetchDrivers();
  };

  const rejectDriver = async (id) => {
    await axios.delete(`${API}/reject/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    fetchDrivers();
  };

  const totalDrivers = pendingDrivers.length + approvedDrivers.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-950 p-8">

      {/* ================= HEADER ================= */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white">
          Admin Dashboard
        </h1>
        <p className="text-gray-500 mt-2">
          Manage drivers, approvals and analytics
        </p>
      </div>

      {/* ================= STATS CARDS ================= */}
      <div className="grid md:grid-cols-3 gap-8 mb-14">

        {/* Total */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg hover:scale-105 transition">
          <p className="opacity-80">Total Drivers</p>
          <h2 className="text-4xl font-bold mt-2">{totalDrivers}</h2>
        </div>

        {/* Pending */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg hover:scale-105 transition">
          <p className="opacity-80">Pending Approval</p>
          <h2 className="text-4xl font-bold mt-2">{pendingDrivers.length}</h2>
        </div>

        {/* Approved */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg hover:scale-105 transition">
          <p className="opacity-80">Approved Drivers</p>
          <h2 className="text-4xl font-bold mt-2">{approvedDrivers.length}</h2>
        </div>

      </div>

      {/* ================= CHART ================= */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg mb-16">
        <h2 className="text-xl font-semibold mb-6 text-gray-700 dark:text-gray-200">
          Driver Growth Analytics
        </h2>
        <DriverGrowthChart />
      </div>

      {/* ================= STATUS ================= */}
      {loading && (
        <div className="text-center py-10 text-gray-500">
          Loading drivers...
        </div>
      )}

      {error && (
        <div className="text-center py-6 text-red-500 font-semibold">
          {error}
        </div>
      )}

      {/* ================= PENDING DRIVERS ================= */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold mb-8 text-red-500">
          Pending Driver Approvals
        </h2>

        <div className="grid md:grid-cols-2 gap-8">
          {pendingDrivers.map((driver) => (
            <div
              key={driver._id}
              className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg hover:shadow-2xl transition"
            >
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                {driver.name}
              </h3>

              <p className="text-gray-500 mb-4">{driver.email}</p>

              <div className="space-y-2 text-sm mb-4">
                {driver.documents?.license && (
                  <a
                    href={`http://localhost:5000/uploads/${driver.documents.license}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 font-medium hover:underline block"
                  >
                    View License
                  </a>
                )}

                {driver.documents?.vehicleRC && (
                  <a
                    href={`http://localhost:5000/uploads/${driver.documents.vehicleRC}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 font-medium hover:underline block"
                  >
                    View Vehicle RC
                  </a>
                )}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => approveDriver(driver._id)}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-semibold transition"
                >
                  Approve
                </button>

                <button
                  onClick={() => rejectDriver(driver._id)}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg font-semibold transition"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ================= APPROVED TABLE ================= */}
      <div>
        <h2 className="text-2xl font-bold mb-8 text-green-500">
          Approved Drivers
        </h2>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">

          <table className="w-full">

            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="p-4 text-left">Driver</th>
                <th>Email</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {approvedDrivers.map((driver) => (
                <tr
                  key={driver._id}
                  className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  <td className="p-4 font-semibold text-gray-800 dark:text-white">
                    {driver.name}
                  </td>

                  <td className="text-gray-500">{driver.email}</td>

                  <td>
                    <span className="px-4 py-1 text-sm font-semibold bg-green-100 text-green-600 rounded-full">
                      Approved
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>

          </table>

        </div>
      </div>

    </div>
  );
};

export default AdminDashboard;
