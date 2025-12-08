import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { authRoutes } from "./routes/auth.js";
import { testsRoutes } from "./routes/tests.js";
import { authMiddleware } from "./middleware/auth.js";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Health check
app.get("/", (c) => {
  return c.json({
    name: "UX Testing API",
    version: "1.0.0",
    status: "healthy",
  });
});

app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

// Auth routes (public)
app.route("/api/auth", authRoutes);

// Protected routes
app.use("/api/tests/*", authMiddleware);
app.route("/api/tests", testsRoutes);

// Start server
const port = parseInt(process.env.PORT || "8080", 10);

console.log(`🚀 Server starting on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});

console.log(`✅ Server running at http://localhost:${port}`);

export default app;
