import "dotenv/config";
import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";

// ============================================================================
// SCHEMAS
// ============================================================================

const UserPersonaSchema = z.object({
  name: z.string(),
  age: z.number().min(18).max(100),
  country: z.string(),
  occupation: z.string(),
  incomeLevel: z.enum(["low", "medium", "high"]),
  techSavviness: z.enum(["beginner", "intermediate", "advanced"]),
  financialGoal: z.string(),
  painPoints: z.array(z.string()),
  context: z.string().optional(),
});

const InteractionLogSchema = z.object({
  timestamp: z.string(),
  action: z.string(),
  observation: z.string(),
  screenshotPath: z.string().optional(),
  sentiment: z.enum(["positive", "neutral", "confused", "frustrated"]),
});

const FeedbackReportSchema = z.object({
  persona: UserPersonaSchema,
  sessionId: z.string(),
  targetUrl: z.string(),
  totalDuration: z.string(),
  interactionLogs: z.array(InteractionLogSchema),
  overallExperience: z.object({
    score: z.number().min(1).max(10),
    summary: z.string(),
  }),
  usabilityIssues: z.array(
    z.object({
      severity: z.enum(["low", "medium", "high", "critical"]),
      description: z.string(),
      recommendation: z.string(),
    })
  ),
  positiveAspects: z.array(z.string()),
  accessibilityNotes: z.array(z.string()),
  personaSpecificFeedback: z.string(),
  recommendations: z.array(z.string()),
});

type UserPersona = z.infer<typeof UserPersonaSchema>;
type InteractionLog = z.infer<typeof InteractionLogSchema>;
type FeedbackReport = z.infer<typeof FeedbackReportSchema>;

// ============================================================================
// PERSONA EXAMPLES
// ============================================================================

