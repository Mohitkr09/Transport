import React, { useState } from "react";
import axios from "axios";

const API = "http://localhost:5000/api/support";

const Contact = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    message: "",
  });

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const res = await axios.post(API, form);
      setSuccessMsg(res.data.message || "Message sent successfully!");
      setForm({ name: "", email: "", message: "" });
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-white">

      {/* ================= HERO ================= */}
      <section className="relative h-[45vh] flex items-center justify-center text-center">

        <img
          src="https://images.unsplash.com/photo-1521791136064-7986c2920216"
          alt="support"
          className="absolute w-full h-full object-cover opacity-30"
        />

        <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/80 to-blue-900/80"/>

        <div className="relative z-10 px-6">
          <h1 className="text-5xl font-bold mb-4">
            Contact <span className="text-indigo-400">Support</span>
          </h1>
          <p className="text-lg text-gray-200">
            We're here to help you 24/7 — talk to us anytime.
          </p>
        </div>
      </section>


      {/* ================= CONTACT OPTIONS ================= */}
      <section className="py-16 px-6 max-w-6xl mx-auto grid md:grid-cols-3 gap-8">

        {[
          ["📞", "Call Us", "+91 9999999999"],
          ["✉️", "Email", "support@transportx.com"],
          ["💬", "Live Chat", "Available 24/7"]
        ].map((item,i)=>(
          <div
            key={i}
            className="bg-white dark:bg-gray-900 p-10 rounded-3xl shadow-lg text-center hover:scale-105 transition"
          >
            <div className="text-5xl mb-4">{item[0]}</div>
            <h3 className="text-xl font-bold mb-2">{item[1]}</h3>
            <p className="text-gray-500">{item[2]}</p>
          </div>
        ))}

      </section>


      {/* ================= FORM + INFO ================= */}
      <section className="py-20 px-6 max-w-7xl mx-auto grid md:grid-cols-2 gap-14 items-start">

        {/* FORM */}
        <div className="backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border border-white/20 shadow-2xl rounded-3xl p-10">

          <h2 className="text-2xl font-bold mb-6">Send us a message</h2>

          {successMsg && (
            <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg">
              {successMsg}
            </div>
          )}

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Full Name"
              required
              className="w-full p-4 rounded-xl border focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800"
            />

            <input
              name="email"
              value={form.email}
              onChange={handleChange}
              type="email"
              placeholder="Email Address"
              required
              className="w-full p-4 rounded-xl border focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800"
            />

            <textarea
              name="message"
              value={form.message}
              onChange={handleChange}
              rows="5"
              placeholder="Describe your issue..."
              required
              className="w-full p-4 rounded-xl border focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl font-semibold text-white
                         bg-gradient-to-r from-indigo-600 to-blue-600
                         hover:scale-[1.02] transition disabled:opacity-60"
            >
              {loading ? "Sending Message..." : "Send Message"}
            </button>

          </form>
        </div>


        {/* INFO PANEL */}
        <div className="space-y-10">

          {/* FAQ */}
          <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-lg">
            <h3 className="text-xl font-bold mb-6">Common Questions</h3>

            <ul className="space-y-4 text-gray-600 dark:text-gray-400">
              <li>✔ How do I book a ride?</li>
              <li>✔ How can I cancel booking?</li>
              <li>✔ How to become a driver?</li>
              <li>✔ Payment not processed?</li>
            </ul>
          </div>

          {/* MAP */}
          <div className="rounded-3xl overflow-hidden shadow-lg">
            <iframe
              title="map"
              src="https://maps.google.com/maps?q=india&t=&z=4&ie=UTF8&iwloc=&output=embed"
              className="w-full h-[260px] border-0"
            />
          </div>

        </div>

      </section>


      {/* ================= FOOTER ================= */}
      <footer className="py-10 text-center text-gray-500 dark:text-gray-400">
        © 2026 TransportX Support Center
      </footer>

    </div>
  );
};

export default Contact;
