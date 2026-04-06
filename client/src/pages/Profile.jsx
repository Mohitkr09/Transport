import React, { useEffect, useState } from "react";
import {
  User,
  Star,
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
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";

export default function Profile() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /* ================= FETCH USER ================= */
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get("/auth/me");
        setUser(res.data.user);
      } catch (err) {
        const localUser = JSON.parse(localStorage.getItem("user"));
        if (localUser) setUser(localUser);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
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

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="h-12 w-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-24">

      {/* 🔥 GRADIENT HEADER */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-500 h-40 rounded-b-3xl shadow-lg" />

      {/* 🔥 PROFILE CARD */}
      <div className="relative -mt-20 mx-4 md:mx-10 bg-white rounded-3xl shadow-xl p-6">

        {/* TOP SECTION */}
        <div className="flex flex-col md:flex-row items-center gap-4">

          {/* AVATAR */}
          <div className="w-20 h-20 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 text-white flex items-center justify-center text-2xl font-bold overflow-hidden shadow-lg">
            {user?.avatar ? (
              <img src={user.avatar} className="w-full h-full object-cover" />
            ) : (
              user?.name?.charAt(0)?.toUpperCase()
            )}
          </div>

          {/* INFO */}
          <div className="text-center md:text-left flex-1">
            <h2 className="text-xl font-bold">{user?.name}</h2>
            <p className="text-gray-500 text-sm">
              {user?.phone || user?.email}
            </p>

            {/* EDIT BUTTON */}
            <button
              onClick={() => navigate("/edit-profile")}
              className="mt-2 flex items-center gap-1 text-sm text-indigo-600 font-semibold hover:underline"
            >
              <Pencil size={14} /> Edit Profile
            </button>
          </div>

          {/* SETTINGS QUICK */}
          <button
            onClick={() => navigate("/settings")}
            className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"
          >
            <Settings />
          </button>
        </div>

        {/* 🔥 STATS */}
        <div className="grid grid-cols-3 gap-4 mt-6 text-center">
          <div>
            <p className="font-bold text-lg">{user?.rides || 12}</p>
            <p className="text-xs text-gray-500">Rides</p>
          </div>
          <div>
            <p className="font-bold text-lg text-yellow-500">
              {user?.rating || 4.5}
            </p>
            <p className="text-xs text-gray-500">Rating</p>
          </div>
          <div>
            <p className="font-bold text-lg">₹{user?.wallet || 120}</p>
            <p className="text-xs text-gray-500">Wallet</p>
          </div>
        </div>
      </div>

      {/* 🔥 MENU */}
      <div className="mt-6 mx-4 md:mx-10 space-y-3">
        {menuItems.map((item, i) => (
          <div
            key={i}
            onClick={() => item.path && navigate(item.path)}
            className="bg-white rounded-2xl shadow p-4 flex items-center justify-between hover:shadow-md transition cursor-pointer"
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

      {/* 🔻 MODERN BOTTOM NAV */}
      <div className="fixed bottom-3 left-1/2 transform -translate-x-1/2 w-[90%] bg-white shadow-xl rounded-2xl flex justify-around py-3 md:hidden">

        <NavItem icon={<Home />} label="Ride" onClick={() => navigate("/")} />
        <NavItem icon={<Navigation />} label="Services" />
        <NavItem icon={<Palmtree />} label="Travel" />
        <NavItem icon={<User />} label="Profile" active />

      </div>
    </div>
  );
}

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