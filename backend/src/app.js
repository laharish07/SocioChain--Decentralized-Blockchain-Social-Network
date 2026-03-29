require("dotenv").config();
const express    = require("express");
const http       = require("http");
const cors       = require("cors");
const mongoose   = require("mongoose");
const { Server } = require("socket.io");

const authRoutes    = require("./routes/auth");
const postRoutes    = require("./routes/posts");
const userRoutes    = require("./routes/users");
const groupRoutes   = require("./routes/groups");
const messageRoutes = require("./routes/messages");
const uploadRoutes  = require("./routes/upload");
const { setupSocket } = require("./socket");

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || "http://localhost:5173", methods: ["GET","POST"] },
});

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));
app.use(express.json({ limit: "10mb" }));

// MongoDB
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/sociochain")
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => { console.error("❌ MongoDB error:", err); process.exit(1); });

// Routes
app.use("/api/auth",     authRoutes);
app.use("/api/posts",    postRoutes);
app.use("/api/users",    userRoutes);
app.use("/api/groups",   groupRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/upload",   uploadRoutes);

app.get("/health", (req, res) => res.json({ status: "ok", time: new Date() }));

// Socket.io
setupSocket(io);
app.set("io", io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`🚀 Backend running on http://localhost:${PORT}`));

module.exports = { app, server };
