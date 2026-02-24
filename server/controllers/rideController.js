const Ride = require("../models/Ride");
const Driver = require("../models/Driver");

/* ======================================================
FARE CALCULATOR
====================================================== */
const calculateFare = (vehicleType, distanceKm = 5) => {
  const rates = { bike: 10, auto: 15, car: 20 };
  return Math.round(distanceKm * (rates[vehicleType] || 20));
};


/* ======================================================
NOTIFICATION HELPER
====================================================== */
const notify = (userId, payload) => {
  if (!global.io) return;
  global.io.to(userId.toString()).emit("notification", {
    id: Date.now(),
    ...payload,
    time: new Date()
  });
};


/* ======================================================
FIND BEST DRIVER
====================================================== */
const findBestDriver = async ({ lat, lng, vehicleType }) => {

  const staleLimit = new Date(Date.now() - 5 * 60 * 1000);

  const drivers = await Driver.find({
    isApproved: true,
    isOnline: true,
    isAvailable: true,
    lastLocationUpdate: { $gte: staleLimit },
    "vehicle.type": vehicleType,
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [Number(lng), Number(lat)]
        },
        $maxDistance: 10000
      }
    }
  })
    .limit(10)
    .select("rating totalRides");

  if (!drivers.length) return null;

  drivers.sort((a, b) => {
    const scoreA = a.rating * 2 + a.totalRides / 50;
    const scoreB = b.rating * 2 + b.totalRides / 50;
    return scoreB - scoreA;
  });

  return drivers[0];
};


/* ======================================================
CREATE RIDE
====================================================== */
exports.createRide = async (req, res) => {
  let lockedDriver = null;

  try {
    const { pickupLocation, dropLocation, vehicleType, distance } = req.body;

    if (!req.user?._id)
      return res.status(401).json({ success:false, message:"Unauthorized" });

    if (
      !pickupLocation ||
      !dropLocation ||
      typeof pickupLocation.lat !== "number" ||
      typeof pickupLocation.lng !== "number"
    ) {
      return res.status(400).json({ success:false, message:"Invalid ride data" });
    }

    /* ---------- SAFE DISTANCE ---------- */
    const parsed = parseFloat(distance);
    const safeDistance = Number.isFinite(parsed) && parsed > 0 ? parsed : 5;

    const fare = calculateFare(vehicleType, safeDistance);

    /* ---------- FIND DRIVER ---------- */
    const driver = await findBestDriver({
      lat: pickupLocation.lat,
      lng: pickupLocation.lng,
      vehicleType
    });

    /* ---------- CREATE RIDE ---------- */
    const ride = await Ride.create({
      user: req.user._id,
      pickupLocation: {
        address: pickupLocation.address,
        location: {
          type: "Point",
          coordinates: [pickupLocation.lng, pickupLocation.lat]
        }
      },
      dropLocation: {
        address: dropLocation.address,
        location: {
          type: "Point",
          coordinates: [dropLocation.lng, dropLocation.lat]
        }
      },
      vehicleType,
      distanceKm: safeDistance,
      fare,
      status: driver ? "driver_assigned" : "no_driver_found",
      driver: driver?._id || null,
      requestedAt: new Date()
    });

    /* ---------- LOCK DRIVER ---------- */
    if (driver) {
      lockedDriver = await Driver.findOneAndUpdate(
        { _id: driver._id, isAvailable: true },
        { isAvailable: false },
        { new: true }
      );

      if (!lockedDriver) {
        ride.status = "no_driver_found";
        ride.driver = null;
        await ride.save();
      }
    }

    /* ---------- NOTIFICATIONS ---------- */
    notify(req.user._id,{
      title:"🚕 Ride Created",
      message: driver
        ? "Driver assigned successfully"
        : "Searching for drivers..."
    });

    if (lockedDriver) {
      notify(lockedDriver._id,{
        title:"📢 New Ride Request",
        message:"You have a new ride request"
      });
    }

    /* ---------- AUTO TIMEOUT ---------- */
    if (lockedDriver) {
      setTimeout(async () => {
        try {
          const r = await Ride.findById(ride._id);

          if (r && r.status === "driver_assigned") {

            r.status = "cancelled";
            r.cancelledBy = "system_timeout";
            await r.save();

            await Driver.findByIdAndUpdate(r.driver,{ isAvailable:true });

            notify(r.user,{
              title:"⌛ Ride Expired",
              message:"Driver didn’t accept in time"
            });

            notify(r.driver,{
              title:"Ride Cancelled",
              message:"Request expired"
            });

          }
        } catch (err) {
          console.log("Auto release error:", err.message);
        }
      }, 30000);
    }

    res.status(201).json({
      success:true,
      ride,
      message: driver
        ? "Driver assigned successfully"
        : "No nearby drivers found"
    });

  } catch (err) {

    console.error("CREATE RIDE ERROR:", err);

    if (lockedDriver?._id)
      await Driver.findByIdAndUpdate(lockedDriver._id,{isAvailable:true});

    res.status(500).json({
      success:false,
      message:"Failed to create ride"
    });
  }
};


