import express from "express";
import cors from "cors";
import { clerkAuthMiddleware } from "./middleware/authMiddleware.js";
import authRoutes from "./routes/authRoutes.js";

const app = express();

// Configure CORS to allow frontend dev server with credentials
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());

// Health check endpoint (keep unchanged) - must be BEFORE Clerk middleware
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "SpeedHype API is running",
  });
});

// Apply Clerk middleware ONLY to auth routes
// Mount auth routes with Clerk middleware
app.use("/api/auth", clerkAuthMiddleware, authRoutes);

export default app;