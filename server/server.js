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

/* ================= CORS ================= */
const allowedOrigins = [
  "http://localhost:5173",
  "https://transport-mpb5.onrender.com"
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("CORS blocked"));
  },
  credentials: true
}));

/* ================= STATIC ================= */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ================= ROUTES ================= */
app.use("/api/auth", authRoutes);   // 🔥 includes /me
app.use("/api/driver", driverRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/ride", rideRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/notifications", notificationRoutes);

/* ================= ROOT ================= */
app.get("/", (req, res) => res.send("🚀 API Running"));

app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "Server is healthy" });
});

/* ================= 404 ================= */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found → ${req.method} ${req.originalUrl}`
  });
});

/* ================= GLOBAL ERROR ================= */
app.use((err, req, res, next) => {
  console.error("🔥 ERROR:", err.message);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Server error"
  });
});

/* ================= SERVER ================= */
const server = http.createServer(app);

/* ================= SOCKET ================= */
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
});

global.io = io;

/* ================= SOCKET AUTH ================= */
io.use((socket, next) => {
  try {
    let user = null;

    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(" ")[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      user = decoded;
    }

    // fallback
    if (!user && socket.handshake.auth?.userId) {
      user = {
        id: socket.handshake.auth.userId,
        role: socket.handshake.auth.role || "driver"
      };
    }

    if (!user) return next(new Error("Unauthorized"));

    socket.user = user;
    next();

  } catch (err) {
    console.log("❌ Socket Auth Error:", err.message);
    next(new Error("Unauthorized"));
  }
});

/* ================= SOCKET CONNECTION ================= */
io.on("connection", async (socket) => {
  try {
    const userId = socket.user?.id;
    const role = socket.user?.role;

    console.log("🟢 Connected:", role, userId);

    if (!userId) return;

    /* PERSONAL ROOM */
    socket.join(userId.toString());

    /* ROLE ROOM */
    socket.join(role);

    if (role === "driver") {
      socket.join("drivers");

      await Driver.findByIdAndUpdate(userId, {
        isOnline: true,
        isAvailable: true
      });

      console.log("🚗 Driver online:", userId);
    }

    /* JOIN RIDE */
    socket.on("joinRide", (rideId) => {
      if (rideId) socket.join(rideId.toString());
    });

    /* LOCATION UPDATE */
    socket.on("driverLocationUpdate", ({ rideId, lat, lng }) => {
      if (rideId) {
        io.to(rideId.toString()).emit("driverMoved", { lat, lng });
      }
    });

    /* ACCEPT */
    socket.on("driverAcceptRide", ({ rideId, driver }) => {
      io.to(rideId.toString()).emit("rideAccepted", { rideId, driver });
    });

    /* START */
    socket.on("driverStartRide", ({ rideId }) => {
      io.to(rideId.toString()).emit("rideStarted", { rideId });
    });

    /* COMPLETE */
    socket.on("driverCompleteRide", ({ rideId }) => {
      io.to(rideId.toString()).emit("rideCompleted", { rideId });
    });

    /* DISCONNECT */
    socket.on("disconnect", async () => {
      console.log("🔴 Disconnected:", userId);

      if (role === "driver") {
        await Driver.findByIdAndUpdate(userId, {
          isOnline: false,
          isAvailable: false
        });
      }
    });

  } catch (err) {
    console.log("⚠️ Socket error:", err.message);
  }
});

/* ================= START ================= */
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});