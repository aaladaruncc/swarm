import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { eq, desc, and } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { validateApiKey } from "./api-keys.js";
import { uploadScreenshot, generateScreenshotKey, getPresignedUrl } from "../lib/s3.js";

type Variables = {
    apiKeyUserId?: string;
    user?: { id: string };
};

const uxagentRoutes = new Hono<{ Variables: Variables }>();

// Middleware to validate API key for internal service calls
async function apiKeyAuth(c: any, next: any) {
    const apiKey = c.req.header("X-API-Key");

    if (!apiKey) {
        return c.json({ error: "Missing X-API-Key header" }, 401);
    }

    const result = await validateApiKey(apiKey, "uxagent:run");

    if (!result.valid) {
        return c.json({ error: result.error }, 403);
    }

    c.set("apiKeyUserId", result.userId);
    await next();
}

// Schema for storing run results
const storeRunSchema = z.object({
    runId: z.string(),
    intent: z.string(),
    startUrl: z.string().url(),
    testRunId: z.string().uuid().optional().nullable(),
    personaData: z.any().optional(),
    status: z.enum(["running", "completed", "failed", "terminated"]),
    score: z.number().optional().nullable(),
    terminated: z.boolean().optional(),
    stepsToken: z.number().optional().nullable(),
    error: z.string().optional().nullable(),
    basicInfo: z.any().optional(),
    actionTrace: z.any().optional(),
    memoryTrace: z.any().optional(),
    observationTrace: z.any().optional(),
    logContent: z.string().optional().nullable(),
    startedAt: z.string().datetime().optional(),
    completedAt: z.string().datetime().optional(),
    screenshots: z.array(z.object({
        stepNumber: z.number(),
        filename: z.string().optional(),
        base64Data: z.string().optional(),
    })).optional(),
});

