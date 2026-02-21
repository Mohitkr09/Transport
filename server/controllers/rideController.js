const Ride = require("../models/Ride");
const Driver = require("../models/Driver");


// ======================================================
// 💰 FARE CALCULATOR
// ======================================================
const calculateFare = (vehicleType, distanceKm = 5) => {
  const rates = { bike: 10, auto: 15, car: 20 };
  return Math.round(distanceKm * (rates[vehicleType] || 20));
};


// ======================================================
// 🎯 FIND BEST DRIVER (SMART + SAFE MATCHING)
// ======================================================
const findBestDriver = async ({ lat, lng, vehicleType }) => {

  const staleLimit = new Date(Date.now() - 5 * 60 * 1000); // ignore inactive drivers

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
        $maxDistance: 7000
      }
    }
  })
  .limit(10)
  .select("rating totalRides location");

  if (!drivers.length) return null;

  // ranking score
  drivers.sort((a, b) => {
    const scoreA = a.rating * 2 + a.totalRides / 50;
    const scoreB = b.rating * 2 + b.totalRides / 50;
    return scoreB - scoreA;
  });

  return drivers[0];
};


// ======================================================
// 🚕 CREATE RIDE
// ======================================================
exports.createRide = async (req, res) => {
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

    // =============================
    // SAFE DISTANCE
    // =============================
    const parsed = parseFloat(distance);
    const safeDistance = Number.isFinite(parsed) && parsed > 0 ? parsed : 5;

    const rates = { bike:10, auto:15, car:20 };
    const fare = Math.round(safeDistance * (rates[vehicleType] || 20));

    // =============================
    // CREATE RIDE FIRST
    // =============================
    const ride = await Ride.create({
      user:req.user._id,
      pickupLocation:{
        address:pickupLocation.address,
        location:{
          type:"Point",
          coordinates:[pickupLocation.lng,pickupLocation.lat]
        }
      },
      dropLocation:{
        address:dropLocation.address,
        location:{
          type:"Point",
          coordinates:[dropLocation.lng,dropLocation.lat]
        }
      },
      vehicleType,
      distanceKm:safeDistance,
      fare,
      status:"requested"
    });

    // =============================
    // FIND DRIVER IN BACKGROUND
    // =============================
    setImmediate(async () => {
      try {
        const driver = await Driver.findOne({
          isApproved:true,
          isOnline:true,
          isAvailable:true,
          "vehicle.type":vehicleType,
          location:{
            $near:{
              $geometry:{
                type:"Point",
                coordinates:[pickupLocation.lng,pickupLocation.lat]
              },
              $maxDistance:15000
            }
          }
        });

        if(!driver){
          await Ride.findByIdAndUpdate(ride._id,{status:"no_driver_found"});
          return;
        }

        await Driver.findByIdAndUpdate(driver._id,{isAvailable:false});

        await Ride.findByIdAndUpdate(ride._id,{
          driver:driver._id,
          status:"driver_assigned"
        });

      } catch(err){
        console.log("BACKGROUND MATCH ERROR:",err);
      }
    });

    // =============================
    // RESPONSE IMMEDIATELY
    // =============================
    res.status(201).json({
      success:true,
      message:"Ride request created. Searching driver...",
      ride
    });

  } catch(err){
    console.error("CREATE RIDE ERROR:",err);
    res.status(500).json({success:false,message:"Failed to create ride"});
  }
};
// ======================================================
// USER RIDES
// ======================================================
exports.getUserRides = async (req,res)=>{
  try{
    const rides = await Ride.find({ user:req.user._id })
      .populate("driver","name email rating vehicle")
      .sort({ createdAt:-1 });

    res.json({ success:true, rides });

  }catch(err){
    console.error(err);
    res.status(500).json({ success:false,message:"Failed to fetch rides" });
  }
};


// ======================================================
// ACCEPT RIDE
// ======================================================
exports.acceptRide = async (req,res)=>{
  try{
    const ride = await Ride.findById(req.params.id);

    if(!ride)
      return res.status(404).json({ message:"Ride not found" });

    if(ride.driver.toString() !== req.user._id.toString())
      return res.status(403).json({ message:"Not your ride" });

    if(ride.status !== "driver_assigned")
      return res.status(400).json({ message:"Ride already accepted" });

    ride.status="accepted";
    ride.acceptedAt=new Date();
    await ride.save();

    res.json({
      success:true,
      message:"Ride accepted",
      ride
    });

  }catch(err){
    res.status(500).json({ message:"Failed to accept ride" });
  }
};


// ======================================================
// COMPLETE RIDE
// ======================================================
exports.completeRide = async (req,res)=>{
  try{
    const ride = await Ride.findById(req.params.id);

    if(!ride)
      return res.status(404).json({ message:"Ride not found" });

    if(ride.driver.toString() !== req.user._id.toString())
      return res.status(403).json({ message:"Not your ride" });

    if(!["accepted","ongoing"].includes(ride.status))
      return res.status(400).json({ message:"Ride cannot be completed" });

    ride.status="completed";
    ride.completedAt=new Date();
    await ride.save();

    await Driver.findByIdAndUpdate(
      ride.driver,
      { isAvailable:true }
    );

    res.json({
      success:true,
      message:"Ride completed",
      ride
    });

  }catch(err){
    res.status(500).json({ message:"Failed to complete ride" });
  }
};