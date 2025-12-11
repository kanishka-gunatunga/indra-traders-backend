import http from "http";
import { Server } from "socket.io";
import db from "./models";
import initSocket from "./realtime/socket";

const PORT = process.env.PORT || 8081;

async function startServer() {
    try {
        await db.sequelize.authenticate();
        console.log("Database connected successfully!");

        const httpServer = http.createServer((req, res) => {
            res.writeHead(200, { "Content-Type": "text/plain" });
            res.end("Socket.IO server running");
        });

        const io = new Server(httpServer, {
            cors: { origin: "*" },
        });

        initSocket(io);

        httpServer.listen(PORT, () => {
            console.log(`✅ Socket.IO server running on port ${PORT}`);
        });
    } catch (err) {
        console.error("❌ Failed to start Socket.IO server:", err);
    }
}

startServer();
