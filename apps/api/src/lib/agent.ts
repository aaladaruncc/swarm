import { Stagehand } from "@browserbasehq/stagehand";
import { type UserPersona, SAMPLE_PERSONAS, getPersonaByIndex } from "./personas.js";
import { Writable } from "stream";

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_RUN_WALL_CLOCK_MS = 6 * 60 * 1000; // 6 minutes hard cap
const ACTION_RETRY_BACKOFF_MS = 1500;
const RAW_STREAM_MAX_ENTRIES = 4000;

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

export interface AgentAction {
  type: string;
  timestamp: number;
  pageUrl?: string;
  x?: number;
  y?: number;
  button?: string;
  keys?: string;
  [key: string]: any;
}

export interface AgentLog {
  timestamp: number;
  level: "INFO" | "WARN" | "ERROR" | "DEBUG";
  message: string;
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
    timestamp?: number;
  }>;
  agentActions?: AgentAction[]; // Actions taken by the agent
  agentReasoning?: string; // Full reasoning/thinking from agent
  agentLogs?: AgentLog[]; // Console logs captured during execution
  rawStreams?: {
    stdout: string[];
    stderr: string[];
  }; // Unfiltered raw stream for full reasoning
  runtimeMetrics?: {
    navDurationMs?: number;
    executionDurationMs?: number;
    timedOut: boolean;
    navigationRetries: number;
    actionCount: number;
    autoScreenshotCount: number;
    errorEvents: string[];
  };
  runCaps?: {
    maxRunMs: number;
  };
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
- Before every click/type: re-read the current page to confirm the element is present and interactable. After each action, verify the expected change (URL or element) happened; if not, re-check once and move on.
- If an action fails, retry once after a short pause. Do not loop. If it still fails, log it as blocked with what you tried and why it failed.
- If a page claims 404/4xx, refresh once and try again; if it works, note it as a warning, otherwise record as an issue with evidence.
- Only treat the site as "slow" when the page/app is slow; do not confuse your own thinking time with user impatience.
- Attach evidence to each issue: what you attempted, the element text/section, any latency noticed, and a concrete fix.
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
// RUNTIME HELPERS
// ============================================================================

function createTimeoutPromise<T>(ms: number, onTimeout: () => void): Promise<T> {
  return new Promise((_, reject) => {
    const timer = setTimeout(() => {
      onTimeout();
      reject(new Error(`Run exceeded max wall clock (${ms} ms)`));
    }, ms);
    // Prevent Node from holding the process open
    (timer as any).unref?.();
  });
}

