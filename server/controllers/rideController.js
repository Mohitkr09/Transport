const Ride = require("../models/Ride");
const Driver = require("../models/Driver");


// ======================================================
// 📍 DISTANCE CALCULATOR
// ======================================================
const getDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};


// ======================================================
// 💰 FARE CALCULATOR
// ======================================================
const calculateFare = (vehicleType, distanceKm = 5) => {
  const rates = { bike: 10, auto: 15, car: 20 };
  return Math.round(distanceKm * (rates[vehicleType] || 20));
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
      !vehicleType ||
      typeof pickupLocation.lat !== "number" ||
      typeof pickupLocation.lng !== "number" ||
      typeof dropLocation.lat !== "number" ||
      typeof dropLocation.lng !== "number"
    )
      return res.status(400).json({ success:false, message:"Invalid ride data" });

    // ======================================================
    // FIND MATCHING DRIVERS
    // ======================================================
    const drivers = await Driver.find({
      isApproved:true,
      isOnline:true,
      isAvailable:true,
      "vehicle.type":vehicleType
    });

    if(!drivers.length)
      return res.status(404).json({
        success:false,
        message:"No drivers available"
      });


    // ======================================================
    // FIND NEAREST DRIVER
    // ======================================================
    let nearest=null;
    let min=Infinity;

    for(const d of drivers){
      if(!d.location?.coordinates) continue;

      const [lng,lat]=d.location.coordinates;
      if(lat===0 && lng===0) continue;

      const dist=getDistanceKm(
        pickupLocation.lat,
        pickupLocation.lng,
        lat,
        lng
      );

      if(dist>50) continue;

      if(dist<min){
        min=dist;
        nearest=d;
      }
    }

    if(!nearest)
      return res.status(404).json({
        success:false,
        message:"No nearby drivers found"
      });


    // ======================================================
    // ATOMIC LOCK DRIVER
    // ======================================================
    const locked=await Driver.findOneAndUpdate(
      { _id:nearest._id, isAvailable:true },
      { isAvailable:false },
      { new:true }
    );

    if(!locked)
      return res.status(409).json({
        success:false,
        message:"Driver just got booked. Try again."
      });


    // ======================================================
    // DISTANCE + FARE
    // ======================================================
    const parsed=parseFloat(distance);
    const safeDistance =
      Number.isFinite(parsed) && parsed>0 ? parsed : 5;

    const fare=calculateFare(vehicleType,safeDistance);


    // ======================================================
    // CREATE RIDE
    // ======================================================
    const ride=await Ride.create({
      user:req.user._id,
      driver:locked._id,
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
      status:"driver_assigned",
      requestedAt:new Date()
    });

    res.status(201).json({
      success:true,
      message:"Driver assigned successfully",
      ride
    });

  } catch(err){
    console.error("CREATE RIDE ERROR:",err);
    res.status(500).json({ success:false, message:"Failed to create ride" });
  }
};



// ======================================================
// 📄 USER RIDES
// ======================================================
exports.getUserRides = async (req,res)=>{
  try{
    const rides=await Ride.find({user:req.user._id})
      .populate("driver","name email rating vehicle")
      .sort({createdAt:-1});

    res.json({success:true,rides});
  }catch{
    res.status(500).json({success:false,message:"Failed to fetch rides"});
  }
};



// ======================================================
// 📍 SINGLE RIDE
// ======================================================
exports.getRideById = async (req,res)=>{
  try{
    const ride=await Ride.findById(req.params.id)
      .populate("driver","name email rating vehicle");

    if(!ride)
      return res.status(404).json({message:"Ride not found"});

    if(
      ride.user.toString()!==req.user._id.toString() &&
      ride.driver.toString()!==req.user._id.toString() &&
      req.user.role!=="admin"
    )
      return res.status(403).json({message:"Access denied"});

    res.json({success:true,ride});

  }catch{
    res.status(500).json({success:false,message:"Failed to fetch ride"});
  }
};



// ======================================================
// DRIVER ACCEPT
// ======================================================
exports.acceptRide = async (req,res)=>{
  try{
    const ride=await Ride.findById(req.params.id);

    if(!ride)
      return res.status(404).json({message:"Ride not found"});

    if(ride.driver.toString()!==req.user._id.toString())
      return res.status(403).json({message:"Not your ride"});

    if(ride.status!=="driver_assigned")
      return res.status(400).json({message:"Ride already accepted"});

    ride.status="accepted";
    ride.acceptedAt=new Date();
    await ride.save();

    res.json({success:true,message:"Ride accepted",ride});
  }catch{
    res.status(500).json({message:"Failed to accept ride"});
  }
};



