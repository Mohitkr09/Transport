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

  const [step, setStep] = useState(1); // 🔥 NEW

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
    setPickup(drop);
    setDrop(pickup);
    setPickupCoords(dropCoords);
    setDropCoords(pickupCoords);
  };

  /* SEARCH */
  const fetchSuggestions = (query,setter)=>{
    if(!query || query.length<3) return setter([]);

    clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async()=>{
      try{
        abortRef.current?.abort();
        abortRef.current = new AbortController();

        const res = await api.get(`/location/search?q=${query}`,{
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

  /* FINAL BOOK */
  const handleBookRide = async()=>{
    if(!vehicleType){
      setMessage("Select vehicle first");
      return;
    }

    try{
      setLoading(true);
      setMessage("Finding driver...");

      const res = await api.post("/ride",{
        pickupLocation:{address:pickup,...pickupCoords},
        dropLocation:{address:drop,...dropCoords},
        vehicleType,
        distance
      });

      navigate(`/payment/${res.data?.ride?._id}`);

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
      <div className="lg:w-2/3 h-[40vh] lg:h-screen">
        <iframe
          title="map"
          src="https://maps.google.com/maps?q=india&t=&z=5&output=embed"
          className="w-full h-full"
        />
      </div>

      {/* PANEL */}
      <div className="lg:w-1/3 bg-white p-6 shadow-xl">

        <h2 className="text-2xl font-bold mb-6">Book Ride</h2>

        {/* STEP 1 */}
        {step === 1 && (
          <>
            <LocationInput {...{
              icon:<MapPin size={18}/>,
              label:"Pickup",
              value:pickup,
              setValue:setPickup,
              suggestions:pickupSuggestions,
              setSuggestions:setPickupSuggestions,
              setCoords:setPickupCoords,
              fetchSuggestions
            }}/>

            <LocationInput {...{
              icon:<MapPin size={18}/>,
              label:"Drop",
              value:drop,
              setValue:setDrop,
              suggestions:dropSuggestions,
              setSuggestions:setDropSuggestions,
              setCoords:setDropCoords,
              fetchSuggestions
            }}/>

            <button
              onClick={()=>{
                if(!pickupCoords || !dropCoords){
                  setMessage("Enter locations");
                  return;
                }
                setStep(2);
              }}
              className="mt-6 w-full py-4 bg-indigo-600 text-white rounded-xl"
            >
              Confirm Ride
            </button>
          </>
        )}

        {/* STEP 2 VEHICLES */}
        {step === 2 && (
          <>
            <button onClick={()=>setStep(1)} className="mb-4 text-sm">
              ← Change Locations
            </button>

            {vehiclePrices.map(v=>(
              <div
                key={v.id}
                onClick={()=>setVehicleType(v.id)}
                className={`p-4 rounded-xl border mb-3 cursor-pointer ${
                  vehicleType===v.id
                  ? "border-indigo-600 bg-indigo-50"
                  : ""
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex gap-3">
                    <img src={v.img} className="h-10"/>
                    <div>
                      <p>{v.label}</p>
                      <p className="text-xs">{eta} min</p>
                    </div>
                  </div>
                  <p>₹{v.price}</p>
                </div>
              </div>
            ))}

            <button
              onClick={handleBookRide}
              className="w-full py-4 bg-green-600 text-white rounded-xl"
            >
              {loading ? "Booking..." : "Confirm Booking"}
            </button>
          </>
        )}

        {message && <p className="mt-3">{message}</p>}

      </div>
    </div>
  );
}

/* INPUT COMPONENT */
const LocationInput = ({
  icon,label,value,setValue,
  suggestions,setSuggestions,setCoords,fetchSuggestions
})=>(
<div className="relative mt-3">
  <div className="absolute left-3 top-4">{icon}</div>

  <input
    className="w-full pl-10 py-4 border rounded-xl"
    placeholder={label}
    value={value}
    onChange={(e)=>{
      setValue(e.target.value);
      fetchSuggestions(e.target.value,setSuggestions);
    }}
  />

  {suggestions.map((p,i)=>(
    <div key={i}
      onClick={()=>{
        setValue(p.display);
        setCoords({lat:p.lat,lng:p.lng});
        setSuggestions([]);
      }}
      className="p-2 cursor-pointer"
    >
      {p.display}
    </div>
  ))}
</div>
);