import React from "react";

const About = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-white">

      {/* ================= HERO ================= */}
      <section className="relative h-[60vh] flex items-center justify-center text-center">

        {/* Background */}
        <img
          src="https://images.unsplash.com/photo-1494412574643-ffb7f4d1c1a5"
          alt="transport"
          className="absolute w-full h-full object-cover opacity-30"
        />

        <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/80 to-blue-900/80"/>

        <div className="relative z-10 px-6">
          <h1 className="text-5xl font-bold mb-4">
            About <span className="text-indigo-400">TransportX</span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg text-gray-200">
            Building the future of smart transportation with real-time technology,
            verified drivers, and intelligent ride systems.
          </p>
        </div>
      </section>


      {/* ================= STORY ================= */}
      <section className="py-20 px-6 max-w-7xl mx-auto grid md:grid-cols-2 gap-14 items-center">

        <img
          src="https://images.unsplash.com/photo-1529070538774-1843cb3265df"
          alt="team"
          className="rounded-3xl shadow-2xl"
        />

        <div>
          <h2 className="text-4xl font-bold mb-6">Our Story</h2>

          <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
            TransportX was founded with one goal — to simplify urban transportation.
            We saw how traditional ride systems lacked reliability, safety,
            and transparency. So we built a platform powered by modern web
            technology to connect riders and drivers instantly.
          </p>

          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            Today, TransportX is growing into a smart mobility ecosystem
            combining real-time tracking, AI support systems, and verified
            drivers to ensure every ride is safe, smooth, and affordable.
          </p>
        </div>
      </section>


      {/* ================= MISSION VISION ================= */}
      <section className="py-20 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-gray-900 dark:to-gray-950">

        <h2 className="text-4xl font-bold text-center mb-16">
          Our Vision & Mission
        </h2>

        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 px-6">

          <div className="bg-white dark:bg-gray-800 p-10 rounded-3xl shadow-xl hover:scale-105 transition">
            <h3 className="text-2xl font-bold mb-4 text-indigo-600">🚀 Vision</h3>
            <p className="text-gray-600 dark:text-gray-400">
              To become the most trusted and intelligent transportation
              platform globally by combining safety, speed, and smart technology.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-10 rounded-3xl shadow-xl hover:scale-105 transition">
            <h3 className="text-2xl font-bold mb-4 text-indigo-600">🎯 Mission</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Deliver safe, affordable, and instant rides using real-time
              systems, verified drivers, and a seamless user experience.
            </p>
          </div>

        </div>
      </section>


      {/* ================= FEATURES ================= */}
      <section className="py-24 px-6 max-w-7xl mx-auto">

        <h2 className="text-4xl font-bold text-center mb-16">
          Why People Trust TransportX
        </h2>

        <div className="grid md:grid-cols-3 gap-10">

          {[
            ["📍", "Live Tracking", "Track your ride in real time with GPS accuracy."],
            ["🛡️", "Verified Drivers", "All drivers pass admin verification."],
            ["⚡", "Instant Booking", "Book rides within seconds."],
            ["🔒", "Secure System", "JWT authentication ensures safety."],
            ["💰", "Fair Pricing", "Transparent fare calculation."],
            ["📱", "Mobile Ready", "Optimized for all devices."]
          ].map((f,i)=>(
            <div
              key={i}
              className="bg-white dark:bg-gray-900 rounded-2xl p-10 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition text-center"
            >
              <div className="text-5xl mb-4">{f[0]}</div>
              <h3 className="text-xl font-bold mb-2">{f[1]}</h3>
              <p className="text-gray-500">{f[2]}</p>
            </div>
          ))}

        </div>
      </section>


      {/* ================= TEAM ================= */}
      <section className="py-24 bg-white dark:bg-gray-900">

        <h2 className="text-4xl font-bold text-center mb-16">
          Our Team
        </h2>

        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-10 px-6">

          {[
            ["Founder", "https://randomuser.me/api/portraits/men/32.jpg"],
            ["Lead Developer", "https://randomuser.me/api/portraits/men/75.jpg"],
            ["UI Designer", "https://randomuser.me/api/portraits/women/65.jpg"]
          ].map((member,i)=>(
            <div
              key={i}
              className="text-center bg-gray-50 dark:bg-gray-800 rounded-3xl p-10 shadow-lg"
            >
              <img
                src={member[1]}
                alt="team"
                className="w-28 h-28 rounded-full mx-auto mb-6 object-cover shadow"
              />
              <h3 className="text-xl font-bold">{member[0]}</h3>
              <p className="text-gray-500">TransportX Team</p>
            </div>
          ))}

        </div>
      </section>


      {/* ================= TECH STACK ================= */}
      <section className="py-20 px-6 max-w-5xl mx-auto text-center">

        <h2 className="text-4xl font-bold mb-12">
          Technology Stack
        </h2>

        <div className="flex flex-wrap justify-center gap-4">

          {[
            "React","Node.js","MongoDB","Express",
            "Socket.io","JWT","Tailwind","OpenStreetMap"
          ].map((tech)=>(
            <span
              key={tech}
              className="px-5 py-2 rounded-full bg-indigo-100 dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 font-semibold"
            >
              {tech}
            </span>
          ))}

        </div>
      </section>


      {/* ================= FOOTER ================= */}
      <footer className="py-10 text-center text-gray-500 dark:text-gray-400">
        © 2026 TransportX — Smart Mobility Platform
      </footer>

    </div>
  );
};

export default About;
