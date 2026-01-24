import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { eq, desc, inArray, and } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { runUserTestAgent } from "../lib/agent.js";
import { SAMPLE_PERSONAS } from "../lib/personas.js";
import type { Session } from "../lib/auth.js";
import Browserbase from "@browserbasehq/sdk";
import { uploadScreenshot, generateScreenshotKey } from "../lib/s3.js";

type Variables = {
  user: Session["user"];
};

const testsRoutes = new Hono<{ Variables: Variables }>();

// Create test request schema
const createTestSchema = z.object({
  targetUrl: z.string().url(),
  personaIndex: z.number().min(0).max(9).optional().default(0),
});

// GET /tests - List all tests for the user
testsRoutes.get("/", async (c) => {
  const user = c.get("user");

  const tests = await db
    .select()
    .from(schema.testRuns)
    .where(eq(schema.testRuns.userId, user.id))
    .orderBy(desc(schema.testRuns.createdAt));

  return c.json({ tests });
});

// POST /tests - Create a new test
testsRoutes.post("/", zValidator("json", createTestSchema), async (c) => {
  const user = c.get("user");
  const { targetUrl, personaIndex } = c.req.valid("json");

  const persona = SAMPLE_PERSONAS[personaIndex];

  // Create test run record
  const [testRun] = await db
    .insert(schema.testRuns)
    .values({
      userId: user.id,
      targetUrl,
      personaIndex,
      personaName: persona.name,
      status: "pending",
    })
    .returning();

  // Start the test in the background
  runTestInBackground(testRun.id, targetUrl, personaIndex);

  return c.json({
    testRun,
    message: "Test started",
  });
});

// DELETE /tests - Delete/Archive multiple tests
testsRoutes.delete("/", zValidator("json", z.object({ ids: z.array(z.string()) })), async (c) => {
  const user = c.get("user");
  const { ids } = c.req.valid("json");

  if (ids.length === 0) {
    return c.json({ message: "No tests selected" });
  }

  // Delete test runs belonging to the user
  await db.delete(schema.testRuns)
    .where(
      and(
        inArray(schema.testRuns.id, ids),
        eq(schema.testRuns.userId, user.id)
      )
    );

  return c.json({ message: "Tests archived successfully" });
});

// GET /tests/:id - Get a specific test
testsRoutes.get("/:id", async (c) => {
  const user = c.get("user");
  const testId = c.req.param("id");

  const [testRun] = await db
    .select()
    .from(schema.testRuns)
    .where(eq(schema.testRuns.id, testId));

  if (!testRun || testRun.userId !== user.id) {
    return c.json({ error: "Test not found" }, 404);
  }

  // Get the report if completed
  let report = null;
  if (testRun.status === "completed") {
    const [reportData] = await db
      .select()
      .from(schema.reports)
      .where(eq(schema.reports.testRunId, testId));
    report = reportData;
  }

  // Get screenshots
  const screenshots = await db
    .select()
    .from(schema.screenshots)
    .where(eq(schema.screenshots.testRunId, testId));

  return c.json({
    testRun,
    report,
    screenshots,
  });
});

// GET /tests/:id/screenshots - Get screenshots for a test
testsRoutes.get("/:id/screenshots", async (c) => {
  const user = c.get("user");
  const testId = c.req.param("id");

  const [testRun] = await db
    .select()
    .from(schema.testRuns)
    .where(eq(schema.testRuns.id, testId));

  if (!testRun || testRun.userId !== user.id) {
    return c.json({ error: "Test not found" }, 404);
  }

  const screenshots = await db
    .select()
    .from(schema.screenshots)
    .where(eq(schema.screenshots.testRunId, testId));

  return c.json({ screenshots });
});

