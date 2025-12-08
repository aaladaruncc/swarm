import { Hono } from "hono";
import { auth } from "../lib/auth.js";

const authRoutes = new Hono();

// Handle all Better Auth routes
authRoutes.all("/*", async (c) => {
  const response = await auth.handler(c.req.raw);
  return response;
});

export { authRoutes };
