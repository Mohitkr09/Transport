
import React, { useState } from "react";
import axios from "axios";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Send,
  CheckCircle,
  AlertCircle,
  Headphones,
  ShieldCheck,
  MessageCircle,
  Mail,
  Phone,
  Clock,
  ChevronDown,
  MapPin,
  Navigation,
  ArrowRight,
  Sparkles,
  LoaderCircle,
  LifeBuoy,
  HelpCircle,
  CarFront,
} from "lucide-react";

const API = "http://localhost:5000/api/support";

const faqs = [
  {
    q: "How do I book a ride?",
    a: "Open the booking page, enter your pickup and drop-off locations, choose your preferred vehicle, and follow the steps to confirm your ride.",
  },
  {
    q: "How can I cancel my booking?",
    a: "Open your active ride or booking details and look for the cancellation option. Cancellation availability and any applicable charges depend on your booking.",
  },
  {
    q: "How can I become a driver?",
    a: "Open the driver login or registration flow, complete the required details, and follow the verification process before accepting rides.",
  },
  {
    q: "What should I do if my payment fails?",
    a: "Check your payment status and transaction history before retrying. If money was deducted or the status is unclear, contact support with your booking and transaction details. Never share your OTP or password.",
  },
  {
    q: "How can I get help with an ongoing ride?",
    a: "Keep your booking details available and contact the support team using the contact information provided by your TransportX service.",
  },
  {
    q: "Can I send a parcel using TransportX?",
    a: "If parcel service is available in your area, choose Parcel on the booking page and follow the instructions for pickup and delivery.",
  },
];

const contactOptions = [
  {
    title: "Call support",
    description: "Speak to our support team.",
    value: "+91 9999999999",
    icon: Phone,
    color:
      "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
    href: "tel:+919999999999",
    action: "Call now",
  },
  {
    title: "Email us",
    description: "Send us your questions.",
    value: "support@transportx.com",
    icon: Mail,
    color:
      "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
    href: "mailto:support@transportx.com",
    action: "Send email",
  },
  {
    title: "Ride assistance",
    description: "Get help with bookings.",
    value: "Booking & account help",
    icon: MessageCircle,
    color:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    href: "/book",
    action: "View booking",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: "easeOut" },
  },
};

