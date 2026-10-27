
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  MapPin,
  Navigation,
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
  Clock3,
  CreditCard,
  Headphones,
  Bike,
  CarFront,
  Package,
  CarTaxiFront,
  LocateFixed,
  Sparkles,
  Route,
  CheckCircle2,
  ChevronRight,
  Zap,
  Menu,
} from "lucide-react";

// Destination images
import airport from "../assets/services/airport.jpg";
import railway from "../assets/services/railway.jpg";
import busStand from "../assets/services/bus_stand.jpg";
import mall from "../assets/services/mall.jpg";
import hospital from "../assets/services/hospital.jpg";

const services = [
  {
    name: "Parcel",
    description: "Send packages across the city.",
    icon: Package,
    color: "from-orange-500 to-amber-500",
    lightBg: "bg-orange-50 dark:bg-orange-500/10",
    iconColor: "text-orange-600 dark:text-orange-400",
    badge: "Quick delivery",
  },
  {
    name: "Auto",
    description: "Affordable rides for short trips.",
    icon: CarTaxiFront,
    color: "from-emerald-500 to-teal-500",
    lightBg: "bg-emerald-50 dark:bg-emerald-500/10",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    badge: "Budget friendly",
  },
  {
    name: "Cab Economy",
    description: "Comfortable everyday city travel.",
    icon: CarFront,
    color: "from-indigo-500 to-blue-500",
    lightBg: "bg-indigo-50 dark:bg-indigo-500/10",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    badge: "Everyday rides",
  },
  {
    name: "Bike",
    description: "Get through busy streets faster.",
    icon: Bike,
    color: "from-fuchsia-500 to-purple-500",
    lightBg: "bg-fuchsia-50 dark:bg-fuchsia-500/10",
    iconColor: "text-fuchsia-600 dark:text-fuchsia-400",
    badge: "City express",
  },
];

const destinations = [
  {
    name: "Airport",
    subtitle: "Start your journey",
    image: airport,
    icon: Navigation,
  },
  {
    name: "Railway Station",
    subtitle: "Catch your train",
    image: railway,
    icon: Route,
  },
  {
    name: "Bus Stand",
    subtitle: "Connect to your next stop",
    image: busStand,
    icon: MapPin,
  },
  {
    name: "Shopping Mall",
    subtitle: "Make your day out easier",
    image: mall,
    icon: MapPin,
  },
  {
    name: "Hospital",
    subtitle: "Travel when it matters",
    image: hospital,
    icon: ShieldCheck,
  },
];

