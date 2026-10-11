import dotenv from "dotenv";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
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
let ingestionAgentProcess;
let ingestionAgentRestartTimer;
let stopping = false;

const startIngestionAgent = () => {
    if (stopping) return;
    const agentDirectory = fileURLToPath(new URL("../../ai-services", import.meta.url));
    const python = process.env.PYTHON_EXECUTABLE || "python";
    ingestionAgentProcess = spawn(
        python,
        ["-m", "uvicorn", "agent.main:app", "--host", "127.0.0.1", "--port", process.env.CAR_INGESTION_PORT || "8010"],
        { cwd: agentDirectory, env: process.env, stdio: "inherit" },
    );
    ingestionAgentProcess.on("error", (error) => {
        console.error("Could not start the car ingestion agent:", error.message);
    });
    ingestionAgentProcess.once("close", (code) => {
        if (stopping) return;
        console.error(`Car ingestion agent stopped (${code ?? "unknown"}); retrying in 10 seconds.`);
        ingestionAgentRestartTimer = setTimeout(startIngestionAgent, 10000);
        ingestionAgentRestartTimer.unref();
    });
};

process.once("exit", () => {
    stopping = true;
    clearTimeout(ingestionAgentRestartTimer);
    ingestionAgentProcess?.kill();
});

const startServer = async () => {
    await connectDB();

    if (process.env.CAR_INGESTION_AGENT_AUTOSTART === "true") {
        startIngestionAgent();
    }

    httpServer.listen(PORT, () => {
        console.log(`SpeedHype API running on port ${PORT}`);
    });
};

startServer();