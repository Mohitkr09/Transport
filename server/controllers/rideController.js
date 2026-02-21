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
// 🚕 CREATE RIDE
// ======================================================
exports.createRide = async (req, res) => {
  try {
    const { pickupLocation, dropLocation, vehicleType, distance } = req.body;

    if (!req.user?._id)
      return res.status(401).json({ success:false, message:"Unauthorized" });

    if (!pickupLocation || !dropLocation)
      return res.status(400).json({ success:false, message:"Invalid ride data" });

    const parsed = parseFloat(distance);
    const safeDistance = Number.isFinite(parsed) && parsed > 0 ? parsed : 5;

    const fare = calculateFare(vehicleType, safeDistance);

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

    // background driver search
    setImmediate(async ()=>{
      try{
        const driver = await Driver.findOne({
          isApproved:true,
          isOnline:true,
          isAvailable:true,
          "vehicle.type":vehicleType
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

      }catch(err){
        console.log("Driver match error:",err.message);
      }
    });

    res.status(201).json({
      success:true,
      message:"Ride created. Searching driver...",
      ride
    });

  } catch(err){
    console.error(err);
    res.status(500).json({ success:false,message:"Failed to create ride" });
  }
};

// ======================================================
// GET USER RIDES
// ======================================================
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

// ======================================================
// GET SINGLE RIDE
// ======================================================
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

// ======================================================
// ACCEPT RIDE
// ======================================================
exports.acceptRide = async (req,res)=>{
  try{
    const ride = await Ride.findById(req.params.id);

    if(!ride)
      return res.status(404).json({ message:"Ride not found" });

    ride.status="accepted";
    ride.acceptedAt=new Date();
    await ride.save();

    res.json({ success:true, ride });

  }catch(err){
    res.status(500).json({ message:"Failed to accept ride" });
  }
};

// ======================================================
// START RIDE
// ======================================================
exports.startRide = async (req,res)=>{
  try{
    const ride = await Ride.findById(req.params.id);
    if(!ride) return res.status(404).json({message:"Ride not found"});

    ride.status="ongoing";
    ride.startedAt=new Date();
    await ride.save();

    res.json({ success:true, ride });

  }catch(err){
    res.status(500).json({message:"Start ride failed"});
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

    ride.status="completed";
    ride.completedAt=new Date();
    await ride.save();

    await Driver.findByIdAndUpdate(ride.driver,{ isAvailable:true });

    res.json({ success:true, ride });

  }catch(err){
    res.status(500).json({ message:"Complete ride failed" });
  }
};

// ======================================================
// CANCEL RIDE
// ======================================================
exports.cancelRide = async (req,res)=>{
  try{
    const ride = await Ride.findById(req.params.id);
    if(!ride) return res.status(404).json({message:"Ride not found"});

    ride.status="cancelled";
    ride.cancelledAt=new Date();
    await ride.save();

    if(ride.driver)
      await Driver.findByIdAndUpdate(ride.driver,{isAvailable:true});

    res.json({ success:true, ride });

  }catch(err){
    res.status(500).json({message:"Cancel failed"});
  }
};

// ======================================================
// RATE RIDE
// ======================================================
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


exports.adminCancelRide = async (req,res)=>{
  try{
    const ride = await Ride.findById(req.params.id);
    if(!ride) return res.status(404).json({message:"Ride not found"});

    ride.status="cancelled";
    ride.cancelledBy="admin";
    await ride.save();

    res.json({ success:true });

  }catch(err){
    res.status(500).json({message:"Admin cancel failed"});
  }
};