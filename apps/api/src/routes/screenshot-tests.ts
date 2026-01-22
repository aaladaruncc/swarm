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

        // Reconstruct personas for rerun - handle both single persona and multiple personas cases
        let personasForRerun: any[] = [];
        let personaIndicesForRerun: number[] = [];

        // Check if we have multiple personas (from generatedPersonas)
        const hasMultiplePersonas = Array.isArray(existingTest.generatedPersonas) && existingTest.generatedPersonas.length > 0
            && Array.isArray(existingTest.selectedPersonaIndices) && existingTest.selectedPersonaIndices.length > 0;

        console.log(`[Rerun ${testId}] Persona data check:`, {
            hasMultiplePersonas,
            hasGeneratedPersonas: Array.isArray(existingTest.generatedPersonas) && existingTest.generatedPersonas.length > 0,
            hasSelectedIndices: Array.isArray(existingTest.selectedPersonaIndices) && existingTest.selectedPersonaIndices.length > 0,
            hasPersonaData: !!existingTest.personaData,
        });

        if (hasMultiplePersonas) {
            // Use the selected personas from the generated list
            const selectedIndices = existingTest.selectedPersonaIndices || [];
            personasForRerun = selectedIndices
                .map((idx: number) => existingTest.generatedPersonas![idx])
                .filter((persona: any) => persona != null);
            personaIndicesForRerun = selectedIndices;
            console.log(`[Rerun ${testId}] Using ${personasForRerun.length} selected personas from generated list`);
        } else if (existingTest.personaData) {
            // Single persona case
            personasForRerun = [existingTest.personaData];
            personaIndicesForRerun = [0];
            console.log(`[Rerun ${testId}] Using single persona from personaData`);
        } else if (Array.isArray(existingTest.generatedPersonas) && existingTest.generatedPersonas.length > 0) {
            // Fallback: if generatedPersonas exists but no selectedPersonaIndices, use all personas
            personasForRerun = existingTest.generatedPersonas;
            personaIndicesForRerun = existingTest.generatedPersonas.map((_, idx) => idx);
            console.log(`[Rerun ${testId}] Using all ${personasForRerun.length} generated personas (no selected indices found)`);
        }

        // Validate we have personas
        if (personasForRerun.length === 0) {
            console.error(`[Rerun ${testId}] No personas found. Test data:`, {
                personaData: existingTest.personaData,
                generatedPersonas: existingTest.generatedPersonas,
                selectedPersonaIndices: existingTest.selectedPersonaIndices,
            });
            return c.json({ 
                error: "No personas found for rerun. The original test may not have persona data saved." 
            }, 400);
        }

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
 * POST /screenshot-tests/:id/terminate
 * Terminate a running screenshot test analysis
 */
