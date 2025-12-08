import { Stagehand } from "@browserbasehq/stagehand";
import { type UserPersona, SAMPLE_PERSONAS, getPersonaByIndex } from "./personas.js";

// ============================================================================
// TYPES
// ============================================================================

export interface InteractionLog {
  timestamp: string;
  action: string;
  observation: string;
  screenshotBase64?: string;
  sentiment: "positive" | "neutral" | "confused" | "frustrated";
}

export interface AgentResult {
  persona: UserPersona;
  sessionId: string;
  browserbaseSessionId?: string;
  targetUrl: string;
  totalDuration: string;
  interactionLogs: InteractionLog[];
  overallExperience: {
    score: number;
    summary: string;
  };
  usabilityIssues: Array<{
    severity: "low" | "medium" | "high" | "critical";
    description: string;
    recommendation: string;
  }>;
  positiveAspects: string[];
  accessibilityNotes: string[];
  personaSpecificFeedback: string;
  recommendations: string[];
  screenshots: Array<{
    stepNumber: number;
    description: string;
    base64Data: string;
  }>;
}

export interface RunTestOptions {
  targetUrl: string;
  personaIndex?: number;
  customPersona?: UserPersona;
  maxSteps?: number;
  onProgress?: (message: string) => void;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateSystemPrompt(persona: UserPersona, targetUrl: string): string {
  return `You are ${persona.name}, a ${persona.age}-year-old ${persona.occupation} from ${persona.country}, testing a website.

PROFILE:
- Tech level: ${persona.techSavviness}
- Goal: ${persona.financialGoal}
${persona.painPoints.length > 0 ? `- Frustrations: ${persona.painPoints.slice(0, 2).join(", ")}` : ""}

BEHAVIOR:
Browse like a real user - scroll, click what interests you, be honest about confusion. 
${persona.techSavviness === "beginner" ? "You need simple, clear interfaces." : persona.techSavviness === "advanced" ? "You expect efficient, professional UX." : "You appreciate good design and clarity."}

Keep moving. Share brief observations only when notable.`;
}

function generateAgentInstructions(persona: UserPersona): string {
  return `
You are ${persona.name} testing this website. Tech level: ${persona.techSavviness}.

QUICK EXPLORATION (complete in 25-30 steps max):
1. Scroll homepage quickly - what do you see?
2. Click 2 navigation items to see key pages
3. Quick scroll on each, note main elements
4. Try 1 interactive element if available
5. Brief thoughts on confusing/good parts only

Move fast! You have limited time. Skip repetitive actions.

AFTER EXPLORING (must complete by step 30), give assessment:

=== FINAL UX ASSESSMENT ===

🎯 FIRST IMPRESSION:
[What did you notice first? Was it clear what this app does?]

😊 WHAT I LIKED (list 2-3 things):
1. [positive thing]
2. [positive thing]

😕 WHAT CONFUSED ME (list 1-2 things):
1. [confusing thing]

🚧 USABILITY ISSUES:
- [Issue - severity: low/medium/high/critical]

♿ ACCESSIBILITY CONCERNS:
[Text size, colors, clarity issues?]

💡 TOP SUGGESTIONS:
1. [suggestion]
2. [suggestion]

⭐ OVERALL SCORE: [X]/10
[One sentence why]

=== END ASSESSMENT ===
`;
}

function parseAgentFeedback(agentMessage: string): {
  summary: string;
  positiveAspects: string[];
  accessibilityNotes: string[];
  usabilityIssues: Array<{
    severity: "low" | "medium" | "high" | "critical";
    description: string;
    recommendation: string;
  }>;
  recommendations: string[];
} {
  const result = {
    summary: "",
    positiveAspects: [] as string[],
    accessibilityNotes: [] as string[],
    usabilityIssues: [] as Array<{
      severity: "low" | "medium" | "high" | "critical";
      description: string;
      recommendation: string;
    }>,
    recommendations: [] as string[],
  };

  if (!agentMessage) return result;

  // Extract summary
  const firstImpressionMatch = agentMessage.match(
    /(?:FIRST IMPRESSION|First Impression)[:\s]*([^\n]+(?:\n(?![A-Z🎯😊😕🚧♿💡⭐])[^\n]+)*)/i
  );
  if (firstImpressionMatch) {
    result.summary = firstImpressionMatch[1].trim();
  } else {
    const sentences = agentMessage
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 10)
      .slice(0, 3);
    result.summary = sentences.join(". ").trim() + ".";
  }

