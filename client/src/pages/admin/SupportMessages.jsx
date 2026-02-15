import React, { useEffect, useState } from "react";
import axios from "axios";

const API = "http://localhost:5000/api/support";

const SupportMessages = () => {
  const [messages, setMessages] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchMessages();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [messages, filter, search]);

  // ================= FETCH =================
  const fetchMessages = async () => {
    try {
      const res = await axios.get(API, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessages(res.data.messages || []);

    } catch (err) {
      console.error("Failed to fetch messages");
    } finally {
      setLoading(false);
    }
  };

  // ================= FILTER =================
  const applyFilters = () => {
    let data = [...messages];

    if (filter !== "all")
      data = data.filter(m => m.status === filter);

    if (search)
      data = data.filter(m =>
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.email.toLowerCase().includes(search.toLowerCase())
      );

    setFiltered(data);
  };

  // ================= RESOLVE =================
  const resolveMessage = async (id) => {
    try {
      await axios.put(
        `${API}/${id}/resolve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessages(prev =>
        prev.map(m =>
          m._id === id ? { ...m, status: "resolved" } : m
        )
      );

    } catch {
      alert("Failed to resolve message");
    }
  };

  // ================= STATS =================
  const pending = messages.filter(m => m.status === "pending").length;
  const resolved = messages.filter(m => m.status === "resolved").length;

  return (
    <div className="p-8 min-h-screen bg-gray-100 dark:bg-gray-900">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
          Support Center
        </h1>

        <input
          placeholder="Search name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 rounded-lg border dark:bg-gray-800"
        />
      </div>


      {/* STATS */}
      <div className="grid md:grid-cols-3 gap-6 mb-10">

        <StatCard title="Total" value={messages.length} color="indigo" />
        <StatCard title="Pending" value={pending} color="red" />
        <StatCard title="Resolved" value={resolved} color="green" />

      </div>


      {/* FILTER TABS */}
      <div className="flex gap-3 mb-8">

        <FilterBtn label="All" active={filter==="all"} onClick={()=>setFilter("all")} />
        <FilterBtn label="Pending" active={filter==="pending"} onClick={()=>setFilter("pending")} />
        <FilterBtn label="Resolved" active={filter==="resolved"} onClick={()=>setFilter("resolved")} />

      </div>


      {/* LOADING */}
      {loading ? (
        <p className="text-gray-500">Loading messages...</p>
      ) : filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid md:grid-cols-2 gap-6">

          {filtered.map((msg) => (
            <div
              key={msg._id}
              className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow hover:shadow-xl transition"
            >
              {/* HEADER */}
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-lg text-gray-800 dark:text-white">
                  {msg.name}
                </h3>

                <StatusBadge status={msg.status} />
              </div>

              {/* EMAIL */}
              <p className="text-sm text-gray-500 mb-3">
                {msg.email}
              </p>

              {/* MESSAGE */}
              <p className="mb-4 text-gray-700 dark:text-gray-200">
                {msg.message}
              </p>

              {/* DATE */}
              <p className="text-xs text-gray-400 mb-4">
                {new Date(msg.createdAt).toLocaleString()}
              </p>

              {/* ACTION */}
              {msg.status === "pending" && (
                <button
                  onClick={() => resolveMessage(msg._id)}
                  className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-medium"
                >
                  Mark as Resolved
                </button>
              )}
            </div>
          ))}

        </div>
      )}
    </div>
  );
};

export default SupportMessages;



/* ================= COMPONENTS ================= */

const StatCard = ({ title, value, color }) => (
  <div className={`bg-${color}-500 text-white p-6 rounded-2xl shadow`}>
    <p>{title}</p>
    <h2 className="text-3xl font-bold mt-2">{value}</h2>
  </div>
);


const FilterBtn = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`px-5 py-2 rounded-lg font-medium transition ${
      active
        ? "bg-indigo-600 text-white"
        : "bg-gray-200 dark:bg-gray-700"
    }`}
  >
    {label}
  </button>
);


const StatusBadge = ({ status }) => (
  <span
    className={`px-3 py-1 text-xs font-semibold rounded-full ${
      status === "pending"
        ? "bg-red-100 text-red-600"
        : "bg-green-100 text-green-600"
    }`}
  >
    {status}
  </span>
);


const EmptyState = () => (
  <div className="text-center mt-20 text-gray-500">
    <p className="text-xl">📭 No support messages found</p>
    <p className="text-sm mt-2">New user complaints will appear here</p>
  </div>
);
