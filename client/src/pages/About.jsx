import React from "react";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import { Github, Linkedin } from "lucide-react";
import { useNavigate } from "react-router-dom";

const fadeUp = {
  hidden: { opacity: 0, y: 60 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8 } }
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.2 } }
};

const About = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-white overflow-hidden">

      {/* ================= HERO ================= */}
      <section className="relative min-h-[80vh] flex items-center justify-center text-center px-6 overflow-hidden">

        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-blue-900 to-black opacity-90" />

        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1500530855697-b586d89ba3ee')] bg-cover bg-center opacity-40" />

        {/* GLASS CARD */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="relative z-10 backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-10 shadow-2xl"
        >
          <h1 className="text-5xl md:text-6xl font-extrabold mb-6">
            About{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent">
              TransportX
            </span>
          </h1>

          <p className="text-lg text-gray-200 mb-6">
            Smart ride platform powered by real-time tech 🚀
          </p>

          <button
            onClick={() => navigate("/book")}
            className="px-8 py-4 rounded-xl bg-indigo-600 text-white shadow-lg hover:scale-105 transition"
          >
            Book Ride Now
          </button>
        </motion.div>
      </section>

      {/* ================= STATS ================= */}
      <section className="py-20 bg-white dark:bg-gray-900">

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center px-6"
        >
          {[
            ["50000", "Rides"],
            ["10000", "Users"],
            ["99.9", "Safety"],
            ["24", "Support"]
          ].map((s, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              whileHover={{ scale: 1.08 }}
              className="p-8 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 shadow-lg"
            >
              <h3 className="text-4xl font-bold text-indigo-600">
                <CountUp end={Number(s[0])} duration={2} />+
              </h3>
              <p className="text-gray-600 dark:text-gray-300">{s[1]}</p>
            </motion.div>
          ))}
        </motion.div>

      </section>

      {/* ================= FEATURES ================= */}
      <section className="py-24 px-6 max-w-7xl mx-auto">

        <h2 className="text-4xl font-bold text-center mb-16">
          Why Choose Us
        </h2>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          className="grid sm:grid-cols-2 md:grid-cols-3 gap-10"
        >
          {[
            ["📍", "Live Tracking"],
            ["⚡", "Instant Booking"],
            ["🛡️", "Secure Rides"],
            ["💰", "Best Pricing"],
            ["📱", "Mobile Friendly"],
            ["🚀", "Fast Matching"]
          ].map((f, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              whileHover={{ y: -10 }}
              className="p-10 rounded-2xl bg-white dark:bg-gray-900 shadow-lg text-center border border-gray-100 dark:border-gray-800"
            >
              <div className="text-5xl mb-4">{f[0]}</div>
              <h3 className="text-xl font-bold">{f[1]}</h3>
            </motion.div>
          ))}
        </motion.div>

      </section>

      {/* ================= TEAM ================= */}
      <section className="py-24 bg-gray-100 dark:bg-gray-900">

        <h2 className="text-4xl font-bold text-center mb-16">
          Our Team
        </h2>

        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-10 px-6">

          {[
            ["Founder", "https://randomuser.me/api/portraits/men/32.jpg"],
            ["Developer", "https://randomuser.me/api/portraits/men/75.jpg"],
            ["Designer", "https://randomuser.me/api/portraits/women/65.jpg"]
          ].map((m, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.05 }}
              className="bg-white dark:bg-gray-800 p-10 rounded-3xl text-center shadow-xl"
            >
              <img
                src={m[1]}
                className="w-28 h-28 rounded-full mx-auto mb-6"
              />

              <h3 className="text-xl font-bold">{m[0]}</h3>

              <div className="flex justify-center gap-4 mt-4 text-gray-500 hover:text-indigo-600">
                <Github />
                <Linkedin />
              </div>
            </motion.div>
          ))}

        </div>

      </section>

      {/* ================= CTA ================= */}
      <section className="py-24 text-center bg-gradient-to-r from-indigo-600 to-blue-600 text-white">

        <h2 className="text-4xl font-bold mb-6">
          Ready to Ride? 🚗
        </h2>

        <button
          onClick={() => navigate("/book")}
          className="bg-white text-indigo-600 px-8 py-4 rounded-xl font-semibold shadow-xl hover:scale-105 transition"
        >
          Book Now
        </button>

      </section>

    </div>
  );
};

export default About;