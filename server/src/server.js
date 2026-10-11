
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
const HOST = "0.0.0.0";

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

// Start the Python ingestion agent only in local development.
const startIngestionAgent = () => {
    if (stopping || ingestionAgentProcess) return;

    const agentDirectory = fileURLToPath(
        new URL("../../ai-services", import.meta.url)
    );

    const python = process.env.PYTHON_EXECUTABLE || "python";

    ingestionAgentProcess = spawn(
        python,
        [
            "-m",
            "uvicorn",
            "agent.main:app",
            "--host",
            "127.0.0.1",
            "--port",
            process.env.CAR_INGESTION_PORT || "8010",
        ],
        {
            cwd: agentDirectory,
            env: process.env,
            stdio: "inherit",
        }
    );

    ingestionAgentProcess.on("error", (error) => {
        console.error(
            "Could not start the car ingestion agent:",
            error.message
        );
    });

    ingestionAgentProcess.once("close", (code) => {
        ingestionAgentProcess = undefined;

        if (stopping) return;

        console.error(
            `Car ingestion agent stopped (${code ?? "unknown"}).`
        );

        ingestionAgentRestartTimer = setTimeout(
            startIngestionAgent,
            10000
        );

        ingestionAgentRestartTimer.unref();
    });
};

const stopServer = (signal) => {
    if (stopping) return;

    stopping = true;
    console.log(`${signal} received. Shutting down SpeedHype...`);

    clearTimeout(ingestionAgentRestartTimer);

    if (ingestionAgentProcess) {
        ingestionAgentProcess.kill();
    }

    httpServer.close(() => {
        process.exit(0);
    });

    // Prevent the process from hanging indefinitely during shutdown.
    setTimeout(() => process.exit(1), 10000).unref();
};

process.once("SIGINT", () => stopServer("SIGINT"));
process.once("SIGTERM", () => stopServer("SIGTERM"));

const startServer = async () => {
    try {
        await connectDB();

        const isProduction =
            process.env.NODE_ENV === "production";

        const agentEnabled =
            process.env.CAR_INGESTION_AGENT_AUTOSTART === "true";

        if (agentEnabled && !isProduction) {
            console.log("Starting local car ingestion agent...");
            startIngestionAgent();
        } else {
            console.log(
                isProduction
                    ? "Local car ingestion agent disabled in production."
                    : "Car ingestion agent disabled."
            );
        }

        httpServer.listen(PORT, HOST, () => {
            console.log(
                `SpeedHype API running on ${HOST}:${PORT}`
            );
        });
    } catch (error) {
        console.error(
            "Failed to start SpeedHype API:",
            error.message
        );

        process.exit(1);
    }
};

startServer();
