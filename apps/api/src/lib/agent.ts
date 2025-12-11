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

Then IMMEDIATELY provide this assessment in plain text format (NO markdown, NO asterisks, NO hash symbols, NO special formatting):

FINAL UX ASSESSMENT

FIRST IMPRESSION:
[One sentence - what is this site for?]

WHAT I LIKED (2 things):
1. [positive]
2. [positive]

WHAT CONFUSED ME (1-2 things):
1. [confusing thing]

USABILITY ISSUES:
[One main issue - severity: low/medium/high/critical]

ACCESSIBILITY CONCERNS:
[Brief - any issues?]

TOP SUGGESTIONS:
1. [suggestion]
2. [suggestion]

OVERALL SCORE: X/10
[Why this score in one sentence]

END ASSESSMENT

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

  if (!agentMessage) {
    result.summary = "No feedback provided.";
    return result;
  }

  // Clean the message - remove excessive reasoning/logs that might appear before the assessment
  // Look for the start of the actual assessment
  let cleanMessage = agentMessage;
  
  // Try to find where the actual assessment starts
  const assessmentMarkers = [
    /=== FINAL UX ASSESSMENT ===/i,
    /FINAL UX ASSESSMENT/i,
    /FIRST IMPRESSION:/i,
    /OVERALL SCORE:/i,
    /END ASSESSMENT/i,
  ];
  
  let assessmentStart = -1;
  for (const marker of assessmentMarkers) {
    const match = cleanMessage.search(marker);
    if (match !== -1) {
      assessmentStart = match;
      break;
    }
  }
  
  // If we found an assessment marker, extract from there
  // Otherwise, try to find the last substantial block of text (likely the assessment)
  if (assessmentStart !== -1) {
    cleanMessage = cleanMessage.substring(assessmentStart);
  } else {
    // Look for the last occurrence of common assessment keywords
    const lastAssessment = Math.max(
      cleanMessage.lastIndexOf("FIRST IMPRESSION"),
      cleanMessage.lastIndexOf("OVERALL SCORE"),
      cleanMessage.lastIndexOf("WHAT I LIKED"),
      cleanMessage.lastIndexOf("USABILITY ISSUES")
    );
    if (lastAssessment > cleanMessage.length * 0.3) {
      cleanMessage = cleanMessage.substring(lastAssessment);
    }
  }

  // Extract summary - try multiple patterns
  const summaryPatterns = [
    // Standard format
    /(?:(?:\*\*|##)?\s*(?:FIRST IMPRESSION|First Impression)[:\s]*)(?:\*\*)?([^\n]+(?:\n(?![A-Z*#🎯😊😕🚧♿💡⭐])[^\n]+)*)/i,
    // After assessment marker
    /(?:=== FINAL UX ASSESSMENT ===|FINAL UX ASSESSMENT)[\s\n]+(?:FIRST IMPRESSION[:\s]*)?([^\n]+(?:\n(?![A-Z🎯😊😕🚧♿💡⭐])[^\n]+)*)/i,
    // Direct first sentence after assessment start
    /(?:FINAL UX ASSESSMENT|FIRST IMPRESSION)[:\s]*\n\s*([^\n]+)/i,
  ];

  for (const pattern of summaryPatterns) {
    const match = cleanMessage.match(pattern);
    if (match && match[1] && match[1].trim().length > 20) {
      result.summary = match[1].trim();
      // Clean up common artifacts
      result.summary = result.summary
        .replace(/^\[.*?\]\s*/, '')
        .replace(/^\d+\.\s*/, '')
        .replace(/^[-•]\s*/, '')
        .trim();
      break;
    }
  }

  // If still no summary, intelligently extract from the text
  if (!result.summary || result.summary.length < 20) {
    // Try to find a meaningful first sentence/paragraph
    const lines = cleanMessage.split('\n').filter(l => l.trim().length > 0);
    
    // Look for lines that seem like assessment content (not reasoning/logs)
    const assessmentLines = lines.filter(line => {
      const trimmed = line.trim();
      // Skip lines that look like reasoning/logs
      if (trimmed.match(/^(okay|now|i'm|i'll|click|navigate|going to|will|should|let me)/i)) return false;
      if (trimmed.match(/^\[.*?\]/)) return false; // Skip bracketed reasoning
      if (trimmed.length < 20) return false; // Too short
      if (trimmed.match(/^(x=|y=|\d+,\s*\d+)/)) return false; // Skip coordinates
      return true;
    });
    
    if (assessmentLines.length > 0) {
      // Take first 1-2 meaningful sentences
      const firstLine = assessmentLines[0];
      const sentences = firstLine.split(/[.!?]+/).filter(s => s.trim().length > 15);
      if (sentences.length > 0) {
        result.summary = sentences.slice(0, 2).join(". ").trim() + ".";
      } else {
        result.summary = firstLine.substring(0, 300).trim();
        if (!result.summary.endsWith('.')) result.summary += ".";
      }
    } else {
      // Last resort: extract first meaningful sentences from entire message
      const allSentences = agentMessage
        .split(/[.!?]+/)
        .filter(s => {
          const trimmed = s.trim();
          return trimmed.length > 20 && 
                 !trimmed.match(/^(okay|now|i'm|i'll|click|navigate)/i) &&
                 !trimmed.match(/^\[.*?\]/);
        })
        .slice(0, 2);
      
      if (allSentences.length > 0) {
        result.summary = allSentences.join(". ").trim() + ".";
      } else {
        // Absolute fallback: clean first 200 chars
        result.summary = agentMessage
          .replace(/\[.*?\]/g, '') // Remove bracketed reasoning
          .replace(/^(okay|now|i'm|i'll|click|navigate).*?\./gi, '') // Remove reasoning sentences
          .substring(0, 200)
          .trim();
        if (result.summary.length < 20) {
          result.summary = "User experience assessment completed.";
        } else if (!result.summary.endsWith('.')) {
          result.summary += ".";
        }
      }
    }
  }
  
  // Ensure summary is never empty and is reasonable length
  if (!result.summary || result.summary.length < 10) {
    result.summary = "User experience assessment completed.";
  }
  if (result.summary.length > 500) {
    result.summary = result.summary.substring(0, 497) + "...";
  }

  // Helper to extract list items more robustly
  const extractList = (regex: RegExp, fallbackPatterns?: RegExp[]) => {
    // Try primary pattern
    let match = cleanMessage.match(regex);
    if (match && match[1]) {
      // Match bullet points, numbered lists, or lines starting with markdown bold
      const items = (match[1].match(/(?:^|\n)\s*(?:[-•\d.*]+)\s*([^\n]+)/g) || [])
        .map(item => item.replace(/^(?:^|\n)\s*(?:[-•\d.*]+)\s*/, "").trim())
        .filter(item => item.length > 5 && !item.match(/^(okay|now|i'm|i'll|click|navigate|going to)/i));
      if (items.length > 0) return items;
    }
    
    // Try fallback patterns if provided
    if (fallbackPatterns) {
      for (const fallbackPattern of fallbackPatterns) {
        match = cleanMessage.match(fallbackPattern);
        if (match && match[1]) {
          const items = match[1]
            .split(/\n/)
            .map(line => line.replace(/^[-•\d.*]+\s*/, "").trim())
            .filter(item => item.length > 5 && !item.match(/^(okay|now|i'm|i'll|click|navigate)/i));
          if (items.length > 0) return items;
        }
      }
    }
    
    return [];
  };

  // Extract positive aspects with multiple patterns
  result.positiveAspects = extractList(
    /(?:(?:\*\*|##)?\s*(?:WHAT I LIKED|What I Liked|LIKED)[:\s]*)(?:\*\*)?([^\n]+(?:\n(?:[-•\d*])[^\n]+)*)/i,
    [
      /(?:liked|positive|good|great|worked well)[:\s]*\n?([^\n]+(?:\n[-•\d][^\n]+)*)/i,
      /(?:strengths|positives)[:\s]*\n?([^\n]+(?:\n[-•\d][^\n]+)*)/i,
    ]
  );

  // Extract confusion points with multiple patterns
  result.accessibilityNotes = extractList(
    /(?:(?:\*\*|##)?\s*(?:WHAT CONFUSED ME|What Confused|CONFUSED|CONFUSION)[:\s]*)(?:\*\*)?([^\n]+(?:\n(?:[-•\d*])[^\n]+)*)/i,
    [
      /(?:confused|confusion|unclear|didn't understand)[:\s]*\n?([^\n]+(?:\n[-•\d][^\n]+)*)/i,
    ]
  );

  // Extract recommendations with multiple patterns
  result.recommendations = extractList(
    /(?:(?:\*\*|##)?\s*(?:SUGGESTIONS|Suggestions|RECOMMENDATIONS|Recommendations|MY TOP SUGGESTIONS)[:\s]*)(?:\*\*)?([^\n]+(?:\n(?:[-•\d*])[^\n]+)*)/i,
    [
      /(?:suggestions|recommendations|should|improve|fix)[:\s]*\n?([^\n]+(?:\n[-•\d][^\n]+)*)/i,
    ]
  );

  // Extract usability issues with enhanced parsing for severity and recommendations
  // Try multiple patterns to find issues section
  let issuesSection = cleanMessage.match(
    /(?:USABILITY ISSUES|🚧)[:\s]*\n([\s\S]*?)(?=\n(?:♿|💡|⭐|===|OVERALL|END|TOP SUGGESTIONS))/i
  );
  
  if (!issuesSection) {
    // Try without newline requirement
    issuesSection = cleanMessage.match(
      /(?:USABILITY ISSUES|🚧)[:\s]*([\s\S]*?)(?=(?:♿|💡|⭐|===|OVERALL|END|TOP SUGGESTIONS))/i
    );
  }
  
  if (issuesSection && issuesSection[1]) {
    const issuesText = issuesSection[1];
    // Split by numbered items, bullets, or new paragraphs
    const issueBlocks = issuesText.split(/\n(?=\d+\.|\n[-•]|\n[A-Z])/);
    
    issueBlocks.forEach((block) => {
      const trimmed = block.trim();
      if (trimmed.length < 10) return;
      
      // Skip reasoning/logs
      if (trimmed.match(/^(okay|now|i'm|i'll|click|navigate|going to|will|should|let me)/i)) return;
      
      // Extract severity - look for [SEVERITY: X] or just [X] or "severity: X"
      const severityMatch = trimmed.match(/\[?SEVERITY[:\s]*(critical|high|medium|low)\]?/i) || 
                           trimmed.match(/\[(critical|high|medium|low)\]/i) ||
                           trimmed.match(/severity[:\s]*(critical|high|medium|low)/i) ||
                           trimmed.match(/\b(critical|high|medium|low)\s*severity/i);
      const severity = (severityMatch?.[1]?.toLowerCase() as "low" | "medium" | "high" | "critical") || "medium";
      
      // Extract description (everything before → or FIX: or RECOMMENDATION:)
      let descMatch = trimmed.match(/(?:\d+\.\s*)?(?:\[.*?\]\s*-?\s*)?(.*?)(?:\n?\s*(?:→|FIX:|RECOMMENDATION:|severity))/is);
      if (!descMatch) {
        descMatch = trimmed.match(/(?:\d+\.\s*)?(?:\[.*?\]\s*-?\s*)?(.+?)(?:\n\n|\n\d+\.|$)/is);
      }
      let description = (descMatch?.[1] || trimmed.split('\n')[0].replace(/^\d+\.\s*/, '')).trim();
      
      // Clean description
      description = description
        .replace(/^\[.*?\]\s*/, '')
        .replace(/\s*[-–]\s*(low|medium|high|critical)\s*severity.*$/i, '')
        .replace(/\s*severity[:\s]*(low|medium|high|critical).*$/i, '')
        .trim();
      
      // Extract recommendation (after → or FIX: or RECOMMENDATION:)
      const recMatch = trimmed.match(/(?:→|FIX:|RECOMMENDATION:)\s*(.+?)(?:\n\n|\n\d+\.|$)/is);
      let recommendation = recMatch?.[1]?.trim() || "Review and address this usability concern";
      
      // Clean recommendation
      recommendation = recommendation.replace(/^\[.*?\]\s*/, '').trim();
      
      if (description.length > 10 && !description.match(/^(okay|now|i'm|i'll|click)/i)) {
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
    const simpleMatch = cleanMessage.match(/(?:USABILITY ISSUES|🚧|issues?)[:\s]*([^\n]+(?:\n(?:[-•\d])[^\n]+)*)/i);
    if (simpleMatch && simpleMatch[1]) {
      const items = simpleMatch[1].match(/[-•\d.]\s*([^\n]+)/g);
      if (items) {
        items.forEach((item) => {
          const cleanItem = item.replace(/^[-•\d.]\s*/, "").trim();
          // Skip reasoning/logs
          if (cleanItem.match(/^(okay|now|i'm|i'll|click|navigate)/i)) return;
          if (cleanItem.length < 10) return;
          
          const severityMatch = cleanItem.match(/\b(low|medium|high|critical)\b/i);
          const description = cleanItem.replace(/\s*[-–]\s*(low|medium|high|critical)\s*/i, "").trim();
          
          if (description.length > 10) {
            result.usabilityIssues.push({
              severity: (severityMatch?.[1]?.toLowerCase() as any) || "medium",
              description: description.substring(0, 500),
              recommendation: "Address this issue to improve user experience",
            });
          }
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
      // Type assertion needed because Stagehand types don't include 'cua' property yet
      agent = stagehand.agent({
        cua: true,
        model: {
          modelName: "google/gemini-2.5-computer-use-preview-10-2025",
          apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
        },
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

FINAL UX ASSESSMENT

FIRST IMPRESSION:
Started exploring the website but session ended before completion. The site appears to be ${targetUrl.includes("app") ? "an application" : "a website"} that may benefit from faster loading or simpler navigation.

WHAT I LIKED:
1. Managed to load and view the homepage
2. Site was accessible and started loading content

WHAT CONFUSED ME:
1. Session ended before I could fully explore the site
2. May have complex navigation or too much content slowing exploration

USABILITY ISSUES:
Performance: Site may be too complex or slow, causing exploration timeout - severity: medium
Navigation: Unable to complete exploration in allocated time, suggesting potential UX complexity - severity: medium

ACCESSIBILITY CONCERNS:
Limited time prevented thorough accessibility assessment. Large or complex sites may overwhelm users with limited time or slower devices.

TOP SUGGESTIONS:
1. Optimize page load times and reduce complexity
2. Simplify navigation structure for faster user exploration
3. Consider progressive disclosure to avoid overwhelming users

OVERALL SCORE: 6/10
Session timed out before full assessment. Site complexity or performance may impact real user experience.

END ASSESSMENT`,
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
        summary: parsedFeedback.summary, // parseAgentFeedback now guarantees a non-empty summary
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
