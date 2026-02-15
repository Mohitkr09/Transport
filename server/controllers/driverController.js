const Driver = require("../models/Driver");
const bcrypt = require("bcryptjs");

// ===============================
// REGISTER DRIVER (WITH DOCUMENTS)
// ===============================
exports.registerDriver = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // -------------------------------
    // 1️⃣ Basic validation
    // -------------------------------
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "All fields are required"
      });
    }

    // -------------------------------
    // 2️⃣ Check documents
    // -------------------------------
    if (
      !req.files ||
      !req.files.license ||
      !req.files.vehicleRC
    ) {
      return res.status(400).json({
        message: "License and Vehicle RC are required"
      });
    }

    // -------------------------------
    // 3️⃣ Check if driver already exists
    // -------------------------------
    const existingDriver = await Driver.findOne({ email });
    if (existingDriver) {
      return res.status(409).json({
        message: "Driver already registered with this email"
      });
    }

    // -------------------------------
    // 4️⃣ Hash password
    // -------------------------------
    const hashedPassword = await bcrypt.hash(password, 10);

    // -------------------------------
    // 5️⃣ Create driver
    // -------------------------------
    const driver = await Driver.create({
      name,
      email,
      password: hashedPassword,
      documents: {
        license: req.files.license[0].filename,
        vehicleRC: req.files.vehicleRC[0].filename
      },
      isApproved: false,
      isOnline: false
    });

    // -------------------------------
    // 6️⃣ Response
    // -------------------------------
    res.status(201).json({
      success: true,
      message: "Driver registered successfully. Await admin approval.",
      driver: {
        id: driver._id,
        name: driver.name,
        email: driver.email,
        isApproved: driver.isApproved
      }
    });

  } catch (err) {
    console.error("Driver Register Error:", err);

    res.status(500).json({
      success: false,
      message: "Server error while registering driver"
    });
  }
};