const SAMPLE_PERSONAS: UserPersona[] = [
  {
    name: "Maria",
    age: 34,
    country: "Brazil",
    occupation: "Elementary School Teacher",
    incomeLevel: "medium",
    techSavviness: "beginner",
    financialGoal: "Save for my children's education while managing monthly bills",
    painPoints: [
      "Complex financial jargon confuses me",
      "I need simple, visual explanations",
      "Limited time to learn new apps",
      "English is my second language",
    ],
    context: "Mother of two, first time using a budgeting app",
  },
  {
    name: "James",
    age: 62,
    country: "United States",
    occupation: "Retired Factory Worker",
    incomeLevel: "low",
    techSavviness: "beginner",
    financialGoal: "Stretch my fixed retirement income and avoid debt",
    painPoints: [
      "Small text is hard to read",
      "Too many options overwhelm me",
      "Worried about security of my information",
      "Prefer simple, straightforward interfaces",
    ],
    context: "Lives on social security, using smartphone for first time",
  },
  {
    name: "Priya",
    age: 28,
    country: "India",
    occupation: "Software Engineer",
    incomeLevel: "high",
    techSavviness: "advanced",
    financialGoal: "Optimize investments and build wealth for early retirement",
    painPoints: [
      "Need detailed analytics and graphs",
      "Want export capabilities for my own analysis",
      "Impatient with slow or clunky interfaces",
      "Want automation features",
    ],
    context: "Tech-savvy millennial, uses multiple financial apps",
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createSessionDir(): { screenshotDir: string; logsDir: string; sessionTimestamp: string } {
  const sessionTimestamp = Date.now().toString();
  const baseDir = path.join(process.cwd(), "sessions", sessionTimestamp);
  const screenshotDir = path.join(baseDir, "screenshots");
  const logsDir = baseDir;
  
  fs.mkdirSync(screenshotDir, { recursive: true });
  
  return { screenshotDir, logsDir, sessionTimestamp };
}

// Helper to append thoughts to the live log file
function appendToThoughtsLog(logsDir: string, content: string): void {
  const thoughtsPath = path.join(logsDir, "thoughts-log.md");
  const timestamp = new Date().toISOString();
  const entry = `\n---\n**[${timestamp}]**\n${content}\n`;
  fs.appendFileSync(thoughtsPath, entry);
}

// Initialize the thoughts log file
function initThoughtsLog(logsDir: string, persona: any, targetUrl: string): void {
  const thoughtsPath = path.join(logsDir, "thoughts-log.md");
  const header = `# 🧠 Live Thoughts Log

## Session Info
- **Persona:** ${persona.name} (${persona.age}yo ${persona.occupation})
- **Tech Level:** ${persona.techSavviness}
- **Target URL:** ${targetUrl}
- **Started:** ${new Date().toISOString()}

---

## Live Thoughts & Observations

`;
  fs.writeFileSync(thoughtsPath, header);
}

// Parse agent's response to extract structured feedback
function parseAgentFeedback(agentMessage: string, persona: UserPersona): {
  summary: string;
  positiveAspects: string[];
  accessibilityNotes: string[];
  usabilityIssues: { severity: "low" | "medium" | "high" | "critical"; description: string; recommendation: string }[];
  recommendations: string[];
} {
  const result = {
    summary: "",
    positiveAspects: [] as string[],
    accessibilityNotes: [] as string[],
    usabilityIssues: [] as { severity: "low" | "medium" | "high" | "critical"; description: string; recommendation: string }[],
    recommendations: [] as string[],
  };

  if (!agentMessage) return result;

  // Extract summary - first paragraph or first impression section
  const firstImpressionMatch = agentMessage.match(/(?:FIRST IMPRESSION|First Impression)[:\s]*([^\n]+(?:\n(?![A-Z🎯😊😕🚧♿💡⭐])[^\n]+)*)/i);
  if (firstImpressionMatch) {
    result.summary = firstImpressionMatch[1].trim();
  } else {
    // Use first 2-3 sentences as summary
    const sentences = agentMessage.split(/[.!?]+/).filter(s => s.trim().length > 10).slice(0, 3);
    result.summary = sentences.join(". ").trim() + ".";
  }

  // Extract positive aspects - look for "liked", "nice", "good", "great", "worked well", etc.
  const likedMatch = agentMessage.match(/(?:WHAT I LIKED|What I Liked|LIKED)[:\s]*([^\n]+(?:\n(?:[-•\d])[^\n]+)*)/i);
  if (likedMatch) {
    const items = likedMatch[1].match(/[-•\d.]\s*([^\n]+)/g);
    if (items) {
      result.positiveAspects = items.map(item => item.replace(/^[-•\d.]\s*/, "").trim()).filter(Boolean);
    }
  }
  
  // Also scan for positive sentiment phrases
  const positivePatterns = [
    /(?:this is nice|I like|I liked|looks good|easy to|clear|intuitive|helpful|impressed)[^.!?]*[.!?]/gi,
    /(?:the .+ is (?:nice|good|great|helpful|clear))[^.!?]*[.!?]/gi,
  ];
  positivePatterns.forEach(pattern => {
    const matches = agentMessage.match(pattern);
    if (matches && result.positiveAspects.length < 5) {
      matches.forEach(m => {
        if (!result.positiveAspects.includes(m.trim())) {
          result.positiveAspects.push(m.trim());
        }
      });
    }
  });

  // Extract confusion/issues - look for "confused", "frustrating", "unclear", "hard to", etc.
  const confusedMatch = agentMessage.match(/(?:WHAT CONFUSED ME|What Confused|CONFUSED|CONFUSION)[:\s]*([^\n]+(?:\n(?:[-•\d])[^\n]+)*)/i);
  if (confusedMatch) {
    const items = confusedMatch[1].match(/[-•\d.]\s*([^\n]+)/g);
    if (items) {
      result.accessibilityNotes = items.map(item => item.replace(/^[-•\d.]\s*/, "").trim()).filter(Boolean);
    }
  }

  // Scan for confusion/frustration phrases
  const negativePatterns = [
    /(?:confused|confusing|frustrat|unclear|hard to find|hard to understand|expected .+ but|didn't expect|not sure)[^.!?]*[.!?]/gi,
    /(?:I don't understand|where is|can't find|difficult to)[^.!?]*[.!?]/gi,
  ];
  negativePatterns.forEach(pattern => {
    const matches = agentMessage.match(pattern);
    if (matches && result.accessibilityNotes.length < 5) {
      matches.forEach(m => {
        if (!result.accessibilityNotes.includes(m.trim())) {
          result.accessibilityNotes.push(m.trim());
        }
      });
    }
  });

  // Extract usability issues
  const issuesMatch = agentMessage.match(/(?:USABILITY ISSUES|Usability Issues|ISSUES FOUND)[:\s]*([^\n]+(?:\n(?:[-•\d])[^\n]+)*)/i);
  if (issuesMatch) {
    const items = issuesMatch[1].match(/[-•\d.]\s*([^\n]+)/g);
    if (items) {
      items.forEach(item => {
        const cleanItem = item.replace(/^[-•\d.]\s*/, "").trim();
        const severityMatch = cleanItem.match(/\b(low|medium|high|critical)\b/i);
        result.usabilityIssues.push({
          severity: (severityMatch?.[1]?.toLowerCase() as "low" | "medium" | "high" | "critical") || "medium",
          description: cleanItem.replace(/\s*[-–]\s*(low|medium|high|critical)\s*/i, ""),
          recommendation: "Address this issue to improve user experience",
        });
      });
    }
  }

  // Extract recommendations
  const recsMatch = agentMessage.match(/(?:SUGGESTIONS|Suggestions|RECOMMENDATIONS|Recommendations|MY TOP SUGGESTIONS)[:\s]*([^\n]+(?:\n(?:[-•\d])[^\n]+)*)/i);
  if (recsMatch) {
    const items = recsMatch[1].match(/[-•\d.]\s*([^\n]+)/g);
    if (items) {
      result.recommendations = items.map(item => item.replace(/^[-•\d.]\s*/, "").trim()).filter(Boolean);
    }
  }

  // If we couldn't extract structured recommendations, generate some based on issues found
  if (result.recommendations.length === 0 && result.accessibilityNotes.length > 0) {
    result.recommendations = result.accessibilityNotes.slice(0, 3).map(note => 
      `Address: ${note.substring(0, 100)}${note.length > 100 ? "..." : ""}`
    );
  }

  return result;
}

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

async function captureScreenshot(
  page: any,
  screenshotDir: string,
  stepNumber: number,
  description: string
): Promise<string> {
  const filename = `step-${stepNumber.toString().padStart(3, "0")}-${description
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .substring(0, 50)}.png`;
  const filepath = path.join(screenshotDir, filename);

  await page.screenshot({ path: filepath, fullPage: false });
  console.log(`📸 Screenshot saved: ${filename}`);

  return filepath;
}

async function extractPageContext(stagehand: any): Promise<string> {
  try {
    const result = await stagehand.extract(
      "Describe what is visible on this page: the main elements, navigation, any forms or buttons, and the overall layout. Be concise."
    );
    return result.extraction || "Unable to extract page context";
  } catch (error) {
    return "Error extracting page context";
  }
}

// ============================================================================
// MAIN AGENT FLOW
// ============================================================================

async function runUserTestAgent(
  targetUrl: string,
  persona: UserPersona
): Promise<FeedbackReport & { logsDir: string }> {
  const startTime = Date.now();
  const { screenshotDir, logsDir, sessionTimestamp } = createSessionDir();
  const interactionLogs: InteractionLog[] = [];
  let stepCount = 0;

  console.log("\n" + "=".repeat(70));
  console.log("🧪 USER TESTING AGENT - BROWSERBASE STAGEHAND");
  console.log("=".repeat(70));
  console.log(`\n👤 Persona: ${persona.name}, ${persona.age}yo ${persona.occupation}`);
  console.log(`📍 Country: ${persona.country}`);
  console.log(`💻 Tech Level: ${persona.techSavviness}`);
  console.log(`🎯 Goal: ${persona.financialGoal}`);
  console.log(`\n🌐 Target URL: ${targetUrl}`);
  console.log(`📁 Session folder: ${logsDir}\n`);

  // Initialize the live thoughts log
  initThoughtsLog(logsDir, persona, targetUrl);
  appendToThoughtsLog(logsDir, `🚀 **Session started**\nPersona ${persona.name} is beginning to explore ${targetUrl}`);

  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    verbose: 1,
  });

  await stagehand.init();

  const sessionId = stagehand.browserbaseSessionId || `local-${Date.now()}`;
  console.log(`\n🔗 Session ID: ${sessionId}`);
  console.log(`👀 Watch live: https://browserbase.com/sessions/${sessionId}\n`);

  const page = stagehand.context.pages()[0];

  try {
    // Navigate to target URL
    console.log(`\n📍 Navigating to ${targetUrl}...`);
    await page.goto(targetUrl, { waitUntil: "networkidle" });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Initial screenshot
    stepCount++;
    const initialScreenshot = await captureScreenshot(
      page,
      screenshotDir,
      stepCount,
      "initial-landing"
    );

    const initialContext = await extractPageContext(stagehand);
    interactionLogs.push({
      timestamp: new Date().toISOString(),
      action: "Landed on page",
      observation: initialContext,
      screenshotPath: initialScreenshot,
      sentiment: "neutral",
    });

    appendToThoughtsLog(logsDir, `📍 **Landed on page**\n${initialContext}`);

    // Create the agent with persona-driven system prompt
    // CUA (Computer Use Agent) mode enables the agent to see screenshots of the page
    const agent = stagehand.agent({
      cua: true,
      model: {
        modelName: "anthropic/claude-sonnet-4-20250514",
        apiKey: process.env.ANTHROPIC_API_KEY,
      },
      systemPrompt: generateSystemPrompt(persona, targetUrl),
    });

    // Execute the agent with the user testing task
    console.log("\n🤖 Starting agent exploration...\n");
    appendToThoughtsLog(logsDir, `🤖 **Agent exploration started**`);

    const agentInstructions = `
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

    const agentResult = await agent.execute({
      instruction: agentInstructions,
      maxSteps: 20,
    });

    // Save the agent's thoughts and final message to the log
    if (agentResult.message) {
      appendToThoughtsLog(logsDir, `\n## 📝 Agent's Complete Response\n\n${agentResult.message}`);
    }

    // Capture final screenshot (with error handling for closed session)
    stepCount++;
    let finalScreenshot = "";
    let finalContext = "Session completed";
    
    try {
      finalScreenshot = await captureScreenshot(
        page,
        screenshotDir,
        stepCount,
        "final-state"
      );
      finalContext = await extractPageContext(stagehand);
    } catch (err) {
      console.log("⚠️ Could not capture final screenshot (session may have ended)");
      appendToThoughtsLog(logsDir, `⚠️ Session ended before final screenshot could be captured`);
    }

    interactionLogs.push({
      timestamp: new Date().toISOString(),
      action: "Completed exploration",
      observation: finalContext,
      screenshotPath: finalScreenshot || undefined,
      sentiment: "neutral",
    });

    appendToThoughtsLog(logsDir, `✅ **Exploration completed**\n${finalContext}`);
    console.log("\n📝 Agent exploration complete. Generating feedback report...\n");

    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);

    // Parse the agent's response for structured feedback
    const agentMessage = agentResult.message || "";
    
    // Extract score from agent message (look for patterns like "8/10" or "Score: 8")
    const scoreMatch = agentMessage.match(/(\d+)\s*\/\s*10/);
    const extractedScore = scoreMatch ? parseInt(scoreMatch[1], 10) : 5;

    // Parse structured sections from agent's response
    const parsedFeedback = parseAgentFeedback(agentMessage, persona);

    // Compile final report using the agent's direct feedback
    const report: FeedbackReport = {
      persona,
      sessionId,
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
    };

    // Finalize the thoughts log
    appendToThoughtsLog(logsDir, `\n---\n\n## 📊 Session Summary\n- Duration: ${report.totalDuration}\n- Score: ${extractedScore}/10\n- Session ID: ${sessionId}`);

    return { ...report, logsDir };
  } finally {
    await stagehand.close();
  }
}