// POST /api/uxagent/runs - Store run results from UXAgent service
uxagentRoutes.post("/runs", apiKeyAuth, zValidator("json", storeRunSchema), async (c) => {
    const userId = c.get("apiKeyUserId");
    const data = c.req.valid("json");

    console.log(`[UXAgent Callback] Received run result: ${data.runId}, status: ${data.status}`);
    console.log(`[DEBUG] UXAgent Callback Logic v2 Loaded. data.testRunId=${data.testRunId}`);

    let finalTestRunId = data.testRunId; // Default to assuming it's a valid ID
    let batchTestRunId: string | null = null; // Store batch ID if we discover it

    // Check if the ID provided is actually a batch ID (by trying to find pending runs for it)
    // Or if it's a direct ID, verify it exists.
    if (data.testRunId) {
        // First check if it's a direct Test Run ID
        const [directRun] = await db.select().from(schema.testRuns).where(eq(schema.testRuns.id, data.testRunId)).limit(1);

        if (directRun) {
            // It's a valid direct ID
            finalTestRunId = directRun.id;
            batchTestRunId = directRun.batchTestRunId;

            // Update the status
            await db
                .update(schema.testRuns)
                .set({
                    status: data.status === "completed" ? "completed" : "failed",
                    completedAt: new Date(),
                    errorMessage: data.error,
                })
                .where(eq(schema.testRuns.id, directRun.id));

            console.log(`[UXAgent Callback] Updated direct test run: ${directRun.id}`);

        } else {
            // Not a direct ID, assume it might be a Batch ID
            // Find a pending test_run in this batch and claim it
            // We lock the row to avoid race conditions with other callbacks 
            const [claimedRun] = await db
                .select()
                .from(schema.testRuns)
                .where(and(
                    eq(schema.testRuns.batchTestRunId, data.testRunId),
                    eq(schema.testRuns.status, "pending")
                ))
                .limit(1);

            if (claimedRun) {
                console.log(`[UXAgent Callback] Found pending run ${claimedRun.id} for batch ${data.testRunId}`);
                finalTestRunId = claimedRun.id;
                batchTestRunId = data.testRunId; // The input WAS the batch ID

                // Update this test run with the result
                await db
                    .update(schema.testRuns)
                    .set({
                        status: data.status === "completed" ? "completed" : "failed",
                        completedAt: new Date(),
                        errorMessage: data.error,
                    })
                    .where(eq(schema.testRuns.id, claimedRun.id));
            } else {
                console.warn(`[UXAgent Callback] No pending run found for ID ${data.testRunId}. It might be invalid or already completed.`);
                // If we can't link it, we set testRunId to null to avoid FK error
                finalTestRunId = null;
                // We assume input might be batch ID for completion check
                batchTestRunId = data.testRunId;
            }
        }
    }

    // Insert the run record
    const [run] = await db
        .insert(schema.uxagentRuns)
        .values({
            userId,
            testRunId: finalTestRunId,
            runId: data.runId,
            intent: data.intent,
            startUrl: data.startUrl,
            personaData: data.personaData,
            status: data.status,
            score: data.score,
            terminated: data.terminated,
            stepsToken: data.stepsToken,
            errorMessage: data.error,
            basicInfo: data.basicInfo,
            actionTrace: data.actionTrace,
            memoryTrace: data.memoryTrace,
            observationTrace: data.observationTrace,
            logContent: data.logContent,
            startedAt: data.startedAt ? new Date(data.startedAt) : null,
            completedAt: data.completedAt ? new Date(data.completedAt) : new Date(),
        })
        .returning();

    // Upload screenshots to S3 if provided
    if (data.screenshots && data.screenshots.length > 0) {
        console.log(`[UXAgent Callback] Uploading ${data.screenshots.length} screenshots to S3...`);
        const screenshotPromises = data.screenshots.map(async (s) => {
            if (s.base64Data) {
                const key = generateScreenshotKey(run.id, s.stepNumber);
                const { s3Key, s3Url } = await uploadScreenshot(key, s.base64Data);
                return {
                    uxagentRunId: run.id,
                    stepNumber: s.stepNumber,
                    filename: s.filename,
                    s3Key,
                    s3Url,
                };
            }
            return {
                uxagentRunId: run.id,
                stepNumber: s.stepNumber,
                filename: s.filename,
                s3Key: null,
                s3Url: null,
            };
        });

        const screenshotRecords = await Promise.all(screenshotPromises);
        await db.insert(schema.uxagentScreenshots).values(screenshotRecords);
        console.log(`[UXAgent Callback] Uploaded ${screenshotRecords.length} screenshots`);
    }

    // Generate report if we have a valid test run
    if (finalTestRunId && data.status === "completed") {
        await db.insert(schema.reports).values({
            testRunId: finalTestRunId,
            score: data.score || 5,
            summary: data.logContent?.substring(0, 500) || "UXAgent test completed",
            fullReport: {
                uxagentRunId: run.id,
                actionTrace: data.actionTrace,
                memoryTrace: data.memoryTrace,
                intent: data.intent,
            } as any,
        });
    }

    // Check if batch is complete
    if (batchTestRunId) {
        // Check if all test runs in the batch are complete
        const remainingPending = await db
            .select({ count: schema.testRuns.id })
            .from(schema.testRuns)
            .where(and(
                eq(schema.testRuns.batchTestRunId, batchTestRunId),
                eq(schema.testRuns.status, "pending")
            ));

        if (remainingPending.length === 0) {
            console.log(`[UXAgent Callback] All runs complete for batch: ${batchTestRunId}`);

            // Update batch status to completed
            await db
                .update(schema.batchTestRuns)
                .set({
                    status: "completed",
                    completedAt: new Date(),
                })
                .where(eq(schema.batchTestRuns.id, batchTestRunId));
        }
    }

    return c.json({
        id: run.id,
        runId: run.runId,
        status: run.status,
        message: "Run stored successfully",
    });
});

// PATCH /api/uxagent/runs/:id - Update run status
uxagentRoutes.patch("/runs/:id", apiKeyAuth, async (c) => {
    const runId = c.req.param("id");
    const body = await c.req.json();

    const [run] = await db
        .update(schema.uxagentRuns)
        .set({
            status: body.status,
            score: body.score,
            terminated: body.terminated,
            completedAt: body.completedAt ? new Date(body.completedAt) : new Date(),
        })
        .where(eq(schema.uxagentRuns.id, runId))
        .returning();

    if (!run) {
        return c.json({ error: "Run not found" }, 404);
    }

    return c.json({ run });
});

