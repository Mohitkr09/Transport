import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Navigation } from "lucide-react";

/* DESTINATION IMAGES */
import airport from "../assets/services/airport.jpg";
import railway from "../assets/services/railway.jpg";
import busStand from "../assets/services/bus_stand.jpg";
import mall from "../assets/services/mall.jpg";
import hospital from "../assets/services/hospital.jpg";

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7 } }
};

const services = [
  { name: "Parcel", icon: "📦" },
  { name: "Auto", icon: "🛺" },
  { name: "Cab Economy", icon: "🚕" },
  { name: "Bike", icon: "🏍️" }
];

const destinations = [
  { name: "Airport", image: airport },
  { name: "Railway Station", image: railway },
  { name: "Bus Stand", image: busStand },
  { name: "Shopping Mall", image: mall },
  { name: "Hospital", image: hospital }
];

const Home = () => {

  const navigate = useNavigate();
  const [count, setCount] = useState([0,0,0,0]);

  /* ======================================================
  ROLE BASED REDIRECT (FINAL FIX)
  ====================================================== */

  useEffect(() => {

    try {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user") || "null");

      if (!token || !user) return;

      if (user.role === "driver") {
        navigate("/driver/dashboard", { replace: true });
      }

      else if (user.role === "admin") {
        navigate("/admin/dashboard", { replace: true });
      }

      // ✅ user stays on home

    } catch (err) {
      console.error("User parse error:", err);
    }

  }, [navigate]);



  /* ======================================================
  COUNTER ANIMATION
  ====================================================== */

  useEffect(()=>{
    const interval = setInterval(()=>{
      setCount(prev=>[
        Math.min(prev[0]+200,10000),
        Math.min(prev[1]+10,500),
        Math.min(prev[2]+2,99),
        Math.min(prev[3]+1,24)
      ])
    },40)

    return ()=>clearInterval(interval)
  },[])



  return(

<div className="bg-gray-50 dark:bg-black text-gray-800 dark:text-white overflow-hidden relative">

{/* BACKGROUND BLOBS */}
<div className="absolute top-20 left-10 w-72 h-72 bg-indigo-400 rounded-full blur-[120px] opacity-20"/>
<div className="absolute top-40 right-10 w-72 h-72 bg-blue-400 rounded-full blur-[120px] opacity-20"/>


{/* HERO */}
<section className="pt-28 md:pt-32 pb-20 px-6 relative">

<div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">


{/* LEFT */}
<motion.div initial="hidden" animate="show" variants={fadeUp}>

<h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight mb-6">
Smart Transport for
<span className="block bg-gradient-to-r from-indigo-500 to-blue-500 text-transparent bg-clip-text">
Modern Cities
</span>
</h1>

<p className="text-base md:text-lg text-gray-500 dark:text-gray-400 mb-8 max-w-lg">
Book rides instantly with real-time tracking, verified drivers and safe digital payments.
</p>

<div className="flex flex-wrap gap-4">

{/* BOOK RIDE */}
<button
onClick={()=>navigate("/book")}
className="px-6 md:px-8 py-3 md:py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-lg hover:scale-105 transition"
>
Book Ride
</button>

{/* DRIVER LOGIN */}
<button
onClick={()=>navigate("/login?role=driver")}
className="px-6 md:px-8 py-3 md:py-4 rounded-xl border border-indigo-500 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-gray-800 font-semibold"
>
Become Driver
</button>

</div>

</motion.div>


{/* BOOKING CARD */}
<motion.div
initial={{opacity:0,y:40}}
animate={{opacity:1,y:0}}
transition={{duration:0.7}}
className="backdrop-blur-xl bg-white/70 dark:bg-gray-900/60 border border-white/30 rounded-3xl shadow-2xl p-6 md:p-8"
>

<h3 className="text-lg md:text-xl font-bold mb-6">
Quick Ride
</h3>

<div className="space-y-4">

<div className="flex items-center gap-3 p-3 md:p-4 rounded-xl bg-gray-100 dark:bg-gray-800">
<MapPin size={18}/>
<input placeholder="Pickup location" className="bg-transparent outline-none w-full"/>
</div>

<div className="flex items-center gap-3 p-3 md:p-4 rounded-xl bg-gray-100 dark:bg-gray-800">
<Navigation size={18}/>
<input placeholder="Drop location" className="bg-transparent outline-none w-full"/>
</div>

<button
onClick={()=>navigate("/book")}
className="w-full py-3 md:py-4 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 shadow-lg hover:scale-[1.02] transition"
>
Find Ride
</button>

</div>

</motion.div>

</div>

</section>


{/* SERVICES */}
<section className="py-16 md:py-20 px-6 max-w-6xl mx-auto">

<h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
Our Services
</h2>

<div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">

{services.map((service,i)=>(

<motion.div
key={i}
whileHover={{scale:1.08}}
className="bg-white dark:bg-gray-900 p-6 md:p-8 rounded-2xl shadow-md hover:shadow-indigo-500/20 transition text-center cursor-pointer"
>

<div className="text-4xl md:text-5xl mb-3">{service.icon}</div>
<p className="font-semibold text-base md:text-lg">{service.name}</p>

</motion.div>

))}

</div>

</section>


{/* DESTINATIONS */}
<section className="px-6 max-w-7xl mx-auto mb-20">

<h2 className="text-2xl md:text-3xl font-bold mb-8 md:mb-10">
Popular Destinations
</h2>

<div className="flex md:grid md:grid-cols-3 lg:grid-cols-5 gap-6 overflow-x-auto md:overflow-visible pb-4">

{destinations.map((place,i)=>(

<motion.div
key={i}
whileHover={{scale:1.05}}
className="relative min-w-[220px] md:min-w-0 h-[200px] md:h-[220px] rounded-2xl overflow-hidden cursor-pointer group shadow-lg"
>

<img src={place.image} alt={place.name} className="w-full h-full object-cover group-hover:scale-110 transition duration-500"/>

<div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"/>

<div className="absolute bottom-4 left-4 text-white">
<p className="text-lg font-semibold">{place.name}</p>
<p className="text-sm opacity-80">Quick rides available</p>
</div>

</motion.div>

))}

</div>

</section>


{/* STATS */}
<section className="py-20 bg-white dark:bg-gray-900">

<div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10 text-center px-6">

{[
[`${count[0]}+`,"Happy Riders"],
[`${count[1]}+`,"Drivers"],
[`${count[2]}%`,"Safety"],
["24/7","Support"]
].map((item,i)=>(

<motion.div key={i} whileHover={{scale:1.08}}
className="p-6 md:p-8 rounded-2xl bg-gray-50 dark:bg-gray-800 shadow-md">

<h3 className="text-3xl md:text-4xl font-bold text-indigo-600">{item[0]}</h3>
<p className="text-gray-500 mt-2">{item[1]}</p>

</motion.div>

))}

</div>

</section>


{/* CTA */}
<section className="py-20 md:py-28 text-center px-6">

<h2 className="text-3xl md:text-4xl font-bold mb-6">
Start Riding Today
</h2>

<p className="text-gray-500 mb-8">
Book your ride in seconds with TransportX
</p>

<button
onClick={()=>navigate("/book")}
className="px-8 md:px-12 py-4 md:py-5 bg-indigo-600 text-white rounded-xl shadow-xl hover:scale-105 transition"
>
Book Your Ride
</button>

</section>


{/* FOOTER */}
<footer className="py-8 text-center border-t dark:border-gray-800 text-gray-500 dark:text-gray-400 text-sm">
© 2026 TransportX — Smart Mobility Platform
</footer>

</div>

  );
};

export default Home;