// ============================================================================
// REPORT GENERATION
// ============================================================================

function generateMarkdownReport(report: FeedbackReport): string {
  const { persona } = report;

  return `# 📊 User Testing Report

## Session Information
| Field | Value |
|-------|-------|
| **Session ID** | \`${report.sessionId}\` |
| **Target URL** | ${report.targetUrl} |
| **Duration** | ${report.totalDuration} |
| **Test Date** | ${new Date().toLocaleDateString()} |

---

## 👤 Persona Profile

### ${persona.name}
| Attribute | Value |
|-----------|-------|
| **Age** | ${persona.age} |
| **Country** | ${persona.country} |
| **Occupation** | ${persona.occupation} |
| **Income Level** | ${persona.incomeLevel} |
| **Tech Savviness** | ${persona.techSavviness} |

**Financial Goal:** ${persona.financialGoal}

**Pain Points:**
${persona.painPoints.map((p) => `- ${p}`).join("\n")}

${persona.context ? `**Context:** ${persona.context}` : ""}

---

## 📈 Overall Experience

### Score: ${report.overallExperience.score}/10 ${"⭐".repeat(Math.round(report.overallExperience.score))}

${report.overallExperience.summary}

---

## 🐛 Usability Issues Found

${
  report.usabilityIssues.length > 0
    ? report.usabilityIssues
        .map(
          (issue, i) => `
### Issue ${i + 1}: ${issue.severity.toUpperCase()}

**Description:** ${issue.description}

**Recommendation:** ${issue.recommendation}
`
        )
        .join("\n")
    : "_No major usability issues identified._"
}

---

## ✅ Positive Aspects

${
  report.positiveAspects.length > 0
    ? report.positiveAspects.map((p) => `- ✨ ${p}`).join("\n")
    : "_No positive aspects noted._"
}

---

## ♿ Accessibility Notes

${
  report.accessibilityNotes.length > 0
    ? report.accessibilityNotes.map((n) => `- ${n}`).join("\n")
    : "_No accessibility concerns noted._"
}

---

## 💭 Persona-Specific Feedback

> "${report.personaSpecificFeedback}"
> 
> — ${persona.name}, ${persona.age}, ${persona.occupation}

---

## 📋 Recommendations

${
  report.recommendations.length > 0
    ? report.recommendations.map((r, i) => `${i + 1}. ${r}`).join("\n")
    : "_No specific recommendations._"
}

---

## 📸 Screenshots

Screenshots saved to: \`${report.interactionLogs[0]?.screenshotPath?.split("/").slice(0, -1).join("/") || "screenshots/"}\`

| Step | Screenshot |
|------|------------|
${report.interactionLogs
  .filter((log) => log.screenshotPath)
  .map((log) => `| ${log.action} | \`${path.basename(log.screenshotPath!)}\` |`)
  .join("\n")}

