/**
 * Public Share Routes
 * 
 * These routes allow public access to shared reports without authentication.
 * Reports can be shared via a unique token.
 */

import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { getPresignedUrl } from "../lib/s3.js";
import crypto from "crypto";

const publicShareRoutes = new Hono();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generates a secure, URL-safe share token
 */
function generateShareToken(): string {
    return crypto.randomBytes(16).toString("base64url");
}

// ============================================================================
// BATCH TEST SHARE ROUTES
// ============================================================================

/**
 * GET /share/batch/:token
 * Public endpoint to view a shared batch test report
 */
publicShareRoutes.get("/batch/:token", async (c) => {
    const token = c.req.param("token");

    try {
        // Find the batch test by share token
        const [batchTestRun] = await db
            .select()
            .from(schema.batchTestRuns)
            .where(eq((schema.batchTestRuns as any).shareToken, token));

        if (!batchTestRun) {
            return c.json({ error: "Report not found" }, 404);
        }

        if (!(batchTestRun as any).shareEnabled) {
            return c.json({ error: "This report is no longer shared" }, 403);
        }

        // Get test runs for this batch
        const testRuns = await db
            .select()
            .from(schema.testRuns)
            .where(eq(schema.testRuns.batchTestRunId, batchTestRun.id));

        // Get reports for each test run
        const reports = await Promise.all(
            testRuns.map(async (tr) => {
                const [report] = await db
                    .select()
                    .from(schema.reports)
                    .where(eq(schema.reports.testRunId, tr.id));
                return { ...tr, report };
            })
        );

        // Get aggregated report
        let aggregatedReport = null;
        if (batchTestRun.status === "completed") {
            const [aggReport] = await db
                .select()
                .from(schema.aggregatedReports)
                .where(eq(schema.aggregatedReports.batchTestRunId, batchTestRun.id));
            aggregatedReport = aggReport;
        }

        // Get UXAgent runs if applicable
        let uxagentRuns: any[] = [];
        if (batchTestRun.useUXAgent) {
            const testRunIds = testRuns.map((tr) => tr.id);
            if (testRunIds.length > 0) {
                const allUxagentRuns = await db.select().from(schema.uxagentRuns);
                uxagentRuns = allUxagentRuns.filter((ur) =>
                    testRunIds.includes(ur.testRunId!)
                );

                // Get screenshots for each UXAgent run
                for (const run of uxagentRuns) {
                    const screenshots = await db
                        .select()
                        .from(schema.uxagentScreenshots)
                        .where(eq(schema.uxagentScreenshots.uxagentRunId, run.id));

                    run.screenshots = await Promise.all(
                        screenshots.map(async (s) => {
                            let signedUrl = s.s3Url;
                            if (s.s3Key) {
                                try {
                                    signedUrl = await getPresignedUrl(s.s3Key, 3600);
                                } catch (err) {
                                    console.error(`Failed to generate presigned URL:`, err);
                                }
                            }
                            return { ...s, signedUrl };
                        })
                    );
                }
            }
        }

        return c.json({
            batchTestRun: {
                id: batchTestRun.id,
                targetUrl: batchTestRun.targetUrl,
                userDescription: batchTestRun.userDescription,
                status: batchTestRun.status,
                createdAt: batchTestRun.createdAt,
                completedAt: batchTestRun.completedAt,
                // Exclude sensitive user info
            },
            testRuns: reports.map((r) => ({
                id: r.id,
                personaName: r.personaName,
                personaData: r.personaData,
                status: r.status,
                report: r.report,
            })),
            aggregatedReport,
            uxagentRuns,
            isSharedView: true,
        });
    } catch (error: any) {
        console.error("[Public Share] Error fetching batch test:", error);
        return c.json(
            { error: "Failed to fetch report", message: error?.message },
            500
        );
    }
});

// ============================================================================
// SCREENSHOT TEST SHARE ROUTES
// ============================================================================

/**
 * GET /share/screenshot/:token
 * Public endpoint to view a shared screenshot test report
 */
publicShareRoutes.get("/screenshot/:token", async (c) => {
    const token = c.req.param("token");

    try {
        // Find the screenshot test by share token
        const [testRun] = await db
            .select()
            .from(schema.screenshotTestRuns)
            .where(eq((schema.screenshotTestRuns as any).shareToken, token));

        if (!testRun) {
            return c.json({ error: "Report not found" }, 404);
        }

        if (!(testRun as any).shareEnabled) {
            return c.json({ error: "This report is no longer shared" }, 403);
        }

        // Get all screenshot images
        const screenshots = await db
            .select()
            .from(schema.screenshotFlowImages)
            .where(eq(schema.screenshotFlowImages.screenshotTestRunId, testRun.id))
            .orderBy(schema.screenshotFlowImages.orderIndex);

        // Get analysis results
        const analysisRows = await db
            .select()
            .from(schema.screenshotAnalysisResults)
            .where(eq(schema.screenshotAnalysisResults.screenshotTestRunId, testRun.id))
            .orderBy(schema.screenshotAnalysisResults.screenshotOrder);

        // Generate presigned URLs for screenshots
        const screenshotsWithUrls = await Promise.all(
            screenshots.map(async (screenshot) => {
                let signedUrl = screenshot.s3Url;
                if (screenshot.s3Key) {
                    try {
                        signedUrl = await getPresignedUrl(screenshot.s3Key, 3600);
                    } catch (err) {
                        console.error(`Failed to generate presigned URL:`, err);
                    }
                }
                return { ...screenshot, signedUrl };
            })
        );

        // Group analysis by persona
        const personaResults = Array.from(
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
        );

        return c.json({
            testRun: {
                id: testRun.id,
                testName: testRun.testName,
                userDescription: testRun.userDescription,
                expectedTask: testRun.expectedTask,
                status: testRun.status,
                overallScore: testRun.overallScore,
                summary: testRun.summary,
                createdAt: testRun.createdAt,
                completedAt: testRun.completedAt,
                // Exclude sensitive user info
            },
            screenshots: screenshotsWithUrls,
            personaResults,
            overallReport:
                testRun.status === "completed"
                    ? {
                        score: testRun.overallScore,
                        summary: testRun.summary,
                        fullReport: testRun.fullReport,
                    }
                    : null,
            isSharedView: true,
        });
    } catch (error: any) {
        console.error("[Public Share] Error fetching screenshot test:", error);
        return c.json(
            { error: "Failed to fetch report", message: error?.message },
            500
        );
    }
});

// ============================================================================
// SHARE MANAGEMENT (Authenticated routes - will be mounted separately)
// ============================================================================

export { publicShareRoutes, generateShareToken };
