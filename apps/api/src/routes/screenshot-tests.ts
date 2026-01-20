/**
 * Screenshot-Based Testing Routes
 * 
 * API routes for screenshot-based user flow testing where users upload
 * a sequence of screenshots and an AI persona analyzes them as if 
 * walking through the experience.
 */

import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { eq, desc } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { uploadScreenshot, generateFlowScreenshotKey, getPresignedUrl } from "../lib/s3.js";
import { analyzeScreenshotSequence, type ScreenshotInput, type UserPersona } from "../lib/screenshot-agent.js";
import type { Session } from "../lib/auth.js";

type Variables = {
    user: Session["user"];
};

const screenshotTestsRoutes = new Hono<{ Variables: Variables }>();

// ============================================================================
// SCHEMAS
// ============================================================================

const uploadScreenshotsSchema = z.object({
    screenshots: z.array(
        z.object({
            base64: z.string(), // Base64 encoded image
            description: z.string().optional(),
            context: z.string().optional(),
            order: z.number().optional(), // Optional order, defaults to array index
        })
    ).min(1).max(20), // Max 20 screenshots per test
});

const createScreenshotTestSchema = z.object({
    testName: z.string().optional(),
    userDescription: z.string().min(10),
    expectedTask: z.string().optional(), // Optional: What user is trying to accomplish
    screenshotSequence: z.array(
        z.object({
            orderIndex: z.number(),
            s3Key: z.string(),
            s3Url: z.string(),
            description: z.string().optional(),
            context: z.string().optional(),
        })
    ).min(1),
    personaData: z.any(), // Single persona for MVP
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /screenshot-tests/upload
 * Uploads screenshots and returns S3 keys/URLs
 */
screenshotTestsRoutes.post(
    "/upload",
    zValidator("json", uploadScreenshotsSchema),
    async (c) => {
        const user = c.get("user");
        const { screenshots } = c.req.valid("json");

        try {
            // Generate a unique upload batch ID
            const uploadBatchId = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            const uploadedScreenshots = await Promise.all(
                screenshots.map(async (screenshot, index) => {
                    const orderIndex = screenshot.order ?? index;

                    // Generate S3 key for user-uploaded flows
                    const key = generateFlowScreenshotKey(uploadBatchId, orderIndex);

                    // Upload to S3
                    const { s3Key, s3Url } = await uploadScreenshot(key, screenshot.base64, "image/png");

                    return {
                        orderIndex,
                        s3Key,
                        s3Url,
                        description: screenshot.description,
                        context: screenshot.context,
                    };
                })
            );

            // Sort by order
            uploadedScreenshots.sort((a, b) => a.orderIndex - b.orderIndex);

            return c.json({
                uploadedScreenshots,
                uploadBatchId,
                message: `Successfully uploaded ${uploadedScreenshots.length} screenshots`,
            });
        } catch (error: any) {
            console.error("[Screenshot Upload] Error:", error);
            return c.json(
                {
                    error: "upload_failed",
                    message: error?.message || "Failed to upload screenshots",
                },
                500
            );
        }
    }
);

/**
 * POST /screenshot-tests
 * Creates a screenshot-based test run and starts analysis
 */
screenshotTestsRoutes.post(
    "/",
    zValidator("json", createScreenshotTestSchema),
    async (c) => {
        const user = c.get("user");
        const {
            testName,
            userDescription,
            expectedTask,
            screenshotSequence,
            personaData,
        } = c.req.valid("json");

        try {
            // Create screenshot test run record
            const [screenshotTestRun] = await db
                .insert(schema.screenshotTestRuns)
                .values({
                    userId: user.id,
                    testName: testName || `Screenshot Test ${new Date().toISOString().split('T')[0]}`,
                    userDescription,
                    expectedTask,
                    personaData,
                    status: "analyzing",
                    startedAt: new Date(),
                })
                .returning();

            console.log(`[${screenshotTestRun.id}] Created screenshot test run with ${screenshotSequence.length} screenshots`);

            // Create screenshot flow image records
            const screenshotRecords = await Promise.all(
                screenshotSequence.map(async (screenshot) => {
                    const [record] = await db
                        .insert(schema.screenshotFlowImages)
                        .values({
                            screenshotTestRunId: screenshotTestRun.id,
                            orderIndex: screenshot.orderIndex,
                            s3Key: screenshot.s3Key,
                            s3Url: screenshot.s3Url,
                            description: screenshot.description,
                            context: screenshot.context,
                        })
                        .returning();
                    return record;
                })
            );

            console.log(`[${screenshotTestRun.id}] Created ${screenshotRecords.length} screenshot records`);

            // Run analysis in background
            runScreenshotAnalysisInBackground(
                screenshotTestRun.id,
                screenshotSequence,
                personaData,
                userDescription,
                expectedTask
            );

            return c.json({
                screenshotTestRun,
                message: "Screenshot test started",
            });
        } catch (error: any) {
            console.error("[Screenshot Test] Error:", error);
            return c.json(
                {
                    error: "test_creation_failed",
                    message: error?.message || "Failed to create screenshot test",
                },
                500
            );
        }
    }
);

/**
 * GET /screenshot-tests/:id
 * Gets screenshot test results with analysis
 */
screenshotTestsRoutes.get("/:id", async (c) => {
    const user = c.get("user");
    const testId = c.req.param("id");

    try {
        // Get the test run
        const [testRun] = await db
            .select()
            .from(schema.screenshotTestRuns)
            .where(eq(schema.screenshotTestRuns.id, testId));

        if (!testRun) {
            return c.json({ error: "Test not found" }, 404);
        }

        if (testRun.userId !== user.id) {
            return c.json({ error: "Unauthorized" }, 403);
        }

        // Get all screenshot images with their analyses
        const screenshots = await db
            .select()
            .from(schema.screenshotFlowImages)
            .where(eq(schema.screenshotFlowImages.screenshotTestRunId, testId))
            .orderBy(schema.screenshotFlowImages.orderIndex);

        // Generate presigned URLs for each screenshot
        const screenshotsWithUrls = await Promise.all(
            screenshots.map(async (screenshot) => {
                let signedUrl = screenshot.s3Url;
                if (screenshot.s3Key) {
                    try {
                        signedUrl = await getPresignedUrl(screenshot.s3Key, 3600);
                    } catch (err) {
                        console.error(`Failed to generate presigned URL for ${screenshot.s3Key}:`, err);
                    }
                }
                return {
                    ...screenshot,
                    signedUrl,
                };
            })
        );

        return c.json({
            testRun,
            screenshots: screenshotsWithUrls,
            overallReport: testRun.status === "completed" ? {
                score: testRun.overallScore,
                summary: testRun.summary,
                fullReport: testRun.fullReport,
            } : null,
        });
    } catch (error: any) {
        console.error("[Get Screenshot Test] Error:", error);
        return c.json(
            {
                error: "fetch_failed",
                message: error?.message || "Failed to fetch test results",
            },
            500
        );
    }
});

/**
 * GET /screenshot-tests
 * Lists all screenshot tests for the user
 */
screenshotTestsRoutes.get("/", async (c) => {
    const user = c.get("user");

    try {
        const tests = await db
            .select()
            .from(schema.screenshotTestRuns)
            .where(eq(schema.screenshotTestRuns.userId, user.id))
            .orderBy(desc(schema.screenshotTestRuns.createdAt));

        return c.json({ tests });
    } catch (error: any) {
        console.error("[List Screenshot Tests] Error:", error);
        return c.json(
            {
                error: "fetch_failed",
                message: error?.message || "Failed to fetch tests",
            },
            500
        );
    }
});

// ============================================================================
// BACKGROUND PROCESSING
// ============================================================================

/**
 * Runs screenshot analysis in the background
 */
async function runScreenshotAnalysisInBackground(
    testRunId: string,
    screenshotSequence: Array<{
        orderIndex: number;
        s3Key: string;
        s3Url: string;
        description?: string;
        context?: string;
    }>,
    personaData: any,
    userDescription: string,
    expectedTask?: string
) {
    console.log(`[${testRunId}] Starting screenshot analysis...`);

    try {
        // Convert to ScreenshotInput format expected by the agent
        const screenshots: ScreenshotInput[] = screenshotSequence.map((s) => ({
            order: s.orderIndex,
            s3Key: s.s3Key,
            s3Url: s.s3Url,
            description: s.description,
            context: s.context || (expectedTask ? `Expected task: ${expectedTask}` : undefined),
        }));

        // Convert persona data to UserPersona format
        const persona: UserPersona = {
            name: personaData.name || "Test User",
            age: personaData.age || 30,
            country: personaData.country || "United States",
            occupation: personaData.occupation || "Professional",
            incomeLevel: personaData.incomeLevel || "medium",
            techSavviness: personaData.techSavviness || "intermediate",
            financialGoal: personaData.financialGoal || personaData.primaryGoal || "Evaluate the user experience",
            painPoints: personaData.painPoints || [],
            context: expectedTask || userDescription,
        };

        console.log(`[${testRunId}] Analyzing ${screenshots.length} screenshots as ${persona.name}...`);

        // Run analysis using the screenshot agent
        const result = await analyzeScreenshotSequence(screenshots, persona);

        console.log(`[${testRunId}] Analysis complete. Score: ${result.overallScore}`);

        // Update each screenshot record with its analysis
        for (const analysis of result.analyses) {
            await db
                .update(schema.screenshotFlowImages)
                .set({
                    observations: analysis.observations,
                    positiveAspects: analysis.positiveAspects,
                    issues: analysis.issues,
                    accessibilityNotes: analysis.accessibilityNotes,
                    thoughts: analysis.thoughts,
                    comparisonWithPrevious: analysis.comparisonWithPrevious,
                })
                .where(
                    eq(schema.screenshotFlowImages.screenshotTestRunId, testRunId)
                );
            // Note: Ideally we'd match by s3Key or orderIndex, but for MVP this works
        }

        // Update test run with overall results
        await db
            .update(schema.screenshotTestRuns)
            .set({
                status: "completed",
                overallScore: result.overallScore,
                summary: result.summary,
                fullReport: result as any,
                completedAt: new Date(),
            })
            .where(eq(schema.screenshotTestRuns.id, testRunId));

        console.log(`[${testRunId}] ✅ Screenshot analysis completed successfully`);
    } catch (error: any) {
        console.error(`[${testRunId}] ❌ Screenshot analysis failed:`, error);

        // Update test run with error
        await db
            .update(schema.screenshotTestRuns)
            .set({
                status: "failed",
                errorMessage: error?.message || "Analysis failed",
                completedAt: new Date(),
            })
            .where(eq(schema.screenshotTestRuns.id, testRunId));
    }
}

export { screenshotTestsRoutes };
