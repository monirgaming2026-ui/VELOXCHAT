import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  // Real-time events and signaling
  const waitingUsers = new Set<string>();

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-world-match", () => {
      // Find someone else waiting
      const peerId = Array.from(waitingUsers).find(id => id !== socket.id);
      
      if (peerId) {
        waitingUsers.delete(peerId);
        // Inform both users they have a match
        io.to(socket.id).emit("match-found", { peerId, initiator: true });
        io.to(peerId).emit("match-found", { peerId: socket.id, initiator: false });
      } else {
        waitingUsers.add(socket.id);
      }
    });

    socket.on("leave-world-match", () => {
      waitingUsers.delete(socket.id);
    });

    socket.on("start-world-call", ({ to, from, fromId, fromName, type }) => {
      socket.to(to).emit("start-world-call", { to: from, fromId, fromName, type });
    });

    socket.on("join-chat", (chatId) => {
      socket.join(chatId);
      console.log(`User ${socket.id} joined chat ${chatId}`);
    });

    socket.on("typing", ({ chatId, userId, username }) => {
      socket.to(chatId).emit("user-typing", { userId, username });
    });

    socket.on("stop-typing", ({ chatId, userId }) => {
      socket.to(chatId).emit("user-stop-typing", { userId });
    });

    // WebRTC Signaling
    socket.on("call-user", ({ to, offer, from, fromName, type }) => {
      socket.to(to).emit("incoming-call", { from, fromName, offer, type });
    });

    socket.on("answer-call", ({ to, answer }) => {
      socket.to(to).emit("call-answered", { answer });
    });

    socket.on("ice-candidate", ({ to, candidate }) => {
      socket.to(to).emit("ice-candidate", { candidate });
    });

    socket.on("end-call", ({ to }) => {
      socket.to(to).emit("call-ended");
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
