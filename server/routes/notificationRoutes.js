const router = require("express").Router();
const Notification = require("../models/Notification");
const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, async (req,res)=>{
  const list = await Notification
    .find({ user:req.user._id })
    .sort({ createdAt:-1 })
    .limit(50);

  res.json(list);
});

router.patch("/read/:id", protect, async(req,res)=>{
  await Notification.findByIdAndUpdate(req.params.id,{read:true});
  res.json({success:true});
});

module.exports = router;