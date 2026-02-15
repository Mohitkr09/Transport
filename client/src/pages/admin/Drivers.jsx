import React, { useEffect, useState } from "react";
import axios from "axios";

const API = "http://localhost:5000/api/admin";

const Drivers = () => {
  const [drivers, setDrivers] = useState([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const token = localStorage.getItem("token");

  // ================= FETCH DRIVERS =================
  const fetchDrivers = async () => {
    try {
      const res = await axios.get(`${API}/drivers/approved`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDrivers(res.data.drivers);
    } catch (err) {
      console.error(err.message);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  // ================= ADD DRIVER =================
  const handleAddDriver = async () => {
    await axios.post(
      `${API}/drivers`,
      { name, email, password },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    setShowModal(false);
    setName("");
    setEmail("");
    setPassword("");
    fetchDrivers();
  };

  // ================= DELETE =================
  const deleteDriver = async (id) => {
    if (!window.confirm("Delete this driver?")) return;

    await axios.delete(`${API}/drivers/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    fetchDrivers();
  };

  // ================= SEARCH FILTER =================
  const filteredDrivers = drivers.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-950">

      {/* ================= HEADER ================= */}
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white">
          Driver Management
        </h1>

        <button
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl shadow-lg"
        >
          + Add Driver
        </button>
      </div>

      {/* ================= SEARCH BAR ================= */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow mb-8">
        <input
          placeholder="Search drivers..."
          className="w-full p-3 rounded-lg border dark:bg-gray-900"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* ================= DRIVER TABLE ================= */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">

        <table className="w-full">

          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="p-4 text-left">Driver</th>
              <th>Email</th>
              <th>Status</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredDrivers.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center p-8 text-gray-500">
                  No drivers found
                </td>
              </tr>
            ) : (
              filteredDrivers.map(driver => (
                <tr
                  key={driver._id}
                  className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <td className="p-4 font-semibold">
                    {driver.name}
                  </td>

                  <td className="text-gray-500">{driver.email}</td>

                  <td>
                    <span className="px-3 py-1 text-sm bg-green-100 text-green-600 rounded-full">
                      Approved
                    </span>
                  </td>

                  <td className="text-center">
                    <button
                      onClick={() => deleteDriver(driver._id)}
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-1 rounded-lg"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>

        </table>
      </div>

      {/* ================= ADD DRIVER MODAL ================= */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">

          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl w-96 shadow-xl">

            <h2 className="text-xl font-bold mb-4">
              Add New Driver
            </h2>

            <div className="space-y-4">
              <input
                placeholder="Name"
                className="w-full p-3 border rounded-lg dark:bg-gray-700"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <input
                placeholder="Email"
                className="w-full p-3 border rounded-lg dark:bg-gray-700"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <input
                type="password"
                placeholder="Password"
                className="w-full p-3 border rounded-lg dark:bg-gray-700"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddDriver}
                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg"
              >
                Save
              </button>

              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-gray-400 text-white py-2 rounded-lg"
              >
                Cancel
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default Drivers;
