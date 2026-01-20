/**
 * Screenshot-Based Testing Agent
 * 
 * This module provides functionality to analyze a sequence of screenshots
 * using AI vision models, simulating how a persona would react to each screenshot.
 */

import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

export interface UserPersona {
  name: string;
  age: number;
  country: string;
  occupation: string;
  incomeLevel: "low" | "medium" | "high";
  techSavviness: "beginner" | "intermediate" | "advanced";
  financialGoal: string;
  painPoints: string[];
  context?: string;
}

export interface ScreenshotInput {
  order: number;
  s3Url: string;
  s3Key: string;
  description?: string;
  context?: string;
}

export interface ScreenshotAnalysis {
  screenshotOrder: number;
  s3Key: string;
  s3Url: string;
  personaName: string;
  observations: string[];
  positiveAspects: string[];
  issues: Array<{
    severity: "low" | "medium" | "high" | "critical";
    description: string;
    recommendation: string;
  }>;
  accessibilityNotes: string[];
  thoughts: string;
  comparisonWithPrevious?: string;
}

export interface ScreenshotTestResult {
  analyses: ScreenshotAnalysis[];
  overallScore: number;
  summary: string;
  commonIssues: Array<{
    severity: "low" | "medium" | "high" | "critical";
    description: string;
    recommendation: string;
    affectedScreenshots: number[];
  }>;
  positiveAspects: string[];
  recommendations: string[];
  personaSpecificFeedback: string;
}

// ============================================================================
// VISION MODEL CLIENT
// ============================================================================

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY or GOOGLE_API_KEY environment variable is required");
  }
  return new GoogleGenerativeAI(apiKey);
}

// ============================================================================
// SCREENSHOT ANALYSIS
// ============================================================================

/**
 * Downloads an image from S3 URL and converts it to base64
 * For now, assumes the URL is accessible. In production, you'd use AWS SDK.
 */
async function downloadImageAsBase64(imageUrl: string): Promise<string> {
  // In production, use AWS SDK to get image from S3
  // For now, we'll assume the URL is publicly accessible or use presigned URLs
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  const buffer = await response.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  return base64;
}

/**
 * Analyzes a single screenshot using Gemini Vision
 */
async function analyzeScreenshotWithVision(
  screenshot: ScreenshotInput,
  persona: UserPersona,
  previousContext: string,
  model: any
): Promise<Omit<ScreenshotAnalysis, "screenshotOrder" | "s3Key" | "s3Url" | "personaName">> {
  // Download image
  const imageBase64 = await downloadImageAsBase64(screenshot.s3Url);
  
  // Generate analysis prompt
  const prompt = generateScreenshotAnalysisPrompt(
    persona,
    previousContext,
    screenshot.description,
    screenshot.context
  );

  // Use Gemini Vision API
  const result = await model.generateContent([
    {
      inlineData: {
        data: imageBase64,
        mimeType: "image/png", // Could detect from file extension
      },
    },
    { text: prompt },
  ]);

  const response = await result.response;
  const text = response.text();

  // Parse structured response
  return parseAnalysisResponse(text, previousContext);
}

/**
 * Generates the prompt for screenshot analysis
 */
