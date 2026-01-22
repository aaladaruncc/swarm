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
import { uploadScreenshot, generateScreenshotKey, getPresignedUrl } from "../lib/s3.js";
import { startUXAgentRun, checkUXAgentHealth } from "../lib/uxagent-client.js";
import { SAMPLE_PERSONAS } from "../lib/personas.js";

type Variables = {
  user: Session["user"];
};

const batchTestsRoutes = new Hono<{ Variables: Variables }>();

// ============================================================================
// SCHEMAS
// ============================================================================

const generatePersonasSchema = z.object({
  targetUrl: z.string().url().optional().or(z.literal("")),
  userDescription: z.string().min(10).max(2000),
  agentCount: z.number().min(1).max(5).optional().default(3),
});

const createBatchTestSchema = z.object({
  targetUrl: z.string().url(),
  userDescription: z.string(),
  generatedPersonas: z.array(z.any()),
  selectedPersonaIndices: z.array(z.number()).min(1).max(5),
  agentCount: z.number().min(1).max(5).optional().default(3),
  useUXAgent: z.boolean().optional().default(false), // Use UXAgent service instead of internal agent
  maxSteps: z.number().min(5).max(50).optional().default(20), // Max steps for UXAgent
  questionnaire: z.any().optional(), // Questionnaire for UXAgent surveys
});

// ============================================================================
// FALLBACK PERSONAS
// ============================================================================

