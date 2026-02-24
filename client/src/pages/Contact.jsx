import React, { useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";

const API = "http://localhost:5000/api/support";

/* ================= FAQ DATA ================= */
const faqs = [
  { q:"How do I book a ride?", a:"Enter pickup & drop location and select vehicle." },
  { q:"How can I cancel booking?", a:"Open ride screen → cancel ride button." },
  { q:"How to become a driver?", a:"Register as driver → admin verifies → start earning." },
  { q:"Payment not processed?", a:"Wait 30 seconds. If still failed contact support." }
];

const Contact = () => {

  const [form,setForm] = useState({
    name:"",
    email:"",
    message:""
  });

  const [open,setOpen] = useState(null);
  const [loading,setLoading] = useState(false);
  const [success,setSuccess] = useState("");
  const [error,setError] = useState("");

  const handleChange = e =>
    setForm({...form,[e.target.name]:e.target.value});

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setSuccess("");
    setError("");

    try{
      const res = await axios.post(API,form);
      setSuccess(res.data.message || "Message sent successfully!");
      setForm({name:"",email:"",message:""});
    }catch(err){
      setError(err.response?.data?.message || "Failed to send message");
    }finally{
      setLoading(false);
    }
  };

  return (
<div className="bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-white overflow-hidden">

{/* ================================================= HERO */}
<section className="relative h-[50vh] flex items-center justify-center text-center">

<img
src="https://images.unsplash.com/photo-1521791136064-7986c2920216"
className="absolute w-full h-full object-cover scale-110"
/>

<div className="absolute inset-0 bg-gradient-to-br from-indigo-900/90 via-blue-900/80 to-black/90"/>

<motion.div
initial={{opacity:0,y:40}}
animate={{opacity:1,y:0}}
transition={{duration:.8}}
className="relative z-10"
>
<h1 className="text-5xl font-extrabold mb-4">
Contact <span className="text-indigo-400">Support</span>
</h1>

<p className="text-lg text-gray-200">
We're here to help you 24/7 — talk to us anytime.
</p>
</motion.div>
</section>


{/* ================================================= CONTACT CARDS */}
<section className="py-20 px-6 max-w-6xl mx-auto grid md:grid-cols-3 gap-10">

{[
["📞","Call Us","+91 9999999999"],
["✉️","Email","support@transportx.com"],
["💬","Live Chat","Available 24/7"]
].map((item,i)=>(
<motion.div
key={i}
whileHover={{y:-8,scale:1.05}}
className="bg-white dark:bg-gray-900 p-10 rounded-3xl shadow-xl text-center backdrop-blur border border-gray-200 dark:border-gray-800"
>
<div className="text-5xl mb-4">{item[0]}</div>
<h3 className="text-xl font-bold">{item[1]}</h3>
<p className="text-gray-500">{item[2]}</p>
</motion.div>
))}
</section>


{/* ================================================= FORM + FAQ */}
<section className="py-24 px-6 max-w-7xl mx-auto grid md:grid-cols-2 gap-14">

{/* ================= FORM */}
<motion.div
initial={{opacity:0,x:-50}}
whileInView={{opacity:1,x:0}}
viewport={{once:true}}
className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl p-10"
>

<h2 className="text-2xl font-bold mb-6">Send us a message</h2>

{success && (
<div className="mb-4 p-3 rounded-lg bg-green-100 text-green-700">
{success}
</div>
)}

{error && (
<div className="mb-4 p-3 rounded-lg bg-red-100 text-red-700">
{error}
</div>
)}

<form onSubmit={handleSubmit} className="space-y-6">

{/* floating input */}
<div className="relative">
<input
name="name"
value={form.name}
onChange={handleChange}
required
className="peer w-full p-4 border rounded-xl bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none"
/>
<label className="absolute left-3 top-1 text-sm text-gray-500 transition-all peer-focus:-top-3 peer-focus:text-xs peer-focus:text-indigo-600 bg-white dark:bg-gray-900 px-1">
Full Name
</label>
</div>

<div className="relative">
<input
name="email"
type="email"
value={form.email}
onChange={handleChange}
required
className="peer w-full p-4 border rounded-xl bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none"
/>
<label className="absolute left-3 top-1 text-sm text-gray-500 transition-all peer-focus:-top-3 peer-focus:text-xs peer-focus:text-indigo-600 bg-white dark:bg-gray-900 px-1">
Email Address
</label>
</div>

<div className="relative">
<textarea
name="message"
rows="5"
value={form.message}
onChange={handleChange}
required
className="peer w-full p-4 border rounded-xl bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none"
/>
<label className="absolute left-3 top-1 text-sm text-gray-500 transition-all peer-focus:-top-3 peer-focus:text-xs peer-focus:text-indigo-600 bg-white dark:bg-gray-900 px-1">
Your Message
</label>
</div>

<div className="text-right text-sm text-gray-400">
{form.message.length}/500
</div>

<motion.button
whileTap={{scale:.95}}
whileHover={{scale:1.03}}
disabled={loading}
className="w-full py-4 rounded-xl font-semibold text-white
bg-gradient-to-r from-indigo-600 to-blue-600 shadow-lg disabled:opacity-50"
>
{loading ? "Sending..." : "Send Message"}
</motion.button>

</form>
</motion.div>


{/* ================= FAQ + MAP */}
<motion.div
initial={{opacity:0,x:50}}
whileInView={{opacity:1,x:0}}
viewport={{once:true}}
className="space-y-10"
>

{/* FAQ */}
<div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-lg">
<h3 className="text-xl font-bold mb-6">Common Questions</h3>

<div className="space-y-3">

{faqs.map((f,i)=>(
<div key={i} className="border-b pb-3">

<button
onClick={()=>setOpen(open===i?null:i)}
className="w-full flex justify-between font-semibold"
>
{f.q}
<span>{open===i?"−":"+"}</span>
</button>

<AnimatePresence>
{open===i && (
<motion.p
initial={{opacity:0,height:0}}
animate={{opacity:1,height:"auto"}}
exit={{opacity:0,height:0}}
className="text-gray-500 mt-2 text-sm"
>
{f.a}
</motion.p>
)}
</AnimatePresence>

</div>
))}

</div>
</div>


{/* MAP */}
<div className="rounded-3xl overflow-hidden shadow-xl">
<iframe
title="map"
src="https://maps.google.com/maps?q=india&t=&z=4&ie=UTF8&iwloc=&output=embed"
className="w-full h-[260px] border-0"
/>
</div>

</motion.div>
</section>


<footer className="py-10 text-center text-gray-500">
© 2026 TransportX Support Center
</footer>

</div>
);
};

export default Contact;