// GET /tests/:id/transcript - Get session transcript with actions, reasoning, and screenshots
testsRoutes.get("/:id/transcript", async (c) => {
  const user = c.get("user");
  const testId = c.req.param("id");

  const [testRun] = await db
    .select()
    .from(schema.testRuns)
    .where(eq(schema.testRuns.id, testId));

  if (!testRun || testRun.userId !== user.id) {
    return c.json({ error: "Test not found" }, 404);
  }

  // Get report with full data
  const [report] = await db
    .select()
    .from(schema.reports)
    .where(eq(schema.reports.testRunId, testId));

  if (!report) {
    return c.json({ error: "Report not found" }, 404);
  }

  // Get screenshots
  const screenshots = await db
    .select()
    .from(schema.screenshots)
    .where(eq(schema.screenshots.testRunId, testId))
    .orderBy(schema.screenshots.stepNumber);

  // Extract transcript data from fullReport
  const fullReport = report.fullReport as any;
  const agentActions = fullReport?.agentActions || [];
  const agentReasoning = fullReport?.agentReasoning || "";
  const agentLogs = fullReport?.agentLogs || [];
  const rawStreams = fullReport?.rawStreams || { stdout: [], stderr: [] };

  // Combine actions, logs, and screenshots into timeline
  const timeline: Array<{
    type: "action" | "screenshot" | "reasoning" | "log" | "raw";
    timestamp: number;
    data: any;
  }> = [];

  const baseTimestamp =
    (testRun.startedAt ? new Date(testRun.startedAt).getTime() : Date.now()) || Date.now();

  // Add logs (agent thinking/INFO messages)
  agentLogs.forEach((log: any) => {
    timeline.push({
      type: "log",
      timestamp: log.timestamp || 0,
      data: {
        level: log.level || "INFO",
        message: log.message || "",
      },
    });
  });

  // Add actions
  agentActions.forEach((action: any) => {
    timeline.push({
      type: "action",
      timestamp: action.timestamp || 0,
      data: action,
    });
  });

  // Add raw stdout/stderr (unfiltered reasoning stream)
  // Parse and split multi-line chunks, extract timestamps from Stagehand format
  let rawIdx = 0;
  (rawStreams.stdout || []).forEach((chunk: string) => {
    // Remove ANSI color codes
    const cleanChunk = chunk.replace(/\x1b\[[0-9;]*m/g, '');
    const lines = cleanChunk.split('\n');
    lines.forEach((line: string) => {
      const trimmed = line.trim();
      if (trimmed.length === 0) return;

      // Strip dev server prefixes (e.g., "apps/api dev: ")
      const cleanLine = trimmed.replace(/^apps\/\w+\s+dev:\s*/i, '').trim();
      if (cleanLine.length === 0) return;

      // Try to extract timestamp from Stagehand format: [2025-12-11 02:58:35.865 -0500] LEVEL: message
      const timestampMatch = cleanLine.match(/\[([^\]]+)\]/);
      let timestamp = baseTimestamp + rawIdx;
      if (timestampMatch) {
        try {
          const parsed = new Date(timestampMatch[1]).getTime();
          if (!isNaN(parsed)) {
            timestamp = parsed;
          }
        } catch {
          // Use default
        }
      }

      timeline.push({
        type: "raw",
        timestamp,
        data: {
          stream: "stdout",
          message: cleanLine,
        },
      });
      rawIdx++;
    });
  });

  (rawStreams.stderr || []).forEach((chunk: string) => {
    // Remove ANSI color codes
    const cleanChunk = chunk.replace(/\x1b\[[0-9;]*m/g, '');
    const lines = cleanChunk.split('\n');
    lines.forEach((line: string) => {
      const trimmed = line.trim();
      if (trimmed.length === 0) return;

      // Strip dev server prefixes
      const cleanLine = trimmed.replace(/^apps\/\w+\s+dev:\s*/i, '').trim();
      if (cleanLine.length === 0) return;

      // Try to extract timestamp from Stagehand format
      const timestampMatch = cleanLine.match(/\[([^\]]+)\]/);
      let timestamp = baseTimestamp + rawIdx + 0.5;
      if (timestampMatch) {
        try {
          const parsed = new Date(timestampMatch[1]).getTime();
          if (!isNaN(parsed)) {
            timestamp = parsed;
          }
        } catch {
          // Use default
        }
      }

      timeline.push({
        type: "raw",
        timestamp,
        data: {
          stream: "stderr",
          message: cleanLine,
        },
      });
      rawIdx++;
    });
  });

  // Add screenshots (use timestamp from fullReport if available, otherwise estimate)
  screenshots.forEach((screenshot, index) => {
    // Try to get timestamp from fullReport screenshots array
    const fullReportScreenshot = (fullReport?.screenshots || []).find(
      (s: any) => s.stepNumber === screenshot.stepNumber
    );

    // Use stored timestamp, or estimate based on step number
    const timestamp = fullReportScreenshot?.timestamp
      ? fullReportScreenshot.timestamp
      : testRun.startedAt
        ? new Date(testRun.startedAt).getTime() + (screenshot.stepNumber * 5000) // ~5 seconds per step
        : Date.now();

    timeline.push({
      type: "screenshot",
      timestamp,
      data: {
        stepNumber: screenshot.stepNumber,
        description: screenshot.description,
        s3Url: screenshot.s3Url,
        createdAt: screenshot.createdAt,
      },
    });
  });

  // Sort timeline by timestamp
  timeline.sort((a, b) => a.timestamp - b.timestamp);

  return c.json({
    agentActions,
    agentReasoning,
    agentLogs,
    rawStreams,
    screenshots,
    timeline,
    testRun: {
      startedAt: testRun.startedAt,
      completedAt: testRun.completedAt,
      targetUrl: testRun.targetUrl,
    },
  });
});

