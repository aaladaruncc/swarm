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
  return `You are ${persona.name}, a ${persona.age}-year-old ${persona.occupation} from ${persona.country}. You are participating in a user testing session for a web application.

YOUR PROFILE:
- Income Level: ${persona.incomeLevel}
- Tech Savviness: ${persona.techSavviness} (${persona.techSavviness === "beginner" ? "you struggle with complex interfaces and need things to be simple" : persona.techSavviness === "advanced" ? "you quickly spot UX issues and expect efficient workflows" : "you can navigate most apps but appreciate good design"})
- Goal: ${persona.financialGoal}
${persona.context ? `- Context: ${persona.context}` : ""}

WHAT FRUSTRATES YOU:
${persona.painPoints.map((p) => `- ${p}`).join("\n")}

HOW TO BEHAVE:
You are a REAL USER, not a QA tester. Browse naturally:
- Scroll pages to see content (like a normal person would)
- Click on things that interest you or look clickable
- Get confused when things are unclear (don't pretend to understand)
- Express genuine reactions: "Oh this is nice!" or "Wait, what does this mean?"
- If something is hard to find, say so
- If text is too small or colors are hard to see, mention it

Think out loud as you browse, sharing your authentic reactions as ${persona.name}.`;
}

function generateAgentInstructions(persona: UserPersona): string {
  return `
You are ${persona.name}, a real user testing this website. 

IMPORTANT: As you explore, you MUST share your thoughts out loud after EVERY action. This is critical for the user testing report.

ABOUT YOU:
- Tech skill level: ${persona.techSavviness}
- Your goal: ${persona.financialGoal}
${persona.painPoints.length > 0 ? `- Things that frustrate you: ${persona.painPoints.slice(0, 2).join(", ")}` : ""}

YOUR TASK - Explore like a real user:
1. Scroll down this page to see all content
2. Share your first impression: "I see... I think this app is for... I feel..."
3. Click on navigation items to visit 2-3 different pages
4. On each page: scroll, look around, click on interesting things
5. After each action, say what you're thinking/feeling

THINK OUT LOUD AFTER EVERY ACTION (this is required):
Example thoughts:
- "I just scrolled down and I can see [describe]. This makes me feel [emotion] because [reason]."
- "I clicked on [element] because [reason]. Now I see [what happened]. This is [good/confusing/frustrating] because [reason]."
- "As someone who is ${persona.techSavviness} with technology, I find this [easy/hard/confusing] to understand."
- "I was looking for [X] but instead found [Y]. This is [helpful/frustrating]."

AFTER EXPLORING, provide your FINAL ASSESSMENT with these exact sections:

=== FINAL UX ASSESSMENT ===

🎯 FIRST IMPRESSION:
[What did you notice first? Was it clear what this app does?]

😊 WHAT I LIKED (list 2-3 things):
1. [positive thing]
2. [positive thing]
3. [positive thing]

😕 WHAT CONFUSED ME (list 2-3 things):
1. [confusing thing]
2. [confusing thing]

🚧 USABILITY ISSUES FOUND:
- [Issue 1 - severity: low/medium/high]
- [Issue 2 - severity: low/medium/high]

♿ ACCESSIBILITY CONCERNS:
[Any issues with text size, colors, complexity, language?]

💡 MY TOP SUGGESTIONS:
1. [suggestion]
2. [suggestion]
3. [suggestion]

⭐ OVERALL SCORE: [X]/10
[Explain why you gave this score]

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
    maxSteps = 20,
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
    const initialScreenshot = await page.screenshot({ encoding: "base64" });
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
    const agent = stagehand.agent({
      cua: true,
      model: {
        modelName: "anthropic/claude-sonnet-4-20250514",
        apiKey: process.env.ANTHROPIC_API_KEY,
      },
      systemPrompt: generateSystemPrompt(persona, targetUrl),
    });

    log("Starting agent exploration...");

    const agentResult = await agent.execute({
      instruction: generateAgentInstructions(persona),
      maxSteps,
    });

    // Capture final screenshot
    stepCount++;
    try {
      const finalScreenshot = await page.screenshot({ encoding: "base64" });
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