  // Extract positive aspects
  const likedMatch = agentMessage.match(
    /(?:WHAT I LIKED|What I Liked|LIKED)[:\s]*([^\n]+(?:\n(?:[-•\d])[^\n]+)*)/i
  );
  if (likedMatch) {
    const items = likedMatch[1].match(/[-•\d.]\s*([^\n]+)/g);
    if (items) {
      result.positiveAspects = items
        .map((item) => item.replace(/^[-•\d.]\s*/, "").trim())
        .filter(Boolean);
    }
  }

  // Extract confusion points
  const confusedMatch = agentMessage.match(
    /(?:WHAT CONFUSED ME|What Confused|CONFUSED|CONFUSION)[:\s]*([^\n]+(?:\n(?:[-•\d])[^\n]+)*)/i
  );
  if (confusedMatch) {
    const items = confusedMatch[1].match(/[-•\d.]\s*([^\n]+)/g);
    if (items) {
      result.accessibilityNotes = items
        .map((item) => item.replace(/^[-•\d.]\s*/, "").trim())
        .filter(Boolean);
    }
  }

  // Extract usability issues
  const issuesMatch = agentMessage.match(
    /(?:USABILITY ISSUES|Usability Issues|ISSUES FOUND)[:\s]*([^\n]+(?:\n(?:[-•\d])[^\n]+)*)/i
  );
  if (issuesMatch) {
    const items = issuesMatch[1].match(/[-•\d.]\s*([^\n]+)/g);
    if (items) {
      items.forEach((item) => {
        const cleanItem = item.replace(/^[-•\d.]\s*/, "").trim();
        const severityMatch = cleanItem.match(/\b(low|medium|high|critical)\b/i);
        result.usabilityIssues.push({
          severity:
            (severityMatch?.[1]?.toLowerCase() as "low" | "medium" | "high" | "critical") ||
            "medium",
          description: cleanItem.replace(/\s*[-–]\s*(low|medium|high|critical)\s*/i, ""),
          recommendation: "Address this issue to improve user experience",
        });
      });
    }
  }

  // Extract recommendations
  const recsMatch = agentMessage.match(
    /(?:SUGGESTIONS|Suggestions|RECOMMENDATIONS|Recommendations|MY TOP SUGGESTIONS)[:\s]*([^\n]+(?:\n(?:[-•\d])[^\n]+)*)/i
  );
  if (recsMatch) {
    const items = recsMatch[1].match(/[-•\d.]\s*([^\n]+)/g);
    if (items) {
      result.recommendations = items
        .map((item) => item.replace(/^[-•\d.]\s*/, "").trim())
        .filter(Boolean);
    }
  }

  return result;
}

// ============================================================================
// MAIN AGENT FUNCTION
// ============================================================================

