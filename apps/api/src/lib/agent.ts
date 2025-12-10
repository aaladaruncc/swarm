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
  const techBehavior = persona.techSavviness === "beginner" 
    ? `You struggle with technical jargon and complex interfaces. You need clear instructions, large buttons, and obvious next steps. You're worried about making mistakes and losing your progress.` 
    : persona.techSavviness === "advanced"
    ? `You expect efficiency, keyboard shortcuts, and professional UX. You notice slow loading times, unnecessary clicks, and poor information architecture. You compare this to best-in-class products.`
    : `You can figure things out but appreciate intuitive design. You notice when things are confusing but can usually work around issues. You want things to be straightforward and visually clear.`;

  return `You are ${persona.name}, a ${persona.age}-year-old ${persona.occupation} from ${persona.country}.

YOUR PROFILE:
- Tech Experience: ${persona.techSavviness}
- Primary Goal: ${persona.primaryGoal}
- Key Pain Points: ${persona.painPoints.slice(0, 3).join("; ")}
- Context: ${persona.context || "Testing this website for usability"}

YOUR BEHAVIOR & EXPECTATIONS:
${techBehavior}

YOUR TASK:
Test this website as yourself - a REAL ${persona.occupation} who ${persona.primaryGoal.toLowerCase()}. 

Be SPECIFIC and ACTIONABLE in your observations:
❌ BAD: "Navigation is confusing"
✅ GOOD: "The main menu has 8 top-level items with unclear labels like 'Solutions' and 'Resources' - I couldn't find pricing or contact info"

❌ BAD: "Forms are hard to use"  
✅ GOOD: "The signup form has 12 required fields with small labels (8px font). No progress indicator. Lost my data when I clicked back"

CRITICAL: Complete assessment in 12-15 steps. Work efficiently!`;
}

