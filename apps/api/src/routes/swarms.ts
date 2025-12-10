import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { eq, desc, and } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import type { Session } from "../lib/auth.js";

type Variables = {
  user: Session["user"];
};

const swarmsRoutes = new Hono<{ Variables: Variables }>();

// ============================================================================
// SCHEMAS
// ============================================================================

const createSwarmSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  personas: z.array(z.any()),
  agentCount: z.number().min(1).max(5),
});

// ============================================================================
// ROUTES
// ============================================================================

// GET /swarms - List all swarms for the user
swarmsRoutes.get("/", async (c) => {
  const user = c.get("user");

  const swarmsList = await db
    .select()
    .from(schema.swarms)
    .where(eq(schema.swarms.userId, user.id))
    .orderBy(desc(schema.swarms.createdAt));

  return c.json({ swarms: swarmsList });
});

// POST /swarms - Create a new swarm
swarmsRoutes.post(
  "/",
  zValidator("json", createSwarmSchema),
  async (c) => {
    const user = c.get("user");
    const { name, description, personas, agentCount } = c.req.valid("json");

    try {
      const [swarm] = await db
        .insert(schema.swarms)
        .values({
          userId: user.id,
          name,
          description,
          personas,
          agentCount,
        })
        .returning();

      return c.json({ swarm });
    } catch (error) {
      console.error("Failed to create swarm:", error);
      return c.json(
        {
          error: "Failed to create swarm",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }
);

// DELETE /swarms/:id - Delete a swarm
swarmsRoutes.delete("/:id", async (c) => {
  const user = c.get("user");
  const swarmId = c.req.param("id");

  try {
    const [deletedSwarm] = await db
      .delete(schema.swarms)
      .where(
        and(
          eq(schema.swarms.id, swarmId),
          eq(schema.swarms.userId, user.id)
        )
      )
      .returning();

    if (!deletedSwarm) {
      return c.json({ error: "Swarm not found or not authorized" }, 404);
    }

    return c.json({ message: "Swarm deleted successfully", id: deletedSwarm.id });
  } catch (error) {
    console.error("Failed to delete swarm:", error);
    return c.json(
      {
        error: "Failed to delete swarm",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});


export { swarmsRoutes };
