import dotenv from "dotenv";
import { createServer } from "node:http";
import { Server } from "socket.io";
import app from "./app.js";
import connectDB from "./config/db.js";
import { attachCommunitySocket } from "./socket/communitySocket.js";

dotenv.config();

const PORT = process.env.PORT || 5000;
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
        credentials: true,
    },
    maxHttpBufferSize: 13 * 1024 * 1024,
});
attachCommunitySocket(io);

const startServer = async () => {
    await connectDB();

    httpServer.listen(PORT, () => {
        console.log(`SpeedHype API running on port ${PORT}`);
    });
};

startServer();