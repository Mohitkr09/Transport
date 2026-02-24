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

const root = __dirname;

/* ======================================================
IMPORT ROUTES
====================================================== */
const authRoutes = require("./routes/authRoutes");
const driverRoutes = require("./routes/driverRoutes");
const adminRoutes = require("./routes/adminRoutes");
const rideRoutes = require("./routes/rideRoutes");
const supportRoutes = require("./routes/supportRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const locationRoutes = require("./routes/locationRoutes");
const webhookRoutes = require("./routes/webhookRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

const connectDB = require("./config/db");

/* ======================================================
ENV VALIDATION
====================================================== */
const REQUIRED = [
  "MONGO_URI",
  "JWT_SECRET",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET"
];

for (const key of REQUIRED) {
  if (!process.env[key]) {
    console.error("❌ Missing ENV:", key);
    process.exit(1);
  }
}

console.log("✅ ENV Loaded");

/* ======================================================
DNS FIX (Render IPv6 bug)
====================================================== */
dns.setDefaultResultOrder("ipv4first");

/* ======================================================
CONNECT DATABASE
====================================================== */
connectDB()
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => {
    console.error("❌ DB ERROR:", err.message);
    process.exit(1);
  });

/* ======================================================
INIT EXPRESS
====================================================== */
const app = express();
app.set("trust proxy", 1);

/* ======================================================
SECURITY
====================================================== */
app.use(
  helmet({
    crossOriginResourcePolicy: false
  })
);

app.use(compression());

/* ======================================================
STRIPE WEBHOOK (RAW BODY FIRST)
====================================================== */
app.use(
  "/api/webhook",
  express.raw({ type: "application/json" }),
  webhookRoutes
);

/* ======================================================
BODY PARSER
====================================================== */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

/* ======================================================
CORS
====================================================== */
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);

      console.warn("⚠️ Blocked Origin:", origin);
      return cb(new Error("Blocked by CORS"));
    },
    credentials: true
  })
);

/* ======================================================
LOGGER
====================================================== */
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

/* ======================================================
STATIC FILES
====================================================== */
app.use("/uploads", express.static(path.join(root, "uploads")));

/* ======================================================
API ROUTES
====================================================== */
app.use("/api/auth", authRoutes);
app.use("/api/driver", driverRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/ride", rideRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/notifications", notificationRoutes);

console.log("✅ Routes mounted");

/* ======================================================
HEALTH CHECK
====================================================== */
app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "running",
    uptime: process.uptime(),
    timestamp: new Date()
  });
});

/* ======================================================
ROOT
====================================================== */
app.get("/", (req, res) => {
  res.send("🚀 TransportX API running...");
});

/* ======================================================
404 HANDLER
====================================================== */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found → ${req.method} ${req.originalUrl}`
  });
});

/* ======================================================
GLOBAL ERROR HANDLER
====================================================== */
app.use((err, req, res, next) => {
  console.error("🔥 SERVER ERROR:", err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error"
  });
});

/* ======================================================
CREATE HTTP SERVER
====================================================== */
const server = http.createServer(app);

/* ======================================================
SOCKET SERVER
====================================================== */
const io = new Server(server, {
  cors: { origin: true },
  transports: ["websocket", "polling"],
  pingTimeout: 60000
});

global.io = io;

/* ======================================================
SOCKET AUTH
====================================================== */
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("No token"));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch {
    next(new Error("Unauthorized socket"));
  }
});

/* ======================================================
SOCKET CONNECTION
====================================================== */
io.on("connection", socket => {
  console.log("🟢 Socket:", socket.id, "User:", socket.user?.id);

  const userId = socket.user?.id;

  /* USER PERSONAL ROOM */
  if (userId) socket.join(userId);

  /* JOIN RIDE ROOM */
  socket.on("joinRide", rideId => {
    if (!rideId) return;
    socket.join(rideId);
  });

  /* DRIVER LIVE LOCATION */
  socket.on("driverLocation", data => {
    if (!data?.rideId) return;

    io.to(data.rideId).emit("driverMoved", {
      lat: data.lat,
      lng: data.lng,
      heading: data.heading,
      updatedAt: new Date()
    });
  });

  /* RIDE STATUS */
  socket.on("rideStatus", ({ rideId, status }) => {
    if (!rideId) return;
    io.to(rideId).emit("rideStatusUpdate", status);
  });

  /* ADMIN GLOBAL ANNOUNCEMENT */
  socket.on("adminBroadcast", msg => {
    if (socket.user?.role !== "admin") return;

    io.emit("notification", {
      title: "📢 Announcement",
      message: msg,
      createdAt: new Date()
    });
  });

  socket.on("disconnect", () => {
    console.log("🔴 Socket Disconnected:", socket.id);
  });
});

/* ======================================================
PROCESS SAFETY
====================================================== */
process.on("SIGINT", () => {
  console.log("🛑 Graceful shutdown...");
  server.close(() => process.exit(0));
});

process.on("uncaughtException", err => {
  console.error("UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", err => {
  console.error("UNHANDLED REJECTION:", err);
});

/* ======================================================
START SERVER
====================================================== */
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});