const benefits = [
  {
    icon: ShieldCheck,
    title: "Safety comes first",
    description:
      "A ride experience designed around safety, clear trip details, and rider confidence.",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
  },
  {
    icon: LocateFixed,
    title: "Track your ride",
    description:
      "Follow your trip with location updates wherever real-time tracking is available.",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-500/10",
  },
  {
    icon: CreditCard,
    title: "Convenient payments",
    description:
      "Review your ride details and use the payment options supported by the platform.",
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-500/10",
  },
  {
    icon: Headphones,
    title: "Help when you need it",
    description:
      "Find support for booking questions, ride concerns, and account assistance.",
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-500/10",
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

const Home = () => {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  const [pickup, setPickup] = useState("");
  const [drop, setDrop] = useState("");
  const [selectedService, setSelectedService] = useState("Cab Economy");
  const [locationError, setLocationError] = useState("");

  // Redirect authenticated drivers and administrators.
  useEffect(() => {
    try {
      const token = localStorage.getItem("token");
      const userString = localStorage.getItem("user");

      if (!token || !userString) return;

      const user = JSON.parse(userString);

      if (user?.role === "driver") {
        navigate("/driver/dashboard", { replace: true });
      } else if (user?.role === "admin") {
        navigate("/admin/dashboard", { replace: true });
      }
    } catch (error) {
      console.error("Unable to read saved user information:", error);
    }
  }, [navigate]);

  const goToBooking = (overrides = {}) => {
    const bookingPickup = overrides.pickup ?? pickup.trim();
    const bookingDrop = overrides.drop ?? drop.trim();
    const bookingService = overrides.service ?? selectedService;

    if (
      !overrides.destination &&
      !bookingPickup &&
      !bookingDrop &&
      !overrides.service
    ) {
      setLocationError("Enter your pickup and drop locations to continue.");
      return;
    }

    setLocationError("");

    navigate("/book", {
      state: {
        pickup: bookingPickup,
        drop: bookingDrop,
        service: bookingService,
        destination: overrides.destination ?? "",
      },
    });
  };

  const handleLocationChange = (setter) => (event) => {
    setter(event.target.value);
    setLocationError("");
  };

  const scrollToBooking = () => {
    document.getElementById("quick-booking")?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "center",
    });
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-gray-50 text-gray-900 transition-colors duration-300 dark:bg-gray-950 dark:text-gray-100">
      {/* BACKGROUND DECORATION */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[-150px] top-40 h-80 w-80 rounded-full bg-indigo-400/10 blur-[100px] dark:bg-indigo-500/10"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[-120px] top-[650px] h-80 w-80 rounded-full bg-blue-400/10 blur-[100px] dark:bg-blue-500/10"
      />

      {/* HERO */}
      <section className="relative px-5 pb-16 pt-12 transition-colors duration-300 sm:px-8 sm:pb-24 sm:pt-16 lg:pb-28 lg:pt-20">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          {/* HERO COPY */}
          <motion.div
            initial={reduceMotion ? false : "hidden"}
            animate="show"
            variants={fadeUp}
            className="relative z-10"
          >
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 dark:border-indigo-400/20 dark:bg-indigo-500/10 dark:text-indigo-300">
              <Sparkles size={16} />
              Your city, your way
            </div>

            <h1 className="max-w-3xl text-4xl font-black leading-[1.12] tracking-tight text-gray-950 dark:text-white sm:text-5xl md:text-6xl xl:text-7xl">
              Every journey,
              <span className="mt-2 block bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 bg-clip-text text-transparent dark:from-indigo-400 dark:via-blue-400 dark:to-cyan-300">
                made simpler.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-gray-600 dark:text-gray-400 sm:text-lg">
              Book a ride, get across town, or send a parcel. TransportX
              brings your everyday travel needs together in one convenient
              place.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={scrollToBooking}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-7 py-4 font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:-translate-y-0.5 hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/30"
              >
                Book a ride
                <ArrowRight size={19} />
              </button>

              <button
                type="button"
                onClick={() => navigate("/login?role=driver")}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-7 py-4 font-bold text-gray-800 transition hover:border-indigo-300 hover:bg-indigo-50 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:hover:border-indigo-500 dark:hover:bg-gray-800"
              >
                Become a driver
                <ArrowUpRight size={19} />
              </button>
            </div>

            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm text-gray-600 dark:text-gray-400">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2
                  size={17}
                  className="text-emerald-600 dark:text-emerald-400"
                />
                Easy booking
              </span>

              <span className="inline-flex items-center gap-2">
                <CheckCircle2
                  size={17}
                  className="text-emerald-600 dark:text-emerald-400"
                />
                Ride details at a glance
              </span>
            </div>
          </motion.div>

          {/* QUICK BOOKING CARD */}
          <motion.div
            id="quick-booking"
            initial={reduceMotion ? false : { opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.1 }}
            className="relative scroll-mt-28"
          >
            <div
              aria-hidden="true"
              className="absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-indigo-500/20 via-blue-500/10 to-cyan-500/20 blur-xl"
            />

            <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-5 shadow-2xl shadow-gray-300/30 transition-colors duration-300 dark:border-gray-800 dark:bg-gray-900 dark:shadow-black/20 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                    <Zap size={16} />
                    QUICK BOOKING
                  </div>

                  <h2 className="mt-2 text-2xl font-extrabold text-gray-950 dark:text-white sm:text-3xl">
                    Where to next?
                  </h2>

                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Choose your locations to get started.
                  </p>
                </div>

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                  <Navigation size={23} />
                </div>
              </div>

              {/* SERVICE SELECTOR */}
              <div className="mt-7">
                <label className="mb-3 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Select a service
                </label>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {services.map((service) => {
                    const Icon = service.icon;
                    const isSelected = selectedService === service.name;

                    return (
                      <button
                        type="button"
                        key={service.name}
                        aria-pressed={isSelected}
                        onClick={() => {
                          setSelectedService(service.name);
                          setLocationError("");
                        }}
                        className={`flex min-h-[92px] flex-col items-center justify-center gap-2 rounded-xl border p-3 text-center transition focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${
                          isSelected
                            ? "border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/15 dark:border-indigo-400 dark:bg-indigo-500/10 dark:text-indigo-300"
                            : "border-gray-200 bg-gray-50 text-gray-600 hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-gray-700 dark:bg-gray-800/70 dark:text-gray-300 dark:hover:border-indigo-500/60 dark:hover:bg-gray-800"
                        }`}
                      >
                        <Icon size={23} />
                        <span className="text-xs font-bold">
                          {service.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* LOCATION INPUTS */}
              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 transition focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 dark:border-gray-700 dark:bg-gray-950">
                  <MapPin
                    size={20}
                    className="shrink-0 text-emerald-600 dark:text-emerald-400"
                  />

                  <div className="min-w-0 flex-1">
                    <label
                      htmlFor="pickup-location"
                      className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400"
                    >
                      PICKUP LOCATION
                    </label>

                    <input
                      id="pickup-location"
                      type="text"
                      autoComplete="street-address"
                      placeholder="Enter pickup location"
                      value={pickup}
                      onChange={handleLocationChange(setPickup)}
                      className="w-full bg-transparent text-sm font-medium text-gray-900 outline-none placeholder:font-normal placeholder:text-gray-400 dark:text-white dark:placeholder:text-gray-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 transition focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 dark:border-gray-700 dark:bg-gray-950">
                  <Navigation
                    size={20}
                    className="shrink-0 text-indigo-600 dark:text-indigo-400"
                  />

                  <div className="min-w-0 flex-1">
                    <label
                      htmlFor="drop-location"
                      className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400"
                    >
                      DROP-OFF LOCATION
                    </label>

                    <input
                      id="drop-location"
                      type="text"
                      autoComplete="off"
                      placeholder="Where are you going?"
                      value={drop}
                      onChange={handleLocationChange(setDrop)}
                      className="w-full bg-transparent text-sm font-medium text-gray-900 outline-none placeholder:font-normal placeholder:text-gray-400 dark:text-white dark:placeholder:text-gray-500"
                    />
                  </div>
                </div>
              </div>

              {locationError && (
                <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
                  {locationError}
                </p>
              )}

              <button
                type="button"
                onClick={() => goToBooking()}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-4 font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:-translate-y-0.5 hover:from-indigo-500 hover:to-blue-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/30"
              >
                Find your ride
                <ArrowRight size={19} />
              </button>

              <p className="mt-4 text-center text-xs leading-5 text-gray-500 dark:text-gray-400">
                Review your ride details before confirming your booking.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="relative border-y border-gray-200/80 bg-white px-5 py-16 transition-colors duration-300 dark:border-gray-800 dark:bg-gray-900/50 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={reduceMotion ? false : "hidden"}
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            variants={fadeUp}
            className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"
          >
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">
                Move your way
              </p>

              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-950 dark:text-white sm:text-4xl">
                One platform, more possibilities.
              </h2>

              <p className="mt-3 max-w-2xl leading-7 text-gray-600 dark:text-gray-400">
                Find a service that fits your trip, budget, and everyday
                needs.
              </p>
            </div>

            <button
              type="button"
              onClick={scrollToBooking}
              className="inline-flex shrink-0 items-center gap-2 self-start font-semibold text-indigo-600 transition hover:text-indigo-500 dark:text-indigo-400 sm:self-auto"
            >
              Explore services
              <ArrowRight size={18} />
            </button>
          </motion.div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((service, index) => {
              const Icon = service.icon;

              return (
                <motion.button
                  type="button"
                  key={service.name}
                  initial={reduceMotion ? false : { opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.4, delay: index * 0.07 }}
                  whileHover={reduceMotion ? undefined : { y: -5 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                  onClick={() => {
                    setSelectedService(service.name);
                    goToBooking({ service: service.name });
                  }}
                  className="group rounded-2xl border border-gray-200 bg-gray-50 p-6 text-left transition-colors duration-300 hover:border-indigo-300 hover:bg-white hover:shadow-xl hover:shadow-indigo-500/5 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-gray-800 dark:bg-gray-950/70 dark:hover:border-indigo-500/50 dark:hover:bg-gray-900"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${service.color} text-white shadow-lg`}
                    >
                      <Icon size={26} />
                    </div>

                    <ArrowUpRight
                      size={19}
                      className="text-gray-400 transition group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                    />
                  </div>

                  <p className="mt-6 text-xl font-bold text-gray-900 dark:text-white">
                    {service.name}
                  </p>

                  <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">
                    {service.description}
                  </p>

                  <span className="mt-5 inline-flex rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-300">
                    {service.badge}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </section>

      {/* POPULAR DESTINATIONS */}
      <section className="px-5 py-16 transition-colors duration-300 dark:bg-gray-950 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={reduceMotion ? false : "hidden"}
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            variants={fadeUp}
            className="mb-9"
          >
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">
              Where to go
            </p>

            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-950 dark:text-white sm:text-4xl">
              Popular destinations
            </h2>

            <p className="mt-3 max-w-2xl leading-7 text-gray-600 dark:text-gray-400">
              From your daily commute to your next big journey, get moving
              with TransportX.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {destinations.map((place, index) => {
              const Icon = place.icon;

              return (
                <motion.button
                  type="button"
                  key={place.name}
                  initial={reduceMotion ? false : { opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.4, delay: index * 0.06 }}
                  whileHover={reduceMotion ? undefined : { y: -4 }}
                  onClick={() => goToBooking({ destination: place.name })}
                  className="group relative h-[240px] overflow-hidden rounded-2xl bg-gray-200 text-left shadow-md focus:outline-none focus:ring-4 focus:ring-indigo-500/40 sm:h-[280px]"
                >
                  <img
                    src={place.image}
                    alt={place.name}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-gray-950/95 via-gray-950/25 to-transparent" />

                  <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/15 backdrop-blur-md">
                      <Icon size={20} />
                    </div>

                    <h3 className="text-lg font-bold">{place.name}</h3>

                    <p className="mt-1 text-sm leading-5 text-gray-200">
                      {place.subtitle}
                    </p>

                    <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-white">
                      Book a ride
                      <ChevronRight
                        size={17}
                        className="transition-transform group-hover:translate-x-1"
                      />
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="border-y border-gray-200 bg-white px-5 py-16 transition-colors duration-300 dark:border-gray-800 dark:bg-gray-900/50 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">
              The TransportX difference
            </p>

            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-950 dark:text-white sm:text-4xl">
              Designed around your journey
            </h2>

            <p className="mt-4 leading-7 text-gray-600 dark:text-gray-400">
              Useful features and a straightforward experience from booking
              to arrival.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;

              return (
                <motion.div
                  key={benefit.title}
                  initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.4, delay: index * 0.08 }}
                  className="text-center sm:text-left"
                >
                  <div
                    className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${benefit.bg} ${benefit.color} sm:mx-0`}
                  >
                    <Icon size={26} />
                  </div>

                  <h3 className="mt-5 text-lg font-bold text-gray-900 dark:text-white">
                    {benefit.title}
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-gray-600 dark:text-gray-400">
                    {benefit.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* DRIVER CTA */}
      <section className="px-5 py-16 transition-colors duration-300 dark:bg-gray-950 sm:px-8 sm:py-20">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-blue-700 to-blue-900 px-6 py-12 text-white shadow-xl sm:px-12 sm:py-16 lg:px-16"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full border-[40px] border-white/5"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-32 right-1/4 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl"
          />

          <div className="relative z-10 flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-medium text-blue-100">
                <CarFront size={16} />
                Drive with TransportX
              </div>

              <h2 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
                Your next opportunity could be on the road.
              </h2>

              <p className="mt-4 max-w-xl leading-7 text-blue-100">
                Interested in becoming a driver? Start with registration and
                complete the required verification process.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/login?role=driver")}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-6 py-4 font-bold text-indigo-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-white/30"
            >
              Get started
              <ArrowRight size={19} />
            </button>
          </div>
        </motion.div>
      </section>

      {/* FINAL CTA */}
      <section className="px-5 pb-20 pt-4 text-center transition-colors duration-300 dark:bg-gray-950 sm:px-8 sm:pb-24">
        <div className="mx-auto max-w-3xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
            <Navigation size={27} />
          </div>

          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-gray-950 dark:text-white sm:text-4xl">
            Ready for your next ride?
          </h2>

          <p className="mx-auto mt-4 max-w-xl leading-7 text-gray-600 dark:text-gray-400">
            Enter your destination and take the next step with TransportX.
          </p>

          <button
            type="button"
            onClick={scrollToBooking}
            className="mt-7 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-8 py-4 font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:-translate-y-0.5 hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/30"
          >
            Plan your ride
            <ArrowRight size={19} />
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-200 bg-white px-5 py-8 transition-colors duration-300 dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="text-2xl font-extrabold tracking-tight text-indigo-600 dark:text-indigo-400"
          >
            Transport<span className="text-blue-500 dark:text-blue-300">X</span>
          </button>

          <p className="text-sm text-gray-500 dark:text-gray-400">
            Making everyday journeys simpler.
          </p>

          <div className="flex flex-wrap justify-center gap-5 text-sm font-medium text-gray-600 dark:text-gray-400">
            <button
              type="button"
              onClick={() => navigate("/about")}
              className="transition hover:text-indigo-600 dark:hover:text-indigo-400"
            >
              About
            </button>

            <button
              type="button"
              onClick={() => navigate("/contact")}
              className="transition hover:text-indigo-600 dark:hover:text-indigo-400"
            >
              Contact
            </button>

            <button
              type="button"
              onClick={() => navigate("/login")}
              className="transition hover:text-indigo-600 dark:hover:text-indigo-400"
            >
              Sign in
            </button>
          </div>
        </div>

        <div className="mx-auto mt-7 max-w-7xl border-t border-gray-200 pt-5 text-center text-xs text-gray-500 dark:border-gray-800 dark:text-gray-500">
          © {new Date().getFullYear()} TransportX. All rights reserved.
        </div>
      </footer>
    </main>
  );
};

export default Home;