// GET /tests/:id/recording - Get session live view URL from Browserbase
testsRoutes.get("/:id/recording", async (c) => {
  const user = c.get("user");
  const testId = c.req.param("id");

  const [testRun] = await db
    .select()
    .from(schema.testRuns)
    .where(eq(schema.testRuns.id, testId));

  if (!testRun || testRun.userId !== user.id) {
    return c.json({ error: "Test not found" }, 404);
  }

  if (!testRun.browserbaseSessionId) {
    return c.json({ error: "No session recording available" }, 404);
  }

  try {
    const bb = new Browserbase({
      apiKey: process.env.BROWSERBASE_API_KEY!,
    });

    // Try to get the live view URL using the debug endpoint
    try {
      const debugInfo = await bb.sessions.debug(testRun.browserbaseSessionId);
      const liveViewUrl = debugInfo.debuggerFullscreenUrl || debugInfo.debuggerUrl;

      return c.json({
        liveViewUrl,
        debugUrl: liveViewUrl,
        sessionId: testRun.browserbaseSessionId,
      });
    } catch (debugError: any) {
      // If session is stopped (410), return a fallback viewer URL
      if (debugError.status === 410 || debugError.error?.message === "Session stopped") {
        console.log(`Session ${testRun.browserbaseSessionId} has stopped, using fallback viewer`);

        // Return the Browserbase session page as fallback
        // This will show the recording on Browserbase's platform
        return c.json({
          liveViewUrl: `https://www.browserbase.com/sessions/${testRun.browserbaseSessionId}`,
          debugUrl: `https://www.browserbase.com/sessions/${testRun.browserbaseSessionId}`,
          sessionId: testRun.browserbaseSessionId,
          isFallback: true,
        });
      }

      // Re-throw other errors
      throw debugError;
    }
  } catch (error) {
    console.error(`Failed to fetch session viewer for ${testRun.browserbaseSessionId}:`, error);
    return c.json({
      error: "Failed to fetch session viewer",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// GET /personas - Get available personas
testsRoutes.get("/personas", async (c) => {
  return c.json({
    personas: SAMPLE_PERSONAS.map((p, i) => ({
      index: i,
      name: p.name,
      age: p.age,
      occupation: p.occupation,
      techSavviness: p.techSavviness,
      country: p.country,
    })),
  });
});

// Background test runner
async function runTestInBackground(testRunId: string, targetUrl: string, personaIndex: number) {
  console.log(`[${testRunId}] Starting background test...`);

  try {
    // Update status to running
    await db
      .update(schema.testRuns)
      .set({
        status: "running",
        startedAt: new Date(),
      })
      .where(eq(schema.testRuns.id, testRunId));

    console.log(`[${testRunId}] Status set to running, starting agent...`);

    // Run the test
    const result = await runUserTestAgent({
      targetUrl,
      personaIndex,
      onProgress: (msg) => console.log(`[${testRunId}] ${msg}`),
    });

    console.log(`[${testRunId}] Agent completed, saving report...`);

    // Save the report (round score to integer)
    await db.insert(schema.reports).values({
      testRunId,
      score: Math.round(result.overallExperience.score),
      summary: result.overallExperience.summary,
      fullReport: result as any,
      positiveAspects: result.positiveAspects,
      usabilityIssues: result.usabilityIssues,
      accessibilityNotes: result.accessibilityNotes,
      recommendations: result.recommendations,
      totalDuration: result.totalDuration,
    });

    console.log(`[${testRunId}] Report saved, saving ${result.screenshots.length} screenshots...`);

    // Save screenshots to S3 (handle errors individually)
    for (const screenshot of result.screenshots) {
      try {
        const key = generateScreenshotKey(testRunId, screenshot.stepNumber);
        const { s3Key, s3Url } = await uploadScreenshot(key, screenshot.base64Data);

        await db.insert(schema.screenshots).values({
          testRunId,
          stepNumber: screenshot.stepNumber,
          description: screenshot.description,
          s3Key,
          s3Url,
        });
      } catch (screenshotError) {
        console.error(`[${testRunId}] Failed to save screenshot ${screenshot.stepNumber}:`, screenshotError);
      }
    }

    console.log(`[${testRunId}] Updating status to completed...`);

    // Update status to completed
    await db
      .update(schema.testRuns)
      .set({
        status: "completed",
        completedAt: new Date(),
        browserbaseSessionId: result.browserbaseSessionId,
        inputTokens: result.tokenUsage?.inputTokens ?? null,
        outputTokens: result.tokenUsage?.outputTokens ?? null,
        totalTokens: result.tokenUsage?.totalTokens ?? null,
      })
      .where(eq(schema.testRuns.id, testRunId));

    console.log(`[${testRunId}] ✅ Test completed successfully!`);
  } catch (error) {
    console.error(`[${testRunId}] ❌ Test failed:`, error);

    // Update status to failed
    try {
      await db
        .update(schema.testRuns)
        .set({
          status: "failed",
          completedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        })
        .where(eq(schema.testRuns.id, testRunId));
    } catch (dbError) {
      console.error(`[${testRunId}] Failed to update status to failed:`, dbError);
    }
  }
}

export { testsRoutes };
