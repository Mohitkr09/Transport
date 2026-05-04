import React, { useEffect, useState } from "react";
import axios from "axios";
import { Trash2, UserPlus, Car, MapPin } from "lucide-react";

const API = "http://localhost:5000/api/admin";

export default function Drivers() {

  const [drivers, setDrivers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    vehicleType: "bike",
    vehicleNumber: "",
    lat: "",
    lng: ""
  });

  const token = localStorage.getItem("token");

  /* ================= FETCH ================= */
  const fetchDrivers = async () => {
    try {
      setLoading(true);

      const res = await axios.get(`${API}/drivers`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setDrivers(res.data.drivers || []);

    } catch (err) {
      console.error(err);
      alert("Failed to load drivers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  /* ================= ADD DRIVER ================= */
  const addDriver = async () => {

    const cleaned = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password.trim(), // 🔥 FIX
      phone: form.phone.trim(),
      vehicleType: form.vehicleType,
      vehicleNumber: form.vehicleNumber.trim() || "TEMP",
      lat: parseFloat(form.lat) || 28.7041,
      lng: parseFloat(form.lng) || 77.1025
    };

    if (!cleaned.name || !cleaned.email || !cleaned.password || !cleaned.phone) {
      return alert("Please fill all required fields");
    }

    try {

      console.log("📤 Sending:", cleaned);

      const res = await axios.post(`${API}/drivers`, cleaned, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert(`✅ Driver added\nPassword: ${res.data.defaultPassword}`);

      setShowModal(false);

      setForm({
        name: "",
        email: "",
        password: "",
        phone: "",
        vehicleType: "bike",
        vehicleNumber: "",
        lat: "",
        lng: ""
      });

      fetchDrivers();

    } catch (err) {
      console.error("❌ ERROR:", err.response?.data || err.message);

      alert(
        err?.response?.data?.message ||
        "Failed to create driver"
      );
    }
  };

  /* ================= DELETE ================= */
  const removeDriver = async (id) => {
    if (!window.confirm("Delete driver permanently?")) return;

    try {
      await axios.delete(`${API}/drivers/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      fetchDrivers();

    } catch (err) {
      console.error(err);
      alert("Delete failed");
    }
  };

  /* ================= FILTER ================= */
  const filtered = drivers.filter(d =>
    d.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.email?.toLowerCase().includes(search.toLowerCase())
  );

  /* ================= STATUS ================= */
  const Status = ({ driver }) => (
    <div className="flex gap-2">
      <span className={`px-3 py-1 rounded-full text-xs font-semibold
        ${driver.isApproved ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
        {driver.isApproved ? "Approved" : "Pending"}
      </span>

      <span className={`px-3 py-1 rounded-full text-xs font-semibold
        ${driver.isOnline ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-600"}`}>
        {driver.isOnline ? "Online" : "Offline"}
      </span>
    </div>
  );

  /* ================= UI ================= */
  return (
    <div className="p-8 min-h-screen bg-gray-100">

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Driver Management</h1>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl">
          <UserPlus size={18} />
          Add Driver
        </button>
      </div>

      <input
        placeholder="Search drivers..."
        className="w-full p-4 border rounded-xl mb-6"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">

          <thead className="bg-gray-100">
            <tr>
              <th className="p-4 text-left">Driver</th>
              <th>Email</th>
              <th>Vehicle</th>
              <th>Location</th>
              <th>Status</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan="6" className="p-10 text-center">
                  Loading...
                </td>
              </tr>
            )}

            {!loading && filtered.map(driver => (
              <tr key={driver._id} className="border-t">

                <td className="p-4 font-semibold">{driver.name}</td>
                <td>{driver.email}</td>

                <td className="flex items-center gap-1 justify-center">
                  <Car size={16} />
                  {driver.vehicle?.type}
                </td>

                <td className="text-sm flex items-center gap-1 justify-center">
                  <MapPin size={14} />
                  {driver.location?.coordinates
                    ? `${driver.location.coordinates[1].toFixed(3)}, ${driver.location.coordinates[0].toFixed(3)}`
                    : "N/A"}
                </td>

                <td><Status driver={driver} /></td>

                <td className="text-center">
                  <button
                    onClick={() => removeDriver(driver._id)}
                    className="bg-red-500 text-white px-4 py-1 rounded">
                    <Trash2 size={14} />
                  </button>
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl w-96 space-y-3">

            <h2 className="text-xl font-bold">Add Driver</h2>

            {["name","email","password","phone"].map(field => (
              <input
                key={field}
                type={field === "password" ? "password" : "text"}
                placeholder={field}
                value={form[field]}
                onChange={e => setForm({ ...form, [field]: e.target.value })}
                className="w-full p-2 border rounded"
              />
            ))}

            <select
              value={form.vehicleType}
              onChange={e => setForm({ ...form, vehicleType: e.target.value })}
              className="w-full p-2 border rounded">

              <option value="bike">Bike</option>
              <option value="auto">Auto</option>
              <option value="car">Car</option>
            </select>

            <input placeholder="Vehicle Number"
              value={form.vehicleNumber}
              onChange={e => setForm({ ...form, vehicleNumber: e.target.value })}
              className="w-full p-2 border rounded" />

            <input placeholder="Latitude"
              value={form.lat}
              onChange={e => setForm({ ...form, lat: e.target.value })}
              className="w-full p-2 border rounded" />

            <input placeholder="Longitude"
              value={form.lng}
              onChange={e => setForm({ ...form, lng: e.target.value })}
              className="w-full p-2 border rounded" />

            <div className="flex gap-2">
              <button
                onClick={addDriver}
                className="flex-1 bg-indigo-600 text-white py-2 rounded">
                Save
              </button>

              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-gray-400 text-white py-2 rounded">
                Cancel
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}