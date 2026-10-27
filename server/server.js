require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http");
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

/* ================= DATABASE ================= */
const connectDB = require("./config/db");

/* ================= INITIALIZATION ================= */
const app = express();
app.set("trust proxy", 1);

connectDB();

/* ================= CORS CONFIGURATION ================= */

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://transport-cmoh.vercel.app",
  process.env.FRONTEND_URL?.replace(/\/$/, ""),
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests without an Origin header (for server-to-server/CLI calls).
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn("❌ CORS blocked origin:", origin);
    return callback(
      new Error(`Origin not allowed by CORS: ${origin}`)
    );
  },

  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
  ],

  credentials: true,
  optionsSuccessStatus: 204,
};

// Register CORS before all other middleware and routes.
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

/* ================= GENERAL MIDDLEWARE ================= */

app.use(helmet());
app.use(compression());
app.use(morgan("dev"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ================= STATIC FILES ================= */

app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

/* ================= API ROUTES ================= */

app.use("/api/auth", authRoutes);
app.use("/api/driver", driverRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/ride", rideRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/notifications", notificationRoutes);

/* ================= HEALTH CHECK ================= */

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server running",
  });
});

/* ================= ROOT ================= */

app.get("/", (req, res) => {
  res.status(200).send("🚀 API Running");
});

/* ================= HTTP SERVER ================= */

const server = http.createServer(app);

/* ================= SOCKET.IO ================= */

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.warn("❌ Socket.IO CORS blocked origin:", origin);
      return callback(
        new Error(`Origin not allowed by Socket.IO CORS: ${origin}`)
      );
    },

    credentials: true,
    methods: ["GET", "POST"],
  },

  transports: ["websocket", "polling"],
  pingTimeout: 60000,
  pingInterval: 25000,
});

/* ================= GLOBAL SOCKET MAPS ================= */

const onlineDrivers = {};
const onlineUsers = {};

app.set("io", io);
app.set("onlineDrivers", onlineDrivers);
app.set("onlineUsers", onlineUsers);

/* ================= SOCKET AUTHENTICATION ================= */

io.use((socket, next) => {
  try {
    let user = null;

    const authorization =
      socket.handshake.headers?.authorization;

    const token =
      socket.handshake.auth?.token ||
      (authorization
        ? authorization.split(" ")[1]
        : null);

    // JWT authentication
    if (token) {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );

      user = {
        id: decoded.id || decoded._id,
        role: decoded.role || "user",
      };
    }

    // Development fallback retained from the original code.
    if (!user && socket.handshake.auth?.userId) {
      user = {
        id: socket.handshake.auth.userId,
        role: socket.handshake.auth.role || "user",
      };
    }

    if (!user?.id) {
      console.log("❌ Socket Unauthorized");
      return next(new Error("Unauthorized"));
    }

    socket.user = user;

    console.log("🔐 Socket Authenticated:", user);

    return next();
  } catch (err) {
    console.log("❌ Socket Auth Error:", err.message);
    return next(new Error("Auth failed"));
  }
});

/* ================= SOCKET CONNECTION ================= */

