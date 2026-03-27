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

/* ======================================================
MODELS
====================================================== */

const Driver = require("./models/Driver");

/* ======================================================
DB
====================================================== */

const connectDB = require("./config/db");

/* ======================================================
ENV CHECK
====================================================== */

["MONGO_URI", "JWT_SECRET"].forEach((key) => {
  if (!process.env[key]) {
    console.error("❌ Missing ENV:", key);
    process.exit(1);
  }
});

/* ======================================================
DNS FIX
====================================================== */

dns.setDefaultResultOrder("ipv4first");

/* ======================================================
CONNECT DB
====================================================== */

connectDB()
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => {
    console.error("❌ DB ERROR:", err.message);
    process.exit(1);
  });

/* ======================================================
INIT EXPRESS
====================================================== */

const app = express();
app.set("trust proxy", 1);

/* ======================================================
GLOBAL DEBUG
====================================================== */

app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.originalUrl}`);
  next();
});

/* ======================================================
BODY PARSER
====================================================== */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ======================================================
SECURITY
====================================================== */

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

app.use(compression());

/* ======================================================
CORS
====================================================== */

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

/* ======================================================
LOGGER
====================================================== */

app.use(morgan("dev"));

/* ======================================================
STATIC FILES
====================================================== */

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ======================================================
WEBHOOK (RAW BODY)
====================================================== */

app.use(
  "/api/webhook",
  express.raw({ type: "application/json" }),
  webhookRoutes
);

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

/* ======================================================
HEALTH CHECK
====================================================== */

app.get("/health", (req, res) => {
  res.json({
    success: true,
    uptime: process.uptime(),
  });
});

/* ======================================================
404 HANDLER
====================================================== */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found → ${req.method} ${req.originalUrl}`,
  });
});

/* ======================================================
ERROR HANDLER
====================================================== */

app.use((err, req, res, next) => {
  console.error("🔥 ERROR:", err.message);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

/* ======================================================
SERVER
====================================================== */

const server = http.createServer(app);

/* ======================================================
SOCKET.IO
====================================================== */

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

global.io = io;

/* ======================================================
SOCKET AUTH
====================================================== */

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("No token"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;

    next();
  } catch (err) {
    next(new Error("Unauthorized"));
  }
});

/* ======================================================
SOCKET CONNECTION
====================================================== */

io.on("connection", (socket) => {
  const userId = socket.user?.id;
  const role = socket.user?.role;

  console.log("🟢 Connected:", role);

  if (userId) socket.join(userId);

  socket.on("disconnect", async () => {
    try {
      if (role === "driver") {
        await Driver.findByIdAndUpdate(userId, {
          socketId: null,
          isOnline: false,
          isAvailable: false,
        });
      }
    } catch (err) {
      console.log("⚠️ Socket cleanup error");
    }
  });
});

/* ======================================================
START SERVER
====================================================== */

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on ${PORT}`);
});