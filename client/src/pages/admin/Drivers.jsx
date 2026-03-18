import React, { useEffect, useState } from "react";
import axios from "axios";
import { Trash2, UserPlus, Car, MapPin } from "lucide-react";

const API = "http://localhost:5000/api/admin";

export default function Drivers() {

  const [drivers,setDrivers] = useState([]);
  const [search,setSearch] = useState("");
  const [loading,setLoading] = useState(true);
  const [showModal,setShowModal] = useState(false);

  const [form,setForm] = useState({
    name:"",
    email:"",
    password:"",
    phone:"",
    vehicleType:"bike",
    vehicleNumber:"",
    lat:"",
    lng:""
  });

  const token = localStorage.getItem("token");



  /* ================= FETCH DRIVERS ================= */

  const fetchDrivers = async () => {

    try{

      setLoading(true);

      const res = await axios.get(`${API}/drivers`,{
        headers:{ Authorization:`Bearer ${token}` }
      });

      setDrivers(res.data.drivers || []);

    }catch(err){
      console.error(err);
      alert("Failed to load drivers");
    }finally{
      setLoading(false);
    }

  };

  useEffect(()=>{ fetchDrivers(); },[]);



  /* ================= ADD DRIVER ================= */

  const addDriver = async () => {

    if(!form.name || !form.email || !form.password || !form.phone)
      return alert("Please fill required fields");

    if(!form.lat || !form.lng)
      return alert("Driver location required");

    try{

      await axios.post(
        `${API}/drivers`,
        form,
        { headers:{ Authorization:`Bearer ${token}` } }
      );

      setShowModal(false);

      setForm({
        name:"",
        email:"",
        password:"",
        phone:"",
        vehicleType:"bike",
        vehicleNumber:"",
        lat:"",
        lng:""
      });

      fetchDrivers();

    }catch(err){

      console.error(err);

      alert(
        err?.response?.data?.message ||
        "Failed to create driver"
      );

    }

  };



  /* ================= DELETE DRIVER ================= */

  const removeDriver = async id => {

    if(!window.confirm("Delete driver permanently?")) return;

    try{

      await axios.delete(`${API}/drivers/${id}`,{
        headers:{ Authorization:`Bearer ${token}` }
      });

      fetchDrivers();

    }catch(err){
      console.error(err);
      alert("Delete failed");
    }

  };



  /* ================= FILTER ================= */

  const filtered = drivers.filter(d =>
    d.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.email?.toLowerCase().includes(search.toLowerCase())
  );



  /* ================= STATUS BADGE ================= */

  const Status = ({ driver }) => (

    <div className="flex gap-2">

      <span className={`px-3 py-1 rounded-full text-xs font-semibold
      ${driver.isApproved
        ? "bg-green-100 text-green-700"
        : "bg-yellow-100 text-yellow-700"}`}>

        {driver.isApproved ? "Approved" : "Pending"}

      </span>

      <span className={`px-3 py-1 rounded-full text-xs font-semibold
      ${driver.isOnline
        ? "bg-blue-100 text-blue-700"
        : "bg-gray-200 text-gray-600"}`}>

        {driver.isOnline ? "Online" : "Offline"}

      </span>

    </div>

  );



  /* ================= UI ================= */

  return (

    <div className="p-8 min-h-screen bg-gradient-to-br
                    from-gray-100 to-gray-200
                    dark:from-gray-900 dark:to-gray-950">

      {/* HEADER */}

      <div className="flex justify-between items-center mb-8">

        <h1 className="text-4xl font-bold text-gray-800 dark:text-white">
          Driver Management
        </h1>

        <button
          onClick={()=>setShowModal(true)}
          className="flex items-center gap-2
                     bg-indigo-600 hover:bg-indigo-700
                     text-white px-6 py-3 rounded-xl shadow">

          <UserPlus size={18}/>
          Add Driver

        </button>

      </div>



      {/* SEARCH */}

      <input
        placeholder="Search drivers..."
        className="w-full p-4 rounded-xl border mb-8
                   bg-white dark:bg-gray-800 shadow"
        value={search}
        onChange={e=>setSearch(e.target.value)}
      />



      {/* TABLE */}

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow overflow-hidden">

        <table className="w-full">

          <thead className="bg-gray-50 dark:bg-gray-700">

            <tr>

              <th className="p-4 text-left">Driver</th>
              <th>Email</th>
              <th>Vehicle</th>
              <th>Location</th>
              <th>Status</th>
              <th className="text-center">Actions</th>

            </tr>

          </thead>

          <tbody>

            {loading && (
              <tr>
                <td colSpan="6" className="p-10 text-center text-gray-400">
                  Loading drivers...
                </td>
              </tr>
            )}

            {!loading && filtered.length===0 && (
              <tr>
                <td colSpan="6" className="p-10 text-center text-gray-400">
                  No drivers found
                </td>
              </tr>
            )}

            {filtered.map(driver=>(

              <tr key={driver._id}
                  className="border-t hover:bg-gray-50 dark:hover:bg-gray-700">

                <td className="p-4 font-semibold flex items-center gap-3">

                  <div className="w-10 h-10 rounded-full
                                  bg-indigo-600 text-white
                                  flex items-center justify-center">

                    {driver.name.charAt(0)}

                  </div>

                  {driver.name}

                </td>

                <td>{driver.email}</td>

                <td className="flex items-center gap-1 justify-center">

                  <Car size={16}/>
                  {driver.vehicle?.type}

                </td>

                <td className="text-sm flex items-center gap-1 justify-center">

                  <MapPin size={14}/>

                  {driver.location?.coordinates
                    ? `${driver.location.coordinates[1].toFixed(3)}, ${driver.location.coordinates[0].toFixed(3)}`
                    : "N/A"}

                </td>

                <td>
                  <Status driver={driver}/>
                </td>

                <td className="text-center">

                  <button
                    onClick={()=>removeDriver(driver._id)}
                    className="flex items-center gap-1 mx-auto
                               bg-red-500 hover:bg-red-600
                               text-white px-4 py-1 rounded-lg">

                    <Trash2 size={14}/>
                    Delete

                  </button>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>



      {/* ADD DRIVER MODAL */}

      {showModal && (

        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">

          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl w-96 shadow-xl space-y-4">

            <h2 className="text-xl font-bold">
              Add Driver
            </h2>


            <input
              placeholder="Name"
              className="w-full p-3 border rounded-lg"
              value={form.name}
              onChange={e=>setForm({...form,name:e.target.value})}
            />

            <input
              placeholder="Email"
              className="w-full p-3 border rounded-lg"
              value={form.email}
              onChange={e=>setForm({...form,email:e.target.value})}
            />

            <input
              type="password"
              placeholder="Password"
              className="w-full p-3 border rounded-lg"
              value={form.password}
              onChange={e=>setForm({...form,password:e.target.value})}
            />

            <input
              placeholder="Phone"
              className="w-full p-3 border rounded-lg"
              value={form.phone}
              onChange={e=>setForm({...form,phone:e.target.value})}
            />


            <select
              className="w-full p-3 border rounded-lg"
              value={form.vehicleType}
              onChange={e=>setForm({...form,vehicleType:e.target.value})}
            >

              <option value="bike">Bike</option>
              <option value="auto">Auto</option>
              <option value="car">Car</option>

            </select>


            <input
              placeholder="Vehicle Number"
              className="w-full p-3 border rounded-lg"
              value={form.vehicleNumber}
              onChange={e=>setForm({...form,vehicleNumber:e.target.value})}
            />


            <input
              placeholder="Latitude"
              className="w-full p-3 border rounded-lg"
              value={form.lat}
              onChange={e=>setForm({...form,lat:e.target.value})}
            />

            <input
              placeholder="Longitude"
              className="w-full p-3 border rounded-lg"
              value={form.lng}
              onChange={e=>setForm({...form,lng:e.target.value})}
            />


            <div className="flex gap-3">

              <button
                onClick={addDriver}
                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg">

                Save

              </button>

              <button
                onClick={()=>setShowModal(false)}
                className="flex-1 bg-gray-400 text-white py-2 rounded-lg">

                Cancel

              </button>

            </div>

          </div>

        </div>

      )}

    </div>

  );

}