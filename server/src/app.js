import express from "express";
import cors from "cors";
import "dotenv/config";
import { clerkAuthMiddleware } from "./middleware/authMiddleware.js";
import authRoutes from "./routes/authRoutes.js";
import blogRoutes from "./routes/blogRoutes.js";
import communityRoutes from "./routes/communityRoutes.js";
import feedRoutes from "./routes/feedRoutes.js";
import vehicleRoutes from "./routes/vehicleRoutes.js";

const app = express();

// Configure CORS to allow frontend dev server with credentials
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
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
app.use("/api/blogs", clerkAuthMiddleware, blogRoutes);
app.use("/api/communities", clerkAuthMiddleware, communityRoutes);
app.use("/api/feed", clerkAuthMiddleware, feedRoutes);
app.use("/api/cars", clerkAuthMiddleware, vehicleRoutes);

app.use((error, _req, res, _next) => {
  console.error("API request failed:", error.message);
  const statusCode = error.statusCode
    || (error.name === "ValidationError" || error.name === "MulterError" ? 400 : 500);
  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? "An unexpected server error occurred." : error.message,
  });
});

export default app;