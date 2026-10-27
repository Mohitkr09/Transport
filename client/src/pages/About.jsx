import React from "react";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  MapPin,
  Navigation,
  CarFront,
  ShieldCheck,
  Clock3,
  Route,
  Users,
  Wallet,
  Smartphone,
  CircleCheck,
  Headphones,
  MapPinned,
  Zap,
  CalendarClock,
  UserRound,
  Star,
  ChevronRight,
  BadgeCheck,
  LocateFixed,
  HeartHandshake,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

const stagger = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12 },
  },
};

const stats = [
  {
    value: 50000,
    suffix: "+",
    label: "Rides completed",
    description: "A growing mobility network",
  },
  {
    value: 10000,
    suffix: "+",
    label: "Registered users",
    description: "People choosing smarter travel",
  },
  {
    value: 99,
    suffix: "%",
    label: "Booking reliability",
    description: "Our goal for dependable rides",
  },
  {
    value: 24,
    suffix: "/7",
    label: "Ride access",
    description: "Book whenever you need to travel",
  },
];

const features = [
  {
    icon: MapPinned,
    title: "Live ride tracking",
    description:
      "Follow your driver's location and keep track of your pickup as your journey approaches.",
    color: "text-indigo-600",
    background: "bg-indigo-50 dark:bg-indigo-500/10",
  },
  {
    icon: Zap,
    title: "Convenient booking",
    description:
      "Enter your pickup and destination, choose an available ride, and book in a few simple steps.",
    color: "text-amber-600",
    background: "bg-amber-50 dark:bg-amber-500/10",
  },
  {
    icon: ShieldCheck,
    title: "Safety-conscious travel",
    description:
      "Access driver and trip details to help you make informed decisions throughout your ride.",
    color: "text-emerald-600",
    background: "bg-emerald-50 dark:bg-emerald-500/10",
  },
  {
    icon: Wallet,
    title: "Clear ride pricing",
    description:
      "Review the ride fare before confirming your booking, based on the pricing provided by the platform.",
    color: "text-blue-600",
    background: "bg-blue-50 dark:bg-blue-500/10",
  },
  {
    icon: Smartphone,
    title: "Built for every screen",
    description:
      "Use TransportX from your phone, tablet, or laptop with an interface that adapts to your device.",
    color: "text-violet-600",
    background: "bg-violet-50 dark:bg-violet-500/10",
  },
  {
    icon: Route,
    title: "Smarter journeys",
    description:
      "Explore route information and, where supported, receive navigation updates during your trip.",
    color: "text-cyan-600",
    background: "bg-cyan-50 dark:bg-cyan-500/10",
  },
];

const steps = [
  {
    number: "01",
    icon: MapPin,
    title: "Set your destination",
    description:
      "Choose your pickup point and enter where you want to go.",
  },
  {
    number: "02",
    icon: CarFront,
    title: "Book your ride",
    description:
      "Review available ride options and confirm your booking.",
  },
  {
    number: "03",
    icon: Navigation,
    title: "Track your journey",
    description:
      "Follow your ride's progress and reach your destination.",
  },
];

const values = [
  {
    icon: HeartHandshake,
    title: "People first",
    description:
      "A straightforward experience for riders and drivers alike.",
  },
  {
    icon: ShieldCheck,
    title: "Trust and transparency",
    description:
      "Clear trip details and a focus on responsible mobility.",
  },
  {
    icon: Clock3,
    title: "Your time matters",
    description:
      "A streamlined booking experience designed to reduce friction.",
  },
];

