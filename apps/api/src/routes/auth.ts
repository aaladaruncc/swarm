import { Hono } from "hono";
import { auth } from "../lib/auth.js";

const authRoutes = new Hono();

// Handle all Better Auth routes
authRoutes.all("/*", async (c) => {
  try {
    const response = await auth.handler(c.req.raw);
    return response;
  } catch (error: any) {
    console.error("[auth] handler error", error?.message || error);
    const status = typeof error?.status === "number" ? error.status : 401;
    return c.json(
      {
        error: "auth_handler_failed",
        message: error?.message || "Failed to process auth request",
      },
      status
    );
  }
});

export { authRoutes };
