const startServer = async () => {
    try {
        await connectDB();

        const isProduction = process.env.NODE_ENV === "production";
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

        httpServer.listen(PORT, "0.0.0.0", () => {
            console.log(`SpeedHype API running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start SpeedHype API:", error.message);
        process.exit(1);
    }
};

startServer();