/* ======================================================
GET USER RIDES
====================================================== */
exports.getUserRides = async (req,res)=>{
  try{
    const rides = await Ride.find({ user:req.user._id })
      .populate("driver","name email rating vehicle")
      .sort({ createdAt:-1 });

    res.json({ success:true, rides });

  }catch(err){
    res.status(500).json({ success:false,message:"Failed to fetch rides" });
  }
};


/* ======================================================
GET SINGLE RIDE
====================================================== */
exports.getRideById = async (req,res)=>{
  try{
    const ride = await Ride.findById(req.params.id)
      .populate("driver","name vehicle rating");

    if(!ride)
      return res.status(404).json({ success:false,message:"Ride not found" });

    res.json({ success:true, ride });

  }catch(err){
    res.status(500).json({ success:false,message:"Error fetching ride" });
  }
};


/* ======================================================
ACCEPT RIDE
====================================================== */
exports.acceptRide = async (req,res)=>{
  try{
    const ride = await Ride.findById(req.params.id);
    if(!ride) return res.status(404).json({message:"Ride not found"});

    if(ride.status!=="driver_assigned")
      return res.status(400).json({message:"Ride not available"});

    ride.status="accepted";
    ride.acceptedAt=new Date();
    await ride.save();

    notify(ride.user,{
      title:"Driver Accepted",
      message:"Your driver is on the way 🚖"
    });

    res.json({ success:true, ride });

  }catch(err){
    res.status(500).json({ message:"Failed to accept ride" });
  }
};


/* ======================================================
START RIDE
====================================================== */
exports.startRide = async (req,res)=>{
  try{
    const ride = await Ride.findById(req.params.id);
    if(!ride) return res.status(404).json({message:"Ride not found"});

    ride.status="ongoing";
    ride.startedAt=new Date();
    await ride.save();

    notify(ride.user,{
      title:"Ride Started",
      message:"Your trip has begun 🚀"
    });

    res.json({ success:true, ride });

  }catch(err){
    res.status(500).json({message:"Start ride failed"});
  }
};


/* ======================================================
COMPLETE RIDE
====================================================== */
exports.completeRide = async (req,res)=>{
  try{
    const ride = await Ride.findById(req.params.id);
    if(!ride) return res.status(404).json({message:"Ride not found"});

    ride.status="completed";
    ride.completedAt=new Date();
    await ride.save();

    await Driver.findByIdAndUpdate(ride.driver,{ isAvailable:true });

    notify(ride.user,{
      title:"Ride Completed",
      message:"Thank you for riding with us ⭐"
    });

    res.json({ success:true, ride });

  }catch(err){
    res.status(500).json({message:"Complete ride failed"});
  }
};


/* ======================================================
CANCEL RIDE
====================================================== */
exports.cancelRide = async (req,res)=>{
  try{
    const ride = await Ride.findById(req.params.id);
    if(!ride) return res.status(404).json({message:"Ride not found"});

    ride.status="cancelled";
    ride.cancelledAt=new Date();
    await ride.save();

    if(ride.driver)
      await Driver.findByIdAndUpdate(ride.driver,{isAvailable:true});

    notify(ride.user,{
      title:"Ride Cancelled",
      message:"Your ride was cancelled"
    });

    res.json({ success:true, ride });

  }catch(err){
    res.status(500).json({message:"Cancel failed"});
  }
};


/* ======================================================
RATE RIDE
====================================================== */
exports.rateRide = async (req,res)=>{
  try{
    const { rating, feedback } = req.body;
    const ride = await Ride.findById(req.params.id);

    if(!ride)
      return res.status(404).json({message:"Ride not found"});

    ride.rating=rating;
    ride.feedback=feedback;
    await ride.save();

    res.json({ success:true, ride });

  }catch(err){
    res.status(500).json({message:"Rating failed"});
  }
};


/* ======================================================
ADMIN GET ALL
====================================================== */
exports.getAllRides = async (req,res)=>{
  try{
    const rides = await Ride.find()
      .populate("user","name email")
      .populate("driver","name vehicle");

    res.json({ success:true, rides });

  }catch(err){
    res.status(500).json({message:"Failed"});
  }
};


/* ======================================================
ADMIN CANCEL
====================================================== */
exports.adminCancelRide = async (req,res)=>{
  try{
    const ride = await Ride.findById(req.params.id);
    if(!ride) return res.status(404).json({message:"Ride not found"});

    ride.status="cancelled";
    ride.cancelledBy="admin";
    await ride.save();

    if(ride.driver)
      await Driver.findByIdAndUpdate(ride.driver,{isAvailable:true});

    notify(ride.user,{
      title:"Ride Cancelled by Admin",
      message:"Support cancelled your ride"
    });

    res.json({ success:true });

  }catch(err){
    res.status(500).json({message:"Admin cancel failed"});
  }
};


module.exports = {
  createRide: exports.createRide,
  getUserRides: exports.getUserRides,
  getRideById: exports.getRideById,
  acceptRide: exports.acceptRide,
  startRide: exports.startRide,
  completeRide: exports.completeRide,
  cancelRide: exports.cancelRide,
  rateRide: exports.rateRide,
  getAllRides: exports.getAllRides,
  adminCancelRide: exports.adminCancelRide
};