import React, { useState, useEffect, useRef } from "react";
import api from "../utils/api";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import {
  MapPin,
  Navigation,
  ArrowUpDown,
  Loader2
} from "lucide-react";
import { motion } from "framer-motion";

/* CONFIG */

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

/* VEHICLES */

import bikeImg from "../assets/services/bike.png";
import autoImg from "../assets/services/auto.png";
import cabImg from "../assets/services/cab-economy.png";

const vehicles = [
  { id: "bike", label: "Bike", img: bikeImg, rate: 8 },
  { id: "auto", label: "Auto", img: autoImg, rate: 12 },
  { id: "car", label: "Cab", img: cabImg, rate: 18 }
];

export default function BookRide() {

  const navigate = useNavigate();

  const socketRef = useRef(null);
  const debounceRef = useRef(null);
  const abortRef = useRef(null);

  const [pickup,setPickup] = useState("");
  const [drop,setDrop] = useState("");

  const [pickupCoords,setPickupCoords] = useState(null);
  const [dropCoords,setDropCoords] = useState(null);

  const [vehicleType,setVehicleType] = useState(null);
  const [vehiclePrices,setVehiclePrices] = useState([]);

  const [distance,setDistance] = useState(null);
  const [eta,setEta] = useState(null);

  const [pickupSuggestions,setPickupSuggestions] = useState([]);
  const [dropSuggestions,setDropSuggestions] = useState([]);

  const [loading,setLoading] = useState(false);
  const [message,setMessage] = useState("");

  /* SOCKET */

  useEffect(()=>{
    socketRef.current = io(SOCKET_URL,{ transports:["websocket"] });
    return ()=> socketRef.current?.disconnect();
  },[]);

  /* GPS */

  const getUserLocation = ()=>{
    navigator.geolocation.getCurrentPosition((pos)=>{
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setPickupCoords({lat,lng});
      setPickup("Current Location");
    });
  };

  /* SWAP */

  const swapLocations = ()=>{
    const temp = pickup;
    setPickup(drop);
    setDrop(temp);

    const tempCoords = pickupCoords;
    setPickupCoords(dropCoords);
    setDropCoords(tempCoords);
  };

  /* SEARCH */

  const fetchSuggestions = (query,setter)=>{
    if(!query || query.length<3) return setter([]);

    clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async()=>{

      try{

        abortRef.current?.abort();
        abortRef.current = new AbortController();

        const res = await api.get(`/api/location/search?q=${query}`,{
          signal:abortRef.current.signal
        });

        setter(res.data?.results || []);

      }catch{
        setter([]);
      }

    },400);
  };

  /* ROUTE */

  const drawRoute = async(start,end)=>{

    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=false`
    );

    const data = await res.json();

    const km = data.routes[0].distance / 1000;
    const mins = data.routes[0].duration / 60;

    setDistance(km.toFixed(1));
    setEta(mins.toFixed(0));

    const prices = vehicles.map(v=>({
      ...v,
      price:Math.round(km*v.rate)
    }));

    setVehiclePrices(prices);
  };

  useEffect(()=>{
    if(pickupCoords && dropCoords){
      drawRoute(pickupCoords,dropCoords);
    }
  },[pickupCoords,dropCoords]);

  /* BOOK */

  const handleBookRide = async()=>{

    if(!vehicleType){
      setMessage("Please select a vehicle");
      return;
    }

    try{

      setLoading(true);
      setMessage("Finding nearby driver...");

      const res = await api.post("/api/ride",{
        pickupLocation:{address:pickup,...pickupCoords},
        dropLocation:{address:drop,...dropCoords},
        vehicleType,
        distance
      });

      const rideId = res.data?.ride?._id;

      navigate(`/payment/${rideId}`);

    }catch{

      setMessage("No drivers nearby");

    }
    finally{
      setLoading(false);
    }

  };

  return(

<div className="min-h-screen flex flex-col lg:flex-row bg-gray-100">


{/* MAP */}

<div className="lg:w-2/3 h-[40vh] lg:h-screen sticky top-0">

<iframe
title="map"
src="https://maps.google.com/maps?q=india&t=&z=5&ie=UTF8&iwloc=&output=embed"
className="w-full h-full border-0"
/>

</div>


{/* BOOKING PANEL */}

<motion.div
initial={{x:40,opacity:0}}
animate={{x:0,opacity:1}}
className="lg:w-1/3 bg-white p-6 lg:p-8 shadow-xl flex flex-col"
>

<h2 className="text-2xl font-bold mb-6">
Book Your Ride
</h2>


<LocationInput
icon={<MapPin size={18}/>}
label="Pickup location"
value={pickup}
setValue={setPickup}
suggestions={pickupSuggestions}
setSuggestions={setPickupSuggestions}
setCoords={setPickupCoords}
fetchSuggestions={fetchSuggestions}
/>


<button
onClick={getUserLocation}
className="flex items-center gap-2 text-indigo-600 text-sm mt-2 hover:underline"
>
<Navigation size={16}/>
Use My Location
</button>


<div className="flex justify-center my-4">

<motion.button
whileHover={{rotate:180}}
onClick={swapLocations}
className="p-3 rounded-full bg-gray-100"
>
<ArrowUpDown size={18}/>
</motion.button>

</div>


<LocationInput
icon={<MapPin size={18}/>}
label="Drop location"
value={drop}
setValue={setDrop}
suggestions={dropSuggestions}
setSuggestions={setDropSuggestions}
setCoords={setDropCoords}
fetchSuggestions={fetchSuggestions}
/>


{distance &&(

<div className="mt-4 bg-indigo-50 p-4 rounded-xl text-sm">

Distance: <b>{distance} km</b>  
ETA: <b>{eta} min</b>

</div>

)}


{/* VEHICLES */}

{vehiclePrices.length>0 &&(

<div className="mt-6 space-y-3">

{vehiclePrices.map(v=>(

<motion.div
key={v.id}
whileHover={{scale:1.02}}
onClick={()=>setVehicleType(v.id)}
className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer
${vehicleType===v.id
? "border-indigo-600 bg-indigo-50"
: "bg-gray-50"}`}
>

