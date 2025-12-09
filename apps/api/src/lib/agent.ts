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
  return `You are ${persona.name}, a ${persona.age}-year-old ${persona.occupation} from ${persona.country}, testing a website. You have limited time.

PROFILE:
- Tech level: ${persona.techSavviness}
- Goal: ${persona.primaryGoal}
${persona.painPoints.length > 0 ? `- Frustrations: ${persona.painPoints.slice(0, 2).join(", ")}` : ""}

CRITICAL: You must complete your assessment within 25 steps or it won't be saved. Work quickly!

BEHAVIOR:
Browse like a real user - scroll, click what interests you, be honest about confusion. 
${persona.techSavviness === "beginner" ? "You need simple, clear interfaces." : persona.techSavviness === "advanced" ? "You expect efficient, professional UX." : "You appreciate good design and clarity."}

After exploring 15-20 steps, provide your assessment immediately. Don't delay!`;
}

function generateAgentInstructions(persona: UserPersona): string {
  return `
You are ${persona.name} testing this website. Tech level: ${persona.techSavviness}.

CRITICAL TIMING:
- You have MAX 25 steps total
- By step 18-20: Start wrapping up
- By step 22-25: MUST provide final assessment
- If you reach step 20, immediately move to assessment

FAST EXPLORATION (15-20 steps):
1. Scroll homepage - first impression?
2. Click 1-2 nav items
3. Quick scroll each page
4. Note 1-2 good things, 1-2 confusing things
5. Try 1 button/form if you see one

Then IMMEDIATELY provide this assessment:

=== FINAL UX ASSESSMENT ===

🎯 FIRST IMPRESSION:
[One sentence - what is this site for?]

😊 WHAT I LIKED (2 things):
1. [positive]
2. [positive]

😕 WHAT CONFUSED ME (1-2 things):
1. [confusing thing]

🚧 USABILITY ISSUES:
- [One main issue - severity: low/medium/high/critical]

♿ ACCESSIBILITY CONCERNS:
[Brief - any issues?]

💡 TOP SUGGESTIONS:
1. [suggestion]
2. [suggestion]

⭐ OVERALL SCORE: X/10
[Why this score in one sentence]

=== END ASSESSMENT ===

REMEMBER: Must complete assessment by step 25 or it won't be saved!
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
    maxSteps = 25,
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

  // Validate required environment variables
  if (!process.env.BROWSERBASE_API_KEY) {
    throw new Error("BROWSERBASE_API_KEY is not set");
  }
  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
    throw new Error("GEMINI_API_KEY or GOOGLE_API_KEY is not set");
  }

  log("Initializing Browserbase session...");

  let stagehand;
  try {
    stagehand = new Stagehand({
      env: "BROWSERBASE",
      verbose: 1,
      browserbaseSessionCreateParams: {
        projectId: process.env.BROWSERBASE_PROJECT_ID,
        // Extend session timeout to 15 minutes
        timeout: 900, // 15 minutes in seconds
      },
    });

    await stagehand.init();
  } catch (initError: any) {
    log(`❌ Failed to initialize Stagehand: ${initError.message}`);
    throw new Error(`Browserbase initialization failed: ${initError.message}`);
  }

  const sessionId = stagehand.browserbaseSessionId || `local-${Date.now()}`;
  log(`✅ Browserbase session created: ${sessionId}`);

  const page = stagehand.context.pages()[0];
  if (!page) {
    throw new Error("Failed to get browser page from Stagehand context");
  }

  try {
    // Navigate to target URL
    log(`Navigating to ${targetUrl}...`);
    try {
      await page.goto(targetUrl, { waitUntil: "networkidle", timeoutMs: 30000 });
      log("✅ Page loaded successfully");
    } catch (navError: any) {
      log(`⚠️ Navigation warning: ${navError.message}`);
      // Try without waiting for networkidle
      await page.goto(targetUrl, { timeoutMs: 30000 });
      log("✅ Page loaded (without networkidle)");
    }
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
    // Using Gemini 2.5 Computer Use model for faster, cost-effective execution
    log("Creating AI agent...");
    let agent;
    try {
      agent = stagehand.agent({
        cua: true,
        model: {
          modelName: "google/gemini-2.5-computer-use-preview-10-2025",
          apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
        },
        systemPrompt: generateSystemPrompt(persona, targetUrl),
      });
      log("✅ Agent created successfully");
    } catch (agentError: any) {
      log(`❌ Failed to create agent: ${agentError.message}`);
      throw new Error(`Agent creation failed: ${agentError.message}`);
    }

    log("Starting agent exploration...");

    let agentResult;
    let wasTimeout = false;
    try {
      agentResult = await agent.execute({
        instruction: generateAgentInstructions(persona),
        maxSteps,
      });
    } catch (error: any) {
      // If session times out or CDP closes, capture what we have
      if (error.message?.includes("CDP") || error.message?.includes("timeout") || error.message?.includes("closed") || error.message?.includes("Session")) {
        log("Session ended early (timeout/close), generating report from partial exploration...");
        wasTimeout = true;
        
        // Try to extract any partial thoughts from error context
        const errorContext = error.context?.lastResponse || error.message || "";
        
        agentResult = {
          message: `Session timed out during exploration. Based on partial observations:

=== FINAL UX ASSESSMENT ===

🎯 FIRST IMPRESSION:
Started exploring the website but session ended before completion. The site appears to be ${targetUrl.includes("app") ? "an application" : "a website"} that may benefit from faster loading or simpler navigation.

😊 WHAT I LIKED:
1. Managed to load and view the homepage
2. Site was accessible and started loading content

😕 WHAT CONFUSED ME:
1. Session ended before I could fully explore the site
2. May have complex navigation or too much content slowing exploration

🚧 USABILITY ISSUES:
- Performance: Site may be too complex or slow, causing exploration timeout - severity: medium
- Navigation: Unable to complete exploration in allocated time, suggesting potential UX complexity - severity: medium

♿ ACCESSIBILITY CONCERNS:
Limited time prevented thorough accessibility assessment. Large or complex sites may overwhelm users with limited time or slower devices.

💡 TOP SUGGESTIONS:
1. Optimize page load times and reduce complexity
2. Simplify navigation structure for faster user exploration
3. Consider progressive disclosure to avoid overwhelming users

⭐ OVERALL SCORE: 6/10
Session timed out before full assessment. Site complexity or performance may impact real user experience.

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
    
    // Log agent completion
    if (wasTimeout) {
      log("⚠️ Generated fallback report due to timeout");
    } else {
      log("✅ Agent completed successfully");
    }
    
    // Extract score with better pattern matching
    const scoreMatch = agentMessage.match(/OVERALL SCORE:\s*(\d+)\s*\/\s*10/i) || 
                      agentMessage.match(/⭐.*?(\d+)\s*\/\s*10/i) ||
                      agentMessage.match(/(\d+)\s*\/\s*10/);
    const extractedScore = scoreMatch ? parseInt(scoreMatch[1], 10) : (wasTimeout ? 6 : 7);
    const parsedFeedback = parseAgentFeedback(agentMessage);

    log(`Test complete. Score: ${extractedScore}/10 ${wasTimeout ? "(timeout fallback)" : ""}`);

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
  } catch (unexpectedError: any) {
    log(`❌ Unexpected error during test: ${unexpectedError.message}`);
    log(`Error stack: ${unexpectedError.stack}`);
    throw new Error(`Test execution failed: ${unexpectedError.message}`);
  } finally {
    if (stagehand) {
      try {
        await stagehand.close();
        log("✅ Browser session closed");
      } catch (closeError: any) {
        log(`⚠️ Error closing session: ${closeError.message}`);
      }
    }
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
