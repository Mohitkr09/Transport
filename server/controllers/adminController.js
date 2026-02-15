const Driver = require("../models/Driver");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");


// =======================================================
// 🟢 CREATE DRIVER (ADMIN ONLY)
// =======================================================
exports.createDriver = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required"
      });
    }

    // Check existing driver
    const existing = await Driver.findOne({ email });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Driver with this email already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const driver = await Driver.create({
      name,
      email,
      password: hashedPassword,
      isApproved: true, // Admin created → auto approved
      isOnline: false
    });

    res.status(201).json({
      success: true,
      message: "Driver created successfully",
      driver: {
        id: driver._id,
        name: driver.name,
        email: driver.email,
        isApproved: driver.isApproved,
        createdAt: driver.createdAt
      }
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to create driver",
      error: err.message
    });
  }
};



// =======================================================
// 🟡 GET ALL PENDING DRIVERS
// =======================================================
exports.getPendingDrivers = async (req, res) => {
  try {
    const drivers = await Driver.find(
      { isApproved: false },
      "-password"
    ).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: drivers.length,
      drivers
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch pending drivers",
      error: err.message
    });
  }
};



// =======================================================
// 🟢 GET ALL APPROVED DRIVERS
// =======================================================
exports.getApprovedDrivers = async (req, res) => {
  try {
    const drivers = await Driver.find(
      { isApproved: true },
      "-password"
    ).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: drivers.length,
      drivers
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch approved drivers",
      error: err.message
    });
  }
};



// =======================================================
// ✅ APPROVE DRIVER
// =======================================================
exports.approveDriver = async (req, res) => {
  try {

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid driver ID"
      });
    }

    const driver = await Driver.findById(req.params.id);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found"
      });
    }

    driver.isApproved = true;
    await driver.save();

    res.status(200).json({
      success: true,
      message: "Driver approved successfully",
      driver: {
        id: driver._id,
        name: driver.name,
        email: driver.email,
        isApproved: driver.isApproved
      }
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to approve driver",
      error: err.message
    });
  }
};



// =======================================================
// ❌ REJECT DRIVER
// =======================================================
exports.rejectDriver = async (req, res) => {
  try {

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid driver ID"
      });
    }

    const driver = await Driver.findById(req.params.id);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found"
      });
    }

    await driver.deleteOne();

    res.status(200).json({
      success: true,
      message: "Driver rejected and removed successfully"
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to reject driver",
      error: err.message
    });
  }
};



// =======================================================
// 📊 DRIVER GROWTH (Last 12 Months with Year Support)
// =======================================================
exports.getDriverGrowth = async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const start = new Date(`${year}-01-01`);
    const end = new Date(`${year}-12-31`);

    const result = await Driver.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          count: { $sum: 1 }
        }
      }
    ]);

    const months = [
      "Jan","Feb","Mar","Apr","May","Jun",
      "Jul","Aug","Sep","Oct","Nov","Dec"
    ];

    const formatted = months.map((m, i) => {
      const found = result.find(r => r._id === i + 1);
      return { month: m, count: found ? found.count : 0 };
    });

    res.json({ success: true, data: formatted });

  } catch (err) {
    res.status(500).json({ message: "Failed to fetch growth" });
  }
};

