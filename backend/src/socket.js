const jwt = require("jsonwebtoken");

function setupSocket(io) {
  // Auth middleware for sockets
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required"));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev_secret");
      socket.user = decoded;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const { address } = socket.user;
    console.log(`🔌 Socket connected: ${address}`);

    // Join personal room
    socket.join(`user:${address}`);

    // Join a conversation room
    socket.on("join_conversation", ({ otherAddress }) => {
      const room = [address, otherAddress].sort().join(":");
      socket.join(`conv:${room}`);
    });

    // Typing indicator
    socket.on("typing", ({ toAddress }) => {
      const room = [address, toAddress].sort().join(":");
      socket.to(`conv:${room}`).emit("user_typing", { address });
    });

    socket.on("stop_typing", ({ toAddress }) => {
      const room = [address, toAddress].sort().join(":");
      socket.to(`conv:${room}`).emit("user_stop_typing", { address });
    });

    // Join a group's live feed room
    socket.on("join_group", ({ groupId }) => {
      socket.join(`group:${groupId}`);
    });

    socket.on("disconnect", () => {
      console.log(`🔌 Socket disconnected: ${address}`);
    });
  });
}

module.exports = { setupSocket };
