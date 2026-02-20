
require("dotenv").config();


const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http");
const dns = require("dns");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const { Server } = require("socket.io");

// absolute root
const root = __dirname;


const authRoutes = require(path.join(root,"routes","authRoutes.js"));
const driverRoutes = require(path.join(root,"routes","driverRoutes.js"));
const adminRoutes = require(path.join(root,"routes","adminRoutes.js"));
const rideRoutes = require(path.join(root,"routes","rideRoutes.js"));
const supportRoutes = require(path.join(root,"routes","supportRoutes.js"));
const paymentRoutes = require(path.join(root,"routes","paymentRoutes.js"));
const locationRoutes = require(path.join(root,"routes","locationRoutes.js"));
const webhookRoutes = require(path.join(root,"routes","webhookRoutes.js"));

const connectDB = require(path.join(root,"config","db.js"));

// ======================================================
// ENV VALIDATION
// ======================================================
["MONGO_URI","JWT_SECRET"].forEach(key=>{
  if(!process.env[key]){
    console.error("❌ Missing ENV:",key);
    process.exit(1);
  }
});

console.log("✅ ENV Loaded");

// ======================================================
// DNS FIX (Mongo Atlas IPv6 bug)
// ======================================================
dns.setDefaultResultOrder("ipv4first");

// ======================================================
// CONNECT DB
// ======================================================
connectDB()
.then(()=>console.log("✅ MongoDB Connected"))
.catch(err=>{
  console.error("❌ DB ERROR:",err.message);
  process.exit(1);
});

// ======================================================
// INIT APP
// ======================================================
const app = express();

// ======================================================
// TRUST PROXY (Required for Render / Heroku / Vercel)
// ======================================================
app.set("trust proxy",1);

// ======================================================
// SECURITY
// ======================================================
app.use(
  helmet({
    crossOriginResourcePolicy:false
  })
);

// ======================================================
// COMPRESSION
// ======================================================
app.use(compression());

// ======================================================
// BODY LIMITS
// ======================================================
app.use(express.json({limit:"10mb"}));
app.use(express.urlencoded({extended:true,limit:"10mb"}));

// ======================================================
// CORS
// ======================================================
const allowedOrigins=[
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin:(origin,cb)=>{
    if(!origin) return cb(null,true);
    if(allowedOrigins.includes(origin)) return cb(null,true);

    console.warn("⚠️ Blocked CORS:",origin);
    return cb(null,true); // allow temporarily
  },
  credentials:true
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
// STRIPE WEBHOOK (RAW BODY ONLY HERE)
// ======================================================
app.use(
  "/api/webhook",
  express.raw({type:"application/json"}),
  webhookRoutes
);

// ======================================================
// STATIC FILES
// ======================================================
app.use("/uploads",express.static(path.join(root,"uploads")));

// ======================================================
// ROUTES
// ======================================================
app.use("/api/auth",authRoutes);
app.use("/api/driver",driverRoutes);
app.use("/api/admin",adminRoutes);
app.use("/api/ride",rideRoutes);
app.use("/api/support",supportRoutes);
app.use("/api/payment",paymentRoutes);
app.use("/api/location",locationRoutes);

console.log("✅ Routes mounted");

// ======================================================
// HEALTH CHECK ROUTE
// ======================================================
app.get("/health",(req,res)=>{
  res.json({
    success:true,
    server:"running",
    time:new Date()
  });
});

// ======================================================
// ROOT
// ======================================================
app.get("/",(req,res)=>{
  res.send("🚀 TransportX API running...");
});

// ======================================================
// GLOBAL 404
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
  console.error("🔥 SERVER ERROR:",err);

  res.status(err.status||500).json({
    success:false,
    message:err.message || "Internal Server Error"
  });
});

// ======================================================
// SERVER + SOCKET
// ======================================================
const server=http.createServer(app);

const io=new Server(server,{
  cors:{
    origin:true,
    methods:["GET","POST"]
  },
  transports:["websocket","polling"], // IMPORTANT FIX
  pingTimeout:60000
});

io.on("connection",socket=>{
  console.log("🟢 Socket Connected:",socket.id);

  socket.on("sendLocation",data=>{
    io.emit("receiveLocation",data);
  });

  socket.on("disconnect",()=>{
    console.log("🔴 Socket Disconnected:",socket.id);
  });
});

// ======================================================
// GRACEFUL SHUTDOWN
// ======================================================
process.on("SIGINT",()=>{
  console.log("🛑 Server shutting down...");
  process.exit(0);
});

process.on("uncaughtException",err=>{
  console.error("UNCAUGHT:",err);
});

process.on("unhandledRejection",err=>{
  console.error("PROMISE ERROR:",err);
});


const PORT=process.env.PORT || 5000;

server.listen(PORT,()=>{
  console.log(`🚀 Server running on port ${PORT}`);
});