// ======================================================
// LOAD ENV FIRST
// ======================================================
require("dotenv").config();

// ======================================================
// IMPORTS
// ======================================================
const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http");
const dns = require("dns");
const helmet = require("helmet");
const morgan = require("morgan");
const { Server } = require("socket.io");
const locationRoutes = require("./routes/locationRoutes");
const connectDB = require("./config/db");

// ======================================================
// VERIFY ENV VARIABLES
// ======================================================
const requiredEnv = [
  "MONGO_URI",
  "JWT_SECRET",
  "EMAIL",
  "EMAIL_PASS",
  "STRIPE_SECRET_KEY"
];

requiredEnv.forEach(key => {
  if (!process.env[key]) {
    console.error(`❌ Missing ENV variable: ${key}`);
    process.exit(1);
  }
});

console.log("✅ ENV Loaded");
console.log("📧 Email:", process.env.EMAIL);

// ======================================================
// FIX MONGODB DNS (Atlas fix)
// ======================================================
dns.setDefaultResultOrder("ipv4first");

// ======================================================
// CONNECT DATABASE
// ======================================================
connectDB()
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch(err => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });

// ======================================================
// INIT APP
// ======================================================
const app = express();

// ======================================================
// SECURITY + MIDDLEWARE
// ======================================================
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

app.use(helmet());
app.use(morgan("dev"));

// ======================================================
// STRIPE WEBHOOK (RAW BODY REQUIRED)
// ======================================================
app.use(
  "/api/webhook",
  express.raw({ type: "application/json" }),
  require("./routes/webhookRoutes")
);

// ======================================================
// JSON PARSER
// ======================================================
app.use(express.json());

// ======================================================
// STATIC FILES
// ======================================================
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ======================================================
// ROUTES IMPORT
// ======================================================
const authRoutes = require("./routes/authRoutes");
const driverRoutes = require("./routes/driverRoutes");
const adminRoutes = require("./routes/adminRoutes");
const rideRoutes = require("./routes/rideRoutes");
const supportRoutes = require("./routes/supportRoutes");
const paymentRoutes = require("./routes/paymentRoutes");

// ======================================================
// REQUEST LOGGER
// ======================================================
app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.originalUrl}`);
  next();
});

// ======================================================
// API ROUTES
// ======================================================
app.use("/api/auth", authRoutes);
app.use("/api/driver", driverRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/ride", rideRoutes);   // ✅ RIDE ROUTES ACTIVE
app.use("/api/support", supportRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/location", locationRoutes);

// ======================================================
// HEALTH CHECK
// ======================================================
app.get("/", (req, res) => {
  res.send("🚀 TransportX API running...");
});

// ======================================================
// 404 HANDLER
// ======================================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`
  });
});

// ======================================================
// GLOBAL ERROR HANDLER
// ======================================================
app.use((err, req, res, next) => {
  console.error("🔥 SERVER ERROR:", err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error"
  });
});

// ======================================================
// CREATE HTTP SERVER
// ======================================================
const server = http.createServer(app);

// ======================================================
// SOCKET.IO
// ======================================================
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  console.log("🟢 Socket connected:", socket.id);

  socket.on("sendLocation", (data) => {
    io.emit("receiveLocation", data);
  });

  socket.on("disconnect", () => {
    console.log("🔴 Socket disconnected:", socket.id);
  });
});

// ======================================================
// CRASH HANDLERS
// ======================================================
process.on("uncaughtException", err => {
  console.error("💥 UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", err => {
  console.error("💥 UNHANDLED PROMISE:", err);
});

// ======================================================
// START SERVER
// ======================================================
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
