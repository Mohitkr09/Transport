require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http");
const dns = require("dns");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");

/* ================= ROUTES ================= */
const authRoutes = require("./routes/authRoutes");
const driverRoutes = require("./routes/driverRoutes");
const adminRoutes = require("./routes/adminRoutes");
const rideRoutes = require("./routes/rideRoutes");
const locationRoutes = require("./routes/locationRoutes");
const notificationRoutes = require("./routes/notificationRoutes"); // ✅ FIX

/* ================= MODELS ================= */
const Driver = require("./models/Driver");

/* ================= DB ================= */
const connectDB = require("./config/db");

/* ================= ENV CHECK ================= */
["MONGO_URI", "JWT_SECRET"].forEach((key) => {
  if (!process.env[key]) {
    console.error("❌ Missing ENV:", key);
    process.exit(1);
  }
});

/* ================= DNS FIX ================= */
dns.setDefaultResultOrder("ipv4first");

/* ================= CONNECT DB ================= */
connectDB()
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => {
    console.error("❌ DB ERROR:", err.message);
    process.exit(1);
  });

/* ================= INIT APP ================= */
const app = express();
app.set("trust proxy", 1);

/* ================= MIDDLEWARE ================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(compression());

app.use(cors({
  origin: "*",
  credentials: true
}));

app.use(morgan("dev"));

/* ================= STATIC ================= */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ================= ROUTES ================= */
app.use("/api/auth", authRoutes);
app.use("/api/driver", driverRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/ride", rideRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/notifications", notificationRoutes); // ✅ FIX (MOST IMPORTANT)

/* ================= ROOT ================= */
app.get("/", (req, res) => {
  res.send("🚀 API Running");
});

/* ================= HEALTH ================= */
app.get("/health", (req, res) => {
  res.json({ success: true });
});

/* ================= 404 ================= */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found → ${req.method} ${req.originalUrl}`
  });
});

/* ================= ERROR ================= */
app.use((err, req, res, next) => {
  console.error("🔥 ERROR:", err.message);
  res.status(500).json({ success: false });
});

/* ================= SERVER ================= */
const server = http.createServer(app);

/* ================= SOCKET ================= */
const io = new Server(server, {
  cors: { origin: "*" },
  transports: ["websocket"] // ✅ required for Render
});

global.io = io;

/* ================= SOCKET AUTH ================= */
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) return next(new Error("No token"));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;

    next();
  } catch {
    next(new Error("Unauthorized"));
  }
});

/* ================= SOCKET CONNECTION ================= */
io.on("connection", async (socket) => {
  try {
    const userId = socket.user?.id;
    const role = socket.user?.role;

    console.log("🟢 Connected:", role, userId, socket.id);

    if (!userId) return;

    // ✅ USER ROOM (IMPORTANT FOR NOTIFICATIONS)
    socket.join(userId.toString());

    /* ================= DRIVER ONLINE ================= */
    if (role === "driver") {
      await Driver.findByIdAndUpdate(userId, {
        socketId: socket.id,
        isOnline: true,
        isAvailable: true
      });
    }

    /* ================= RIDE REQUEST ================= */
    socket.on("requestRide", async (ride) => {
      const drivers = await Driver.find({
        isOnline: true,
        isAvailable: true
      });

      drivers.forEach(driver => {
        if (driver.socketId) {
          io.to(driver.socketId).emit("newRideRequest", ride);
        }
      });
    });

    /* ================= RIDE ACCEPTED ================= */
    socket.on("rideAccepted", async (ride) => {
      // Notify user
      io.to(ride.user.toString()).emit("rideAccepted", ride);

      // 🔥 ALSO CREATE NOTIFICATION
      const Notification = require("./models/Notification");

      await Notification.create({
        user: ride.user,
        ride: ride._id,
        driver: ride.driver,
        title: "Ride Accepted",
        message: "Your driver is on the way 🚗",
        type: "ride"
      });

      // Notify all drivers
      const drivers = await Driver.find({ isOnline: true });

      drivers.forEach(d => {
        if (d.socketId) {
          io.to(d.socketId).emit("rideTaken", ride._id);
        }
      });
    });

    /* ================= DISCONNECT ================= */
    socket.on("disconnect", async () => {
      if (role === "driver") {
        await Driver.findByIdAndUpdate(userId, {
          socketId: null,
          isOnline: false,
          isAvailable: false
        });

        console.log("🔴 Driver offline:", userId);
      }
    });

  } catch (err) {
    console.log("⚠️ Socket error:", err.message);
  }
});

/* ================= START ================= */
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on ${PORT}`);
});