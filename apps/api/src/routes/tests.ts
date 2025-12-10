import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { eq, desc, inArray, and } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { runUserTestAgent, SAMPLE_PERSONAS } from "../lib/agent.js";
import type { Session } from "../lib/auth.js";
import Browserbase from "@browserbasehq/sdk";

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
      
      return c.json({ 
        liveViewUrl: debugInfo.debuggerFullscreenUrl,
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

    // Save the report
    await db.insert(schema.reports).values({
      testRunId,
      score: result.overallExperience.score,
      summary: result.overallExperience.summary,
      fullReport: result as any,
      positiveAspects: result.positiveAspects,
      usabilityIssues: result.usabilityIssues,
      accessibilityNotes: result.accessibilityNotes,
      recommendations: result.recommendations,
      totalDuration: result.totalDuration,
    });

    console.log(`[${testRunId}] Report saved, saving ${result.screenshots.length} screenshots...`);

    // Save screenshots (handle errors individually)
    for (const screenshot of result.screenshots) {
      try {
        await db.insert(schema.screenshots).values({
          testRunId,
          stepNumber: screenshot.stepNumber,
          description: screenshot.description,
          base64Data: screenshot.base64Data,
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
