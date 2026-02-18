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

// absolute path root
const root = __dirname;

// ======================================================
// ROUTES (ABSOLUTE PATH SAFE)
// ======================================================
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
// VERIFY ENV
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
// CONNECT DATABASE
// ======================================================
connectDB()
.then(()=>console.log("✅ MongoDB Connected"))
.catch(err=>{
  console.error("DB ERROR:",err.message);
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
    return cb(null,true); // allow for testing
  },
  credentials:true
}));

// ======================================================
// LOGGING
// ======================================================
app.use(morgan("dev"));

app.use((req,res,next)=>{
  console.log("➡️",req.method,req.originalUrl);
  next();
});

// ======================================================
// STRIPE WEBHOOK (RAW BODY)
// ======================================================
app.use(
  "/api/webhook",
  express.raw({type:"application/json"}),
  webhookRoutes
);

// ======================================================
// JSON PARSER
// ======================================================
app.use(express.json());

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

console.log("✅ Routes mounted successfully");

// ======================================================
// ROOT CHECK
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
// ERROR HANDLER
// ======================================================
app.use((err,req,res,next)=>{
  console.error("🔥 SERVER ERROR:",err);

  res.status(err.status||500).json({
    success:false,
    message:err.message||"Internal Server Error"
  });
});

// ======================================================
// SERVER + SOCKET
// ======================================================
const server=http.createServer(app);

const io=new Server(server,{
  cors:{origin:true,methods:["GET","POST"]}
});

io.on("connection",socket=>{
  console.log("🟢 Socket:",socket.id);

  socket.on("sendLocation",data=>{
    io.emit("receiveLocation",data);
  });

  socket.on("disconnect",()=>{
    console.log("🔴 Socket:",socket.id);
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
const PORT=process.env.PORT||5000;

server.listen(PORT,()=>{
  console.log(`🚀 Server running on port ${PORT}`);
});