// GET /api/uxagent/runs - List runs (requires user auth or API key)
uxagentRoutes.get("/runs", async (c) => {
    const apiKey = c.req.header("X-API-Key");
    let userId: string | undefined;

    if (apiKey) {
        const result = await validateApiKey(apiKey, "uxagent:read");
        if (!result.valid) {
            return c.json({ error: result.error }, 403);
        }
        userId = result.userId;
    } else {
        // Try to get user from session (if using regular auth)
        userId = c.get("user")?.id;
    }

    if (!userId) {
        return c.json({ error: "Authentication required" }, 401);
    }

    const runs = await db
        .select({
            id: schema.uxagentRuns.id,
            runId: schema.uxagentRuns.runId,
            intent: schema.uxagentRuns.intent,
            startUrl: schema.uxagentRuns.startUrl,
            status: schema.uxagentRuns.status,
            score: schema.uxagentRuns.score,
            terminated: schema.uxagentRuns.terminated,
            startedAt: schema.uxagentRuns.startedAt,
            completedAt: schema.uxagentRuns.completedAt,
            createdAt: schema.uxagentRuns.createdAt,
        })
        .from(schema.uxagentRuns)
        .where(eq(schema.uxagentRuns.userId, userId))
        .orderBy(desc(schema.uxagentRuns.createdAt))
        .limit(50);

    return c.json({ runs });
});

// GET /api/uxagent/runs/:id - Get full run details
uxagentRoutes.get("/runs/:id", async (c) => {
    const runId = c.req.param("id");
    const apiKey = c.req.header("X-API-Key");

    let userId: string | undefined;
    if (apiKey) {
        const result = await validateApiKey(apiKey, "uxagent:read");
        if (result.valid) userId = result.userId;
    } else {
        userId = c.get("user")?.id;
    }

    const [run] = await db
        .select()
        .from(schema.uxagentRuns)
        .where(eq(schema.uxagentRuns.id, runId));

    if (!run) {
        return c.json({ error: "Run not found" }, 404);
    }

    // Check ownership if we have a userId
    if (userId && run.userId !== userId) {
        return c.json({ error: "Access denied" }, 403);
    }

    // Get screenshots
    const screenshots = await db
        .select()
        .from(schema.uxagentScreenshots)
        .where(eq(schema.uxagentScreenshots.uxagentRunId, runId));

    return c.json({ run, screenshots });
});

// POST /api/uxagent/invoke - Trigger new UXAgent run
const invokeSchema = z.object({
    intent: z.string(),
    startUrl: z.string().url(),
    maxSteps: z.number().min(1).max(50).optional().default(10),
    personaData: z.any().optional(),
    testRunId: z.string().uuid().optional(),
});

uxagentRoutes.post("/invoke", apiKeyAuth, zValidator("json", invokeSchema), async (c) => {
    const userId = c.get("apiKeyUserId");
    const { intent, startUrl, maxSteps, personaData, testRunId } = c.req.valid("json");

    // Get UXAgent URL from env
    const uxagentUrl = process.env.UXAGENT_API_URL;
    const uxagentApiKey = process.env.UXAGENT_API_KEY;

    if (!uxagentUrl || !uxagentApiKey) {
        return c.json({ error: "UXAgent service not configured" }, 500);
    }

    try {
        // Call UXAgent service
        const response = await fetch(`${uxagentUrl}/run`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": uxagentApiKey,
                "X-Callback-URL": `${process.env.API_URL}/api/uxagent/runs`,
                "X-User-ID": userId || "",
                "X-Test-Run-ID": testRunId || "",
            },
            body: JSON.stringify({
                total_personas: 1,
                demographics: personaData?.demographics || "General user",
                general_intent: intent,
                start_url: startUrl,
                max_steps: maxSteps,
                questionnaire: [],
                headless: true,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            const status = response.status >= 400 && response.status < 600 ? response.status as 400 | 401 | 403 | 404 | 500 | 502 | 503 : 500;
            return c.json({ error: `UXAgent error: ${error}` }, status);
        }

        const result = await response.json();
        return c.json({
            message: "UXAgent run started",
            result,
        });
    } catch (error) {
        console.error("Failed to invoke UXAgent:", error);
        return c.json(
            { error: "Failed to connect to UXAgent service" },
            500
        );
    }
});

export { uxagentRoutes };
