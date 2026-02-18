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

const root = __dirname;

// ======================================================
// ROUTES
// ======================================================
const authRoutes = require("./routes/authRoutes");
const driverRoutes = require("./routes/driverRoutes");
const adminRoutes = require("./routes/adminRoutes");
const rideRoutes = require("./routes/rideRoutes");
const supportRoutes = require("./routes/supportRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const locationRoutes = require("./routes/locationRoutes");
const webhookRoutes = require("./routes/webhookRoutes");

const connectDB = require("./config/db");

// ======================================================
// VERIFY ENV VARIABLES
// ======================================================
["MONGO_URI","JWT_SECRET"].forEach(key=>{
  if(!process.env[key]){
    console.error(`❌ Missing ENV variable: ${key}`);
    process.exit(1);
  }
});

console.log("✅ ENV Loaded");

// ======================================================
// DNS FIX
// ======================================================
dns.setDefaultResultOrder("ipv4first");

// ======================================================
// CONNECT DATABASE
// ======================================================
connectDB()
.then(()=>console.log("✅ MongoDB Connected"))
.catch(err=>{
  console.error("Mongo Error:",err.message);
  process.exit(1);
});

// ======================================================
// INIT APP
// ======================================================
const app = express();

// ======================================================
// SECURITY
// ======================================================
app.use(helmet());

// ======================================================
// CORS (AUTO DEV + PROD)
// ======================================================
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin))
      return callback(null, true);

    console.warn("Blocked CORS:", origin);
    return callback(null, true); // allow for now
  },
  credentials: true
}));

// ======================================================
// LOGGER
// ======================================================
app.use(morgan("dev"));

app.use((req,res,next)=>{
  console.log("➡️",req.method,req.originalUrl);
  next();
});

// ======================================================
// STRIPE WEBHOOK RAW BODY
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
app.use("/uploads", express.static(path.join(root,"uploads")));

// ======================================================
// ROUTES
// ======================================================
app.use("/api/auth", authRoutes);
app.use("/api/driver", driverRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/ride", rideRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/location", locationRoutes);

console.log("✅ All routes mounted successfully");

// ======================================================
// ROOT ROUTE
// ======================================================
app.get("/", (req,res)=>{
  res.send("🚀 TransportX API running...");
});

// ======================================================
// 404 HANDLER
// ======================================================
app.use((req,res)=>{
  res.status(404).json({
    success:false,
    message:`Route not found → ${req.method} ${req.originalUrl}`
  });
});

// ======================================================
// GLOBAL ERROR HANDLER
// ======================================================
app.use((err,req,res,next)=>{
  console.error("🔥 ERROR:",err);

  res.status(err.status || 500).json({
    success:false,
    message:err.message || "Internal Server Error"
  });
});

// ======================================================
// SERVER + SOCKET
// ======================================================
const server = http.createServer(app);

const io = new Server(server,{
  cors:{
    origin:true,
    methods:["GET","POST"]
  }
});

io.on("connection",(socket)=>{
  console.log("🟢 Socket connected:",socket.id);

  socket.on("sendLocation",(data)=>{
    io.emit("receiveLocation",data);
  });

  socket.on("disconnect",()=>{
    console.log("🔴 Socket disconnected:",socket.id);
  });
});

// ======================================================
// CRASH HANDLERS
// ======================================================
process.on("uncaughtException",err=>{
  console.error("UNCAUGHT:",err);
});

process.on("unhandledRejection",err=>{
  console.error("PROMISE ERROR:",err);
});

// ======================================================
// START SERVER
// ======================================================
const PORT = process.env.PORT || 5000;

server.listen(PORT,()=>{
  console.log(`🚀 Server running on port ${PORT}`);
});