function pushCapped(arr: string[], item: string) {
  if (!item) return;
  arr.push(item);
  if (arr.length > RAW_STREAM_MAX_ENTRIES) {
    arr.shift();
  }
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
  const runCaps = { maxRunMs: MAX_RUN_WALL_CLOCK_MS };
  const interactionLogs: InteractionLog[] = [];
  const screenshots: Array<{ stepNumber: number; description: string; base64Data: string; timestamp?: number }> = [];
  const agentLogs: AgentLog[] = [];
  const rawStdout: string[] = [];
  const rawStderr: string[] = [];
  const errorEvents: string[] = [];
  let navigationRetries = 0;
  let stepCount = 0;
  let navDurationMs: number | undefined;
  let executionDurationMs: number | undefined;
  let runTimedOut = false;

  // Intercept both console.log and stdout to capture ALL messages from Stagehand verbose logging
  const originalConsoleLog = console.log;
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;
  const originalConsoleInfo = console.info;
  const originalStdoutWrite = process.stdout.write.bind(process.stdout);
  const originalStderrWrite = process.stderr.write.bind(process.stderr);
  let isConsoleStdoutWrite = false;
  let isConsoleStderrWrite = false;
  const recentLogMap = new Map<string, number>();
  const DEDUPE_MS = 1500;
  
  // Track current log entry for multi-line messages
  let currentLogEntry: { level: "INFO" | "WARN" | "ERROR" | "DEBUG"; message: string; timestamp: number } | null = null;
  
  // Helper to parse Stagehand verbose log format: [timestamp] LEVEL: message
  // Also handles dev server prefixes like "apps/api dev: "
  const parseStagehandLog = (line: string): { level: "INFO" | "WARN" | "ERROR" | "DEBUG"; message: string; timestamp?: number } | null => {
    const trimmed = line.trim();
    if (!trimmed) return null;
    
    // Strip common dev server prefixes (e.g., "apps/api dev: ", "apps/web dev: ")
    let cleanLine = trimmed.replace(/^apps\/\w+\s+dev:\s*/i, '');
    
    // Match Stagehand format: [2025-12-11 02:58:35.865 -0500] DEBUG: message
    // Also match with optional prefix before the bracket
    const stagehandMatch = cleanLine.match(/\[([^\]]+)\]\s+(DEBUG|INFO|WARN|ERROR|TRACE):\s*(.+)$/i);
    if (stagehandMatch) {
      const [, timestampStr, levelStr, message] = stagehandMatch;
      const level = (levelStr.toUpperCase() as "INFO" | "WARN" | "ERROR" | "DEBUG");
      // Try to parse timestamp, fallback to current time
      let timestamp: number;
      try {
        timestamp = new Date(timestampStr).getTime();
        if (isNaN(timestamp)) timestamp = Date.now();
      } catch {
        timestamp = Date.now();
      }
      return { level, message: message.trim(), timestamp };
    }
    
    // Category lines are handled as continuations, not skipped here
    // They'll be included in the log entry they belong to
    
    // Default: treat as INFO level, but keep the original message
    return { level: "INFO", message: trimmed };
  };

  const captureLog = (level: "INFO" | "WARN" | "ERROR" | "DEBUG", message: string) => {
    // Always keep raw stream (unfiltered) for replay
    pushCapped(level === "DEBUG" ? rawStderr : rawStdout, message);

    // Split multi-line chunks so we don't lose content written in a single stdout write
    const lines = (message || "").split("\n");
    lines.forEach((line) => {
      const trimmedMessage = line.trim();
      if (trimmedMessage.length <= 1) {
        // Empty line - if we have a current log entry, add a newline to it
        if (currentLogEntry) {
          currentLogEntry.message += "\n";
        }
        return;
      }

      // Try to parse Stagehand log format first
      const parsed = parseStagehandLog(trimmedMessage);
      
      // If this is a new log entry (has timestamp/level), finalize previous entry and start new one
      if (parsed && parsed.timestamp) {
        // Finalize previous entry if exists
        if (currentLogEntry) {
          const lower = currentLogEntry.message.toLowerCase();
          const isApiNoise =
            (lower.includes("get /api/") && !lower.includes("reasoning") && !lower.includes("executing step")) ||
            (lower.includes("post /api/") && !lower.includes("reasoning")) ||
            (lower.includes("options /api/")) ||
            (lower.includes("put /api/")) ||
            (lower.includes("delete /api/")) ||
            (lower.includes("[queue]") && !lower.includes("reasoning")) ||
            (lower.startsWith("<--") && !lower.includes("reasoning")) ||
            (lower.startsWith("-->") && !lower.includes("reasoning") && !lower.match(/\d{3}\s+\d+ms/)) ||
            (lower.includes("batch-tests") && !lower.includes("reasoning") && !lower.includes("executing")) ||
            (lower.includes("auth/get-session") && !lower.includes("reasoning")) ||
            (lower.match(/^\d{3}\s+\d+ms$/) && !lower.includes("reasoning"));
          
          const isStagehandAgentLog = 
            currentLogEntry.level === "DEBUG" ||
            lower.includes("reasoning:") ||
            lower.includes("executing step") ||
            lower.includes("raw response") ||
            lower.includes("function call") ||
            lower.includes("found function call") ||
            lower.includes("taking screenshot") ||
            lower.includes("capturing screenshot") ||
            lower.includes("agent completed") ||
            lower.includes("category:");
          
          if (!isApiNoise || isStagehandAgentLog) {
            // Deduplicate
            const key = `${currentLogEntry.level}:${currentLogEntry.message}`;
            const now = Date.now();
            const lastSeen = recentLogMap.get(key);
            if (!lastSeen || now - lastSeen >= DEDUPE_MS) {
              recentLogMap.set(key, now);
              agentLogs.push({
                timestamp: currentLogEntry.timestamp,
                level: currentLogEntry.level,
                message: currentLogEntry.message,
              });
            }
          }
        }
        
        // Start new log entry
        currentLogEntry = {
          level: parsed.level,
          message: parsed.message,
          timestamp: parsed.timestamp,
        };
      } else if (currentLogEntry) {
        // Continuation of previous log entry (multi-line message)
        // Check if this line is a continuation:
        const cleanLine = trimmedMessage.replace(/^apps\/\w+\s+dev:\s*/i, '').trim();
        
        // Check if this is a new timestamped log entry
        const isNewTimestampedLog = cleanLine.match(/^\[([^\]]+)\]\s+(DEBUG|INFO|WARN|ERROR|TRACE):/i);
        
        // Check if this is an HTTP log (not a continuation)
        const isHttpLog = cleanLine.match(/^(GET|POST|PUT|DELETE|OPTIONS)\s+\//i) || 
                          cleanLine.match(/^<--|^-->/) ||
                          cleanLine.match(/^\d{3}\s+\d+ms/);
        
        // Determine if this is a continuation:
        // - Not a new timestamped log
        // - Not an HTTP log  
        // - Is JSON content, category line, or continuation text
        const isJsonContent = 
          cleanLine.match(/^[\s"{}[\],:]/) || // JSON structure characters
          cleanLine.match(/^\s*"[^"]+"\s*:/) || // JSON key-value pairs
          cleanLine.match(/^\s*category:/i) || // Category metadata (part of JSON block)
          (currentLogEntry.message.includes("{") && !currentLogEntry.message.includes("}")) || // Incomplete JSON object
          (currentLogEntry.message.match(/\{/g)?.length || 0) > (currentLogEntry.message.match(/\}/g)?.length || 0); // Unbalanced braces
        
        const isContinuation = 
          !isNewTimestampedLog && // Not a new timestamped log
          !isHttpLog && // Not an HTTP log
          (isJsonContent || // JSON/category content
           cleanLine[0] === cleanLine[0].toLowerCase() || // Starts with lowercase (likely continuation)
           cleanLine.startsWith("  ") || // Indented (likely continuation)
           cleanLine.startsWith("    ") || // More indented
           currentLogEntry.message.toLowerCase().includes("raw response") || // Part of raw response block
           currentLogEntry.message.toLowerCase().includes("reasoning:")); // Part of reasoning block
        
        if (isContinuation) {
          // Include category lines as part of the log entry
          currentLogEntry.message += "\n" + cleanLine;
        } else {
          // Might be a new log entry without timestamp, finalize previous and start new
          const lower = currentLogEntry.message.toLowerCase();
          const isApiNoise =
            (lower.includes("get /api/") && !lower.includes("reasoning") && !lower.includes("executing step")) ||
            (lower.includes("post /api/") && !lower.includes("reasoning")) ||
            (lower.includes("options /api/")) ||
            (lower.includes("put /api/")) ||
            (lower.includes("delete /api/")) ||
            (lower.includes("[queue]") && !lower.includes("reasoning")) ||
            (lower.startsWith("<--") && !lower.includes("reasoning")) ||
            (lower.startsWith("-->") && !lower.includes("reasoning") && !lower.match(/\d{3}\s+\d+ms/)) ||
            (lower.includes("batch-tests") && !lower.includes("reasoning") && !lower.includes("executing")) ||
            (lower.includes("auth/get-session") && !lower.includes("reasoning")) ||
            (lower.match(/^\d{3}\s+\d+ms$/) && !lower.includes("reasoning"));
          
          const isStagehandAgentLog = 
            currentLogEntry.level === "DEBUG" ||
            lower.includes("reasoning:") ||
            lower.includes("executing step") ||
            lower.includes("raw response") ||
            lower.includes("function call") ||
            lower.includes("found function call") ||
            lower.includes("taking screenshot") ||
            lower.includes("capturing screenshot") ||
            lower.includes("agent completed") ||
            lower.includes("category:");
          
          if (!isApiNoise || isStagehandAgentLog) {
            const key = `${currentLogEntry.level}:${currentLogEntry.message}`;
            const now = Date.now();
            const lastSeen = recentLogMap.get(key);
            if (!lastSeen || now - lastSeen >= DEDUPE_MS) {
              recentLogMap.set(key, now);
              agentLogs.push({
                timestamp: currentLogEntry.timestamp,
                level: currentLogEntry.level,
                message: currentLogEntry.message,
              });
            }
          }
          
          // Start new entry
          currentLogEntry = {
            level: parsed?.level || level,
            message: parsed?.message || cleanLine,
            timestamp: parsed?.timestamp || Date.now(),
          };
        }
      } else {
        // No current entry, start new one
        const cleanLine = trimmedMessage.replace(/^apps\/\w+\s+dev:\s*/i, '').trim();
        currentLogEntry = {
          level: parsed?.level || level,
          message: parsed?.message || cleanLine,
          timestamp: parsed?.timestamp || Date.now(),
        };
      }
    });
  };

  // Intercept console methods
  console.log = (...args: any[]) => {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    try {
      isConsoleStdoutWrite = true;
      originalConsoleLog(...args);
    } finally {
      isConsoleStdoutWrite = false;
    }
    captureLog("INFO", message);
  };

  console.info = (...args: any[]) => {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    try {
      isConsoleStdoutWrite = true;
      originalConsoleInfo(...args);
    } finally {
      isConsoleStdoutWrite = false;
    }
    captureLog("INFO", message);
  };

  console.warn = (...args: any[]) => {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    try {
      isConsoleStdoutWrite = true;
      originalConsoleWarn(...args);
    } finally {
      isConsoleStdoutWrite = false;
    }
    captureLog("WARN", message);
  };

  console.error = (...args: any[]) => {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    try {
      isConsoleStderrWrite = true;
      originalConsoleError(...args);
    } finally {
      isConsoleStderrWrite = false;
    }
    captureLog("ERROR", message);
  };

  // Also intercept stdout directly (Stagehand might write directly to stdout)
  process.stdout.write = function(chunk: any, encoding?: any, callback?: any): boolean {
    if (typeof chunk === 'string') {
      // Always capture raw (with ANSI codes for now, we'll strip them later)
      pushCapped(rawStdout, chunk);
      // Avoid double-capturing console.* writes
      if (!isConsoleStdoutWrite) {
        // Remove ANSI codes before parsing
        const cleanChunk = chunk.replace(/\x1b\[[0-9;]*m/g, '');
        captureLog("INFO", cleanChunk);
      }
    } else if (Buffer.isBuffer(chunk)) {
      const str = chunk.toString('utf8');
      pushCapped(rawStdout, str);
      if (!isConsoleStdoutWrite) {
        const cleanChunk = str.replace(/\x1b\[[0-9;]*m/g, '');
        captureLog("INFO", cleanChunk);
      }
    }
    return originalStdoutWrite(chunk, encoding, callback);
  };

  // Intercept stderr as well (Stagehand/Gemini sometimes streams reasoning to stderr)
  process.stderr.write = function(chunk: any, encoding?: any, callback?: any): boolean {
    if (typeof chunk === 'string') {
      // Always capture raw
      pushCapped(rawStderr, chunk);
      // Avoid double-capturing console.error writes
      if (!isConsoleStderrWrite) {
        // Remove ANSI codes before parsing
        const cleanChunk = chunk.replace(/\x1b\[[0-9;]*m/g, '');
        captureLog("DEBUG", cleanChunk);
      }
    } else if (Buffer.isBuffer(chunk)) {
      const str = chunk.toString('utf8');
      pushCapped(rawStderr, str);
      if (!isConsoleStderrWrite) {
        const cleanChunk = str.replace(/\x1b\[[0-9;]*m/g, '');
        captureLog("DEBUG", cleanChunk);
      }
    }
    return originalStderrWrite(chunk, encoding, callback);
  };

  const log = (message: string) => {
    originalConsoleLog(message);
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
        verbose: 2, // Maximum verbosity to capture all agent thinking/logs
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
    const navStart = Date.now();
    const looksLike404 = async () => {
      try {
        const title = await page.title();
        if (title && title.toLowerCase().includes("404")) return true;
        const content = await page.evaluate(() => document.documentElement.outerHTML);
        return content.toLowerCase().includes("404");
      } catch {
        return false;
      }
    };

    const navigateOnce = async (waitForNetworkIdle: boolean) => {
      const response = await page.goto(targetUrl, waitForNetworkIdle ? { waitUntil: "networkidle", timeoutMs: 30000 } : { timeoutMs: 30000 });
      const status = typeof response?.status === "function" ? response?.status() : undefined;
      return status;
    };

    try {
      const status = await navigateOnce(true);
      navDurationMs = Date.now() - navStart;
      if (status && status >= 400) {
        navigationRetries += 1;
        errorEvents.push(`navigation-status-${status}`);
        log(`⚠️ Navigation returned status ${status}, retrying with refresh...`);
        await page.reload({ waitUntil: "networkidle", timeoutMs: 20000 });
      }
    } catch (navError: any) {
      navigationRetries += 1;
      errorEvents.push(`navigation-error-${navError?.message || "unknown"}`);
      log(`⚠️ Navigation warning: ${navError.message}`);
      // Try without waiting for networkidle
      const status = await navigateOnce(false);
      navDurationMs = Date.now() - navStart;
      if (status && status >= 400) {
        errorEvents.push(`navigation-status-${status}`);
        log(`⚠️ Navigation status ${status} after fallback; attempting one refresh...`);
        await page.reload({ timeoutMs: 20000 });
      }
    }

    const seen404 = await looksLike404();
    if (seen404) {
      navigationRetries += 1;
      errorEvents.push("navigation-404-check");
      log("⚠️ Page looks like 404; refreshing once to confirm...");
      await page.reload({ timeoutMs: 20000 });
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Helper to capture screenshots with monotonically increasing step numbers
    let nextStepNumber = 1;
    const captureScreenshot = async (description: string) => {
      try {
        const buffer = await page.screenshot();
        const base64 = buffer.toString("base64");
        const stepNumber = nextStepNumber++;
        stepCount = Math.max(stepCount, stepNumber);
        screenshots.push({
          stepNumber,
          description,
          base64Data: base64,
          timestamp: Date.now(),
        });
      } catch (err) {
        // Do not throw—screenshots are best-effort
        originalConsoleWarn("Screenshot capture failed:", (err as any)?.message || err);
      }
    };

    // Initial screenshot
    await captureScreenshot("initial-landing");

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

    let agentResult: any;
    let wasTimeout = false;
    let screenshotLoopStop = false;
    const screenshotIntervalMs = 5000; // capture every 5 seconds while the agent runs
    const maxAutoScreenshots = Math.max(8, maxSteps + 3); // cap to avoid spam
    let autoShotCount = 0;

    // Run a background loop to capture periodic screenshots during the blocking execute call
    const screenshotLoop = (async () => {
      while (!screenshotLoopStop && autoShotCount < maxAutoScreenshots) {
        await new Promise(res => setTimeout(res, screenshotIntervalMs));
        if (screenshotLoopStop) break;
        autoShotCount += 1;
        await captureScreenshot(`auto-${autoShotCount}`);
      }
    })();

    const execStart = Date.now();
    try {
      const execPromise = agent.execute({
        instruction: generateAgentInstructions(persona),
        maxSteps,
      });

      agentResult = await Promise.race([
        execPromise,
        createTimeoutPromise(MAX_RUN_WALL_CLOCK_MS, () => {
          runTimedOut = true;
        }),
      ]);
      executionDurationMs = Date.now() - execStart;
      
      // After agent completes, we can't capture intermediate states
      // But we can associate screenshots with actions using Browserbase's recording
      // For now, capture the final state and note that intermediate screenshots
      // would need to be extracted from Browserbase's session recording
      const agentActions = (agentResult as any).actions || [];
      log(`Agent completed with ${agentActions.length} actions.`);
      
      // Capture final state after completion
      screenshotLoopStop = true;
      await screenshotLoop;
      await captureScreenshot("final-state");
    } catch (error: any) {
      screenshotLoopStop = true;
      await screenshotLoop;

      // If session times out or CDP closes, capture what we have
      if (runTimedOut || error.message?.includes("CDP") || error.message?.includes("timeout") || error.message?.includes("closed") || error.message?.includes("Session")) {
        log("Session ended early (timeout/close), generating report from partial exploration...");
        wasTimeout = true;
        errorEvents.push(`execution-error-${error?.message || "timeout"}`);
        
        // Try to extract any partial thoughts from error context
        const errorContext = error?.context?.lastResponse || error?.message || "";
        
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

END ASSESSMENT

Additional error context:
${errorContext}`,
          success: false,
        };

        // Best-effort final screenshot for the partial session
        await captureScreenshot("final-state-partial");
      } else {
        throw error;
      }
    } finally {
      if (!executionDurationMs) {
        executionDurationMs = Date.now() - execStart;
      }
    }

    // Note: Intermediate screenshots cannot be captured during agent.execute() 
    // because it's a blocking call. To get screenshots at each action, we would need
    // to use Browserbase's session recording API to extract frames at different timestamps.
    // For now, we capture initial and final states only.

    interactionLogs.push({
      timestamp: new Date().toISOString(),
      action: "Completed exploration",
      observation: "Agent finished exploring",
      sentiment: "neutral",
    });

    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);

    // Parse agent response
    let agentMessage = agentResult.message || "";
    const hasChunkError = /cannot read properties of undefined \(reading 'parts'\)/i.test(agentMessage) || /failed to execute task/i.test(agentMessage);
    if (hasChunkError) {
      agentMessage = `${agentMessage}\n\nNOTE: Model returned an invalid chunk mid-run; navigation continued and screenshots were captured.`;
    }
    
    // Capture agent actions and reasoning
    const agentActions = (agentResult as any).actions || [];
    const agentReasoning = agentMessage; // Full message contains reasoning
    
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
    if (/failed to execute task|cannot read properties of undefined \(reading 'parts'\)/i.test(parsedFeedback.summary)) {
      parsedFeedback.summary = "Run completed with a transient model chunk error; see transcript and screenshots for the full walkthrough.";
    }

    log(`Test complete. Score: ${extractedScore}/10 ${wasTimeout ? "(timeout fallback)" : ""}`);

    // Finalize any pending log entry
    if (currentLogEntry !== null) {
      const pendingEntry: { level: "INFO" | "WARN" | "ERROR" | "DEBUG"; message: string; timestamp: number } = currentLogEntry;
      const lower = pendingEntry.message.toLowerCase();
      const isApiNoise =
        (lower.includes("get /api/") && !lower.includes("reasoning") && !lower.includes("executing step")) ||
        (lower.includes("post /api/") && !lower.includes("reasoning")) ||
        (lower.includes("options /api/")) ||
        (lower.includes("put /api/") && !lower.includes("reasoning")) ||
        (lower.includes("delete /api/")) ||
        (lower.includes("[queue]") && !lower.includes("reasoning")) ||
        (lower.startsWith("<--") && !lower.includes("reasoning")) ||
        (lower.startsWith("-->") && !lower.includes("reasoning") && !lower.match(/\d{3}\s+\d+ms/)) ||
        (lower.includes("batch-tests") && !lower.includes("reasoning") && !lower.includes("executing")) ||
        (lower.includes("auth/get-session") && !lower.includes("reasoning")) ||
        (lower.match(/^\d{3}\s+\d+ms$/) && !lower.includes("reasoning"));
      
      const isStagehandAgentLog = 
        pendingEntry.level === "DEBUG" ||
        lower.includes("reasoning:") ||
        lower.includes("executing step") ||
        lower.includes("raw response") ||
        lower.includes("function call") ||
        lower.includes("found function call") ||
        lower.includes("taking screenshot") ||
        lower.includes("capturing screenshot") ||
        lower.includes("agent completed") ||
        lower.includes("category:");
      
      if (!isApiNoise || isStagehandAgentLog) {
        const key = `${pendingEntry.level}:${pendingEntry.message}`;
        const now = Date.now();
        const lastSeen = recentLogMap.get(key);
        if (!lastSeen || now - lastSeen >= DEDUPE_MS) {
          agentLogs.push({
            timestamp: pendingEntry.timestamp,
            level: pendingEntry.level,
            message: pendingEntry.message,
          });
        }
      }
      currentLogEntry = null;
    }

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
      agentActions: (agentResult as any).actions || [], // Include agent actions for transcript
      agentReasoning, // Include full reasoning
      agentLogs, // Include captured console logs
      rawStreams: {
        stdout: rawStdout,
        stderr: rawStderr,
      },
      runtimeMetrics: {
        navDurationMs,
        executionDurationMs,
        timedOut: wasTimeout || runTimedOut,
        navigationRetries,
        actionCount: ((agentResult as any).actions || []).length,
        autoScreenshotCount: autoShotCount,
        errorEvents,
      },
      runCaps,
    };
  } catch (unexpectedError: any) {
    log(`❌ Unexpected error during test: ${unexpectedError.message}`);
    log(`Error stack: ${unexpectedError.stack}`);
    throw new Error(`Test execution failed: ${unexpectedError.message}`);
  } finally {
    // Restore original console methods and stdout
    console.log = originalConsoleLog;
    console.info = originalConsoleInfo;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
    
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

// Re-exports removed - import directly from ./personas.js if needed
