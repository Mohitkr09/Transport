const Driver = require("../models/Driver");
const Ride = require("../models/Ride");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// =====================================================
// TOKEN GENERATOR
// =====================================================
const generateToken = id =>
  jwt.sign({ id, role: "driver" }, process.env.JWT_SECRET, { expiresIn: "7d" });

// =====================================================
// REGISTER DRIVER
// =====================================================
exports.registerDriver = async (req,res)=>{
  try{
    const { name,email,password,vehicleType } = req.body;

    if(!name || !email || !password || !vehicleType)
      return res.status(400).json({success:false,message:"All fields required"});

    if(password.length < 6)
      return res.status(400).json({success:false,message:"Password must be 6+ chars"});

    if(!req.files?.license || !req.files?.vehicleRC)
      return res.status(400).json({success:false,message:"License & RC required"});

    const exists = await Driver.findOne({email});
    if(exists)
      return res.status(409).json({success:false,message:"Driver already exists"});

    const hashed = await bcrypt.hash(password,12);

    const driver = await Driver.create({
      name,
      email:email.toLowerCase(),
      password:hashed,
      vehicle:{type:vehicleType},
      documents:{
        license:req.files.license[0].filename,
        vehicleRC:req.files.vehicleRC[0].filename
      },
      isOnline:false,
      isAvailable:false,
      lastLocationUpdate:null
    });

    res.status(201).json({
      success:true,
      message:"Registered. Awaiting admin approval.",
      driver:{
        id:driver._id,
        name:driver.name,
        email:driver.email,
        vehicle:driver.vehicle,
        isApproved:driver.isApproved
      }
    });

  }catch(err){
    console.error("REGISTER DRIVER ERROR:",err);
    res.status(500).json({success:false,message:"Registration failed"});
  }
};


// =====================================================
// LOGIN DRIVER
// =====================================================
exports.loginDriver = async (req,res)=>{
  try{
    const { email,password } = req.body;

    const driver = await Driver.findOne({email}).select("+password");
    if(!driver)
      return res.status(404).json({success:false,message:"Driver not found"});

    const match = await bcrypt.compare(password,driver.password);
    if(!match)
      return res.status(401).json({success:false,message:"Invalid credentials"});

    if(!driver.isApproved)
      return res.status(403).json({success:false,message:"Driver not approved yet"});

    driver.isOnline=true;
    driver.isAvailable=true;
    driver.lastLogin=new Date();
    await driver.save();

    res.json({
      success:true,
      token:generateToken(driver._id),
      driver:{
        id:driver._id,
        name:driver.name,
        email:driver.email,
        vehicle:driver.vehicle,
        isOnline:driver.isOnline,
        isAvailable:driver.isAvailable
      }
    });

  }catch(err){
    console.error("LOGIN ERROR:",err);
    res.status(500).json({success:false,message:"Login failed"});
  }
};


// =====================================================
// PROFILE
// =====================================================
exports.getDriverProfile = async (req,res)=>{
  try{
    const driver = await Driver.findById(req.user._id).select("-password");
    if(!driver)
      return res.status(404).json({success:false,message:"Driver not found"});

    res.json({success:true,driver});

  }catch(err){
    console.error("PROFILE ERROR:",err);
    res.status(500).json({success:false,message:"Failed to fetch profile"});
  }
};


// =====================================================
// TOGGLE ONLINE STATUS
// =====================================================
exports.toggleOnlineStatus = async (req,res)=>{
  try{
    const driver = await Driver.findById(req.user._id);
    if(!driver)
      return res.status(404).json({success:false,message:"Driver not found"});

    driver.isOnline=!driver.isOnline;
    driver.isAvailable=driver.isOnline;

    await driver.save();

    // 🔥 notify frontend realtime
    global.io.emit("driverStatusChanged",{
      driverId:driver._id,
      isOnline:driver.isOnline
    });

    res.json({
      success:true,
      isOnline:driver.isOnline,
      isAvailable:driver.isAvailable
    });

  }catch(err){
    console.error("STATUS ERROR:",err);
    res.status(500).json({success:false,message:"Status update failed"});
  }
};


