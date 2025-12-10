import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { authRoutes } from "./routes/auth.js";
import { testsRoutes } from "./routes/tests.js";
import { batchTestsRoutes } from "./routes/batch-tests.js";
import { swarmsRoutes } from "./routes/swarms.js";
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
app.use("/api/tests", authMiddleware); // Match base path
app.use("/api/tests/*", authMiddleware); // Match child paths
app.use("/api/batch-tests", authMiddleware); // Match base path
app.use("/api/batch-tests/*", authMiddleware); // Match child paths
app.use("/api/swarms", authMiddleware); // Match base path
app.use("/api/swarms/*", authMiddleware); // Match child paths
app.route("/api/tests", testsRoutes);
app.route("/api/batch-tests", batchTestsRoutes);
app.route("/api/swarms", swarmsRoutes);

// Start server
const port = parseInt(process.env.PORT || "8080", 10);

console.log(`🚀 Server starting on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});

console.log(`✅ Server running at http://localhost:${port}`);

export default app;