---

## 📝 Interaction Log

${report.interactionLogs
  .map(
    (log) => `
**${log.timestamp}** - ${log.action}
- Observation: ${log.observation}
- Sentiment: ${log.sentiment}
`
  )
  .join("\n")}

---

*Report generated by Stagehand User Testing Agent*
`;
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

function generateComprehensiveUXReport(report: FeedbackReport, agentThoughts: string): string {
  const { persona } = report;
  
  // Generate smart recommendations based on findings
  const generateActionItems = (): string => {
    const items: string[] = [];
    
    if (report.usabilityIssues.length > 0) {
      const highPriority = report.usabilityIssues.filter(i => i.severity === "high" || i.severity === "critical");
      if (highPriority.length > 0) {
        items.push(`**🔴 Critical:** Fix ${highPriority.length} high-priority usability issue(s): ${highPriority.map(i => i.description.substring(0, 50)).join("; ")}`);
      }
    }
    
    if (report.accessibilityNotes.length > 0) {
      items.push(`**🟡 Important:** Address ${report.accessibilityNotes.length} confusion point(s) identified by the user`);
    }
    
    if (report.positiveAspects.length > 0) {
      items.push(`**🟢 Maintain:** Keep the ${report.positiveAspects.length} positive aspect(s) that users appreciated`);
    }
    
    if (items.length === 0) {
      items.push("Review the user's journey above for specific improvement opportunities");
    }
    
    return items.map((item, i) => `${i + 1}. ${item}`).join("\n");
  };
  
  return `# 📊 Comprehensive UX Testing Report

