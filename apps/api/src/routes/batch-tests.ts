import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { eq, desc } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { generatePersonas, selectTopPersonas } from "../lib/persona-generator.js";
import { runUserTestAgent } from "../lib/agent.js";
import { aggregateReports } from "../lib/report-aggregator.js";
import { globalTestQueue } from "../lib/queue-manager.js";
import type { Session } from "../lib/auth.js";
import type { AgentResult } from "../lib/agent.js";

type Variables = {
  user: Session["user"];
};

const batchTestsRoutes = new Hono<{ Variables: Variables }>();

// ============================================================================
// SCHEMAS
// ============================================================================

const generatePersonasSchema = z.object({
  targetUrl: z.string().url(),
  userDescription: z.string().min(10).max(2000),
  agentCount: z.number().min(1).max(5).optional().default(3),
});

const createBatchTestSchema = z.object({
  targetUrl: z.string().url(),
  userDescription: z.string(),
  generatedPersonas: z.array(z.any()),
  selectedPersonaIndices: z.array(z.number()).min(1).max(5),
  agentCount: z.number().min(1).max(5).optional().default(3),
});

// ============================================================================
// ROUTES
// ============================================================================

// POST /batch-tests/generate-personas - Generate personas based on user description
batchTestsRoutes.post(
  "/generate-personas",
  zValidator("json", generatePersonasSchema),
  async (c) => {
    const user = c.get("user");
    const { targetUrl, userDescription, agentCount } = c.req.valid("json");

    try {
      console.log(`[${user.id}] Generating personas for ${targetUrl} (will select ${agentCount})...`);
      
      const result = await generatePersonas(userDescription, targetUrl);
      const selection = selectTopPersonas(result.personas, agentCount || 3);

      return c.json({
        personas: result.personas,
        reasoning: result.reasoning,
        recommendedIndices: selection.selectedIndices,
        selectionReasoning: selection.reasoning,
      });
    } catch (error) {
      console.error("Failed to generate personas:", error);
      return c.json(
        {
          error: "Failed to generate personas",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }
);

// POST /batch-tests - Create and start a batch test
batchTestsRoutes.post(
  "/",
  zValidator("json", createBatchTestSchema),
  async (c) => {
    const user = c.get("user");
    const { targetUrl, userDescription, generatedPersonas, selectedPersonaIndices, agentCount } = c.req.valid("json");

    try {
      // Validate that selectedPersonaIndices length matches agentCount
      const finalAgentCount = agentCount || selectedPersonaIndices.length;
      if (selectedPersonaIndices.length !== finalAgentCount) {
        return c.json(
          {
            error: "Invalid selection",
            details: `Please select exactly ${finalAgentCount} personas`,
          },
          400
        );
      }

      // Create batch test run record
      const [batchTestRun] = await db
        .insert(schema.batchTestRuns)
        .values({
          userId: user.id,
          targetUrl,
          userDescription,
          generatedPersonas,
          selectedPersonaIndices,
          status: "running_tests",
        })
        .returning();

      console.log(`[${batchTestRun.id}] Created batch test run with ${selectedPersonaIndices.length} personas`);

      // Start the batch test in the background
      runBatchTestInBackground(batchTestRun.id, targetUrl, generatedPersonas, selectedPersonaIndices);

      return c.json({
        batchTestRun,
        message: "Batch test started",
      });
    } catch (error) {
      console.error("Failed to create batch test:", error);
      return c.json(
        {
          error: "Failed to create batch test",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }
);

// GET /batch-tests - List all batch tests for the user
batchTestsRoutes.get("/", async (c) => {
  const user = c.get("user");

  const batchTests = await db
    .select()
    .from(schema.batchTestRuns)
    .where(eq(schema.batchTestRuns.userId, user.id))
    .orderBy(desc(schema.batchTestRuns.createdAt));

  return c.json({ batchTests });
});

// GET /batch-tests/:id - Get a specific batch test with all details
batchTestsRoutes.get("/:id", async (c) => {
  const user = c.get("user");
  const batchId = c.req.param("id");

  const [batchTestRun] = await db
    .select()
    .from(schema.batchTestRuns)
    .where(eq(schema.batchTestRuns.id, batchId));

  if (!batchTestRun || batchTestRun.userId !== user.id) {
    return c.json({ error: "Batch test not found" }, 404);
  }

  // Get all individual test runs for this batch
  const testRuns = await db
    .select()
    .from(schema.testRuns)
    .where(eq(schema.testRuns.batchTestRunId, batchId));

  // Get individual reports
  const reports = await Promise.all(
    testRuns.map(async (testRun) => {
      const [report] = await db
        .select()
        .from(schema.reports)
        .where(eq(schema.reports.testRunId, testRun.id));
      
      return { testRun, report };
    })
  );

  // Get aggregated report if completed
  let aggregatedReport = null;
  if (batchTestRun.status === "completed") {
    const [aggReport] = await db
      .select()
      .from(schema.aggregatedReports)
      .where(eq(schema.aggregatedReports.batchTestRunId, batchId));
    aggregatedReport = aggReport;
  }

  return c.json({
    batchTestRun,
    testRuns: reports,
    aggregatedReport,
  });
});

// ============================================================================
// BACKGROUND PROCESSING
// ============================================================================

async function runBatchTestInBackground(
  batchTestRunId: string,
  targetUrl: string,
  generatedPersonas: any[],
  selectedPersonaIndices: number[]
) {
  console.log(`[${batchTestRunId}] Starting batch test in background...`);

  try {
    // Get selected personas
    const selectedPersonas = selectedPersonaIndices.map(idx => generatedPersonas[idx]);

    console.log(`[${batchTestRunId}] Running tests for ${selectedPersonas.length} personas with queue management...`);

    // Create individual test run records
    const testRunPromises = selectedPersonas.map(async (persona, index) => {
      const [testRun] = await db
        .insert(schema.testRuns)
        .values({
          batchTestRunId,
          userId: (await db.select().from(schema.batchTestRuns).where(eq(schema.batchTestRuns.id, batchTestRunId)))[0].userId,
          targetUrl,
          personaIndex: selectedPersonaIndices[index],
          personaData: persona,
          personaName: persona.name,
          status: "pending",
        })
        .returning();

      return testRun;
    });

    const testRuns = await Promise.all(testRunPromises);
    console.log(`[${batchTestRunId}] Created ${testRuns.length} test run records`);
    
    // Get queue status
    const queueStatus = globalTestQueue.getStatus();
    console.log(`[${batchTestRunId}] Queue status: ${queueStatus.running} running, ${queueStatus.queued} queued`);

    // Run all tests using the queue manager (prevents rate limits)
    const testPromises = testRuns.map(async (testRun, index) => {
      // Use queue to manage rate limits
      return globalTestQueue.add(testRun.id, async () => {
        try {
          console.log(`[${testRun.id}] Starting test for ${selectedPersonas[index].name}...`);

          // Update status to running
          await db
            .update(schema.testRuns)
            .set({ status: "running", startedAt: new Date() })
            .where(eq(schema.testRuns.id, testRun.id));

          // Run the test
          const result = await runUserTestAgent({
            targetUrl,
            customPersona: selectedPersonas[index],
            onProgress: (msg) => console.log(`[${testRun.id}] ${msg}`),
          });

        console.log(`[${testRun.id}] Test completed. Score: ${result.overallExperience.score}/10`);

        // Save the report (round score to integer)
        await db.insert(schema.reports).values({
          testRunId: testRun.id,
          score: Math.round(result.overallExperience.score),
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
          try {
            await db.insert(schema.screenshots).values({
              testRunId: testRun.id,
              stepNumber: screenshot.stepNumber,
              description: screenshot.description,
              base64Data: screenshot.base64Data,
            });
          } catch (screenshotError) {
            console.error(`[${testRun.id}] Failed to save screenshot:`, screenshotError);
          }
        }

        // Update status to completed
        await db
          .update(schema.testRuns)
          .set({
            status: "completed",
            completedAt: new Date(),
            browserbaseSessionId: result.browserbaseSessionId,
          })
          .where(eq(schema.testRuns.id, testRun.id));

          return result;
        } catch (error) {
          console.error(`[${testRun.id}] Test failed:`, error);

          await db
            .update(schema.testRuns)
            .set({
              status: "failed",
              completedAt: new Date(),
              errorMessage: error instanceof Error ? error.message : "Unknown error",
            })
            .where(eq(schema.testRuns.id, testRun.id));

          return null;
        }
      });
    });

    console.log(`[${batchTestRunId}] Waiting for all tests to complete...`);
    const results = await Promise.all(testPromises);
    const successfulResults = results.filter((r): r is AgentResult => r !== null);

    console.log(`[${batchTestRunId}] ${successfulResults.length}/${results.length} tests completed successfully`);

    if (successfulResults.length === 0) {
      throw new Error("All tests failed");
    }

    // Update batch status to aggregating
    await db
      .update(schema.batchTestRuns)
      .set({ status: "aggregating" })
      .where(eq(schema.batchTestRuns.id, batchTestRunId));

    console.log(`[${batchTestRunId}] Aggregating reports...`);

    // Aggregate results
    const { aggregatedReport, fullAnalysis } = await aggregateReports(
      successfulResults,
      targetUrl
    );

    // Save aggregated report (round score to integer)
    await db.insert(schema.aggregatedReports).values({
      batchTestRunId,
      overallScore: Math.round(aggregatedReport.overallScore),
      executiveSummary: aggregatedReport.executiveSummary,
      commonIssues: aggregatedReport.commonIssues as any,
      personaSpecificInsights: aggregatedReport.personaSpecificInsights as any,
      recommendations: aggregatedReport.recommendations as any,
      strengthsAcrossPersonas: aggregatedReport.strengthsAcrossPersonas,
      fullAnalysis,
    });

    // Update batch status to completed
    await db
      .update(schema.batchTestRuns)
      .set({
        status: "completed",
        completedAt: new Date(),
      })
      .where(eq(schema.batchTestRuns.id, batchTestRunId));

    console.log(`[${batchTestRunId}] ✅ Batch test completed successfully!`);
  } catch (error) {
    console.error(`[${batchTestRunId}] ❌ Batch test failed:`, error);

    await db
      .update(schema.batchTestRuns)
      .set({
        status: "failed",
        completedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      })
      .where(eq(schema.batchTestRuns.id, batchTestRunId));
  }
}

export { batchTestsRoutes };