<div className="flex items-center gap-3">

<img src={v.img} className="h-10"/>

<div>

<p className="font-semibold">{v.label}</p>
<p className="text-xs text-gray-500">{eta} min away</p>

</div>

</div>

<div className="font-bold text-indigo-600">
₹{v.price}
</div>

</motion.div>

))}

</div>

)}


<button
onClick={handleBookRide}
disabled={loading}
className="mt-6 w-full py-4 rounded-xl font-semibold text-white
bg-gradient-to-r from-indigo-600 to-blue-600 flex items-center justify-center gap-2"
>

{loading
? <>
<Loader2 className="animate-spin" size={18}/>
Finding Driver...
</>
: "Confirm Ride"
}

</button>


{message &&(
<p className="text-center mt-3 text-indigo-600 text-sm">
{message}
</p>
)}

</motion.div>

</div>

);

}


/* LOCATION INPUT */

const LocationInput = ({
icon,
label,
value,
setValue,
suggestions,
setSuggestions,
setCoords,
fetchSuggestions
})=>(

<div className="relative mt-3">

<div className="absolute left-3 top-4 text-indigo-500">
{icon}
</div>

<input
className="w-full pl-10 pr-4 py-4 rounded-xl border outline-none focus:ring-2 focus:ring-indigo-500"
placeholder={label}
value={value}
onChange={(e)=>{
setValue(e.target.value);
fetchSuggestions(e.target.value,setSuggestions);
}}
/>

{suggestions.length>0 &&(

<div className="absolute z-50 bg-white border w-full shadow rounded mt-2 max-h-48 overflow-y-auto">

{suggestions.map((p,i)=>(

<div
key={i}
className="p-3 hover:bg-indigo-50 cursor-pointer text-sm"
onClick={()=>{

setValue(p.display);
setCoords({lat:p.lat,lng:p.lng});
setSuggestions([]);

}}
>

📍 {p.display}

</div>

))}

</div>

)}

</div>

);