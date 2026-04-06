import React, { useEffect, useState } from "react";
import {
  User,
  HelpCircle,
  CreditCard,
  Clock,
  Shield,
  Gift,
  Award,
  Ticket,
  Settings,
  ChevronRight,
  Home,
  Navigation,
  Palmtree,
  Pencil,
  RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";

export default function Profile() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [ridesCount, setRidesCount] = useState(0);
  const [wallet, setWallet] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /* ================= FETCH ALL DATA ================= */
  const fetchData = async () => {
    try {
      setRefreshing(true);

      const [userRes, ridesRes] = await Promise.all([
        api.get("/auth/me"),
        api.get("/ride/my"),
      ]);

      const userData = userRes.data.user;
      const rides = ridesRes.data.rides || [];

      setUser(userData);
      setRidesCount(rides.length);

      // 💰 calculate wallet (demo logic)
      const total = rides.reduce((sum, r) => sum + (r.fare || 0), 0);
      setWallet(total);

    } catch (err) {
      console.error("Profile fetch error:", err);

      const localUser = JSON.parse(localStorage.getItem("user"));
      if (localUser) setUser(localUser);

    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  /* ================= MENU ================= */
  const menuItems = [
    { icon: <HelpCircle />, label: "Help", path: "/help" },
    { icon: <CreditCard />, label: "Payments", path: "/payment" },
    { icon: <Clock />, label: "My Rides", path: "/rides" },
    { icon: <Shield />, label: "Safety", path: "/safety" },
    { icon: <Gift />, label: "Refer & Earn", sub: "Get ₹50" },
    { icon: <Award />, label: "Rewards", path: "/rewards" },
    { icon: <Ticket />, label: "Power Pass", path: "/pass" },
    { icon: <Settings />, label: "Settings", path: "/settings" },
  ];

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin">
          <RefreshCw size={40} className="text-indigo-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-24">

      {/* 🔥 HEADER */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-500 h-44 rounded-b-3xl shadow-lg relative">

        {/* REFRESH BUTTON */}
        <button
          onClick={fetchData}
          className="absolute right-4 top-4 bg-white/20 p-2 rounded-full text-white hover:bg-white/30"
        >
          <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
        </button>
      </div>

      {/* 🔥 PROFILE CARD */}
      <div className="relative -mt-24 mx-4 md:mx-10 bg-white rounded-3xl shadow-xl p-6 transition hover:shadow-2xl">

        <div className="flex flex-col md:flex-row items-center gap-4">

          {/* AVATAR */}
          <div className="w-20 h-20 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 text-white flex items-center justify-center text-2xl font-bold overflow-hidden shadow-lg">
            {user?.avatar ? (
              <img src={user.avatar} className="w-full h-full object-cover" />
            ) : (
              user?.name?.charAt(0)?.toUpperCase() || <User />
            )}
          </div>

          {/* USER INFO */}
          <div className="text-center md:text-left flex-1">
            <h2 className="text-xl font-bold">{user?.name}</h2>
            <p className="text-gray-500 text-sm">
              {user?.phone || user?.email}
            </p>

            <button
              onClick={() => navigate("/edit-profile")}
              className="mt-2 flex items-center gap-1 text-sm text-indigo-600 font-semibold hover:underline"
            >
              <Pencil size={14} /> Edit Profile
            </button>
          </div>

          {/* SETTINGS */}
          <button
            onClick={() => navigate("/settings")}
            className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"
          >
            <Settings />
          </button>
        </div>

        {/* 🔥 STATS */}
        <div className="grid grid-cols-3 gap-4 mt-6 text-center">
          <Stat label="Rides" value={ridesCount} />
          <Stat label="Rating" value={user?.rating || 4.5} highlight />
          <Stat label="Wallet" value={`₹${wallet}`} />
        </div>
      </div>

      {/* 🔥 MENU */}
      <div className="mt-6 mx-4 md:mx-10 space-y-3">
        {menuItems.map((item, i) => (
          <div
            key={i}
            onClick={() => item.path && navigate(item.path)}
            className="bg-white rounded-2xl shadow p-4 flex items-center justify-between hover:scale-[1.02] hover:shadow-md transition cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                {item.icon}
              </div>
              <div>
                <p className="font-medium">{item.label}</p>
                {item.sub && (
                  <p className="text-xs text-gray-500">{item.sub}</p>
                )}
              </div>
            </div>
            <ChevronRight className="text-gray-400" />
          </div>
        ))}
      </div>

      {/* 🔻 BOTTOM NAV */}
      <div className="fixed bottom-3 left-1/2 transform -translate-x-1/2 w-[90%] bg-white shadow-xl rounded-2xl flex justify-around py-3 md:hidden">
        <NavItem icon={<Home />} label="Ride" onClick={() => navigate("/")} />
        <NavItem icon={<Navigation />} label="Services" />
        <NavItem icon={<Palmtree />} label="Travel" />
        <NavItem icon={<User />} label="Profile" active />
      </div>
    </div>
  );
}

/* 🔥 STAT COMPONENT */
const Stat = ({ label, value, highlight }) => (
  <div>
    <p className={`font-bold text-lg ${highlight ? "text-yellow-500" : ""}`}>
      {value}
    </p>
    <p className="text-xs text-gray-500">{label}</p>
  </div>
);

/* 🔥 NAV ITEM */
const NavItem = ({ icon, label, onClick, active }) => (
  <div
    onClick={onClick}
    className={`flex flex-col items-center text-xs cursor-pointer ${
      active ? "text-indigo-600 font-semibold" : "text-gray-500"
    }`}
  >
    {icon}
    <span>{label}</span>
  </div>
);