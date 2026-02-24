import React from "react";
import { motion } from "framer-motion";

/* ================= ANIMATION PRESETS ================= */

const fadeUp = {
  hidden:{opacity:0,y:40},
  show:{opacity:1,y:0,transition:{duration:0.7}}
};

const stagger = {
  hidden:{},
  show:{transition:{staggerChildren:0.15}}
};


/* ================= COMPONENT ================= */

const About = () => {
  return (
    <div className="bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-white overflow-hidden">


      {/* ================================================= HERO */}
      <section className="relative h-[65vh] flex items-center justify-center text-center">

        <img
          src="https://images.unsplash.com/photo-1494412574643-ffb7f4d1c1a5"
          className="absolute w-full h-full object-cover scale-110"
          alt=""
        />

        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/90 via-blue-900/80 to-black/90"/>

        <motion.div
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="relative z-10 px-6 max-w-3xl"
        >
          <h1 className="text-5xl md:text-6xl font-extrabold mb-6">
            About{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent">
              TransportX
            </span>
          </h1>

          <p className="text-lg text-gray-200">
            Building the future of smart transportation with real-time
            technology, verified drivers, and intelligent ride systems.
          </p>
        </motion.div>
      </section>


      {/* ================================================= STORY */}
      <section className="py-24 px-6 max-w-7xl mx-auto grid md:grid-cols-2 gap-14 items-center">

        <motion.img
          initial={{opacity:0,x:-60}}
          whileInView={{opacity:1,x:0}}
          transition={{duration:0.8}}
          viewport={{once:true}}
          src="https://images.unsplash.com/photo-1529070538774-1843cb3265df"
          className="rounded-3xl shadow-2xl"
          alt=""
        />

        <motion.div
          initial={{opacity:0,x:60}}
          whileInView={{opacity:1,x:0}}
          transition={{duration:0.8}}
          viewport={{once:true}}
        >
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
        </motion.div>
      </section>


      {/* ================================================= STATS */}
      <section className="py-20 bg-white dark:bg-gray-900">

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{once:true}}
          className="max-w-6xl mx-auto grid md:grid-cols-4 gap-10 text-center"
        >

          {[
            ["50K+","Rides Completed"],
            ["10K+","Active Users"],
            ["99.9%","Safety Rating"],
            ["24/7","Support"]
          ].map((s,i)=>(
            <motion.div
              variants={fadeUp}
              key={i}
              whileHover={{scale:1.08}}
              className="p-8 rounded-2xl bg-gray-50 dark:bg-gray-800 shadow"
            >
              <h3 className="text-4xl font-bold text-indigo-600 mb-2">
                {s[0]}
              </h3>
              <p className="text-gray-500">{s[1]}</p>
            </motion.div>
          ))}
        </motion.div>

      </section>


      {/* ================================================= VISION */}
      <section className="py-24 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-gray-900 dark:to-gray-950">

        <h2 className="text-4xl font-bold text-center mb-16">
          Our Vision & Mission
        </h2>

        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 px-6">

          {[
            ["🚀","Vision","To become the most trusted and intelligent transportation platform globally by combining safety, speed, and smart technology."],
            ["🎯","Mission","Deliver safe, affordable, and instant rides using real-time systems, verified drivers, and a seamless user experience."]
          ].map((card,i)=>(
            <motion.div
              key={i}
              whileHover={{y:-8}}
              className="bg-white dark:bg-gray-800 p-10 rounded-3xl shadow-xl backdrop-blur border border-gray-200 dark:border-gray-700"
            >
              <h3 className="text-2xl font-bold mb-4 text-indigo-600">
                {card[0]} {card[1]}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {card[2]}
              </p>
            </motion.div>
          ))}

        </div>
      </section>


      {/* ================================================= FEATURES */}
      <section className="py-24 px-6 max-w-7xl mx-auto">

        <h2 className="text-4xl font-bold text-center mb-16">
          Why People Trust TransportX
        </h2>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{once:true}}
          className="grid md:grid-cols-3 gap-10"
        >
          {[
            ["📍","Live Tracking","Track your ride in real time with GPS accuracy."],
            ["🛡️","Verified Drivers","All drivers pass admin verification."],
            ["⚡","Instant Booking","Book rides within seconds."],
            ["🔒","Secure System","JWT authentication ensures safety."],
            ["💰","Fair Pricing","Transparent fare calculation."],
            ["📱","Mobile Ready","Optimized for all devices."]
          ].map((f,i)=>(
            <motion.div
              key={i}
              variants={fadeUp}
              whileHover={{scale:1.05}}
              className="bg-white dark:bg-gray-900 rounded-2xl p-10 shadow-lg text-center"
            >
              <div className="text-5xl mb-4">{f[0]}</div>
              <h3 className="text-xl font-bold mb-2">{f[1]}</h3>
              <p className="text-gray-500">{f[2]}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>


      {/* ================================================= TEAM */}
      <section className="py-24 bg-white dark:bg-gray-900">

        <h2 className="text-4xl font-bold text-center mb-16">
          Our Team
        </h2>

        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-10 px-6">

          {[
            ["Founder","https://randomuser.me/api/portraits/men/32.jpg"],
            ["Lead Developer","https://randomuser.me/api/portraits/men/75.jpg"],
            ["UI Designer","https://randomuser.me/api/portraits/women/65.jpg"]
          ].map((member,i)=>(
            <motion.div
              key={i}
              whileHover={{y:-10}}
              className="text-center bg-gray-50 dark:bg-gray-800 rounded-3xl p-10 shadow-lg"
            >
              <img
                src={member[1]}
                className="w-28 h-28 rounded-full mx-auto mb-6 object-cover shadow-xl"
                alt=""
              />

              <h3 className="text-xl font-bold">{member[0]}</h3>
              <p className="text-gray-500">TransportX Team</p>
            </motion.div>
          ))}

        </div>
      </section>


      {/* ================================================= TECH STACK */}
      <section className="py-20 px-6 max-w-5xl mx-auto text-center">

        <h2 className="text-4xl font-bold mb-12">
          Technology Stack
        </h2>

        <div className="flex flex-wrap justify-center gap-4">

          {[
            "React","Node.js","MongoDB","Express",
            "Socket.io","JWT","Tailwind","OpenStreetMap"
          ].map((tech,i)=>(
            <motion.span
              key={i}
              whileHover={{scale:1.1}}
              className="px-6 py-3 rounded-full bg-indigo-100 dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 font-semibold shadow"
            >
              {tech}
            </motion.span>
          ))}

        </div>
      </section>


      {/* ================================================= FOOTER */}
      <footer className="py-10 text-center text-gray-500 dark:text-gray-400">
        © 2026 TransportX — Smart Mobility Platform
      </footer>

    </div>
  );
};

export default About;