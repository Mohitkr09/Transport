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

// absolute path helper
const root = __dirname;

// ROUTES (absolute paths fix Render issues)
const authRoutes = require(path.join(root, "routes/authRoutes"));
const driverRoutes = require(path.join(root, "routes/driverRoutes"));
const adminRoutes = require(path.join(root, "routes/adminRoutes"));
const rideRoutes = require(path.join(root, "routes/rideRoutes"));
const supportRoutes = require(path.join(root, "routes/supportRoutes"));
const paymentRoutes = require(path.join(root, "routes/paymentRoutes"));
const locationRoutes = require(path.join(root, "routes/locationRoutes"));
const webhookRoutes = require(path.join(root, "routes/webhookRoutes"));

const connectDB = require(path.join(root, "config/db"));

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

// ======================================================
// FIX MONGODB DNS (Atlas fix)
// ======================================================
dns.setDefaultResultOrder("ipv4first");

// ======================================================
// CONNECT DATABASE
// ======================================================
connectDB()
  .then(() => console.log("✅ MongoDB Connected"))
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
app.use(helmet());

app.use(cors({
  origin: [
    "http://localhost:5173",
    process.env.FRONTEND_URL
  ],
  credentials: true
}));

app.use(morgan("dev"));

// ======================================================
// STRIPE WEBHOOK (RAW BODY REQUIRED)
// ======================================================
app.use(
  "/api/webhook",
  express.raw({ type: "application/json" }),
  webhookRoutes
);

// ======================================================
// JSON PARSER
// ======================================================
app.use(express.json());

// ======================================================
// STATIC FILES
// ======================================================
app.use("/uploads", express.static(path.join(root, "uploads")));


app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.originalUrl}`);
  next();
});


app.use("/api/auth", authRoutes);
app.use("/api/driver", driverRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/ride", rideRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/location", locationRoutes);

// DEBUG ROUTE CHECK
console.log("✅ All routes mounted successfully");


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
    origin: [
      "http://localhost:5173",
      process.env.FRONTEND_URL
    ],
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