// =====================================================
// UPDATE LOCATION (REALTIME)
// =====================================================
exports.updateLocation = async (req,res)=>{
  try{
    const { lat,lng,rideId } = req.body;

    if(typeof lat !== "number" || typeof lng !== "number")
      return res.status(400).json({success:false,message:"Valid lat/lng required"});

    if(lat<-90 || lat>90 || lng<-180 || lng>180)
      return res.status(400).json({success:false,message:"Invalid coordinate range"});

    const driver = await Driver.findById(req.user._id);
    if(!driver)
      return res.status(404).json({success:false,message:"Driver not found"});

    // save to DB
    driver.location={
      type:"Point",
      coordinates:[lng,lat]
    };
    driver.lastLocationUpdate=new Date();
    await driver.save();

    // ==================================================
    // REALTIME EMIT TO RIDE ROOM
    // ==================================================
    if(rideId){
      global.io.to(rideId).emit("driverMoved",{
        lat,
        lng,
        driverId:driver._id,
        updatedAt:new Date()
      });
    }

    res.json({success:true});

  }catch(err){
    console.error("LOCATION ERROR:",err);
    res.status(500).json({success:false,message:"Location update failed"});
  }
};


// =====================================================
// ADMIN APPROVE
// =====================================================
exports.approveDriver = async (req,res)=>{
  try{
    const driver = await Driver.findByIdAndUpdate(
      req.params.id,
      {isApproved:true},
      {new:true}
    );

    if(!driver)
      return res.status(404).json({success:false,message:"Driver not found"});

    res.json({success:true,message:"Driver approved"});

  }catch(err){
    console.error("APPROVE ERROR:",err);
    res.status(500).json({success:false,message:"Approval failed"});
  }
};


// =====================================================
// ADMIN REJECT
// =====================================================
exports.rejectDriver = async (req,res)=>{
  try{
    const driver = await Driver.findByIdAndDelete(req.params.id);

    if(!driver)
      return res.status(404).json({success:false,message:"Driver not found"});

    res.json({success:true,message:"Driver removed"});

  }catch(err){
    console.error("REJECT ERROR:",err);
    res.status(500).json({success:false,message:"Reject failed"});
  }
};


// =====================================================
// ADMIN LIST
// =====================================================
exports.getAllDrivers = async (req,res)=>{
  try{
    const drivers = await Driver.find().select("-password");

    res.json({
      success:true,
      count:drivers.length,
      drivers
    });

  }catch(err){
    console.error("GET DRIVERS ERROR:",err);
    res.status(500).json({success:false,message:"Failed to fetch drivers"});
  }
};


// =====================================================
// FIND NEARBY DRIVERS (FAST GEO SEARCH)
// =====================================================
exports.findNearbyDrivers = async (req,res)=>{
  try{
    const { lat,lng,radius=5000,vehicleType } = req.query;

    if(!lat || !lng)
      return res.status(400).json({success:false,message:"lat & lng required"});

    const staleLimit=new Date(Date.now()-5*60*1000);

    const query={
      isApproved:true,
      isOnline:true,
      isAvailable:true,
      lastLocationUpdate:{$gte:staleLimit},
      location:{
        $near:{
          $geometry:{type:"Point",coordinates:[+lng,+lat]},
          $maxDistance:Number(radius)
        }
      }
    };

    if(vehicleType) query["vehicle.type"]=vehicleType;

    const drivers = await Driver.find(query)
      .limit(20)
      .select("name rating vehicle location");

    res.json({
      success:true,
      count:drivers.length,
      drivers
    });

  }catch(err){
    console.error("NEARBY ERROR:",err);
    res.status(500).json({success:false,message:"Driver search failed"});
  }
};