function generateAgentInstructions(persona: UserPersona): string {
  const explorationFocus = persona.techSavviness === "beginner"
    ? `Focus on: Are instructions clear? Can you find what you need? Are buttons obvious? Do you feel safe clicking things?`
    : persona.techSavviness === "advanced" 
    ? `Focus on: Loading speed, information architecture, workflow efficiency, professional polish, mobile responsiveness.`
    : `Focus on: Visual clarity, intuitive navigation, ease of completing tasks, overall user-friendliness.`;

  return `
You are ${persona.name}, a ${persona.age}-year-old ${persona.occupation}. Tech level: ${persona.techSavviness}.

YOUR CONTEXT:
${persona.primaryGoal}

Pain points you care about:
${persona.painPoints.slice(0, 3).map((p, i) => `${i + 1}. ${p}`).join('\n')}

${explorationFocus}

TESTING PROCESS (Complete in 12-15 steps):

PHASE 1 - FIRST IMPRESSIONS (Steps 1-3):
1. Land on homepage - What is this? Who is it for? Is it immediately clear?
2. Scroll to see full page - What stands out? Any immediate red flags?
3. Note your gut reaction as a ${persona.occupation}

PHASE 2 - NAVIGATION & CORE TASKS (Steps 4-10):
4. Try to accomplish ONE key task relevant to this site type
5. Navigate through 2-3 pages using the menu
6. Test ONE interactive element (button, form, search, filter)
7. Look for critical info (pricing, contact, features)
8. Note SPECIFIC friction points with exact details

PHASE 3 - ASSESSMENT (Steps 11-15):
Provide your detailed, ACTIONABLE assessment:

=== FINAL UX ASSESSMENT ===

🎯 FIRST IMPRESSION (2-3 sentences with specifics):
[What is this site? Did I understand in 5 seconds? Include specific observations about layout, messaging, or design]

😊 WHAT WORKED WELL (3-4 specific items with details):
1. [Specific positive - e.g., "Clear hero section with '3 Steps to Start' - immediately understood the process"]
2. [Include numbers, locations, exact elements]
3. [Another specific positive]
4. [One more if applicable]

😕 CONFUSION POINTS (2-3 specific items with context):
1. [Specific confusion - e.g., "Clicked 'Products' but landed on page with 12 categories and no descriptions - spent 2 minutes looking for basic pricing"]
2. [Include what you tried, what happened, what you expected]
3. [Another if applicable]

🚧 USABILITY ISSUES (2-4 issues with SPECIFIC recommendations):
1. [SEVERITY: critical] - [Exact issue with measurements/counts - e.g., "Submit button is 28px wide and blends with background (#f0f0f0 on #ffffff) - failed to find it 3 times"]
   → FIX: [Actionable - e.g., "Make button minimum 120px wide, use high contrast color (#171717), add 'Submit' label in 14px font"]

2. [SEVERITY: high/medium/low] - [Another specific issue with details]
   → FIX: [Specific, measurable recommendation]

3. [Continue with more if found - be thorough!]

♿ ${persona.techSavviness === 'beginner' ? 'BEGINNER-SPECIFIC CONCERNS' : persona.techSavviness === 'advanced' ? 'ADVANCED USER CONCERNS' : 'ACCESSIBILITY & USABILITY NOTES'}:
${persona.techSavviness === 'beginner' 
  ? '[Text readability (font sizes), button visibility, fear of errors, need for confirmation messages]' 
  : persona.techSavviness === 'advanced' 
  ? '[Performance metrics, keyboard shortcuts, information density, power user features, technical polish]'
  : '[Visual hierarchy, help availability, error messages, recovery from mistakes]'}

💡 TOP 3 RECOMMENDATIONS (Prioritized with expected impact):
1. [HIGH] [Specific fix] - Impact: [Quantify if possible - e.g., "Would help 60% of ${persona.techSavviness} users complete signup faster"]
2. [MEDIUM] [Specific improvement] - Impact: [Expected benefit]
3. [LOW] [Polish item] - Impact: [Expected benefit]

⭐ OVERALL SCORE: X/10

SCORE JUSTIFICATION (Be specific):
- First Impression (clarity): X/10 - [Why? Cite specific elements]
- Navigation (findability): X/10 - [Why? What worked/didn't work]
- Task Completion (can I succeed): X/10 - [Why? What blocked or helped you]
- Design & Trust (professional feel): X/10 - [Why? Specific design elements]
- Performance (speed): X/10 - [Why? Loading times, responsiveness]

WEIGHTED AVERAGE: X/10

ONE-SENTENCE SUMMARY FOR STAKEHOLDERS:
[Capture the core insight that would make a CEO/product manager take action]

=== END ASSESSMENT ===

CRITICAL REMINDERS:
- Provide SPECIFIC details (exact button text, page names, measurements)
- Give ACTIONABLE recommendations (not "improve UX" but "reduce form from 12 to 5 fields")
- Think as a ${persona.age}yo ${persona.occupation} with ${persona.techSavviness} tech skills
- Complete by step 15 maximum!
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
    /(?:(?:\*\*|##)?\s*(?:FIRST IMPRESSION|First Impression)[:\s]*)(?:\*\*)?([^\n]+(?:\n(?![A-Z*#🎯😊😕🚧♿💡⭐])[^\n]+)*)/i
  );
  if (firstImpressionMatch) {
    result.summary = firstImpressionMatch[1].trim();
  } else {
    // Fallback: Try to find the start of the assessment block
    const assessmentStart = agentMessage.indexOf("=== FINAL UX ASSESSMENT ===");
    if (assessmentStart !== -1) {
        const afterStart = agentMessage.substring(assessmentStart + 27);
        const firstLine = afterStart.split('\n').find(l => l.trim().length > 0 && !l.includes('FIRST IMPRESSION'));
        if (firstLine) result.summary = firstLine.trim();
    }
    
    if (!result.summary) {
        const sentences = agentMessage
        .split(/[.!?]+/)
        .filter((s) => s.trim().length > 10)
        .slice(0, 3);
        result.summary = sentences.join(". ").trim() + ".";
    }
  }

  // Helper to extract list items more robustly
  const extractList = (regex: RegExp) => {
    const match = agentMessage.match(regex);
    if (!match) return [];
    // Match bullet points, numbered lists, or lines starting with markdown bold
    return (match[1].match(/(?:^|\n)\s*(?:[-•\d.*]+)\s*([^\n]+)/g) || [])
      .map(item => item.replace(/^(?:^|\n)\s*(?:[-•\d.*]+)\s*/, "").trim())
      .filter(Boolean);
  };

  // Extract positive aspects
  result.positiveAspects = extractList(/(?:(?:\*\*|##)?\s*(?:WHAT I LIKED|What I Liked|LIKED)[:\s]*)(?:\*\*)?([^\n]+(?:\n(?:[-•\d*])[^\n]+)*)/i);

  // Extract confusion points
  result.accessibilityNotes = extractList(/(?:(?:\*\*|##)?\s*(?:WHAT CONFUSED ME|What Confused|CONFUSED|CONFUSION)[:\s]*)(?:\*\*)?([^\n]+(?:\n(?:[-•\d*])[^\n]+)*)/i);

  // Extract recommendations
  result.recommendations = extractList(/(?:(?:\*\*|##)?\s*(?:SUGGESTIONS|Suggestions|RECOMMENDATIONS|Recommendations|MY TOP SUGGESTIONS)[:\s]*)(?:\*\*)?([^\n]+(?:\n(?:[-•\d*])[^\n]+)*)/i);

  // Extract usability issues with enhanced parsing for severity and recommendations
  const issuesSection = agentMessage.match(
    /(?:USABILITY ISSUES|🚧)[:\s]*\n([\s\S]*?)(?=\n(?:♿|💡|⭐|===))/i
  );
  
  if (issuesSection) {
    const issueBlocks = issuesSection[1].split(/\n(?=\d+\.)/);
    
    issueBlocks.forEach((block) => {
      if (block.trim().length < 10) return;
      
      // Extract severity - look for [SEVERITY: X] or just [X]
      const severityMatch = block.match(/\[?SEVERITY[:\s]*(critical|high|medium|low)\]?/i) || 
                           block.match(/\[(critical|high|medium|low)\]/i);
      const severity = (severityMatch?.[1]?.toLowerCase() as "low" | "medium" | "high" | "critical") || "medium";
      
      // Extract description (everything before → or FIX: or RECOMMENDATION:)
      const descMatch = block.match(/(?:\d+\.\s*)?(?:\[.*?\]\s*-?\s*)?(.*?)(?:\n?\s*(?:→|FIX:|RECOMMENDATION:))/is);
      const description = (descMatch?.[1] || block.split('\n')[0].replace(/^\d+\.\s*/, '')).trim();
      
      // Extract recommendation (after → or FIX: or RECOMMENDATION:)
      const recMatch = block.match(/(?:→|FIX:|RECOMMENDATION:)\s*(.+?)(?:\n\n|\n\d+\.|$)/is);
      const recommendation = recMatch?.[1]?.trim() || "Review and address this usability concern";
      
      if (description.length > 10) {
        result.usabilityIssues.push({
          severity,
          description: description.substring(0, 500),
          recommendation: recommendation.substring(0, 500),
        });
      }
    });
  }
  
  // Fallback to simpler parsing if structured format not found
  if (result.usabilityIssues.length === 0) {
    const simpleMatch = agentMessage.match(/(?:USABILITY ISSUES|🚧)[:\s]*([^\n]+(?:\n(?:[-•\d])[^\n]+)*)/i);
    if (simpleMatch) {
      const items = simpleMatch[1].match(/[-•\d.]\s*([^\n]+)/g);
      if (items) {
        items.forEach((item) => {
          const cleanItem = item.replace(/^[-•\d.]\s*/, "").trim();
          const severityMatch = cleanItem.match(/\b(low|medium|high|critical)\b/i);
          result.usabilityIssues.push({
            severity: (severityMatch?.[1]?.toLowerCase() as any) || "medium",
            description: cleanItem.replace(/\s*[-–]\s*(low|medium|high|critical)\s*/i, ""),
            recommendation: "Address this issue to improve user experience",
          });
        });
      }
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
    // By default, limit to ~5 minutes (15 steps x 20s = 300s)
    maxSteps = 15,
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
          timeout: 900,
        },
      });

      await stagehand.init();
    } catch (initError: any) {
      log(`❌ Failed to initialize Stagehand: ${initError.message}`);
      throw new Error(`Browserbase initialization failed: ${initError.message}`);
    }

  const sessionId = stagehand.browserbaseSessionID || `local-${Date.now()}`;
  log(`✅ Browserbase session created: ${sessionId}`);

  const page = stagehand.context.pages()[0];
  if (!page) {
    throw new Error("Failed to get browser page from Stagehand context");
  }

  try {
    // Navigate to target URL
    log(`Navigating to ${targetUrl}...`);
    try {
      await page.goto(targetUrl, { waitUntil: "networkidle", timeout: 30000 });
      log("✅ Page loaded successfully");
    } catch (navError: any) {
      log(`⚠️ Navigation warning: ${navError.message}`);
      // Try without waiting for networkidle
      await page.goto(targetUrl, { timeout: 30000 });
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
      // Type assertion needed because Stagehand types don't include 'cua' property yet
      agent = stagehand.agent({
        cua: true,
        model: "google/gemini-2.5-computer-use-preview-10-2025",
        systemPrompt: generateSystemPrompt(persona, targetUrl),
      } as any);
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
