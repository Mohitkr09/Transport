import React from "react";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import { Github, Linkedin } from "lucide-react";

/* ANIMATION */

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7 } }
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15 } }
};

const About = () => {

  return (
    <div className="bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-white overflow-hidden">

      {/* HERO */}

      <section className="relative min-h-[70vh] flex items-center justify-center text-center px-6 overflow-hidden">

        {/* animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-blue-900 to-black opacity-90"/>

        {/* background image */}
        <motion.div
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          transition={{ duration: 8 }}
          className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1500530855697-b586d89ba3ee')] bg-cover bg-center opacity-40"
        />

        {/* floating blobs */}
        <div className="absolute top-10 left-10 w-72 h-72 bg-indigo-500 rounded-full blur-3xl opacity-20 animate-pulse"/>
        <div className="absolute bottom-10 right-10 w-72 h-72 bg-blue-500 rounded-full blur-3xl opacity-20 animate-pulse"/>

        <motion.div
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="relative z-10 max-w-3xl"
        >

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-6">
            About{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent">
              TransportX
            </span>
          </h1>

          <p className="text-lg text-gray-200">
            Smart ride platform powered by real-time technology,
            secure drivers, and seamless mobility solutions.
          </p>

        </motion.div>

      </section>


      {/* STORY */}

      <section className="py-24 px-6 max-w-7xl mx-auto grid md:grid-cols-2 gap-14 items-center">

        <motion.img
          initial={{ opacity: 0, x: -60 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          src="https://images.unsplash.com/photo-1529070538774-1843cb3265df"
          className="rounded-3xl shadow-2xl"
        />

        <motion.div
          initial={{ opacity: 0, x: 60 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >

          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Our Story
          </h2>

          <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
            TransportX was created to simplify transportation using
            modern web technology. Our platform connects riders and
            drivers instantly while maintaining safety, transparency,
            and speed.
          </p>

          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            By combining real-time tracking, intelligent routing,
            and verified drivers, we are building a smarter
            mobility ecosystem for the future.
          </p>

        </motion.div>

      </section>


      {/* STATS */}

      <section className="py-20 bg-white dark:bg-gray-900">

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center px-6"
        >

          {[
            ["50000", "Rides Completed"],
            ["10000", "Active Users"],
            ["99.9", "Safety Rating"],
            ["24", "Support"]
          ].map((s, i) => (

            <motion.div
              variants={fadeUp}
              key={i}
              whileHover={{ scale: 1.08 }}
              className="p-8 rounded-2xl bg-gray-50 dark:bg-gray-800 shadow-xl"
            >

              <h3 className="text-3xl md:text-4xl font-bold text-indigo-600 mb-2">
                <CountUp end={Number(s[0])} duration={2}/>+
              </h3>

              <p className="text-gray-500">{s[1]}</p>

            </motion.div>

          ))}

        </motion.div>

      </section>


      {/* VISION */}

      <section className="py-24 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-gray-900 dark:to-gray-950">

        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
          Vision & Mission
        </h2>

        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 px-6">

          {[
            ["🚀", "Vision", "To become the world's most trusted smart mobility platform."],
            ["🎯", "Mission", "Deliver safe, fast, and affordable rides with modern technology."]
          ].map((card, i) => (

            <motion.div
              key={i}
              whileHover={{ y: -10 }}
              className="bg-white dark:bg-gray-800 p-10 rounded-3xl shadow-xl backdrop-blur-lg border border-gray-200 dark:border-gray-700"
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


      {/* FEATURES */}

      <section className="py-24 px-6 max-w-7xl mx-auto">

        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
          Why Choose TransportX
        </h2>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid sm:grid-cols-2 md:grid-cols-3 gap-10"
        >

          {[
            ["📍", "Live Tracking"],
            ["🛡️", "Verified Drivers"],
            ["⚡", "Instant Booking"],
            ["🔒", "Secure System"],
            ["💰", "Fair Pricing"],
            ["📱", "Mobile Friendly"]
          ].map((f, i) => (

            <motion.div
              key={i}
              variants={fadeUp}
              whileHover={{ scale: 1.05 }}
              className="bg-white dark:bg-gray-900 rounded-2xl p-10 shadow-xl text-center"
            >

              <div className="text-5xl mb-4">{f[0]}</div>

              <h3 className="text-xl font-bold">{f[1]}</h3>

            </motion.div>

          ))}

        </motion.div>

      </section>


      {/* TEAM */}

      <section className="py-24 bg-white dark:bg-gray-900">

        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
          Our Team
        </h2>

        <div className="max-w-6xl mx-auto grid sm:grid-cols-2 md:grid-cols-3 gap-10 px-6">

          {[
            ["Founder", "https://randomuser.me/api/portraits/men/32.jpg"],
            ["Lead Developer", "https://randomuser.me/api/portraits/men/75.jpg"],
            ["UI Designer", "https://randomuser.me/api/portraits/women/65.jpg"]
          ].map((member, i) => (

            <motion.div
              key={i}
              whileHover={{ y: -10 }}
              className="group text-center bg-gray-50 dark:bg-gray-800 rounded-3xl p-10 shadow-lg"
            >

              <img
                src={member[1]}
                className="w-28 h-28 rounded-full mx-auto mb-6 object-cover shadow group-hover:scale-110 transition"
              />

              <h3 className="text-xl font-bold">{member[0]}</h3>

              <div className="flex justify-center gap-4 mt-4 opacity-0 group-hover:opacity-100 transition">

                <Github className="cursor-pointer hover:text-indigo-600"/>
                <Linkedin className="cursor-pointer hover:text-indigo-600"/>

              </div>

            </motion.div>

          ))}

        </div>

      </section>


      {/* TECH STACK */}

      <section className="py-20 px-6 max-w-5xl mx-auto text-center">

        <h2 className="text-3xl md:text-4xl font-bold mb-12">
          Technology Stack
        </h2>

        <div className="flex flex-wrap justify-center gap-4">

          {[
            "React",
            "Node.js",
            "MongoDB",
            "Express",
            "Socket.io",
            "JWT",
            "Tailwind",
            "OpenStreetMap"
          ].map((tech, i) => (

            <motion.span
              key={i}
              whileHover={{ scale: 1.1 }}
              className="px-6 py-3 rounded-full bg-indigo-100 dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 font-semibold shadow-lg"
            >
              {tech}
            </motion.span>

          ))}

        </div>

      </section>


      {/* CTA */}

      <section className="py-24 text-center bg-gradient-to-r from-indigo-600 to-blue-600 text-white">

        <h2 className="text-4xl font-bold mb-6">
          Ready to Ride?
        </h2>

        <p className="mb-8">
          Book your first ride with TransportX today.
        </p>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="bg-white text-indigo-600 px-8 py-4 rounded-xl font-semibold shadow-xl"
        >
          Book Ride
        </motion.button>

      </section>


      {/* FOOTER */}

      <footer className="py-10 text-center text-gray-500 dark:text-gray-400">
        © 2026 TransportX — Smart Mobility Platform
      </footer>

    </div>
  );

};

export default About;