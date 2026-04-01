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
const notificationRoutes = require("./routes/notificationRoutes");

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

/* ================= INIT ================= */
const app = express();
app.set("trust proxy", 1);

/* ================= MIDDLEWARE ================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(compression());
app.use(morgan("dev"));

/* ======================================================
🔥 FINAL CORS FIX (SAFE + FLEXIBLE)
====================================================== */
const allowedOrigins = [
  "http://localhost:5173",
  "https://transport-mpb5.onrender.com"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // allow Postman / mobile

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("CORS blocked"));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

/* ❌ REMOVE THIS (CAUSE OF CRASH) */
/*
app.options("*", cors());
*/

/* ================= STATIC ================= */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ================= ROUTES ================= */
app.use("/api/auth", authRoutes);
app.use("/api/driver", driverRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/ride", rideRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/notifications", notificationRoutes);

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
  res.status(500).json({
    success: false,
    message: err.message
  });
});

/* ================= SERVER ================= */
const server = http.createServer(app);

/* ======================================================
🔥 SOCKET.IO (FINAL FIX)
====================================================== */
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ["websocket", "polling"]
});

global.io = io;

/* ================= SOCKET AUTH ================= */
io.use((socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(" ")[1];

    if (!token) return next(new Error("No token"));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;

    next();
  } catch (err) {
    console.log("❌ Socket Auth Error:", err.message);
    next(new Error("Unauthorized"));
  }
});

/* ================= SOCKET ================= */
io.on("connection", async (socket) => {
  try {
    const userId = socket.user?.id;
    const role = socket.user?.role;

    console.log("🟢 Connected:", role, userId);

    if (!userId) return;

    socket.join(userId.toString());

    if (role === "driver") {
      await Driver.findByIdAndUpdate(userId, {
        socketId: socket.id,
        isOnline: true,
        isAvailable: true
      });
    }

    socket.on("joinRide", (rideId) => {
      if (!rideId) return;
      socket.join(rideId);
    });

    socket.on("driverLocationUpdate", ({ rideId, lat, lng }) => {
      io.to(rideId).emit("driverMoved", { lat, lng });
    });

    socket.on("driverAcceptRide", ({ rideId, driver }) => {
      io.to(rideId).emit("rideAccepted", { rideId, driver });
    });

    socket.on("driverStartRide", ({ rideId }) => {
      io.to(rideId).emit("rideStarted");
    });

    socket.on("driverCompleteRide", ({ rideId }) => {
      io.to(rideId).emit("rideCompleted");
    });

    socket.on("disconnect", async () => {
      console.log("🔴 Disconnected:", userId);

      if (role === "driver") {
        await Driver.findByIdAndUpdate(userId, {
          socketId: null,
          isOnline: false,
          isAvailable: false
        });
      }
    });

  } catch (err) {
    console.log("⚠️ Socket error:", err.message);
  }
});

/* ================= PORT ================= */
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on ${PORT}`);
});