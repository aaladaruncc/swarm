import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { eq, desc } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { runUserTestAgent, SAMPLE_PERSONAS } from "../lib/agent.js";
import type { Session } from "../lib/auth.js";

type Variables = {
  user: Session["user"];
};

const testsRoutes = new Hono<{ Variables: Variables }>();

// Create test request schema
const createTestSchema = z.object({
  targetUrl: z.string().url(),
  personaIndex: z.number().min(0).max(2).optional().default(0),
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
  try {
    // Update status to running
    await db
      .update(schema.testRuns)
      .set({
        status: "running",
        startedAt: new Date(),
      })
      .where(eq(schema.testRuns.id, testRunId));

    // Run the test
    const result = await runUserTestAgent({
      targetUrl,
      personaIndex,
      onProgress: (msg) => console.log(`[${testRunId}] ${msg}`),
    });

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

    // Save screenshots
    for (const screenshot of result.screenshots) {
      await db.insert(schema.screenshots).values({
        testRunId,
        stepNumber: screenshot.stepNumber,
        description: screenshot.description,
        base64Data: screenshot.base64Data,
      });
    }

    // Update status to completed
    await db
      .update(schema.testRuns)
      .set({
        status: "completed",
        completedAt: new Date(),
        browserbaseSessionId: result.browserbaseSessionId,
      })
      .where(eq(schema.testRuns.id, testRunId));
  } catch (error) {
    console.error(`[${testRunId}] Test failed:`, error);

    // Update status to failed
    await db
      .update(schema.testRuns)
      .set({
        status: "failed",
        completedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      })
      .where(eq(schema.testRuns.id, testRunId));
  }
}

export { testsRoutes };