## Executive Summary

| Metric | Value |
|--------|-------|
| **Overall Score** | ${report.overallExperience.score}/10 ${"⭐".repeat(Math.min(10, Math.max(0, Math.round(report.overallExperience.score))))} |
| **Test Duration** | ${report.totalDuration} |
| **Tester Persona** | ${persona.name} (${persona.techSavviness} tech user) |
| **Target URL** | ${report.targetUrl} |
| **Session ID** | \`${report.sessionId}\` |
| **Date** | ${new Date().toLocaleDateString()} |

### Quick Assessment
${report.overallExperience.summary}

---

## 👤 Tester Profile

**${persona.name}** - ${persona.age} years old, ${persona.occupation} from ${persona.country}

| Attribute | Details |
|-----------|---------|
| Tech Savviness | ${persona.techSavviness} |
| Income Level | ${persona.incomeLevel} |
| Primary Goal | ${persona.financialGoal} |
${persona.context ? `| Context | ${persona.context} |` : ""}

### Known Pain Points (what frustrates this user type)
${persona.painPoints.map(p => `- ${p}`).join("\n")}

---

## 🧠 User's Complete Journey & Thoughts

The following is the complete stream of consciousness from ${persona.name} as they explored the application:

${agentThoughts}

---

## 📈 Key Findings

### ✅ What Worked Well (${report.positiveAspects.length} items)
${report.positiveAspects.length > 0 
  ? report.positiveAspects.map((p, i) => `${i + 1}. ${p}`).join("\n")
  : `_No specific positive aspects were extracted. Review the user's journey above - look for phrases like "nice", "helpful", "easy", "clear"._`}