// ======================================================
// START RIDE
// ======================================================
exports.startRide = async (req,res)=>{
  try{
    const ride=await Ride.findById(req.params.id);

    if(!ride)
      return res.status(404).json({message:"Ride not found"});

    if(ride.driver.toString()!==req.user._id.toString())
      return res.status(403).json({message:"Not your ride"});

    if(ride.status!=="accepted")
      return res.status(400).json({message:"Ride cannot start"});

    ride.status="ongoing";
    ride.startedAt=new Date();
    await ride.save();

    res.json({success:true,message:"Ride started",ride});

  }catch{
    res.status(500).json({message:"Failed to start ride"});
  }
};



// ======================================================
// COMPLETE
// ======================================================
exports.completeRide = async (req,res)=>{
  try{
    const ride=await Ride.findById(req.params.id);

    if(!ride)
      return res.status(404).json({message:"Ride not found"});

    if(ride.driver.toString()!==req.user._id.toString())
      return res.status(403).json({message:"Not your ride"});

    if(!["accepted","ongoing"].includes(ride.status))
      return res.status(400).json({message:"Ride cannot be completed"});

    ride.status="completed";
    ride.completedAt=new Date();
    await ride.save();

    await Driver.findByIdAndUpdate(ride.driver,{isAvailable:true});

    res.json({success:true,message:"Ride completed",ride});

  }catch{
    res.status(500).json({message:"Failed to complete ride"});
  }
};



// ======================================================
// CANCEL
// ======================================================
exports.cancelRide = async (req,res)=>{
  try{
    const ride=await Ride.findById(req.params.id);

    if(!ride)
      return res.status(404).json({message:"Ride not found"});

    if(ride.status==="completed")
      return res.status(400).json({message:"Completed ride cannot be cancelled"});

    ride.status="cancelled";
    ride.cancelledAt=new Date();
    ride.cancelledBy=req.user.role || "user";
    await ride.save();

    await Driver.findByIdAndUpdate(ride.driver,{isAvailable:true});

    res.json({success:true,message:"Ride cancelled"});
  }catch{
    res.status(500).json({message:"Failed to cancel ride"});
  }
};



// ======================================================
// ⭐ RATE RIDE
// ======================================================
exports.rateRide = async (req,res)=>{
  try{
    const {rating,feedback}=req.body;
    const ride=await Ride.findById(req.params.id);

    if(!ride)
      return res.status(404).json({message:"Ride not found"});

    if(ride.user.toString()!==req.user._id.toString())
      return res.status(403).json({message:"Not allowed"});

    if(ride.status!=="completed")
      return res.status(400).json({message:"Ride not completed"});

    ride.rating=rating;
    ride.feedback=feedback;
    await ride.save();

    // update driver rating avg
    const driver=await Driver.findById(ride.driver);

    const total=driver.totalRides+1;
    const newRating =
      ((driver.rating*driver.totalRides)+rating)/total;

    driver.rating=newRating.toFixed(1);
    driver.totalRides=total;
    await driver.save();

    res.json({success:true,message:"Rating submitted"});

  }catch{
    res.status(500).json({message:"Rating failed"});
  }
};



// ======================================================
// ADMIN — ALL RIDES
// ======================================================
exports.getAllRides = async(req,res)=>{
  try{
    const rides=await Ride.find()
      .populate("user","name email")
      .populate("driver","name email")
      .sort({createdAt:-1});

    res.json({success:true,count:rides.length,rides});
  }catch{
    res.status(500).json({message:"Failed to fetch rides"});
  }
};



// ======================================================
// ADMIN CANCEL
// ======================================================
exports.adminCancelRide = async(req,res)=>{
  try{
    const ride=await Ride.findById(req.params.id);

    if(!ride)
      return res.status(404).json({message:"Ride not found"});

    ride.status="cancelled";
    ride.cancelledBy="admin";
    ride.cancelledAt=new Date();
    await ride.save();

    await Driver.findByIdAndUpdate(ride.driver,{isAvailable:true});

    res.json({success:true,message:"Ride cancelled by admin"});
  }catch{
    res.status(500).json({message:"Cancel failed"});
  }
};