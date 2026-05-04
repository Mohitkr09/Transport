const Driver = require("../models/Driver");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

/* =========================================================
CREATE DRIVER (ADMIN)
========================================================= */

exports.createDriver = async (req, res) => {
  try {
    let {
      name,
      email,
      password,
      phone,
      vehicleType,
      vehicleNumber,
      lat,
      lng,
    } = req.body;

    if (!name || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: "Name, email and phone required",
      });
    }

    email = email.toLowerCase().trim();
    phone = phone.trim();

    const exists = await Driver.findOne({
      $or: [{ email }, { phone }],
    });

    if (exists) {
      return res.status(409).json({
        success: false,
        message: "Driver already exists",
      });
    }

    /* 🔥 IMPORTANT: NO HASH HERE */
    const plainPassword = password?.trim() || "123456";

    const driver = await Driver.create({
      name,
      email,
      password: plainPassword, // ✅ FIXED (plain password)
      phone,
      role: "driver",

      vehicle: {
        type: vehicleType || "bike",
        number: vehicleNumber || "",
      },

      location: {
        type: "Point",
        coordinates: [Number(lng), Number(lat)],
      },

      lastLocationUpdate: new Date(),

      isApproved: true,
      isOnline: false,
      isAvailable: false,
    });

    res.status(201).json({
      success: true,
      message: "Driver created successfully",
      defaultPassword: plainPassword, // 🔥 important
      driver: {
        id: driver._id,
        name: driver.name,
        email: driver.email,
        phone: driver.phone,
      },
    });

  } catch (err) {
    console.error("CREATE DRIVER ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
/* =========================================================
GET ALL DRIVERS
========================================================= */

exports.getAllDrivers = async (req,res)=>{

try{

const drivers = await Driver.find()
.select("-password")
.sort({createdAt:-1});

res.json({
success:true,
count:drivers.length,
drivers
});

}catch(err){

console.error("GET DRIVER ERROR:",err);

res.status(500).json({
success:false,
message:"Failed to fetch drivers"
});
}

};



/* =========================================================
GET APPROVED DRIVERS
========================================================= */

exports.getApprovedDrivers = async (req,res)=>{

try{

const drivers = await Driver.find({isApproved:true})
.select("-password")
.sort({createdAt:-1});

res.json({
success:true,
count:drivers.length,
drivers
});

}catch(err){

console.error("APPROVED DRIVER ERROR:",err);

res.status(500).json({
success:false,
message:"Failed to fetch drivers"
});
}

};



/* =========================================================
GET PENDING DRIVERS
========================================================= */

exports.getPendingDrivers = async (req,res)=>{

try{

const drivers = await Driver.find({isApproved:false})
.select("-password")
.sort({createdAt:-1});

res.json({
success:true,
count:drivers.length,
drivers
});

}catch(err){

console.error("PENDING DRIVER ERROR:",err);

res.status(500).json({
success:false,
message:"Failed to fetch pending drivers"
});
}

};



/* =========================================================
APPROVE DRIVER
========================================================= */

exports.approveDriver = async (req,res)=>{

try{

const {id} = req.params;

if(!mongoose.Types.ObjectId.isValid(id)){
return res.status(400).json({
success:false,
message:"Invalid driver id"
});
}

const driver = await Driver.findById(id);

if(!driver){
return res.status(404).json({
success:false,
message:"Driver not found"
});
}

driver.isApproved = true;

await driver.save();

res.json({
success:true,
message:"Driver approved",
driver
});

}catch(err){

console.error("APPROVE DRIVER ERROR:",err);

res.status(500).json({
success:false,
message:"Failed to approve driver"
});
}

};



/* =========================================================
DELETE DRIVER
========================================================= */

exports.rejectDriver = async (req,res)=>{

try{

const {id} = req.params;

if(!mongoose.Types.ObjectId.isValid(id)){
return res.status(400).json({
success:false,
message:"Invalid driver id"
});
}

const driver = await Driver.findById(id);

if(!driver){
return res.status(404).json({
success:false,
message:"Driver not found"
});
}

await driver.deleteOne();

res.json({
success:true,
message:"Driver removed"
});

}catch(err){

console.error("DELETE DRIVER ERROR:",err);

res.status(500).json({
success:false,
message:"Failed to delete driver"
});
}

};



/* =========================================================
UPDATE DRIVER LOCATION
========================================================= */

exports.updateDriverLocation = async (req,res)=>{

try{

const {lat,lng} = req.body;

const driver = await Driver.findById(req.user.id);

if(!driver){
return res.status(404).json({
success:false,
message:"Driver not found"
});
}

driver.location={
type:"Point",
coordinates:[Number(lng),Number(lat)]
};

driver.lastLocationUpdate=new Date();

await driver.save();

res.json({
success:true,
message:"Location updated"
});

}catch(err){

console.error("LOCATION UPDATE ERROR:",err);

res.status(500).json({
success:false,
message:"Failed to update location"
});
}

};



/* =========================================================
UPDATE DRIVER STATUS
========================================================= */

exports.updateDriverStatus = async (req,res)=>{

try{

const {isOnline} = req.body;

const driver = await Driver.findById(req.user.id);

if(!driver){
return res.status(404).json({
success:false,
message:"Driver not found"
});
}

driver.isOnline = isOnline;

if(!isOnline){
driver.isAvailable=false;
}

await driver.save();

res.json({
success:true,
message:"Status updated",
driver
});

}catch(err){

console.error("DRIVER STATUS ERROR:",err);

res.status(500).json({
success:false,
message:"Failed to update status"
});
}

};



/* =========================================================
GET NEARBY DRIVERS
========================================================= */

exports.getNearbyDrivers = async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: "User location required"
      });
    }

    const drivers = await Driver.find({
      isOnline: true,
      isApproved: true,
      isAvailable: true,

      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [Number(lng), Number(lat)]
          },
          $maxDistance: 50000 // 🔥 50 KM
        }
      }

    }).select("-password");

    res.json({
      success: true,
      count: drivers.length,
      drivers
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Failed to fetch drivers"
    });
  }
};



/* =========================================================
DRIVER GROWTH ANALYTICS
========================================================= */

exports.getDriverGrowth = async (req,res)=>{

try{

const year = parseInt(req.query.year) || new Date().getFullYear();

const start = new Date(`${year}-01-01`);
const end = new Date(`${year}-12-31`);

const result = await Driver.aggregate([
{
$match:{ createdAt:{ $gte:start,$lte:end } }
},
{
$group:{
_id:{ $month:"$createdAt" },
count:{ $sum:1 }
}
}
]);

const months=[
"Jan","Feb","Mar","Apr","May","Jun",
"Jul","Aug","Sep","Oct","Nov","Dec"
];

const formatted = months.map((m,i)=>{
const found = result.find(r=>r._id===i+1);
return {month:m,count:found?found.count:0};
});

res.json({
success:true,
data:formatted
});

}catch(err){

console.error("DRIVER GROWTH ERROR:",err);

res.status(500).json({
success:false,
message:"Failed to fetch growth"
});
}

};