const Contact = () => {
  const reduceMotion = useReducedMotion();

  const [form, setForm] = useState({
    name: "",
    email: "",
    message: "",
  });

  const [open, setOpen] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (error) setError("");
    if (success) setSuccess("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setSuccess("");
    setError("");

    const name = form.name.trim();
    const email = form.email.trim();
    const message = form.message.trim();

    if (!name || !email || !message) {
      setError("Please complete all fields before sending your message.");
      return;
    }

    if (message.length > 500) {
      setError("Your message must be 500 characters or fewer.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        API,
        { name, email, message },
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 15000,
        }
      );

      setSuccess(
        response.data?.message || "Your message has been sent successfully!"
      );

      setForm({
        name: "",
        email: "",
        message: "",
      });
    } catch (err) {
      console.error("Contact form submission failed:", err);

      if (err.response) {
        setError(
          err.response.data?.message ||
            "We couldn't send your message. Please try again."
        );
      } else if (err.code === "ECONNABORTED") {
        setError(
          "The request took too long. Please check your connection and try again."
        );
      } else {
        setError(
          "Unable to connect to support. Please check that the server is running and try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleContactOption = (option) => {
    if (option.href.startsWith("/")) {
      window.location.assign(option.href);
    } else {
      window.location.href = option.href;
    }
  };

  return (
    <main className="min-h-screen overflow-hidden bg-gray-50 text-gray-900 transition-colors duration-300 dark:bg-gray-950 dark:text-gray-100">
      {/* HERO */}
      <section className="relative isolate flex min-h-[460px] items-center justify-center overflow-hidden px-5 py-20 sm:min-h-[510px] sm:px-8 lg:min-h-[565px]">
        {/* Background image */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-20 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=2000&q=85')",
          }}
        />

        {/* Image overlay adapts to theme */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-950/90 via-blue-950/85 to-gray-950/95 transition-colors duration-300 dark:from-gray-950/95 dark:via-indigo-950/90 dark:to-black/95" />

        <div
          aria-hidden="true"
          className="absolute -left-24 top-10 -z-10 h-72 w-72 rounded-full bg-indigo-500/25 blur-[100px]"
        />

        <div
          aria-hidden="true"
          className="absolute -right-20 bottom-0 -z-10 h-80 w-80 rounded-full bg-blue-400/20 blur-[100px]"
        />

        <motion.div
          initial={reduceMotion ? false : "hidden"}
          animate="show"
          variants={fadeUp}
          className="mx-auto max-w-4xl text-center"
        >
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white shadow-lg backdrop-blur-xl">
            <Headphones size={18} className="text-cyan-300" />
            TransportX Support Center
          </div>

          <h1 className="text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
            How can we
            <span className="block bg-gradient-to-r from-indigo-300 via-blue-300 to-cyan-300 bg-clip-text text-transparent">
              help you?
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-gray-200 sm:text-lg">
            Questions about your ride, booking, or account? Contact our team
            and let us help you find the right solution.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#contact-options"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-medium text-white backdrop-blur-md transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/70"
            >
              <ShieldCheck size={17} className="text-emerald-300" />
              Ride assistance
            </a>

            <a
              href="#contact-form"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-medium text-white backdrop-blur-md transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/70"
            >
              <MessageCircle size={17} className="text-blue-300" />
              Customer support
            </a>
          </div>

          <div className="mt-10 flex items-center justify-center gap-2 text-sm text-gray-300">
            <Clock size={16} />
            <span>We're here to help with your TransportX questions</span>
          </div>
        </motion.div>
      </section>

      {/* CONTACT INTRO */}
      <section
        id="contact-options"
        className="scroll-mt-24 px-5 pb-8 pt-16 transition-colors duration-300 sm:px-8 sm:pt-20"
      >
        <motion.div
          initial={reduceMotion ? false : "hidden"}
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeUp}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
            Get in touch
          </p>

          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-gray-950 dark:text-white sm:text-4xl">
            We're here to help
          </h2>

          <p className="mt-4 leading-7 text-gray-600 dark:text-gray-400">
            Choose a contact option or send us a message using the form below.
          </p>
        </motion.div>
      </section>

      {/* CONTACT CARDS */}
      <section className="px-5 py-10 sm:px-8 sm:py-12">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {contactOptions.map((option, index) => {
            const Icon = option.icon;

            return (
              <motion.button
                key={option.title}
                type="button"
                initial={reduceMotion ? false : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                whileHover={reduceMotion ? undefined : { y: -5 }}
                whileTap={reduceMotion ? undefined : { scale: 0.99 }}
                onClick={() => handleContactOption(option)}
                className="group rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-sm transition-colors duration-300 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/5 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-indigo-500/50 sm:p-7"
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl ${option.color}`}
                  >
                    <Icon size={25} />
                  </div>

                  <ArrowRight
                    size={19}
                    className="text-gray-400 transition group-hover:translate-x-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                  />
                </div>

                <h3 className="mt-5 text-xl font-bold text-gray-900 dark:text-white">
                  {option.title}
                </h3>

                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {option.description}
                </p>

                <p className="mt-4 break-words text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                  {option.value}
                </p>

                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {option.action}
                  <ArrowRight size={15} />
                </span>
              </motion.button>
            );
          })}
        </div>

        <p className="mx-auto mt-5 max-w-6xl text-center text-xs leading-5 text-gray-500 dark:text-gray-500">
          Replace the example phone number and email address with your verified
          support contact details before deployment.
        </p>
      </section>

      {/* CONTACT FORM AND FAQ */}
      <section className="px-5 py-14 transition-colors duration-300 dark:bg-gray-950 sm:px-8 sm:py-20">
        <div className="mx-auto grid max-w-7xl items-start gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
          {/* FORM */}
          <motion.div
            id="contact-form"
            initial={reduceMotion ? false : { opacity: 0, x: -25 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.5 }}
            className="scroll-mt-24 rounded-3xl border border-gray-200 bg-white p-5 shadow-xl shadow-gray-200/50 transition-colors duration-300 dark:border-gray-800 dark:bg-gray-900 dark:shadow-black/10 sm:p-8 lg:p-10"
          >
            <div className="mb-8 flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                <Mail size={23} />
              </div>

              <div>
                <h2 className="text-2xl font-extrabold text-gray-950 dark:text-white">
                  Send us a message
                </h2>

                <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">
                  Describe your question or issue, and we'll help you find the
                  next step.
                </p>
              </div>
            </div>

            {/* SUCCESS MESSAGE */}
            <AnimatePresence mode="wait">
              {success && (
                <motion.div
                  key="success"
                  role="status"
                  aria-live="polite"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
                >
                  <CheckCircle size={19} className="mt-0.5 shrink-0" />
                  <p>{success}</p>
                </motion.div>
              )}

              {error && (
                <motion.div
                  key="error"
                  role="alert"
                  aria-live="assertive"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
                >
                  <AlertCircle size={19} className="mt-0.5 shrink-0" />
                  <p>{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="contact-name"
                  className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
                >
                  Full name
                </label>

                <input
                  id="contact-name"
                  type="text"
                  name="name"
                  placeholder="Enter your full name"
                  value={form.name}
                  onChange={handleChange}
                  autoComplete="name"
                  maxLength={100}
                  required
                  disabled={loading}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:placeholder:text-gray-500 dark:focus:bg-gray-950"
                />
              </div>

              <div>
                <label
                  htmlFor="contact-email"
                  className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
                >
                  Email address
                </label>

                <input
                  id="contact-email"
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="email"
                  maxLength={254}
                  required
                  disabled={loading}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:placeholder:text-gray-500 dark:focus:bg-gray-950"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label
                    htmlFor="contact-message"
                    className="block text-sm font-semibold text-gray-700 dark:text-gray-300"
                  >
                    Your message
                  </label>

                  <span
                    className={`text-xs tabular-nums ${
                      form.message.length > 450
                        ? "text-orange-600 dark:text-orange-400"
                        : "text-gray-500 dark:text-gray-500"
                    }`}
                  >
                    {form.message.length}/500
                  </span>
                </div>

                <textarea
                  id="contact-message"
                  name="message"
                  rows={5}
                  maxLength={500}
                  placeholder="Tell us how we can help..."
                  value={form.message}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  className="w-full resize-y rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:placeholder:text-gray-500 dark:focus:bg-gray-950"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-4 font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:-translate-y-0.5 hover:from-indigo-500 hover:to-blue-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
              >
                {loading ? (
                  <>
                    <LoaderCircle size={19} className="animate-spin" />
                    Sending message...
                  </>
                ) : (
                  <>
                    Send message
                    <Send size={18} />
                  </>
                )}
              </button>

              <p className="text-center text-xs leading-5 text-gray-500 dark:text-gray-500">
                Please don't include passwords, OTPs, or sensitive payment
                information in your message.
              </p>
            </form>
          </motion.div>

          {/* FAQ AND MAP */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, x: 25 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.5 }}
            className="space-y-7"
          >
            {/* FAQ */}
            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-xl shadow-gray-200/50 transition-colors duration-300 dark:border-gray-800 dark:bg-gray-900 dark:shadow-black/10 sm:p-8">
              <div className="mb-7 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                  <HelpCircle size={23} />
                </div>

                <div>
                  <h3 className="text-xl font-extrabold text-gray-950 dark:text-white">
                    Common questions
                  </h3>

                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Quick answers to frequent questions.
                  </p>
                </div>
              </div>

              <div className="divide-y divide-gray-200 dark:divide-gray-800">
                {faqs.map((faq, index) => {
                  const isOpen = open === index;

                  return (
                    <div key={faq.q} className="py-1">
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={`faq-answer-${index}`}
                        onClick={() =>
                          setOpen((previous) =>
                            previous === index ? null : index
                          )
                        }
                        className="flex w-full items-center justify-between gap-4 py-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                      >
                        <span className="text-sm font-semibold leading-6 text-gray-800 dark:text-gray-200">
                          {faq.q}
                        </span>

                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition ${
                            isOpen
                              ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
                              : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                          }`}
                        >
                          <motion.span
                            animate={{ rotate: isOpen ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex"
                          >
                            <ChevronDown size={17} />
                          </motion.span>
                        </span>
                      </button>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            id={`faq-answer-${index}`}
                            initial={
                              reduceMotion
                                ? false
                                : { opacity: 0, height: 0 }
                            }
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <p className="pb-4 pr-8 text-sm leading-7 text-gray-600 dark:text-gray-400">
                              {faq.a}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* MAP */}
            <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xl shadow-gray-200/50 transition-colors duration-300 dark:border-gray-800 dark:bg-gray-900 dark:shadow-black/10">
              <div className="flex items-center gap-3 p-5 sm:p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                  <MapPin size={22} />
                </div>

                <div>
                  <h3 className="font-bold text-gray-950 dark:text-white">
                    Find us on the map
                  </h3>

                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Explore the map of India.
                  </p>
                </div>
              </div>

              <iframe
                title="Map of India"
                src="https://maps.google.com/maps?q=India&t=&z=4&ie=UTF8&iwloc=&output=embed"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-[260px] w-full border-0 sm:h-[300px]"
              />

              <div className="flex items-center justify-between gap-3 p-4 sm:px-6">
                <p className="text-xs leading-5 text-gray-500 dark:text-gray-400">
                  Map shown for general location reference.
                </p>

                <a
                  href="https://www.google.com/maps/search/?api=1&query=India"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-indigo-600 transition hover:text-indigo-500 dark:text-indigo-400"
                >
                  Open map
                  <ArrowRight size={15} />
                </a>
              </div>
            </div>

            {/* SUPPORT REMINDER */}
            <div className="flex items-start gap-4 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-5 dark:border-indigo-500/20 dark:bg-indigo-500/5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 dark:bg-gray-900 dark:text-indigo-400">
                <LifeBuoy size={22} />
              </div>

              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">
                  Need more assistance?
                </h3>

                <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">
                  Include relevant booking details in your support request so
                  the team can better understand your question.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section className="px-5 pb-16 pt-4 sm:px-8 sm:pb-20">
        <div className="mx-auto max-w-5xl rounded-3xl bg-gradient-to-br from-indigo-700 via-blue-700 to-indigo-900 px-6 py-10 text-center text-white sm:px-10 sm:py-12">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
            <CarFront size={25} />
          </div>

          <h2 className="mt-5 text-2xl font-extrabold sm:text-3xl">
            Ready to get moving?
          </h2>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-blue-100 sm:text-base">
            Head to the booking page to plan your next journey with TransportX.
          </p>

          <a
            href="/book"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 font-bold text-indigo-700 transition hover:-translate-y-0.5 hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-white/30"
          >
            Book a ride
            <ArrowRight size={18} />
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-200 bg-white px-5 py-8 transition-colors duration-300 dark:border-gray-800 dark:bg-gray-900 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <a
            href="/"
            className="text-2xl font-extrabold tracking-tight text-indigo-600 dark:text-indigo-400"
          >
            Transport<span className="text-blue-500 dark:text-blue-300">X</span>
          </a>

          <p className="text-sm text-gray-500 dark:text-gray-400">
            We're here to help make every journey simpler.
          </p>

          <p className="text-xs text-gray-500 dark:text-gray-500">
            © {new Date().getFullYear()} TransportX Support Center
          </p>
        </div>
      </footer>
    </main>
  );
};

export default Contact;