export default function About() {
  const navigate = useNavigate();

  const handleBookRide = () => {
    navigate("/book");
  };

  return (
    <main className="overflow-hidden bg-white text-slate-900 dark:bg-[#080f1d] dark:text-white">
      {/* ================= HERO ================= */}

      <section className="relative isolate min-h-[680px] overflow-hidden bg-[#07111f] text-white sm:min-h-[720px] lg:min-h-[760px]">
        {/* Background image */}

        <div
          className="absolute inset-0 -z-20 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=2200&q=85')",
          }}
        />

        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#07111f]/95 via-[#07111f]/80 to-[#07111f]/35" />

        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#07111f] via-transparent to-[#07111f]/20" />

        {/* Decorative glow */}

        <div className="pointer-events-none absolute -left-40 top-24 -z-10 h-80 w-80 rounded-full bg-indigo-500/20 blur-[110px]" />

        <div className="pointer-events-none absolute right-0 top-1/4 -z-10 h-72 w-72 rounded-full bg-cyan-400/10 blur-[100px]" />

        <div className="mx-auto grid min-h-[680px] max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:min-h-[760px] lg:grid-cols-[1.1fr_0.9fr] lg:gap-10 lg:px-12 xl:px-16">
          {/* Hero copy */}

          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="max-w-2xl"
          >
            <motion.div
              variants={fadeUp}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-4 py-2 text-xs font-semibold text-slate-200 backdrop-blur-md sm:text-sm"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              A smarter way to get around
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-4xl font-black leading-[1.1] tracking-tight sm:text-5xl md:text-6xl xl:text-7xl"
            >
              Every ride has
              <span className="mt-2 block bg-gradient-to-r from-indigo-300 via-blue-300 to-cyan-200 bg-clip-text text-transparent">
                a destination.
              </span>
              <span className="mt-2 block text-white">
                Make the journey count.
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8"
            >
              TransportX brings ride booking, driver coordination, and
              journey tracking together in one convenient platform.
              Spend less time figuring out your ride and more time getting
              where you need to be.
            </motion.p>

            <motion.div
              variants={fadeUp}
              className="mt-8 flex flex-col gap-3 sm:flex-row"
            >
              <button
                onClick={handleBookRide}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-500 px-6 py-3.5 font-bold text-white shadow-xl shadow-indigo-950/40 transition hover:bg-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-400/30"
              >
                Book a ride
                <ArrowRight size={19} />
              </button>

              <a
                href="#how-it-works"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/[0.06] px-6 py-3.5 font-semibold text-white backdrop-blur-md transition hover:bg-white/10"
              >
                How it works
                <ChevronRight size={18} />
              </a>
            </motion.div>

            <motion.div
              variants={fadeUp}
              className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-slate-300"
            >
              <span className="inline-flex items-center gap-2">
                <CircleCheck size={17} className="text-emerald-400" />
                Simple booking
              </span>

              <span className="inline-flex items-center gap-2">
                <CircleCheck size={17} className="text-emerald-400" />
                Journey visibility
              </span>

              <span className="inline-flex items-center gap-2">
                <CircleCheck size={17} className="text-emerald-400" />
                Rider-focused design
              </span>
            </motion.div>
          </motion.div>

          {/* Ride booking preview */}

          <motion.div
            initial={{ opacity: 0, x: 35 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mx-auto w-full max-w-md lg:ml-auto"
          >
            <div className="overflow-hidden rounded-[2rem] border border-white/15 bg-[#0c1728]/90 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">
                    Your next journey
                  </p>

                  <h2 className="mt-2 text-xl font-bold sm:text-2xl">
                    Where are we going?
                  </h2>

                  <p className="mt-1 text-sm text-slate-400">
                    Your journey begins here.
                  </p>
                </div>

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300">
                  <CarFront size={27} />
                </div>
              </div>

              {/* Pickup and destination */}

              <div className="relative mt-6 space-y-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <div className="absolute bottom-[48px] left-[29px] top-[45px] border-l-2 border-dashed border-slate-600" />

                <div className="relative flex items-center gap-3">
                  <div className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-slate-950">
                    <LocateFixed size={16} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Pickup location
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-200">
                      Choose your pickup
                    </p>
                  </div>

                  <MapPin size={17} className="shrink-0 text-slate-500" />
                </div>

                <div className="relative flex items-center gap-3">
                  <div className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white">
                    <Navigation size={15} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Destination
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-200">
                      Enter your destination
                    </p>
                  </div>

                  <ArrowUpRight
                    size={18}
                    className="shrink-0 text-slate-500"
                  />
                </div>
              </div>

              {/* Booking highlights */}

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                    <Route size={19} />
                  </div>

                  <p className="text-sm font-semibold">Route visibility</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    Follow your trip progress
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                    <ShieldCheck size={19} />
                  </div>

                  <p className="text-sm font-semibold">Trip details</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    Keep key ride information handy
                  </p>
                </div>
              </div>

              <button
                onClick={handleBookRide}
                className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 font-bold text-slate-900 transition hover:bg-indigo-50"
              >
                Start booking
                <ArrowRight size={18} />
              </button>

              <p className="mt-3 text-center text-[11px] leading-5 text-slate-500">
                Enter your trip details on the booking page.
              </p>
            </div>
          </motion.div>
        </div>

        {/* Bottom fade */}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#080f1d] to-transparent" />
      </section>

      {/* ================= STATS ================= */}

      <section className="relative border-b border-slate-200 bg-white py-12 dark:border-white/10 dark:bg-[#080f1d] sm:py-16">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-5 sm:gap-6 sm:px-8 md:grid-cols-4 lg:px-12"
        >
          {stats.map((stat) => (
            <motion.div
              key={stat.label}
              variants={fadeUp}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center dark:border-white/10 dark:bg-white/[0.035] sm:p-6"
            >
              <h3 className="text-2xl font-black tracking-tight text-indigo-600 dark:text-indigo-400 sm:text-3xl md:text-4xl">
                <CountUp
                  end={stat.value}
                  duration={2}
                  enableScrollSpy
                  scrollSpyOnce
                  separator=","
                />
                {stat.suffix}
              </h3>

              <p className="mt-2 text-sm font-bold text-slate-800 dark:text-slate-100 sm:text-base">
                {stat.label}
              </p>

              <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400 sm:text-sm">
                {stat.description}
              </p>
            </motion.div>
          ))}
        </motion.div>

        <p className="mx-auto mt-5 max-w-3xl px-5 text-center text-xs leading-5 text-slate-500 dark:text-slate-500">
          Replace these example metrics with verified live platform
          statistics before publishing.
        </p>
      </section>

      {/* ================= ABOUT TRANSPORTX ================= */}

      <section className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-2 lg:gap-16 lg:px-12 lg:py-24">
        <motion.div
          initial={{ opacity: 0, x: -25 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.65 }}
          className="relative"
        >
          <div className="overflow-hidden rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-900/10 dark:border-white/10 dark:shadow-black/20">
            <img
              src="https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=1200&q=85"
              alt="Car travelling along a city road"
              loading="lazy"
              className="h-[300px] w-full object-cover sm:h-[420px]"
            />
          </div>

          <div className="relative mx-4 -mt-14 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-[#111b2c] sm:mx-8 sm:p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                <Navigation size={24} />
              </div>

              <div>
                <p className="font-bold">From pickup to destination</p>
                <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
                  A connected experience for your journey.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="pt-2 lg:pt-0"
        >
          <motion.p
            variants={fadeUp}
            className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400"
          >
            About TransportX
          </motion.p>

          <motion.h2
            variants={fadeUp}
            className="mt-4 text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl"
          >
            Built around the way people travel.
          </motion.h2>

          <motion.p
            variants={fadeUp}
            className="mt-5 text-base leading-7 text-slate-600 dark:text-slate-400 sm:text-lg sm:leading-8"
          >
            Getting from one place to another should feel straightforward.
            TransportX is designed to connect riders with drivers through
            a unified ride-booking experience, with trip details and
            journey information accessible in one place.
          </motion.p>

          <motion.p
            variants={fadeUp}
            className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-400"
          >
            From choosing your destination to following your trip, our
            goal is to make everyday travel easier to understand and
            manage.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-7 space-y-4">
            {[
              "A clear and simple booking journey",
              "Connected rider and driver workflows",
              "A responsive experience across devices",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <CircleCheck
                  size={21}
                  className="mt-0.5 shrink-0 text-emerald-500"
                />
                <p className="text-sm font-medium leading-6 text-slate-700 dark:text-slate-300 sm:text-base">
                  {item}
                </p>
              </div>
            ))}
          </motion.div>

          <motion.div variants={fadeUp} className="mt-8">
            <button
              onClick={handleBookRide}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-bold text-white transition hover:bg-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/30"
            >
              Plan your ride
              <ArrowRight size={18} />
            </button>
          </motion.div>
        </motion.div>
      </section>

      {/* ================= FEATURES ================= */}

      <section className="bg-slate-50 px-5 py-16 dark:bg-[#0b1423] sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-12 max-w-2xl text-center sm:mb-16">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
              Designed for the road
            </p>

            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
              A better ride experience starts here.
            </h2>

            <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-400 sm:text-base">
              Practical features to help you book, follow, and manage
              your journey with greater convenience.
            </p>
          </div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6"
          >
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <motion.article
                  key={feature.title}
                  variants={fadeUp}
                  whileHover={{ y: -5 }}
                  className="group rounded-2xl border border-slate-200 bg-white p-6 transition-shadow hover:shadow-xl hover:shadow-slate-900/5 dark:border-white/10 dark:bg-[#111b2c] dark:hover:shadow-black/20 sm:p-7"
                >
                  <div
                    className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl ${feature.background} ${feature.color}`}
                  >
                    <Icon size={24} />
                  </div>

                  <h3 className="text-lg font-bold sm:text-xl">
                    {feature.title}
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-400 sm:text-base">
                    {feature.description}
                  </p>

                  <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                    Built for your journey
                    <ArrowRight
                      size={16}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </div>
                </motion.article>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}

      <section
        id="how-it-works"
        className="scroll-mt-8 px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-12 max-w-2xl text-center sm:mb-16">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
              Three simple steps
            </p>

            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
              From here to there.
            </h2>

            <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-400 sm:text-base">
              A straightforward process from entering your destination
              to completing your journey.
            </p>
          </div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="relative grid gap-6 md:grid-cols-3 md:gap-8"
          >
            {steps.map((step, index) => {
              const Icon = step.icon;

              return (
                <motion.article
                  key={step.number}
                  variants={fadeUp}
                  className="relative rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-[#111b2c] sm:p-8"
                >
                  <div className="mb-7 flex items-center justify-between">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                      <Icon size={26} />
                    </div>

                    <span className="text-3xl font-black text-slate-200 dark:text-slate-700">
                      {step.number}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold">{step.title}</h3>

                  <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-400 sm:text-base">
                    {step.description}
                  </p>

                  {index < steps.length - 1 && (
                    <div className="mt-6 hidden items-center gap-2 text-indigo-500 md:flex">
                      <span className="h-px flex-1 bg-indigo-200 dark:bg-indigo-500/30" />
                      <ArrowRight size={18} />
                    </div>
                  )}
                </motion.article>
              );
            })}
          </motion.div>

          <div className="mt-10 text-center">
            <button
              onClick={handleBookRide}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-7 py-3.5 font-bold text-white transition hover:bg-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/30"
            >
              Book your first ride
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* ================= OUR VALUES ================= */}

      <section className="border-y border-slate-200 bg-slate-50 px-5 py-16 dark:border-white/10 dark:bg-[#0b1423] sm:px-8 sm:py-20 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
                What guides us
              </p>

              <h2 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">
                More than getting from A to B.
              </h2>

              <p className="mt-5 text-base leading-7 text-slate-600 dark:text-slate-400">
                A useful mobility platform should respect your time,
                make important trip details easy to find, and support
                both sides of every ride.
              </p>
            </div>

            <div className="space-y-4">
              {values.map((value) => {
                const Icon = value.icon;

                return (
                  <div
                    key={value.title}
                    className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#111b2c] sm:p-6"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                      <Icon size={22} />
                    </div>

                    <div>
                      <h3 className="font-bold sm:text-lg">
                        {value.title}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400 sm:text-base">
                        {value.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ================= DRIVER CTA ================= */}

      <section className="px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
        <div className="mx-auto grid max-w-7xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-700 via-indigo-600 to-blue-700 text-white shadow-2xl shadow-indigo-950/20 md:grid-cols-[1fr_0.75fr]">
          <div className="p-7 sm:p-10 lg:p-12">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold sm:text-sm">
              <Users size={16} />
              For drivers and riders
            </div>

            <h2 className="max-w-xl text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
              Better journeys begin with better connections.
            </h2>

            <p className="mt-5 max-w-xl text-sm leading-7 text-indigo-100 sm:text-base sm:leading-8">
              Whether you're looking for a convenient ride or want to
              join the driver network, TransportX provides a starting
              point for a connected travel experience.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={handleBookRide}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 font-bold text-indigo-700 transition hover:bg-indigo-50"
              >
                Book a ride
                <ArrowRight size={18} />
              </button>

              <Link
                to="/signup"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3 font-semibold text-white transition hover:bg-white/15"
              >
                Create an account
                <ArrowUpRight size={18} />
              </Link>
            </div>
          </div>

          <div className="relative hidden min-h-[320px] overflow-hidden md:block">
            <img
              src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=85"
              alt="Modern car on the road"
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />

            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/50 via-indigo-700/10 to-transparent" />

            <div className="absolute bottom-6 left-6 right-6 rounded-2xl border border-white/20 bg-[#07111f]/75 p-5 backdrop-blur-lg">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
                  <CarFront size={24} />
                </div>

                <div>
                  <p className="font-bold">Your next trip awaits</p>
                  <p className="mt-1 text-xs text-slate-300">
                    Start with a destination.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FINAL CTA ================= */}

      <section className="border-t border-slate-200 px-5 py-16 text-center dark:border-white/10 sm:px-8 sm:py-20">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="mx-auto max-w-3xl"
        >
          <motion.div
            variants={fadeUp}
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300"
          >
            <Navigation size={27} />
          </motion.div>

          <motion.h2
            variants={fadeUp}
            className="mt-6 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl"
          >
            Ready for your next journey?
          </motion.h2>

          <motion.p
            variants={fadeUp}
            className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-600 dark:text-slate-400 sm:text-base"
          >
            Choose your destination and get started with TransportX.
            Your next journey is only a few steps away.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-8">
            <button
              onClick={handleBookRide}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-8 py-3.5 font-bold text-white shadow-lg shadow-indigo-950/20 transition hover:-translate-y-0.5 hover:bg-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/30"
            >
              Book your ride
              <ArrowRight size={19} />
            </button>
          </motion.div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-xs text-slate-500 sm:text-sm">
            <span className="inline-flex items-center gap-2">
              <BadgeCheck size={16} />
              Simple booking
            </span>

            <span className="inline-flex items-center gap-2">
              <Headphones size={16} />
              Ride information
            </span>

            <span className="inline-flex items-center gap-2">
              <CalendarClock size={16} />
              Plan your journey
            </span>
          </div>
        </motion.div>
      </section>

      {/* ================= FOOTER ================= */}

      <footer className="border-t border-slate-200 bg-slate-50 px-5 py-8 dark:border-white/10 dark:bg-[#060c16] sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-lg font-extrabold"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <CarFront size={21} />
            </span>

            <span>
              Transport<span className="text-indigo-500">X</span>
            </span>
          </Link>

          <p className="text-xs leading-5 text-slate-500 sm:text-sm">
            © {new Date().getFullYear()} TransportX. Smart mobility for
            modern journeys.
          </p>

          <Link
            to="/"
            className="text-sm font-semibold text-slate-600 transition hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
          >
            Back to home
          </Link>
        </div>
      </footer>
    </main>
  );
}