function generateScreenshotAnalysisPrompt(
  persona: UserPersona,
  previousContext: string,
  userDescription?: string,
  screenshotContext?: string
): string {
  return `You are ${persona.name}, a ${persona.age}-year-old ${persona.occupation} from ${persona.country}. You are participating in a user testing session where you'll analyze a series of screenshots.

YOUR PROFILE:
- Tech Savviness: ${persona.techSavviness} (${persona.techSavviness === "beginner" ? "you struggle with complex interfaces and need things to be simple" : persona.techSavviness === "advanced" ? "you quickly spot UX issues and expect efficient workflows" : "you can navigate most apps but appreciate good design"})
- Goal: ${persona.financialGoal}
${persona.context ? `- Context: ${persona.context}` : ""}

WHAT FRUSTRATES YOU:
${persona.painPoints.map((p) => `- ${p}`).join("\n")}

${previousContext ? `PREVIOUS SCREENSHOT CONTEXT:\n${previousContext}\n\n` : ""}
${userDescription ? `USER'S DESCRIPTION:\n${userDescription}\n\n` : ""}
${screenshotContext ? `SCREENSHOT CONTEXT:\n${screenshotContext}\n\n` : ""}

ANALYZE THIS SCREENSHOT as if you were seeing it for the first time. Think out loud about:
1. What you notice first
2. What makes sense to you
3. What confuses you
4. What you like
5. What frustrates you
6. Accessibility concerns (text size, colors, complexity)

${previousContext ? "Also compare this screenshot to the previous one you saw. What changed? Is the flow logical?" : ""}

Provide your analysis in this EXACT format:

=== ANALYSIS ===

OBSERVATIONS:
- [What you see and notice]
- [Key elements visible]
- [Overall layout and design]

POSITIVE ASPECTS:
- [What you like about this screenshot]
- [What works well]

ISSUES FOUND:
- [Issue 1 - severity: low/medium/high/critical]
- [Issue 2 - severity: low/medium/high/critical]

ACCESSIBILITY CONCERNS:
- [Any issues with text size, colors, complexity, language?]

${previousContext ? "COMPARISON WITH PREVIOUS:\n[How does this compare to the previous screenshot? What changed? Is the flow logical?]\n" : ""}

THOUGHTS:
[Your stream of consciousness - what you're thinking as ${persona.name} looking at this screenshot. Be honest and authentic.]

=== END ANALYSIS ===`;
}

/**
 * Parses the agent's response into structured data
 */
function parseAnalysisResponse(
  responseText: string,
  previousContext: string
): Omit<ScreenshotAnalysis, "screenshotOrder" | "s3Key" | "s3Url" | "personaName">> {
  const result: Omit<ScreenshotAnalysis, "screenshotOrder" | "s3Key" | "s3Url" | "personaName"> = {
    observations: [],
    positiveAspects: [],
    issues: [],
    accessibilityNotes: [],
    thoughts: "",
  };

  // Extract observations
  const obsMatch = responseText.match(/OBSERVATIONS:\s*([\s\S]*?)(?=POSITIVE ASPECTS:|ISSUES FOUND:|ACCESSIBILITY|THOUGHTS:|===)/i);
  if (obsMatch) {
    result.observations = obsMatch[1]
      .split("\n")
      .map((line) => line.replace(/^[-•]\s*/, "").trim())
      .filter((line) => line.length > 0);
  }

  // Extract positive aspects
  const posMatch = responseText.match(/POSITIVE ASPECTS:\s*([\s\S]*?)(?=ISSUES FOUND:|ACCESSIBILITY|THOUGHTS:|===)/i);
  if (posMatch) {
    result.positiveAspects = posMatch[1]
      .split("\n")
      .map((line) => line.replace(/^[-•]\s*/, "").trim())
      .filter((line) => line.length > 0);
  }

  // Extract issues
  const issuesMatch = responseText.match(/ISSUES FOUND:\s*([\s\S]*?)(?=ACCESSIBILITY|THOUGHTS:|===)/i);
  if (issuesMatch) {
    const issueLines = issuesMatch[1]
      .split("\n")
      .map((line) => line.replace(/^[-•]\s*/, "").trim())
      .filter((line) => line.length > 0);

    result.issues = issueLines.map((line) => {
      const severityMatch = line.match(/\b(low|medium|high|critical)\b/i);
      const severity = (severityMatch?.[1]?.toLowerCase() as "low" | "medium" | "high" | "critical") || "medium";
      const description = line.replace(/\s*[-–]\s*severity:\s*(low|medium|high|critical)\s*/i, "").trim();
      return {
        severity,
        description,
        recommendation: `Address this issue to improve user experience`,
      };
    });
  }

  // Extract accessibility notes
  const accMatch = responseText.match(/ACCESSIBILITY CONCERNS:\s*([\s\S]*?)(?=COMPARISON|THOUGHTS:|===)/i);
  if (accMatch) {
    result.accessibilityNotes = accMatch[1]
      .split("\n")
      .map((line) => line.replace(/^[-•]\s*/, "").trim())
      .filter((line) => line.length > 0);
  }

  // Extract comparison
  if (previousContext) {
    const compMatch = responseText.match(/COMPARISON WITH PREVIOUS:\s*([\s\S]*?)(?=THOUGHTS:|===)/i);
    if (compMatch) {
      result.comparisonWithPrevious = compMatch[1].trim();
    }
  }

  // Extract thoughts
  const thoughtsMatch = responseText.match(/THOUGHTS:\s*([\s\S]*?)(?===|$)/i);
  if (thoughtsMatch) {
    result.thoughts = thoughtsMatch[1].trim();
  } else {
    // Fallback: use the entire response as thoughts
    result.thoughts = responseText;
  }

  return result;
}

// ============================================================================
// MAIN ANALYSIS FUNCTION
// ============================================================================

/**
 * Analyzes a sequence of screenshots with a given persona
 */
export async function analyzeScreenshotSequence(
  screenshots: ScreenshotInput[],
  persona: UserPersona
): Promise<ScreenshotTestResult> {
  const model = getGeminiClient().getGenerativeModel({ model: "gemini-2.0-flash-exp" });
  const analyses: ScreenshotAnalysis[] = [];
  let previousContext = "";

  // Analyze each screenshot sequentially
  for (const screenshot of screenshots.sort((a, b) => a.order - b.order)) {
    console.log(`[Screenshot Agent] Analyzing screenshot ${screenshot.order}/${screenshots.length}...`);

    const analysis = await analyzeScreenshotWithVision(
      screenshot,
      persona,
      previousContext,
      model
    );

    const fullAnalysis: ScreenshotAnalysis = {
      screenshotOrder: screenshot.order,
      s3Key: screenshot.s3Key,
      s3Url: screenshot.s3Url,
      personaName: persona.name,
      ...analysis,
    };

    analyses.push(fullAnalysis);
    previousContext = analysis.thoughts; // Use thoughts as context for next screenshot
  }

  // Generate overall report
  const overallReport = generateOverallReport(analyses, persona);

  return {
    analyses,
    ...overallReport,
  };
}

/**
 * Generates an overall report from individual analyses
 */
function generateOverallReport(
  analyses: ScreenshotAnalysis[],
  persona: UserPersona
): Omit<ScreenshotTestResult, "analyses"> {
  // Aggregate issues across all screenshots
  const allIssues = analyses.flatMap((analysis, idx) =>
    analysis.issues.map((issue) => ({
      ...issue,
      screenshotIndex: idx + 1,
    }))
  );

  // Group issues by description (similar issues)
  const issueGroups = new Map<string, Array<{ severity: string; screenshotIndex: number }>>();
  allIssues.forEach((issue) => {
    const key = issue.description.toLowerCase().substring(0, 100);
    if (!issueGroups.has(key)) {
      issueGroups.set(key, []);
    }
    issueGroups.get(key)!.push({
      severity: issue.severity,
      screenshotIndex: issue.screenshotIndex,
    });
  });

  // Create common issues list
  const commonIssues = Array.from(issueGroups.entries())
    .map(([key, occurrences]) => {
      const firstIssue = allIssues.find((i) => i.description.toLowerCase().substring(0, 100) === key);
      if (!firstIssue) return null;

      // Determine overall severity (use highest)
      const severities = occurrences.map((o) => o.severity);
      const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
      const maxSeverity = severities.reduce((max, s) =>
        severityOrder[s as keyof typeof severityOrder] > severityOrder[max as keyof typeof severityOrder] ? s : max
      );

      return {
        severity: maxSeverity as "low" | "medium" | "high" | "critical",
        description: firstIssue.description,
        recommendation: firstIssue.recommendation,
        affectedScreenshots: occurrences.map((o) => o.screenshotIndex),
      };
    })
    .filter((issue): issue is NonNullable<typeof issue> => issue !== null)
    .sort((a, b) => {
      const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });

  // Aggregate positive aspects
  const allPositiveAspects = analyses.flatMap((a) => a.positiveAspects);
  const uniquePositiveAspects = Array.from(new Set(allPositiveAspects));

  // Calculate overall score (0-100)
  // Base score: 70, then adjust based on issues and positive aspects
  let score = 70;
  commonIssues.forEach((issue) => {
    const severityPenalty = { low: -2, medium: -5, high: -10, critical: -15 };
    score += severityPenalty[issue.severity];
  });
  score += Math.min(uniquePositiveAspects.length * 3, 15); // Bonus for positive aspects
  score = Math.max(0, Math.min(100, score)); // Clamp to 0-100

  // Generate summary
  const summary = `Analyzed ${analyses.length} screenshots as ${persona.name}. Found ${commonIssues.length} common issues and ${uniquePositiveAspects.length} positive aspects. Overall experience: ${score >= 70 ? "positive" : score >= 50 ? "mixed" : "needs improvement"}.`;

  // Generate recommendations
  const recommendations = commonIssues
    .slice(0, 5)
    .map((issue) => `Address ${issue.description.toLowerCase()} (affects ${issue.affectedScreenshots.length} screenshots)`);

  // Generate persona-specific feedback
  const personaFeedback = analyses
    .map((a, idx) => `Screenshot ${idx + 1}: ${a.thoughts.substring(0, 200)}...`)
    .join("\n\n");

  return {
    overallScore: Math.round(score),
    summary,
    commonIssues,
    positiveAspects: uniquePositiveAspects,
    recommendations,
    personaSpecificFeedback: personaFeedback,
  };
}