### 😕 Areas of Confusion (${report.accessibilityNotes.length} items)
${report.accessibilityNotes.length > 0
  ? report.accessibilityNotes.map((n, i) => `${i + 1}. ${n}`).join("\n")
  : `_No specific confusion points were extracted. Review the user's journey above - look for phrases like "confused", "unclear", "hard to find"._`}

### 🐛 Usability Issues (${report.usabilityIssues.length} items)
${report.usabilityIssues.length > 0
  ? report.usabilityIssues.map((issue, i) => `
**Issue ${i + 1}** - Severity: \`${issue.severity.toUpperCase()}\`
- **Problem:** ${issue.description}
- **Recommendation:** ${issue.recommendation}
`).join("\n")
  : `_No specific usability issues were extracted. Review the user's journey above for any problems encountered._`}

---

## 💡 Recommendations (${report.recommendations.length} items)

${report.recommendations.length > 0
  ? report.recommendations.map((r, i) => `${i + 1}. ${r}`).join("\n")
  : `_No specific recommendations were extracted. Based on the user's journey, consider:_
1. _Addressing any navigation issues that caused confusion_
2. _Simplifying complex features for ${persona.techSavviness}-level users_
3. _Improving visual hierarchy and call-to-action clarity_`}

---

## 📸 Screenshot Evidence

