import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { user } from "@ux-testing/db/schema";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { authMiddleware } from "../middleware/auth.js";

const userRoutes = new Hono();

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
});

userRoutes.patch("/me", authMiddleware, zValidator("json", updateUserSchema), async (c) => {
  const currentUser = c.get("user");
  const { name, email } = c.req.valid("json");

  if (!name && !email) {
    return c.json({ error: "No fields to update" }, 400);
  }

  const updates: any = {};
  if (name) updates.name = name;
  if (email) {
      // Check if email already exists
      const existing = await db.query.user.findFirst({
          where: eq(user.email, email)
      });
      if (existing && existing.id !== currentUser.id) {
          return c.json({ error: "Email already in use" }, 409);
      }
      updates.email = email;
      updates.emailVerified = false; // Reset verification if email changes
  }
  updates.updatedAt = new Date();

  const [updatedUser] = await db.update(user)
    .set(updates)
    .where(eq(user.id, currentUser.id))
    .returning();

  return c.json(updatedUser);
});

export { userRoutes };