screenshotTestsRoutes.post("/:id/terminate", async (c) => {
    const user = c.get("user");
    const testId = c.req.param("id");

    try {
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

        // Only allow termination if test is still analyzing
        if (testRun.status !== "analyzing") {
            return c.json({ error: "Test is not running" }, 400);
        }

        // Update test status to terminated
        await db
            .update(schema.screenshotTestRuns)
            .set({
                status: "terminated",
                completedAt: new Date(),
            })
            .where(eq(schema.screenshotTestRuns.id, testId));

        console.log(`[${testId}] Screenshot test terminated by user ${user.id}`);

        // Get updated test run
        const [updatedTestRun] = await db
            .select()
            .from(schema.screenshotTestRuns)
            .where(eq(schema.screenshotTestRuns.id, testId));

        return c.json({
            message: "Screenshot test terminated successfully",
            screenshotTestRun: updatedTestRun,
        });
    } catch (error: any) {
        console.error("[Terminate Screenshot Test] Error:", error);
        return c.json(
            {
                error: "Failed to terminate screenshot test",
                details: error?.message || "Unknown error",
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
            ? `https://useswarm.co/share/screenshot/${shareToken}`
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
            ? `https://useswarm.co/share/screenshot/${shareToken}`
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
// AGGREGATED INSIGHTS
// ============================================================================

/**
 * POST /screenshot-tests/:id/insights/generate
 * Generate and store aggregated insights from persona analyses
 */
screenshotTestsRoutes.post("/:id/insights/generate", async (c) => {
    const user = c.get("user");
    const testId = c.req.param("id");

    try {
        // Verify test ownership
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

        if (testRun.status !== "completed") {
            return c.json({ error: "Test must be completed before generating insights" }, 400);
        }

        // Delete existing insights for this test
        await db
            .delete(schema.screenshotAggregatedInsights)
            .where(eq(schema.screenshotAggregatedInsights.screenshotTestRunId, testId));

        // Fetch all analysis results
        const analysisResults = await db
            .select()
            .from(schema.screenshotAnalysisResults)
            .where(eq(schema.screenshotAnalysisResults.screenshotTestRunId, testId));

        if (analysisResults.length === 0) {
            return c.json({ insights: [], message: "No analysis data available" });
        }

        // Helper function to clean markdown from text
        const cleanMarkdown = (text: string): string => {
            if (!text) return text;
            let cleaned = text;
            // Remove markdown blockquotes (lines starting with >)
            cleaned = cleaned.replace(/^>\s+/gm, '');
            // Remove HTML blockquote tags
            cleaned = cleaned.replace(/<blockquote[^>]*>/gi, '');
            cleaned = cleaned.replace(/<\/blockquote>/gi, '');
            // Remove markdown bold (**text** or __text__)
            cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
            cleaned = cleaned.replace(/__([^_]+)__/g, '$1');
            // Remove markdown italic (*text* or _text_)
            cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');
            cleaned = cleaned.replace(/_([^_]+)_/g, '$1');
            // Remove markdown code (`text`)
            cleaned = cleaned.replace(/`([^`]+)`/g, '$1');
            // Remove markdown links [text](url)
            cleaned = cleaned.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
            // Remove markdown strikethrough (~~text~~)
            cleaned = cleaned.replace(/~~([^~]+)~~/g, '$1');
            // Remove markdown headers (# ## ###)
            cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');
            // Remove markdown horizontal rules (--- or ***)
            cleaned = cleaned.replace(/^[-*]{3,}$/gm, '');
            // Remove leading/trailing quotes if the entire text is wrapped
            cleaned = cleaned.trim();
            if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || 
                (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
                cleaned = cleaned.slice(1, -1);
            }
            // Remove any remaining quote markers at the start/end
            cleaned = cleaned.replace(/^["']+/, '');
            cleaned = cleaned.replace(/["']+$/, '');
            return cleaned.trim();
        };

        // Helper function to normalize text for similarity comparison
        const normalizeText = (text: string): string => {
            return text
                .toLowerCase()
                .replace(/[^\w\s]/g, ' ') // Remove punctuation
                .replace(/\s+/g, ' ') // Normalize whitespace
                .trim();
        };

        // Helper function to calculate text similarity (simple word overlap)
        const calculateSimilarity = (text1: string, text2: string): number => {
            const words1 = new Set(normalizeText(text1).split(' ').filter(w => w.length > 2));
            const words2 = new Set(normalizeText(text2).split(' ').filter(w => w.length > 2));
            
            if (words1.size === 0 || words2.size === 0) return 0;
            
            const intersection = new Set([...words1].filter(w => words2.has(w)));
            const union = new Set([...words1, ...words2]);
            
            return intersection.size / union.size; // Jaccard similarity
        };

        // Extract all raw insights first
        interface RawInsight {
            category: string;
            severity: string | null;
            description: string;
            recommendation: string | null;
            personaName: string;
            personaIndex: number;
            screenshotOrder: number;
        }

        const rawInsights: RawInsight[] = [];

        for (const analysis of analysisResults) {
            const personaName = analysis.personaName || `Persona ${analysis.personaIndex}`;

            // Extract issues
            if (analysis.issues && Array.isArray(analysis.issues)) {
                for (const issue of analysis.issues) {
                    rawInsights.push({
                        category: "issues",
                        severity: issue.severity,
                        description: cleanMarkdown(issue.description),
                        recommendation: issue.recommendation ? cleanMarkdown(issue.recommendation) : null,
                        personaName,
                        personaIndex: analysis.personaIndex,
                        screenshotOrder: analysis.screenshotOrder,
                    });
                }
            }

            // Extract positive aspects
            if (analysis.positiveAspects && Array.isArray(analysis.positiveAspects)) {
                for (const positive of analysis.positiveAspects) {
                    rawInsights.push({
                        category: "positives",
                        severity: null,
                        description: cleanMarkdown(positive),
                        recommendation: null,
                        personaName,
                        personaIndex: analysis.personaIndex,
                        screenshotOrder: analysis.screenshotOrder,
                    });
                }
            }

            // Extract accessibility notes
            if (analysis.accessibilityNotes && Array.isArray(analysis.accessibilityNotes)) {
                for (const note of analysis.accessibilityNotes) {
                    rawInsights.push({
                        category: "accessibility",
                        severity: null,
                        description: cleanMarkdown(note),
                        recommendation: null,
                        personaName,
                        personaIndex: analysis.personaIndex,
                        screenshotOrder: analysis.screenshotOrder,
                    });
                }
            }

            // Extract observations
            if (analysis.observations && Array.isArray(analysis.observations)) {
                for (const observation of analysis.observations) {
                    rawInsights.push({
                        category: "observations",
                        severity: null,
                        description: cleanMarkdown(observation),
                        recommendation: null,
                        personaName,
                        personaIndex: analysis.personaIndex,
                        screenshotOrder: analysis.screenshotOrder,
                    });
                }
            }
        }

        // Group similar insights by category and severity
        const groupedInsights = new Map<string, {
            canonical: RawInsight;
            evidence: Array<{ personaName: string; personaIndex: number; screenshotOrder: number }>;
            allDescriptions: string[];
        }>();

        const SIMILARITY_THRESHOLD = 0.4; // 40% word overlap to consider similar

        for (const insight of rawInsights) {
            const key = `${insight.category}:${insight.severity || 'none'}`;
            let foundGroup = false;

            // Try to find a similar existing group
            for (const [groupKey, group] of groupedInsights.entries()) {
                if (groupKey.startsWith(key)) {
                    const similarity = calculateSimilarity(
                        group.canonical.description,
                        insight.description
                    );

                    if (similarity >= SIMILARITY_THRESHOLD) {
                        // Add to existing group
                        group.evidence.push({
                            personaName: insight.personaName,
                            personaIndex: insight.personaIndex,
                            screenshotOrder: insight.screenshotOrder,
                        });
                        group.allDescriptions.push(insight.description);
                        // Use the longest/most detailed description as canonical
                        if (insight.description.length > group.canonical.description.length) {
                            group.canonical.description = insight.description;
                            if (insight.recommendation) {
                                group.canonical.recommendation = insight.recommendation;
                            }
                        }
                        foundGroup = true;
                        break;
                    }
                }
            }

            // Create new group if no similar one found
            if (!foundGroup) {
                const groupId = `${key}:${insight.description.substring(0, 50)}`;
                groupedInsights.set(groupId, {
                    canonical: { ...insight },
                    evidence: [{
                        personaName: insight.personaName,
                        personaIndex: insight.personaIndex,
                        screenshotOrder: insight.screenshotOrder,
                    }],
                    allDescriptions: [insight.description],
                });
            }
        }

        // Convert grouped insights to insert format
        const insightsToInsert: Array<{
            screenshotTestRunId: string;
            category: string;
            severity: string | null;
            title: string;
            description: string;
            recommendation: string | null;
            personaName: string;
            personaIndex: number;
            screenshotOrder: number;
            evidence: Array<{ personaName: string; personaIndex: number; screenshotOrder: number }> | null;
        }> = [];

        for (const group of groupedInsights.values()) {
            const evidence = group.evidence.length > 1 ? group.evidence : null;
            const uniquePersonas = new Set(group.evidence.map(e => e.personaName));
            const uniqueScreens = new Set(group.evidence.map(e => e.screenshotOrder));

            // Use the first evidence source for personaName/personaIndex/screenshotOrder (for backward compatibility)
            // But store all evidence in the evidence field
            insightsToInsert.push({
                screenshotTestRunId: testId,
                category: group.canonical.category,
                severity: group.canonical.severity,
                title: group.canonical.description.substring(0, 100),
                description: group.canonical.description,
                recommendation: group.canonical.recommendation,
                personaName: group.canonical.personaName,
                personaIndex: group.canonical.personaIndex,
                screenshotOrder: group.canonical.screenshotOrder,
                evidence: evidence,
            });
        }

        // Insert all insights
        let insertedInsights: any[] = [];
        if (insightsToInsert.length > 0) {
            insertedInsights = await db
                .insert(schema.screenshotAggregatedInsights)
                .values(insightsToInsert)
                .returning();
        }

        console.log(`[${testId}] Generated ${insertedInsights.length} aggregated insights`);

        return c.json({
            insights: insertedInsights,
            message: `Generated ${insertedInsights.length} insights`,
        });
    } catch (error: any) {
        console.error("[Insights Generate] Error:", error);
        return c.json(
            {
                error: "insights_generation_failed",
                message: error?.message || "Failed to generate insights",
            },
            500
        );
    }
});

/**
 * GET /screenshot-tests/:id/insights
 * Get stored aggregated insights for a screenshot test
 */
screenshotTestsRoutes.get("/:id/insights", async (c) => {
    const user = c.get("user");
    const testId = c.req.param("id");

    try {
        // Verify test ownership
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

        // Fetch insights
        const insights = await db
            .select()
            .from(schema.screenshotAggregatedInsights)
            .where(eq(schema.screenshotAggregatedInsights.screenshotTestRunId, testId))
            .orderBy(schema.screenshotAggregatedInsights.createdAt);

        return c.json({ insights });
    } catch (error: any) {
        console.error("[Insights Fetch] Error:", error);
        return c.json(
            {
                error: "insights_fetch_failed",
                message: error?.message || "Failed to fetch insights",
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

        // Helper function to check if test was terminated
        const checkTerminated = async (): Promise<boolean> => {
            const [testRun] = await db
                .select()
                .from(schema.screenshotTestRuns)
                .where(eq(schema.screenshotTestRuns.id, testRunId));
            return testRun?.status === "terminated";
        };

        const personaResults = await Promise.all(
            personasData.map(async (personaData, index) => {
                // Check if terminated before starting
                if (await checkTerminated()) {
                    console.log(`[${testRunId}] Test terminated, skipping persona ${index}`);
                    return null;
                }

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

                // Check again before analysis
                if (await checkTerminated()) {
                    console.log(`[${testRunId}] Test terminated during persona setup`);
                    return null;
                }

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
                        userObservation: analysis.userObservation,
                        missionContext: analysis.missionContext,
                        expectedOutcome: analysis.expectedOutcome,
                    }))
                );

                // Check if terminated after analysis
                if (await checkTerminated()) {
                    console.log(`[${testRunId}] Test terminated after analysis for ${persona.name}`);
                    return null;
                }

                console.log(`[${testRunId}] Analysis complete for ${persona.name}. Score: ${result.overallScore}`);

                return {
                    personaIndex,
                    personaName: persona.name,
                    result,
                };
            })
        );

        // Filter out null results (terminated personas)
        const validPersonaResults = personaResults.filter((r): r is NonNullable<typeof r> => r !== null);

        // If all personas were terminated, update status and return
        if (validPersonaResults.length === 0) {
            console.log(`[${testRunId}] All personas terminated, marking test as terminated`);
            await db
                .update(schema.screenshotTestRuns)
                .set({
                    status: "terminated",
                    completedAt: new Date(),
                })
                .where(eq(schema.screenshotTestRuns.id, testRunId));
            return;
        }

        const averageScore = Math.round(
            validPersonaResults.reduce((sum, entry) => sum + entry.result.overallScore, 0) / Math.max(validPersonaResults.length, 1)
        );
        const overallSummary = `Analyzed ${screenshots.length} screenshots across ${validPersonaResults.length} persona${validPersonaResults.length !== 1 ? "s" : ""}. Overall experience: ${averageScore >= 70 ? "positive" : averageScore >= 50 ? "mixed" : "needs improvement"}.`;

        // Check if terminated before final update
        if (await checkTerminated()) {
            console.log(`[${testRunId}] Test terminated before final update`);
            return;
        }

        // Update test run with overall results
        await db
            .update(schema.screenshotTestRuns)
            .set({
                status: "completed",
                overallScore: averageScore,
                summary: overallSummary,
                fullReport: {
                    personaResults: validPersonaResults.map((entry) => ({
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
