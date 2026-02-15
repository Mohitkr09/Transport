import React from "react";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-white">

      {/* ================= HERO ================= */}
      <section className="relative h-[90vh] flex items-center justify-center text-center overflow-hidden">

        {/* Background Image */}
        <img
          src="https://images.unsplash.com/photo-1502877338535-766e1452684a"
          alt="transport"
          className="absolute w-full h-full object-cover opacity-30"
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/80 to-blue-900/80" />

        {/* Content */}
        <div className="relative z-10 max-w-3xl px-6">

          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight">
            Smart Transport for
            <span className="block text-indigo-400">
              Modern Cities
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-200 mb-10">
            Book rides instantly with real-time tracking, verified drivers
            and AI-powered safety monitoring.
          </p>

          <div className="flex justify-center gap-6">
            <button
              onClick={() => navigate("/book")}
              className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-lg"
            >
              Book Ride
            </button>

            <button
              onClick={() => navigate("/register")}
              className="px-8 py-3 rounded-xl border border-white text-white hover:bg-white hover:text-indigo-600 font-semibold transition"
            >
              Become Driver
            </button>
          </div>

        </div>
      </section>

      {/* ================= TRUST STATS ================= */}
      <section className="py-16 bg-white dark:bg-gray-900">
        <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-10 text-center">

          {[
            ["10K+", "Happy Riders"],
            ["500+", "Verified Drivers"],
            ["99.9%", "Safe Rides"],
            ["24/7", "Live Support"]
          ].map((item, i) => (
            <div key={i}>
              <h3 className="text-3xl font-bold text-indigo-600">{item[0]}</h3>
              <p className="text-gray-500">{item[1]}</p>
            </div>
          ))}

        </div>
      </section>

      {/* ================= RIDES ================= */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-16">
          Choose Your Ride
        </h2>

        <div className="grid md:grid-cols-3 gap-10">

          {[
            {
              name: "Bike",
              img: "https://images.unsplash.com/photo-1558981806-ec527fa84c39",
              desc: "Fastest way to beat traffic"
            },
            {
              name: "Auto",
              img: "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2",
              desc: "Best for short distance rides"
            },
            {
              name: "Car",
              img: "https://images.unsplash.com/photo-1549924231-f129b911e442",
              desc: "Comfortable premium rides"
            }
          ].map((ride, i) => (
            <div
              key={i}
              className="rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition group bg-white dark:bg-gray-900"
            >
              <img
                src={ride.img}
                alt={ride.name}
                className="h-56 w-full object-cover group-hover:scale-110 transition duration-500"
              />

              <div className="p-6 text-center">
                <h3 className="text-2xl font-bold mb-2">{ride.name}</h3>
                <p className="text-gray-500">{ride.desc}</p>
              </div>
            </div>
          ))}

        </div>
      </section>

      {/* ================= FEATURES ================= */}
      <section className="py-24 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-gray-900 dark:to-gray-950">

        <h2 className="text-4xl font-bold text-center mb-16">
          Why Riders Love TransportX
        </h2>

        <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-10 px-6">

          {[
            ["📍", "Real-time Tracking"],
            ["🛡️", "Verified Drivers"],
            ["💳", "Secure Payments"],
            ["⚡", "Instant Booking"]
          ].map((f, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-2xl p-10 shadow-lg hover:scale-105 transition text-center"
            >
              <div className="text-5xl mb-4">{f[0]}</div>
              <h3 className="font-bold text-lg">{f[1]}</h3>
            </div>
          ))}

        </div>
      </section>

      {/* ================= TESTIMONIALS ================= */}
      <section className="py-24 max-w-6xl mx-auto px-6">

        <h2 className="text-4xl font-bold text-center mb-16">
          What Users Say
        </h2>

        <div className="grid md:grid-cols-3 gap-10">

          {[
            ["Rohan", "Best ride service I've used. Fast & reliable."],
            ["Amit", "Drivers are polite and verified. Loved it!"],
            ["Sneha", "Affordable and super safe rides."]
          ].map((t, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-lg"
            >
              <p className="mb-6 text-gray-500">"{t[1]}"</p>
              <h4 className="font-bold text-indigo-600">{t[0]}</h4>
            </div>
          ))}

        </div>
      </section>

      {/* ================= APP CTA ================= */}
      <section className="py-24 text-center bg-indigo-600 text-white">

        <h2 className="text-4xl font-bold mb-6">
          Start Riding in Seconds
        </h2>

        <p className="mb-10 text-lg">
          Book your first ride now and experience smarter transport.
        </p>

        <button
          onClick={() => navigate("/book")}
          className="bg-white text-indigo-600 px-10 py-4 rounded-xl font-bold hover:bg-gray-200 transition"
        >
          Book Ride Now
        </button>

      </section>

      {/* ================= FOOTER ================= */}
      <footer className="py-10 text-center text-gray-500 dark:text-gray-400">
        © 2026 TransportX — Smart Mobility Platform
      </footer>

    </div>
  );
};

export default Home;
