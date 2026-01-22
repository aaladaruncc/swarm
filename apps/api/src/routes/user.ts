import { Hono } from "hono";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { user, testRuns, screenshotTestRuns } from "@ux-testing/db/schema";
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

userRoutes.get("/me/usage", authMiddleware, async (c) => {
  const currentUser = c.get("user");
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [liveMonth] = await db
    .select({
      totalTokens: sql<number>`coalesce(sum(${testRuns.totalTokens}), 0)`,
    })
    .from(testRuns)
    .where(and(eq(testRuns.userId, currentUser.id), gte(testRuns.createdAt, monthStart)));

  const [liveAllTime] = await db
    .select({
      totalTokens: sql<number>`coalesce(sum(${testRuns.totalTokens}), 0)`,
    })
    .from(testRuns)
    .where(eq(testRuns.userId, currentUser.id));

  const [screenshotMonth] = await db
    .select({
      totalTokens: sql<number>`coalesce(sum(${screenshotTestRuns.totalTokens}), 0)`,
    })
    .from(screenshotTestRuns)
    .where(and(eq(screenshotTestRuns.userId, currentUser.id), gte(screenshotTestRuns.createdAt, monthStart)));

  const [screenshotAllTime] = await db
    .select({
      totalTokens: sql<number>`coalesce(sum(${screenshotTestRuns.totalTokens}), 0)`,
    })
    .from(screenshotTestRuns)
    .where(eq(screenshotTestRuns.userId, currentUser.id));

  const monthLiveTokens = Number(liveMonth?.totalTokens || 0);
  const monthScreenshotTokens = Number(screenshotMonth?.totalTokens || 0);
  const allTimeLiveTokens = Number(liveAllTime?.totalTokens || 0);
  const allTimeScreenshotTokens = Number(screenshotAllTime?.totalTokens || 0);

  return c.json({
    month: {
      totalTokens: monthLiveTokens + monthScreenshotTokens,
      liveTokens: monthLiveTokens,
      screenshotTokens: monthScreenshotTokens,
    },
    allTime: {
      totalTokens: allTimeLiveTokens + allTimeScreenshotTokens,
      liveTokens: allTimeLiveTokens,
      screenshotTokens: allTimeScreenshotTokens,
    },
  });
});

export { userRoutes };


