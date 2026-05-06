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

/* ================= DB ================= */
const connectDB = require("./config/db");

/* ================= INIT ================= */
const app = express();
app.set("trust proxy", 1);

/* ================= DB ================= */
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
  "https://transport-cmoh.vercel.app",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {

      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.warn("❌ CORS BLOCKED:", origin);

      return callback(null, true);
    },

    credentials: true,
  })
);

/* ================= STATIC ================= */
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

/* ================= ROUTES ================= */
app.use("/api/auth", authRoutes);
app.use("/api/driver", driverRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/ride", rideRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/notifications", notificationRoutes);

/* ================= HEALTH ================= */
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Server running ✅",
  });
});

/* ================= ROOT ================= */
app.get("/", (req, res) => {
  res.send("🚀 API Running");
});

/* ================= SERVER ================= */
const server = http.createServer(app);

/* =====================================================
SOCKET.IO
===================================================== */

const io = new Server(server, {

  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST"],
  },

  transports: ["websocket", "polling"],

  pingTimeout: 60000,
  pingInterval: 25000,
});

/* =====================================================
GLOBAL SOCKET MAPS
===================================================== */

const onlineDrivers = {};
const onlineUsers = {};

app.set("io", io);
app.set("onlineDrivers", onlineDrivers);
app.set("onlineUsers", onlineUsers);

/* =====================================================
SOCKET AUTH
===================================================== */

io.use((socket, next) => {

  try {

    let user = null;

    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(" ")[1];

    /* JWT AUTH */
    if (token) {

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );

      user = decoded;
    }

    /* DEV FALLBACK */
    if (!user && socket.handshake.auth?.userId) {

      user = {
        id: socket.handshake.auth.userId,
        role:
          socket.handshake.auth.role || "user",
      };
    }

    if (!user) {

      console.log("❌ Socket Unauthorized");

      return next(
        new Error("Unauthorized")
      );
    }

    socket.user = user;

    next();

  } catch (err) {

    console.log(
      "❌ Socket Auth Error:",
      err.message
    );

    next(new Error("Auth failed"));
  }
});

/* =====================================================
SOCKET CONNECTION
===================================================== */

io.on("connection", async (socket) => {

  try {

    const userId = socket.user?.id;
    const role = socket.user?.role;

    if (!userId) return;

    console.log(
      "🟢 Connected:",
      role,
      userId,
      socket.id
    );

    /* JOIN PERSONAL ROOM */
    socket.join(userId.toString());

    /* =================================================
    REGISTER DRIVER (MULTI DEVICE)
    ================================================= */

    if (role === "driver") {

      if (!onlineDrivers[userId]) {
        onlineDrivers[userId] = [];
      }

      onlineDrivers[userId].push(socket.id);

      console.log(
        "🚗 Driver sockets:",
        onlineDrivers[userId]
      );

      await Driver.findByIdAndUpdate(
        userId,
        {
          isOnline: true,
          isAvailable: true,
        }
      );
    }

    /* =================================================
    REGISTER USER
    ================================================= */

    if (role === "user") {

      if (!onlineUsers[userId]) {
        onlineUsers[userId] = [];
      }

      onlineUsers[userId].push(socket.id);

      console.log(
        "👤 User sockets:",
        onlineUsers[userId]
      );
    }

    /* =================================================
    JOIN RIDE ROOM
    ================================================= */

    socket.on("joinRide", (rideId) => {

      socket.join(rideId.toString());

      console.log(
        `🚕 Joined ride room: ${rideId}`
      );
    });

    /* =================================================
    DRIVER LIVE LOCATION
    ================================================= */

    socket.on(
      "driverLocationUpdate",
      ({ rideId, lat, lng }) => {

        if (rideId) {

          io.to(rideId.toString()).emit(
            "driverMoved",
            { lat, lng }
          );
        }
      }
    );

    /* =================================================
    RIDE STATUS EVENTS
    ================================================= */

    socket.on("rideAccepted", ({ rideId }) => {

      io.to(rideId.toString()).emit(
        "rideAccepted"
      );
    });

    socket.on("driverArrived", ({ rideId }) => {

      io.to(rideId.toString()).emit(
        "driverArrived"
      );
    });

    socket.on("rideStarted", ({ rideId }) => {

      io.to(rideId.toString()).emit(
        "rideStarted"
      );
    });

    socket.on("rideCompleted", ({ rideId }) => {

      io.to(rideId.toString()).emit(
        "rideCompleted"
      );
    });

    socket.on("paymentDone", ({ rideId }) => {

      io.to(rideId.toString()).emit(
        "paymentDone"
      );
    });

    /* =================================================
    CANCEL RIDE
    ================================================= */

    socket.on("cancelRide", ({ rideId }) => {

      if (rideId) {

        io.to(rideId.toString()).emit(
          "rideCancelled",
          {
            rideId,
            message:
              "Ride has been cancelled",
          }
        );
      }
    });

    /* =================================================
    DRIVER HEARTBEAT
    ================================================= */

    socket.on("driverPing", () => {

      socket.emit("driverPong");
    });

    /* =================================================
    DISCONNECT
    ================================================= */

    socket.on("disconnect", async () => {

      console.log(
        "🔴 Disconnected:",
        userId,
        socket.id
      );

      /* DRIVER */
      if (role === "driver") {

        if (onlineDrivers[userId]) {

          onlineDrivers[userId] =
            onlineDrivers[userId].filter(
              (id) => id !== socket.id
            );

          /* LAST DEVICE CLOSED */
          if (
            onlineDrivers[userId].length === 0
          ) {

            delete onlineDrivers[userId];

            await Driver.findByIdAndUpdate(
              userId,
              {
                isOnline: false,
                isAvailable: false,
              }
            );

            console.log(
              "🚗 Driver offline:",
              userId
            );
          }
        }
      }

      /* USER */
      if (role === "user") {

        if (onlineUsers[userId]) {

          onlineUsers[userId] =
            onlineUsers[userId].filter(
              (id) => id !== socket.id
            );

          if (
            onlineUsers[userId].length === 0
          ) {

            delete onlineUsers[userId];
          }
        }
      }
    });

  } catch (err) {

    console.log(
      "⚠️ Socket Error:",
      err.message
    );
  }
});

/* =====================================================
ERROR HANDLER
===================================================== */

app.use((err, req, res, next) => {

  console.error(
    "🔥 Server Error:",
    err.message
  );

  res.status(500).json({
    success: false,
    message: err.message || "Server error",
  });
});

/* =====================================================
START SERVER
===================================================== */

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {

  console.log(
    `🚀 Server running on port ${PORT}`
  );
});