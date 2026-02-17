const express = require("express");
const router = express.Router();

const rideController = require("../controllers/rideController");
const { protect } = require("../middleware/authMiddleware");

const asyncHandler = fn => (req,res,next)=>
  Promise.resolve(fn(req,res,next)).catch(next);

// logger
router.use((req,res,next)=>{
  console.log(`🚗 ${req.method} ${req.originalUrl}`);
  next();
});


// CREATE + LIST RIDES
router.route("/")
  .post(protect, asyncHandler(rideController.createRide))
  .get(protect, asyncHandler(rideController.getUserRides));


// GET SINGLE RIDE
router.get("/:id",
  protect,
  asyncHandler(rideController.getRideById)
);


// ACCEPT
router.put("/:id/accept",
  protect,
  asyncHandler(rideController.acceptRide)
);


// COMPLETE
router.put("/:id/complete",
  protect,
  asyncHandler(rideController.completeRide)
);


// CANCEL
router.put("/:id/cancel",
  protect,
  asyncHandler(rideController.cancelRide)
);


// TEST ROUTE
router.post("/test",(req,res)=>{
  res.json({success:true,msg:"test ok",body:req.body});
});


// HEALTH
router.get("/health",(req,res)=>{
  res.json({success:true,message:"Ride API healthy"});
});


// 404 fallback
router.use((req,res)=>{
  res.status(404).json({
    success:false,
    message:`Ride route not found → ${req.method} ${req.originalUrl}`
  });
});

module.exports = router;