Screenshots are saved in the \`screenshots/\` folder alongside this report.

---

## 🎯 Actionable Next Steps

${generateActionItems()}

### Priority Matrix for ${persona.techSavviness}-level Users

| Priority | Action | Impact |
|----------|--------|--------|
| High | Fix any navigation/flow issues | Users can complete tasks |
| Medium | Improve clarity of terminology | Reduces confusion |
| Low | Polish visual design | Better first impressions |

---

## 📋 Raw Agent Response

<details>
<summary>Click to expand full agent response</summary>

\`\`\`
${agentThoughts}
\`\`\`

</details>

---

*Report generated by Stagehand User Testing Agent*  
*Session: ${report.sessionId}*  
*Persona: ${persona.name} (${persona.techSavviness})*
`;
}

async function main() {
  // Get URL from command line args or use default
  const targetUrl = process.argv[2] || "https://preview--moneymind-planner.lovable.app";

  // Select persona (can be passed as second arg: 0, 1, or 2)
  const personaIndex = parseInt(process.argv[3] || "0", 10);
  const persona = SAMPLE_PERSONAS[personaIndex] || SAMPLE_PERSONAS[0];

  console.log("\n🚀 Starting User Testing Agent...\n");

  try {
    const result = await runUserTestAgent(targetUrl, persona);
    const { logsDir, ...report } = result;

    // Save JSON report in session folder
    const jsonReportPath = path.join(logsDir, "report-data.json");
    fs.writeFileSync(jsonReportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 JSON Data saved: ${jsonReportPath}`);

    // Read the thoughts log to include in comprehensive report
    const thoughtsLogPath = path.join(logsDir, "thoughts-log.md");
    const thoughtsContent = fs.existsSync(thoughtsLogPath) 
      ? fs.readFileSync(thoughtsLogPath, "utf-8")
      : "No thoughts captured";

    // Use the full agent message for the report (contains all exploration thoughts)
    const fullAgentThoughts = report.personaSpecificFeedback || thoughtsContent;

    // Generate and save comprehensive UX report
    const comprehensiveReport = generateComprehensiveUXReport(report, fullAgentThoughts);
    const uxReportPath = path.join(logsDir, "ux-report.md");
    fs.writeFileSync(uxReportPath, comprehensiveReport);
    console.log(`📊 Comprehensive UX Report saved: ${uxReportPath}`);

    // Also save the standard markdown report
    const markdownReport = generateMarkdownReport(report);
    const mdReportPath = path.join(logsDir, "session-report.md");
    fs.writeFileSync(mdReportPath, markdownReport);
    console.log(`📝 Session Report saved: ${mdReportPath}`);

    // Print summary to console
    console.log("\n" + "=".repeat(70));
    console.log("📊 TEST COMPLETE");
    console.log("=".repeat(70));
    console.log(`\n👤 Tested as: ${persona.name}`);
    console.log(`⭐ Overall Score: ${report.overallExperience.score}/10`);
    console.log(`\n📁 All files saved to: ${logsDir}`);
    console.log(`   - thoughts-log.md   (live thoughts during exploration)`);
    console.log(`   - ux-report.md      (comprehensive UX analysis)`);
    console.log(`   - session-report.md (detailed session report)`);
    console.log(`   - report-data.json  (raw data)`);
    console.log(`   - screenshots/      (captured screenshots)`);
    console.log("\n" + "=".repeat(70));
  } catch (error) {
    console.error("\n❌ Error running user test agent:", error);
    process.exit(1);
  }
}

main();

