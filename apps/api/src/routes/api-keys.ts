import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { eq, and } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import type { Session } from "../lib/auth.js";
import crypto from "crypto";

type Variables = {
    user: Session["user"];
};

const apiKeysRoutes = new Hono<{ Variables: Variables }>();

// Generate a new API key
function generateApiKey(): { key: string; hash: string; prefix: string } {
    const key = `ux_${crypto.randomBytes(32).toString("hex")}`;
    const hash = crypto.createHash("sha256").update(key).digest("hex");
    const prefix = key.substring(0, 11); // "ux_" + first 8 chars
    return { key, hash, prefix };
}

// Hash an API key for comparison
function hashApiKey(key: string): string {
    return crypto.createHash("sha256").update(key).digest("hex");
}

// Create API key schema
const createApiKeySchema = z.object({
    name: z.string().min(1).max(100),
    scopes: z.array(z.string()).optional().default(["uxagent:run", "uxagent:read"]),
    expiresAt: z.string().datetime().optional(),
});

// POST /api-keys - Create a new API key
apiKeysRoutes.post(
    "/",
    zValidator("json", createApiKeySchema),
    async (c) => {
        const user = c.get("user");
        const { name, scopes, expiresAt } = c.req.valid("json");

        const { key, hash, prefix } = generateApiKey();

        const [apiKey] = await db
            .insert(schema.apiKeys)
            .values({
                userId: user.id,
                name,
                keyHash: hash,
                keyPrefix: prefix,
                scopes,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
            })
            .returning();

        // Return the full key ONLY on creation (never stored or shown again)
        return c.json({
            id: apiKey.id,
            name: apiKey.name,
            key, // Full key - only shown once!
            prefix: apiKey.keyPrefix,
            scopes: apiKey.scopes,
            expiresAt: apiKey.expiresAt,
            createdAt: apiKey.createdAt,
            message: "Save this key securely. It will not be shown again.",
        });
    }
);

// GET /api-keys - List all API keys (without the actual key)
apiKeysRoutes.get("/", async (c) => {
    const user = c.get("user");

    const keys = await db
        .select({
            id: schema.apiKeys.id,
            name: schema.apiKeys.name,
            keyPrefix: schema.apiKeys.keyPrefix,
            scopes: schema.apiKeys.scopes,
            isActive: schema.apiKeys.isActive,
            lastUsedAt: schema.apiKeys.lastUsedAt,
            expiresAt: schema.apiKeys.expiresAt,
            createdAt: schema.apiKeys.createdAt,
        })
        .from(schema.apiKeys)
        .where(eq(schema.apiKeys.userId, user.id));

    return c.json({ keys });
});

// DELETE /api-keys/:id - Revoke an API key
apiKeysRoutes.delete("/:id", async (c) => {
    const user = c.get("user");
    const keyId = c.req.param("id");

    const [key] = await db
        .select()
        .from(schema.apiKeys)
        .where(and(eq(schema.apiKeys.id, keyId), eq(schema.apiKeys.userId, user.id)));

    if (!key) {
        return c.json({ error: "API key not found" }, 404);
    }

    await db.delete(schema.apiKeys).where(eq(schema.apiKeys.id, keyId));

    return c.json({ message: "API key revoked" });
});

// PATCH /api-keys/:id - Update API key (deactivate/reactivate)
apiKeysRoutes.patch(
    "/:id",
    zValidator("json", z.object({ isActive: z.boolean().optional() })),
    async (c) => {
        const user = c.get("user");
        const keyId = c.req.param("id");
        const { isActive } = c.req.valid("json");

        const [key] = await db
            .select()
            .from(schema.apiKeys)
            .where(and(eq(schema.apiKeys.id, keyId), eq(schema.apiKeys.userId, user.id)));

        if (!key) {
            return c.json({ error: "API key not found" }, 404);
        }

        const [updated] = await db
            .update(schema.apiKeys)
            .set({ isActive: isActive ?? key.isActive })
            .where(eq(schema.apiKeys.id, keyId))
            .returning();

        return c.json({ key: updated });
    }
);

// Validate API key helper (exported for use in middleware)
export async function validateApiKey(
    apiKey: string,
    requiredScope?: string
): Promise<{ valid: boolean; userId?: string; error?: string }> {
    const hash = hashApiKey(apiKey);

    const [key] = await db
        .select()
        .from(schema.apiKeys)
        .where(eq(schema.apiKeys.keyHash, hash));

    if (!key) {
        return { valid: false, error: "Invalid API key" };
    }

    if (!key.isActive) {
        return { valid: false, error: "API key is inactive" };
    }

    if (key.expiresAt && new Date(key.expiresAt) < new Date()) {
        return { valid: false, error: "API key has expired" };
    }

    if (requiredScope && key.scopes && !key.scopes.includes(requiredScope)) {
        return { valid: false, error: `Missing required scope: ${requiredScope}` };
    }

    // Update last used timestamp
    await db
        .update(schema.apiKeys)
        .set({ lastUsedAt: new Date() })
        .where(eq(schema.apiKeys.id, key.id));

    return { valid: true, userId: key.userId ?? undefined };
}

export { apiKeysRoutes, hashApiKey };
