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
import { eq, desc, and } from "drizzle-orm";
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
    personaData: z.any().optional(), // Single persona fallback
    generatedPersonas: z.array(z.any()).optional(),
    selectedPersonaIndices: z.array(z.number()).min(1).max(5).optional(),
    agentCount: z.number().min(1).max(5).optional(),
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
            generatedPersonas,
            selectedPersonaIndices,
            agentCount,
        } = c.req.valid("json");

        try {
            const hasMultiplePersonas = Array.isArray(generatedPersonas) && generatedPersonas.length > 0
                && Array.isArray(selectedPersonaIndices) && selectedPersonaIndices.length > 0;
            if (!hasMultiplePersonas && !personaData) {
                return c.json(
                    { error: "Missing persona data" },
                    400
                );
            }

            const selectedPersonaEntries = hasMultiplePersonas
                ? selectedPersonaIndices
                    .map((idx) => ({ idx, persona: generatedPersonas[idx] }))
                    .filter((entry) => Boolean(entry.persona))
                : [];
            const finalPersonas = hasMultiplePersonas
                ? selectedPersonaEntries.map((entry) => entry.persona)
                : [personaData];
            const finalPersonaIndices = hasMultiplePersonas
                ? selectedPersonaEntries.map((entry) => entry.idx)
                : [0];
            if (finalPersonas.length === 0) {
                return c.json({ error: "No valid personas selected" }, 400);
            }

            // Create screenshot test run record
            const [screenshotTestRun] = await db
                .insert(schema.screenshotTestRuns)
                .values({
                    userId: user.id,
                    testName: testName || `Screenshot Test ${new Date().toISOString().split('T')[0]}`,
                    userDescription,
                    expectedTask,
                    personaData: hasMultiplePersonas ? null : personaData,
                    generatedPersonas: hasMultiplePersonas ? generatedPersonas : personaData ? [personaData] : null,
                    selectedPersonaIndices: hasMultiplePersonas ? finalPersonaIndices : personaData ? [0] : null,
                    agentCount: hasMultiplePersonas ? (agentCount || finalPersonaIndices.length || 1) : 1,
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
                finalPersonas,
                finalPersonaIndices,
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
 * POST /screenshot-tests/:id/rerun
 * Re-runs analysis with the same screenshots/persona, creating a new test run
 */
screenshotTestsRoutes.post("/:id/rerun", async (c) => {
    const user = c.get("user");
    const testId = c.req.param("id");

    try {
        const [existingTest] = await db
            .select()
            .from(schema.screenshotTestRuns)
            .where(eq(schema.screenshotTestRuns.id, testId));

        if (!existingTest) {
            return c.json({ error: "Test not found" }, 404);
        }

        if (existingTest.userId !== user.id) {
            return c.json({ error: "Unauthorized" }, 403);
        }

        const existingScreenshots = await db
            .select()
            .from(schema.screenshotFlowImages)
            .where(eq(schema.screenshotFlowImages.screenshotTestRunId, testId))
            .orderBy(schema.screenshotFlowImages.orderIndex);

        if (existingScreenshots.length === 0) {
            return c.json({ error: "No screenshots found for this test" }, 400);
        }

        const [newTestRun] = await db
            .insert(schema.screenshotTestRuns)
            .values({
                userId: user.id,
                testName: existingTest.testName
                    ? `${existingTest.testName} (Rerun)`
                    : `Screenshot Test ${new Date().toISOString().split("T")[0]} (Rerun)`,
                userDescription: existingTest.userDescription,
                expectedTask: existingTest.expectedTask,
                personaData: existingTest.personaData,
                status: "analyzing",
                startedAt: new Date(),
            })
            .returning();

        const screenshotSequence = await Promise.all(
            existingScreenshots.map(async (screenshot) => {
                const [record] = await db
                    .insert(schema.screenshotFlowImages)
                    .values({
                        screenshotTestRunId: newTestRun.id,
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

        const personasForRerun = Array.isArray(existingTest.generatedPersonas) && existingTest.generatedPersonas.length > 0
            ? existingTest.generatedPersonas
            : existingTest.personaData
                ? [existingTest.personaData]
                : [];
        const personaIndicesForRerun = Array.isArray(existingTest.selectedPersonaIndices) && existingTest.selectedPersonaIndices.length > 0
            ? existingTest.selectedPersonaIndices
            : personasForRerun.length > 0
                ? [0]
                : [];

        runScreenshotAnalysisInBackground(
            newTestRun.id,
            screenshotSequence.map((s) => ({
                orderIndex: s.orderIndex,
                s3Key: s.s3Key,
                s3Url: s.s3Url,
                description: s.description || undefined,
                context: s.context || undefined,
            })),
            personasForRerun,
            personaIndicesForRerun,
            existingTest.userDescription || "",
            existingTest.expectedTask || undefined
        );

        return c.json({
            screenshotTestRun: newTestRun,
            message: "Screenshot test rerun started",
        });
    } catch (error: any) {
        console.error("[Rerun Screenshot Test] Error:", error);
        return c.json(
            {
                error: "rerun_failed",
                message: error?.message || "Failed to rerun screenshot test",
            },
            500
        );
    }
});

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

        const analysisRows = await db
            .select()
            .from(schema.screenshotAnalysisResults)
            .where(eq(schema.screenshotAnalysisResults.screenshotTestRunId, testId))
            .orderBy(schema.screenshotAnalysisResults.screenshotOrder);

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
            personaResults: analysisRows.length > 0
                ? Array.from(
                    analysisRows.reduce((map, row) => {
                        const key = row.personaIndex;
                        if (!map.has(key)) {
                            map.set(key, {
                                personaIndex: row.personaIndex,
                                personaName: row.personaName || `Persona ${row.personaIndex + 1}`,
                                analyses: [],
                            });
                        }
                        map.get(key)!.analyses.push(row);
                        return map;
                    }, new Map<number, { personaIndex: number; personaName: string; analyses: Array<typeof analysisRows[number]> }>()).values()
                )
                : [],
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

/**
 * POST /screenshot-tests/:id/share
 * Enable/disable sharing and get share URL
 */
screenshotTestsRoutes.post("/:id/share", async (c) => {
    const user = c.get("user");
    const testId = c.req.param("id");

    try {
        const body = await c.req.json().catch(() => ({}));
        const enableShare = body.enabled !== false; // Default to enabling

        // Verify ownership
        const [testRun] = await db
            .select()
            .from(schema.screenshotTestRuns)
            .where(eq(schema.screenshotTestRuns.id, testId));

        if (!testRun || testRun.userId !== user.id) {
            return c.json({ error: "Test not found" }, 404);
        }

        let shareToken = (testRun as any).shareToken;

        // Generate a new token if enabling and none exists
        if (enableShare && !shareToken) {
            const crypto = await import("crypto");
            shareToken = crypto.randomBytes(16).toString("base64url");
        }

        // Update share settings
        await db
            .update(schema.screenshotTestRuns)
            .set({
                shareToken,
                shareEnabled: enableShare,
            } as any)
            .where(eq(schema.screenshotTestRuns.id, testId));

        const shareUrl = enableShare && shareToken
            ? `${process.env.NEXT_PUBLIC_WEB_URL || 'https://useswarm.co'}/share/screenshot/${shareToken}`
            : null;

        return c.json({
            enabled: enableShare,
            shareToken: enableShare ? shareToken : null,
            shareUrl,
            message: enableShare ? "Sharing enabled" : "Sharing disabled",
        });
    } catch (error: any) {
        console.error("[Share Screenshot Test] Error:", error);
        return c.json(
            {
                error: "share_update_failed",
                message: error?.message || "Failed to update share settings",
            },
            500
        );
    }
});

/**
 * GET /screenshot-tests/:id/share
 * Get current share status
 */
screenshotTestsRoutes.get("/:id/share", async (c) => {
    const user = c.get("user");
    const testId = c.req.param("id");

    try {
        const [testRun] = await db
            .select()
            .from(schema.screenshotTestRuns)
            .where(eq(schema.screenshotTestRuns.id, testId));

        if (!testRun || testRun.userId !== user.id) {
            return c.json({ error: "Test not found" }, 404);
        }

        const shareEnabled = (testRun as any).shareEnabled || false;
        const shareToken = (testRun as any).shareToken;
        const shareUrl = shareEnabled && shareToken
            ? `${process.env.NEXT_PUBLIC_WEB_URL || 'https://useswarm.co'}/share/screenshot/${shareToken}`
            : null;

        return c.json({
            enabled: shareEnabled,
            shareToken: shareEnabled ? shareToken : null,
            shareUrl,
        });
    } catch (error: any) {
        console.error("[Get Share Status] Error:", error);
        return c.json(
            {
                error: "share_fetch_failed",
                message: error?.message || "Failed to get share status",
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
    personasData: any[],
    personaIndices: number[],
    userDescription: string,
    expectedTask?: string
) {
    console.log(`[${testRunId}] Starting screenshot analysis...`);

    try {
        if (!personasData || personasData.length === 0) {
            throw new Error("No personas provided for screenshot analysis");
        }
        // Convert to ScreenshotInput format expected by the agent
        const screenshots: ScreenshotInput[] = await Promise.all(
            screenshotSequence.map(async (s) => {
                let signedUrl = s.s3Url;
                if (s.s3Key) {
                    try {
                        signedUrl = await getPresignedUrl(s.s3Key, 3600);
                    } catch (err) {
                        console.error(`Failed to generate presigned URL for ${s.s3Key}:`, err);
                    }
                }

                return {
                    order: s.orderIndex,
                    s3Key: s.s3Key,
                    s3Url: signedUrl,
                    description: s.description,
                    context: s.context || (expectedTask ? `Expected task: ${expectedTask}` : undefined),
                };
            })
        );

        const personaResults = await Promise.all(
            personasData.map(async (personaData, index) => {
                const personaIndex = personaIndices[index] ?? index;
                const persona: UserPersona = {
                    name: personaData?.name || "Test User",
                    age: personaData?.age || 30,
                    country: personaData?.country || "United States",
                    occupation: personaData?.occupation || "Professional",
                    incomeLevel: personaData?.incomeLevel || "medium",
                    techSavviness: personaData?.techSavviness || "intermediate",
                    financialGoal: personaData?.financialGoal || personaData?.primaryGoal || "Evaluate the user experience",
                    painPoints: personaData?.painPoints || [],
                    context: expectedTask || userDescription,
                };

                console.log(`[${testRunId}] Analyzing ${screenshots.length} screenshots as ${persona.name}...`);

                const result = await analyzeScreenshotSequence(screenshots, persona);

                await db.insert(schema.screenshotAnalysisResults).values(
                    result.analyses.map((analysis) => ({
                        screenshotTestRunId: testRunId,
                        screenshotOrder: analysis.screenshotOrder,
                        s3Key: analysis.s3Key,
                        s3Url: analysis.s3Url,
                        personaIndex,
                        personaName: analysis.personaName,
                        observations: analysis.observations,
                        positiveAspects: analysis.positiveAspects,
                        issues: analysis.issues,
                        accessibilityNotes: analysis.accessibilityNotes,
                        thoughts: analysis.thoughts,
                        comparisonWithPrevious: analysis.comparisonWithPrevious,
                    }))
                );

                console.log(`[${testRunId}] Analysis complete for ${persona.name}. Score: ${result.overallScore}`);

                return {
                    personaIndex,
                    personaName: persona.name,
                    result,
                };
            })
        );

        const averageScore = Math.round(
            personaResults.reduce((sum, entry) => sum + entry.result.overallScore, 0) / Math.max(personaResults.length, 1)
        );
        const overallSummary = `Analyzed ${screenshots.length} screenshots across ${personaResults.length} persona${personaResults.length !== 1 ? "s" : ""}. Overall experience: ${averageScore >= 70 ? "positive" : averageScore >= 50 ? "mixed" : "needs improvement"}.`;

        // Update test run with overall results
        await db
            .update(schema.screenshotTestRuns)
            .set({
                status: "completed",
                overallScore: averageScore,
                summary: overallSummary,
                fullReport: {
                    personaResults: personaResults.map((entry) => ({
                        personaIndex: entry.personaIndex,
                        personaName: entry.personaName,
                        ...entry.result,
                    })),
                } as any,
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