const fallbackPersonas = SAMPLE_PERSONAS.map((persona, index) => {
  const incomeByLevel: Record<string, string> = {
    low: "$25,000",
    medium: "$60,000",
    high: "$120,000",
  };

  return {
    ...persona,
    gender: "Not specified",
    maritalStatus: "single" as const,
    education: "Not specified",
    income: incomeByLevel[persona.incomeLevel] || "Not specified",
    background: `${persona.name} is a ${persona.age}-year-old ${persona.occupation} from ${persona.country}.`,
    financialSituation: `${persona.name} has a ${persona.incomeLevel} income level and plans spending carefully.`,
    browsingHabits: `Tech savviness: ${persona.techSavviness}. ${persona.context || ""}`.trim(),
    professionalLife: `Works as a ${persona.occupation} and balances daily tasks with time constraints.`,
    personalStyle: "Practical and goal-oriented.",
    context: persona.context || "",
    relevanceScore: Math.min(9, 6 + (index % 4)),
  };
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
      console.log(
        `[${user.id}] Generating personas for ${targetUrl || "no-url"} (will select ${agentCount})...`
      );

      const result = await generatePersonas(userDescription, targetUrl);
      const selection = selectTopPersonas(result.personas, agentCount || 3);

      return c.json({
        personas: result.personas,
        recommendedIndices: selection.selectedIndices,
        selectionReasoning: selection.reasoning,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      const rawText = (error as any)?.text;

      console.error("[generate-personas] Failed to generate personas:", message);
      if (stack) {
        console.error("[generate-personas] Stack:", stack);
      }
      if (rawText) {
        console.error("[generate-personas] Raw error text:", rawText);
      }
      const selection = selectTopPersonas(fallbackPersonas, agentCount || 3);

      return c.json({
        personas: fallbackPersonas,
        reasoning: "Fallback personas used due to generation error.",
        recommendedIndices: selection.selectedIndices,
        selectionReasoning: selection.reasoning,
        generationWarning: message,
        fallbackUsed: true,
      });
    }
  }
);

// POST /batch-tests - Create and start a batch test
batchTestsRoutes.post(
  "/",
  zValidator("json", createBatchTestSchema),
  async (c) => {
    const user = c.get("user");
    const {
      targetUrl,
      userDescription,
      generatedPersonas,
      selectedPersonaIndices,
      agentCount,
      useUXAgent,
      maxSteps,
      questionnaire,
    } = c.req.valid("json");

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
          useUXAgent: useUXAgent || false,
        })
        .returning();

      console.log(`[${batchTestRun.id}] Created batch test run with ${selectedPersonaIndices.length} personas`);

      // Choose which runner to use
      if (useUXAgent) {
        // Use UXAgent service
        console.log(`[${batchTestRun.id}] Using UXAgent service for agent orchestration`);
        runBatchTestWithUXAgent(
          batchTestRun.id,
          targetUrl,
          generatedPersonas,
          selectedPersonaIndices,
          user.id,
          maxSteps || 20,
          questionnaire || {},
        );
      } else {
        // Use internal agent (existing flow)
        console.log(`[${batchTestRun.id}] Using internal agent for orchestration`);
        runBatchTestInBackground(batchTestRun.id, targetUrl, generatedPersonas, selectedPersonaIndices);
      }

      return c.json({
        batchTestRun,
        message: "Batch test started",
        useUXAgent: useUXAgent || false,
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

  // If UXAgent was used, fetch uxagent runs linked to the test runs
  let uxagentRuns: any[] = [];
  if (batchTestRun.useUXAgent) {
    const testRunIds = testRuns.map(tr => tr.id);
    if (testRunIds.length > 0) {
      // Get all uxagent runs for these test runs
      const allUxagentRuns = await db
        .select()
        .from(schema.uxagentRuns)
        .where(eq(schema.uxagentRuns.testRunId, testRunIds[0])); // Start with first

      // Get all uxagent runs for all test runs in the batch
      for (const testRunId of testRunIds) {
        const runs = await db
          .select()
          .from(schema.uxagentRuns)
          .where(eq(schema.uxagentRuns.testRunId, testRunId));
        uxagentRuns.push(...runs);
      }

      // Get screenshots for each uxagent run and generate presigned URLs
      for (const run of uxagentRuns) {
        const screenshots = await db
          .select()
          .from(schema.uxagentScreenshots)
          .where(eq(schema.uxagentScreenshots.uxagentRunId, run.id));

        // Generate presigned URLs for each screenshot
        run.screenshots = await Promise.all(
          screenshots.map(async (s) => {
            let signedUrl = s.s3Url; // Default to stored URL
            if (s.s3Key) {
              try {
                signedUrl = await getPresignedUrl(s.s3Key, 3600); // 1 hour expiry
              } catch (err) {
                console.error(`Failed to generate presigned URL for ${s.s3Key}:`, err);
              }
            }
            return {
              ...s,
              signedUrl,
            };
          })
        );
      }
    }
  }

  return c.json({
    batchTestRun,
    testRuns: reports,
    aggregatedReport,
    uxagentRuns,
  });
});

// POST /batch-tests/:id/terminate - Terminate a running batch test
batchTestsRoutes.post("/:id/terminate", async (c) => {
  const user = c.get("user");
  const batchId = c.req.param("id");

  try {
    // Verify ownership
    const [batchTestRun] = await db
      .select()
      .from(schema.batchTestRuns)
      .where(eq(schema.batchTestRuns.id, batchId));

    if (!batchTestRun || batchTestRun.userId !== user.id) {
      return c.json({ error: "Batch test not found" }, 404);
    }

    // Only allow termination if test is still running
    if (!["running_tests", "aggregating"].includes(batchTestRun.status)) {
      return c.json({ error: "Test is not running" }, 400);
    }

    // Get all test runs for this batch
    const testRuns = await db
      .select()
      .from(schema.testRuns)
      .where(eq(schema.testRuns.batchTestRunId, batchId));

    // Cancel queued jobs in the queue manager
    const testRunIds = testRuns.map(tr => tr.id);
    globalTestQueue.cancelBatch(batchId, testRunIds);

    // Update all running/pending test runs to terminated
    const runningTestRuns = testRuns.filter(tr => tr.status === "running" || tr.status === "pending");

    for (const testRun of runningTestRuns) {
      await db
        .update(schema.testRuns)
        .set({
          status: "terminated",
          completedAt: new Date(),
          errorMessage: "Test terminated by user",
        })
        .where(eq(schema.testRuns.id, testRun.id));
    }

    // Update batch status to terminated
    await db
      .update(schema.batchTestRuns)
      .set({
        status: "terminated",
        completedAt: new Date(),
        errorMessage: "Test terminated by user",
      })
      .where(eq(schema.batchTestRuns.id, batchId));

    console.log(`[${batchId}] Batch test terminated by user ${user.id}`);

    // Get updated batch test run
    const [updatedBatchTestRun] = await db
      .select()
      .from(schema.batchTestRuns)
      .where(eq(schema.batchTestRuns.id, batchId));

    return c.json({
      message: "Batch test terminated successfully",
      batchTestRun: updatedBatchTestRun
    });
  } catch (error) {
    console.error("Failed to terminate batch test:", error);
    return c.json(
      {
        error: "Failed to terminate batch test",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// POST /batch-tests/:id/share - Enable/disable sharing and get share URL
batchTestsRoutes.post("/:id/share", async (c) => {
  const user = c.get("user");
  const batchId = c.req.param("id");

  try {
    const body = await c.req.json().catch(() => ({}));
    const enableShare = body.enabled !== false; // Default to enabling

    // Verify ownership
    const [batchTestRun] = await db
      .select()
      .from(schema.batchTestRuns)
      .where(eq(schema.batchTestRuns.id, batchId));

    if (!batchTestRun || batchTestRun.userId !== user.id) {
      return c.json({ error: "Batch test not found" }, 404);
    }

    let shareToken = (batchTestRun as any).shareToken;

    // Generate a new token if enabling and none exists
    if (enableShare && !shareToken) {
      const crypto = await import("crypto");
      shareToken = crypto.randomBytes(16).toString("base64url");
    }

    // Update share settings
    await db
      .update(schema.batchTestRuns)
      .set({
        shareToken,
        shareEnabled: enableShare,
      } as any)
      .where(eq(schema.batchTestRuns.id, batchId));

    const shareUrl = enableShare && shareToken
      ? `https://useswarm.co/share/batch/${shareToken}`
      : null;

    return c.json({
      enabled: enableShare,
      shareToken: enableShare ? shareToken : null,
      shareUrl,
      message: enableShare ? "Sharing enabled" : "Sharing disabled",
    });
  } catch (error) {
    console.error("Failed to update share settings:", error);
    return c.json(
      {
        error: "Failed to update share settings",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// GET /batch-tests/:id/share - Get current share status
batchTestsRoutes.get("/:id/share", async (c) => {
  const user = c.get("user");
  const batchId = c.req.param("id");

  try {
    const [batchTestRun] = await db
      .select()
      .from(schema.batchTestRuns)
      .where(eq(schema.batchTestRuns.id, batchId));

    if (!batchTestRun || batchTestRun.userId !== user.id) {
      return c.json({ error: "Batch test not found" }, 404);
    }

    const shareUrl = (batchTestRun as any).shareEnabled && (batchTestRun as any).shareToken
      ? `https://useswarm.co/share/batch/${(batchTestRun as any).shareToken}`
      : null;

    return c.json({
      enabled: (batchTestRun as any).shareEnabled || false,
      shareToken: (batchTestRun as any).shareEnabled ? (batchTestRun as any).shareToken : null,
      shareUrl,
    });
  } catch (error) {
    console.error("Failed to get share status:", error);
    return c.json(
      {
        error: "Failed to get share status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
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

    // Get queue status before adding
    const queueStatusBefore = globalTestQueue.getStatus();
    console.log(`[${batchTestRunId}] Queue status before adding: ${queueStatusBefore.running} running, ${queueStatusBefore.queued} queued`);

    // Run all tests using the queue manager (prevents rate limits)
    console.log(`[${batchTestRunId}] Adding ${testRuns.length} tests to queue...`);
    const testPromises = testRuns.map(async (testRun, index) => {
      // Use queue to manage rate limits
      console.log(`[${batchTestRunId}] Adding test ${testRun.id} (${selectedPersonas[index].name}) to queue...`);
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

          // Save screenshots to S3
          for (const screenshot of result.screenshots) {
            try {
              const key = generateScreenshotKey(testRun.id, screenshot.stepNumber);
              const { s3Key, s3Url } = await uploadScreenshot(key, screenshot.base64Data);

              await db.insert(schema.screenshots).values({
                testRunId: testRun.id,
                stepNumber: screenshot.stepNumber,
                description: screenshot.description,
                s3Key,
                s3Url,
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

    // Get queue status after adding
    const queueStatusAfter = globalTestQueue.getStatus();
    console.log(`[${batchTestRunId}] Queue status after adding: ${queueStatusAfter.running} running, ${queueStatusAfter.queued} queued`);
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

/**
 * Run batch test using UXAgent service.
 * UXAgent handles all persona runs with its own concurrency,
 * and calls back to /api/uxagent/runs with results.
 */
async function runBatchTestWithUXAgent(
  batchTestRunId: string,
  targetUrl: string,
  generatedPersonas: any[],
  selectedPersonaIndices: number[],
  userId: string,
  maxSteps: number,
  questionnaire: Record<string, any>,
) {
  console.log(`[${batchTestRunId}] Starting batch test with UXAgent service...`);

  try {
    // Check UXAgent health first
    const isHealthy = await checkUXAgentHealth();
    if (!isHealthy) {
      throw new Error("UXAgent service is not available");
    }

    // Get selected personas
    const selectedPersonas = selectedPersonaIndices.map(idx => generatedPersonas[idx]);

    console.log(`[${batchTestRunId}] Calling UXAgent with ${selectedPersonas.length} personas...`);

    // Create test run records for each persona (so UXAgent can link results)
    const testRunPromises = selectedPersonas.map(async (persona, index) => {
      const [testRun] = await db
        .insert(schema.testRuns)
        .values({
          batchTestRunId,
          userId,
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

    // Build demographics from selected personas
    const demographics = selectedPersonas.map(p => ({
      category: p.occupation || p.name || "General User",
      percentage: Math.round(100 / selectedPersonas.length),
    }));

    // Convert GeneratedPersona objects to UXAgent persona format
    // This allows UXAgent to use our pre-generated personas directly
    const uxAgentPersonas = selectedPersonas.map(p => ({
      persona: `Persona: ${p.name}

Background:
${p.background || `${p.name} is a ${p.age}-year-old ${p.occupation} from ${p.country}.`}

Demographics:
Age: ${p.age}
Gender: ${(p as any).gender || 'Not specified'}
Education: ${(p as any).education || 'Not specified'}
Profession: ${p.occupation}
Income: ${(p as any).income || p.incomeLevel}

Financial Situation:
${(p as any).financialSituation || `${p.name} has a ${p.incomeLevel} income level and manages their spending accordingly.`}

Browsing Habits:
${(p as any).browsingHabits || `Tech savviness: ${p.techSavviness}. ${p.context || ''}`}

Professional Life:
${(p as any).professionalLife || `Works as a ${p.occupation}.`}

Personal Style:
${(p as any).personalStyle || 'Practical and goal-oriented.'}

Primary Goal: ${p.primaryGoal}
Pain Points: ${p.painPoints?.join('; ') || ''}`,
      intent: p.primaryGoal || "Test the website user experience",
      name: p.name,
      // Include original data for reference
      ...p,
    }));

    // Call UXAgent service with pre-generated personas
    const result = await startUXAgentRun(
      {
        total_personas: selectedPersonas.length,
        demographics,
        general_intent: selectedPersonas[0]?.primaryGoal || "Test the website user experience",
        start_url: targetUrl,
        max_steps: maxSteps,
        questionnaire: questionnaire || {},
        concurrency: Math.min(selectedPersonas.length, 5), // Support up to 5 concurrent agents
        headless: true,
        example_persona: selectedPersonas[0]?.persona,
        personas: uxAgentPersonas, // Pass pre-generated personas to skip generation
      },
      undefined, // Use default callback URL
      batchTestRunId, // Pass batch test ID so UXAgent can link results
      userId,
    );

    console.log(`[${batchTestRunId}] UXAgent run started: ${result.agent_count} agents`);

    // Update batch status - UXAgent will callback with results
    // The status will be updated when callbacks are received
    await db
      .update(schema.batchTestRuns)
      .set({ status: "running_uxagent" })
      .where(eq(schema.batchTestRuns.id, batchTestRunId));

    // Note: The actual completion will be handled when UXAgent sends callbacks
    // to /api/uxagent/runs. We need to update uxagent.ts to handle batch completion.

  } catch (error) {
    console.error(`[${batchTestRunId}] ❌ UXAgent batch test failed:`, error);

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
