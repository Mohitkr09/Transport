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

/* ================= INIT ================= */
const app = express();
app.set("trust proxy", 1);

/* ================= DB CONNECT ================= */
connectDB();

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
  origin: allowedOrigins,
  credentials: true
}));

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
app.get("/", (req, res) => res.send("🚀 API Running"));

/* ================= SERVER ================= */
const server = http.createServer(app);

/* ================= SOCKET ================= */
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
});

/* ======================================================
🔥 IMPORTANT MAPS (FIX)
====================================================== */
const onlineDrivers = {};
const onlineUsers = {};

app.set("io", io);
app.set("onlineDrivers", onlineDrivers);
app.set("onlineUsers", onlineUsers);

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

    /* ✅ STORE SOCKET */
    if (role === "driver") {
      onlineDrivers[userId] = socket.id;
      console.log("🚗 Driver mapped:", userId, socket.id);

      await Driver.findByIdAndUpdate(userId, {
        isOnline: true,
        isAvailable: true
      });
    }

    if (role === "user") {
      onlineUsers[userId] = socket.id;
      console.log("👤 User mapped:", userId, socket.id);
    }

    /* PERSONAL ROOM */
    socket.join(userId.toString());

    /* ================= EVENTS ================= */

    socket.on("joinRide", (rideId) => {
      socket.join(rideId.toString());
    });

    socket.on("driverLocationUpdate", ({ rideId, lat, lng }) => {
      if (rideId) {
        io.to(rideId.toString()).emit("driverMoved", { lat, lng });
      }
    });

    socket.on("disconnect", async () => {
      console.log("🔴 Disconnected:", userId);

      if (role === "driver") {
        delete onlineDrivers[userId];

        await Driver.findByIdAndUpdate(userId, {
          isOnline: false,
          isAvailable: false
        });
      }

      if (role === "user") {
        delete onlineUsers[userId];
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