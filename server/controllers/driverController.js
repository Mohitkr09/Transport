const Driver = require("../models/Driver");
const Ride = require("../models/Ride");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

/* =====================================================
HELPERS
===================================================== */

// token
const generateToken = id =>
  jwt.sign({ id, role: "driver" }, process.env.JWT_SECRET, {
    expiresIn: "7d"
  });

// socket notify
const notify = (room, event, payload) => {
  if (!global.io) return;
  global.io.to(room.toString()).emit(event, {
    ...payload,
    time: new Date()
  });
};

// safe response
const send = (res, success, data = {}, code = 200) =>
  res.status(code).json({ success, ...data });



/* =====================================================
REGISTER DRIVER
===================================================== */
exports.registerDriver = async (req,res)=>{
  try{
    const { name,email,password,vehicleType } = req.body;

    if(!name || !email || !password || !vehicleType)
      return send(res,false,{message:"All fields required"},400);

    if(password.length < 6)
      return send(res,false,{message:"Password must be 6+ chars"},400);

    if(!req.files?.license || !req.files?.vehicleRC)
      return send(res,false,{message:"License & RC required"},400);

    const exists = await Driver.findOne({email});
    if(exists)
      return send(res,false,{message:"Driver already exists"},409);

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
      isAvailable:false
    });

    send(res,true,{
      message:"Registered. Awaiting admin approval.",
      driver:{
        id:driver._id,
        name:driver.name,
        email:driver.email,
        vehicle:driver.vehicle,
        isApproved:driver.isApproved
      }
    },201);

  }catch(err){
    console.error("REGISTER DRIVER ERROR:",err);
    send(res,false,{message:"Registration failed"},500);
  }
};



/* =====================================================
LOGIN DRIVER
===================================================== */
exports.loginDriver = async (req,res)=>{
  try{
    const { email,password } = req.body;

    const driver = await Driver.findOne({email}).select("+password");
    if(!driver)
      return send(res,false,{message:"Driver not found"},404);

    const match = await bcrypt.compare(password,driver.password);
    if(!match)
      return send(res,false,{message:"Invalid credentials"},401);

    if(!driver.isApproved)
      return send(res,false,{message:"Driver not approved yet"},403);

    driver.isOnline=true;
    driver.isAvailable=true;
    driver.lastLogin=new Date();
    await driver.save();

    notify(driver._id,"driverOnline",{});

    send(res,true,{
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
    send(res,false,{message:"Login failed"},500);
  }
};



/* =====================================================
PROFILE
===================================================== */
exports.getDriverProfile = async (req,res)=>{
  try{
    const driver = await Driver.findById(req.user._id).select("-password");
    if(!driver)
      return send(res,false,{message:"Driver not found"},404);

    send(res,true,{driver});

  }catch(err){
    console.error("PROFILE ERROR:",err);
    send(res,false,{message:"Failed to fetch profile"},500);
  }
};



/* =====================================================
ONLINE STATUS
===================================================== */
exports.toggleOnlineStatus = async (req,res)=>{
  try{
    const driver = await Driver.findById(req.user._id);
    if(!driver)
      return send(res,false,{message:"Driver not found"},404);

    driver.isOnline = !driver.isOnline;
    driver.isAvailable = driver.isOnline;
    await driver.save();

    notify("admins","driverStatusChanged",{
      driverId:driver._id,
      isOnline:driver.isOnline
    });

    send(res,true,{
      isOnline:driver.isOnline,
      isAvailable:driver.isAvailable
    });

  }catch(err){
    console.error("STATUS ERROR:",err);
    send(res,false,{message:"Status update failed"},500);
  }
};



/* =====================================================
LOCATION UPDATE
===================================================== */
exports.updateLocation = async (req,res)=>{
  try{
    const { lat,lng,rideId } = req.body;

    if(typeof lat!=="number" || typeof lng!=="number")
      return send(res,false,{message:"Valid lat/lng required"},400);

    if(lat<-90 || lat>90 || lng<-180 || lng>180)
      return send(res,false,{message:"Invalid coordinate range"},400);

    const driver = await Driver.findById(req.user._id);
    if(!driver)
      return send(res,false,{message:"Driver not found"},404);

    driver.location={
      type:"Point",
      coordinates:[lng,lat]
    };
    driver.lastLocationUpdate=new Date();
    await driver.save();

    // emit to ride room
    if(rideId){
      notify(rideId,"driverMoved",{
        lat,lng,
        driverId:driver._id
      });
    }

    send(res,true);

  }catch(err){
    console.error("LOCATION ERROR:",err);
    send(res,false,{message:"Location update failed"},500);
  }
};



/* =====================================================
ADMIN APPROVE
===================================================== */
exports.approveDriver = async (req,res)=>{
  try{
    const driver = await Driver.findByIdAndUpdate(
      req.params.id,
      {isApproved:true},
      {new:true}
    );

    if(!driver)
      return send(res,false,{message:"Driver not found"},404);

    notify(driver._id,"approved",{});

    send(res,true,{message:"Driver approved"});

  }catch(err){
    console.error("APPROVE ERROR:",err);
    send(res,false,{message:"Approval failed"},500);
  }
};



/* =====================================================
ADMIN REJECT
===================================================== */
exports.rejectDriver = async (req,res)=>{
  try{
    const driver = await Driver.findByIdAndDelete(req.params.id);

    if(!driver)
      return send(res,false,{message:"Driver not found"},404);

    send(res,true,{message:"Driver removed"});

  }catch(err){
    console.error("REJECT ERROR:",err);
    send(res,false,{message:"Reject failed"},500);
  }
};



/* =====================================================
ADMIN LIST
===================================================== */
exports.getAllDrivers = async (req,res)=>{
  try{
    const drivers = await Driver.find().select("-password");

    send(res,true,{
      count:drivers.length,
      drivers
    });

  }catch(err){
    console.error("GET DRIVERS ERROR:",err);
    send(res,false,{message:"Failed to fetch drivers"},500);
  }
};



/* =====================================================
NEARBY DRIVERS
===================================================== */
exports.findNearbyDrivers = async (req,res)=>{
  try{
    const { lat,lng,radius=5000,vehicleType } = req.query;

    if(!lat || !lng)
      return send(res,false,{message:"lat & lng required"},400);

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

    send(res,true,{
      count:drivers.length,
      drivers
    });

  }catch(err){
    console.error("NEARBY ERROR:",err);
    send(res,false,{message:"Driver search failed"},500);
  }
};