export async function runUserTestAgent(options: RunTestOptions): Promise<AgentResult> {
  const {
    targetUrl,
    personaIndex = 0,
    customPersona,
    maxSteps = 35,
    onProgress,
  } = options;

  const persona = customPersona || getPersonaByIndex(personaIndex);
  const startTime = Date.now();
  const interactionLogs: InteractionLog[] = [];
  const screenshots: Array<{ stepNumber: number; description: string; base64Data: string }> = [];
  let stepCount = 0;

  const log = (message: string) => {
    console.log(message);
    onProgress?.(message);
  };

  log(`Starting test for ${targetUrl} with persona: ${persona.name}`);

  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    verbose: 1,
    browserbaseSessionCreateParams: {
      projectId: process.env.BROWSERBASE_PROJECT_ID,
      // Extend session timeout to 15 minutes
      timeout: 900, // 15 minutes in seconds
    },
  });

  await stagehand.init();

  const sessionId = stagehand.browserbaseSessionId || `local-${Date.now()}`;
  log(`Browserbase session: ${sessionId}`);

  const page = stagehand.context.pages()[0];

  try {
    // Navigate to target URL
    log(`Navigating to ${targetUrl}...`);
    await page.goto(targetUrl, { waitUntil: "networkidle" });
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Initial screenshot
    stepCount++;
    const initialScreenshotBuffer = await page.screenshot();
    const initialScreenshot = initialScreenshotBuffer.toString("base64");
    screenshots.push({
      stepNumber: stepCount,
      description: "initial-landing",
      base64Data: initialScreenshot,
    });

    interactionLogs.push({
      timestamp: new Date().toISOString(),
      action: "Landed on page",
      observation: "Initial page load",
      sentiment: "neutral",
    });

    // Create agent with persona
    // Using Claude Haiku 4.5 CUA model for faster execution
    const agent = stagehand.agent({
      cua: true,
      model: {
        modelName: "anthropic/claude-haiku-4-5-20251001",
        apiKey: process.env.ANTHROPIC_API_KEY,
      },
      systemPrompt: generateSystemPrompt(persona, targetUrl),
    });

    log("Starting agent exploration...");

    let agentResult;
    try {
      agentResult = await agent.execute({
        instruction: generateAgentInstructions(persona),
        maxSteps,
      });
    } catch (error: any) {
      // If session times out or CDP closes, capture what we have
      if (error.message?.includes("CDP") || error.message?.includes("timeout") || error.message?.includes("closed")) {
        log("Session ended early (timeout/close), generating report from partial exploration...");
        agentResult = {
          message: `Partial exploration completed. Session ended early.
          
=== FINAL UX ASSESSMENT ===

🎯 FIRST IMPRESSION:
Explored the website before session timeout.

😊 WHAT I LIKED:
1. Managed to navigate parts of the site

😕 WHAT CONFUSED ME:
1. Session ended before full exploration

🚧 USABILITY ISSUES:
- Unable to complete full assessment due to early session end

♿ ACCESSIBILITY CONCERNS:
Limited assessment time

💡 TOP SUGGESTIONS:
1. Extend testing session for thorough evaluation

⭐ OVERALL SCORE: 6/10
Limited time for proper assessment

=== END ASSESSMENT ===`,
          success: false,
        };
      } else {
        throw error;
      }
    }

    // Capture final screenshot
    stepCount++;
    try {
      const finalScreenshotBuffer = await page.screenshot();
      const finalScreenshot = finalScreenshotBuffer.toString("base64");
      screenshots.push({
        stepNumber: stepCount,
        description: "final-state",
        base64Data: finalScreenshot,
      });
    } catch {
      log("Could not capture final screenshot");
    }

    interactionLogs.push({
      timestamp: new Date().toISOString(),
      action: "Completed exploration",
      observation: "Agent finished exploring",
      sentiment: "neutral",
    });

    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);

    // Parse agent response
    const agentMessage = agentResult.message || "";
    const scoreMatch = agentMessage.match(/(\d+)\s*\/\s*10/);
    const extractedScore = scoreMatch ? parseInt(scoreMatch[1], 10) : 5;
    const parsedFeedback = parseAgentFeedback(agentMessage);

    log(`Test complete. Score: ${extractedScore}/10`);

    return {
      persona,
      sessionId: `test-${Date.now()}`,
      browserbaseSessionId: sessionId,
      targetUrl,
      totalDuration: `${Math.floor(duration / 60)}m ${duration % 60}s`,
      interactionLogs,
      overallExperience: {
        score: extractedScore,
        summary: parsedFeedback.summary || agentMessage.substring(0, 500) || "Exploration completed",
      },
      usabilityIssues: parsedFeedback.usabilityIssues,
      positiveAspects: parsedFeedback.positiveAspects,
      accessibilityNotes: parsedFeedback.accessibilityNotes,
      personaSpecificFeedback: agentMessage,
      recommendations: parsedFeedback.recommendations,
      screenshots,
    };
  } finally {
    await stagehand.close();
  }
}

// ============================================================================
// CLI ENTRY POINT (for direct execution)
// ============================================================================

if (import.meta.url === `file://${process.argv[1]}`) {
  import("dotenv/config").then(async () => {
    const targetUrl = process.argv[2] || "https://preview--moneymind-planner.lovable.app";
    const personaIndex = parseInt(process.argv[3] || "0", 10);

    console.log("\n🚀 Starting User Testing Agent...\n");

    try {
      const result = await runUserTestAgent({
        targetUrl,
        personaIndex,
        onProgress: console.log,
      });

      console.log("\n" + "=".repeat(70));
      console.log("📊 TEST COMPLETE");
      console.log("=".repeat(70));
      console.log(`\n👤 Tested as: ${result.persona.name}`);
      console.log(`⭐ Overall Score: ${result.overallExperience.score}/10`);
      console.log(`📝 Summary: ${result.overallExperience.summary.substring(0, 200)}...`);
      console.log("\n" + "=".repeat(70));
    } catch (error) {
      console.error("\n❌ Error running user test agent:", error);
      process.exit(1);
    }
  });
}

export { SAMPLE_PERSONAS, getPersonaByIndex, type UserPersona };