io.on("connection", async (socket) => {
  try {
    const userId = socket.user?.id;
    const role = socket.user?.role;

    if (!userId) {
      socket.disconnect(true);
      return;
    }

    console.log(
      "🟢 Connected:",
      role,
      userId,
      socket.id
    );

    // Join the user's personal room.
    socket.join(userId.toString());

    // Socket heartbeat diagnostics.
    socket.conn.on("packet", (packet) => {
      if (packet.type === "ping") {
        console.log("💓 Socket ping:", userId);
      }
    });

    /* ================= REGISTER DRIVER ================= */

    if (role === "driver") {
      if (!onlineDrivers[userId]) {
        onlineDrivers[userId] = [];
      }

      // Remove duplicate socket IDs.
      onlineDrivers[userId] =
        onlineDrivers[userId].filter(
          (id) => id !== socket.id
        );

      // Remove disconnected sockets.
      onlineDrivers[userId] =
        onlineDrivers[userId].filter(
          (id) => io.sockets.sockets.has(id)
        );

      onlineDrivers[userId].push(socket.id);

      console.log(
        "🚗 Driver sockets:",
        userId,
        onlineDrivers[userId]
      );

      await Driver.findByIdAndUpdate(userId, {
        isOnline: true,
        isAvailable: true,
        lastActive: new Date(),
      });
    }

    /* ================= REGISTER USER ================= */

    if (role === "user") {
      if (!onlineUsers[userId]) {
        onlineUsers[userId] = [];
      }

      onlineUsers[userId] =
        onlineUsers[userId].filter(
          (id) => id !== socket.id
        );

      onlineUsers[userId] =
        onlineUsers[userId].filter(
          (id) => io.sockets.sockets.has(id)
        );

      onlineUsers[userId].push(socket.id);

      console.log(
        "👤 User sockets:",
        userId,
        onlineUsers[userId]
      );
    }

    /* ================= JOIN RIDE ROOM ================= */

    socket.on("joinRide", (rideId) => {
      if (!rideId) return;

      socket.join(rideId.toString());

      console.log(`🚕 Joined ride room: ${rideId}`);
    });

    /* ================= DRIVER LIVE LOCATION ================= */

    socket.on(
      "driverLocationUpdate",
      ({ rideId, lat, lng } = {}) => {
        if (
          !rideId ||
          typeof lat !== "number" ||
          typeof lng !== "number"
        ) {
          return;
        }

        io.to(rideId.toString()).emit("driverMoved", {
          lat,
          lng,
        });
      }
    );

    /* ================= RIDE STATUS EVENTS ================= */

    socket.on("rideAccepted", ({ rideId } = {}) => {
      if (!rideId) return;
      io.to(rideId.toString()).emit("rideAccepted");
    });

    socket.on("driverArrived", ({ rideId } = {}) => {
      if (!rideId) return;
      io.to(rideId.toString()).emit("driverArrived");
    });

    socket.on("rideStarted", ({ rideId } = {}) => {
      if (!rideId) return;
      io.to(rideId.toString()).emit("rideStarted");
    });

    socket.on("rideCompleted", ({ rideId } = {}) => {
      if (!rideId) return;
      io.to(rideId.toString()).emit("rideCompleted");
    });

    socket.on("paymentDone", ({ rideId } = {}) => {
      if (!rideId) return;
      io.to(rideId.toString()).emit("paymentDone");
    });

    /* ================= CANCEL RIDE ================= */

    socket.on("cancelRide", ({ rideId } = {}) => {
      if (!rideId) return;

      io.to(rideId.toString()).emit("rideCancelled", {
        rideId,
        message: "Ride has been cancelled",
      });
    });

    /* ================= DRIVER HEARTBEAT ================= */

    socket.on("driverPing", async () => {
      socket.emit("driverPong");

      if (role === "driver") {
        if (!onlineDrivers[userId]) {
          onlineDrivers[userId] = [];
        }

        if (!onlineDrivers[userId].includes(socket.id)) {
          onlineDrivers[userId].push(socket.id);
        }

        try {
          await Driver.findByIdAndUpdate(userId, {
            isOnline: true,
            isAvailable: true,
            lastActive: new Date(),
          });

          console.log("💓 Driver heartbeat:", userId);
        } catch (err) {
          console.error(
            "❌ Driver heartbeat update failed:",
            err.message
          );
        }
      }
    });

    /* ================= DISCONNECT ================= */

    socket.on("disconnect", async (reason) => {
      console.log(
        "🔴 Disconnected:",
        reason,
        userId,
        socket.id
      );

      // Driver disconnect handling.
      if (role === "driver" && onlineDrivers[userId]) {
        onlineDrivers[userId] =
          onlineDrivers[userId].filter(
            (id) => id !== socket.id
          );

        // Mark offline only when all devices are disconnected.
        if (onlineDrivers[userId].length === 0) {
          delete onlineDrivers[userId];

          try {
            await Driver.findByIdAndUpdate(userId, {
              isOnline: false,
              isAvailable: false,
            });

            console.log("🚗 Driver offline:", userId);
          } catch (err) {
            console.error(
              "❌ Failed to update driver offline status:",
              err.message
            );
          }
        }
      }

      // User disconnect handling.
      if (role === "user" && onlineUsers[userId]) {
        onlineUsers[userId] =
          onlineUsers[userId].filter(
            (id) => id !== socket.id
          );

        if (onlineUsers[userId].length === 0) {
          delete onlineUsers[userId];
        }
      }
    });
  } catch (err) {
    console.error("⚠️ Socket connection error:", err);

    // Keep the server running if socket setup fails.
    socket.disconnect(true);
  }
});

/* ================= START SERVER ================= */

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});