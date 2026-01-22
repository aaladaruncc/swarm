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
  // New concise format fields
  userObservation?: string; // Action-oriented quoted feedback
  missionContext?: string; // Why this action makes sense, what it tests
  expectedOutcome?: string; // What happens next
}

export interface ScreenshotTestResult {
  analyses: ScreenshotAnalysis[];
  reflections: ScreenshotReflection[];
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
  tokenUsage?: TokenUsageSummary;
}

export interface ScreenshotReflection {
  startOrder: number;
  endOrder: number;
  reflection: string;
}

export interface TokenUsageSummary {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

interface UsageMetadataShape {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
  prompt_token_count?: number;
  candidates_token_count?: number;
  total_token_count?: number;
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

function isOverloadedError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const message = "message" in error && typeof error.message === "string"
    ? error.message.toLowerCase()
    : "";
  const status = "status" in error && typeof error.status === "number"
    ? error.status
    : undefined;
  return message.includes("overloaded") || message.includes("quota") || status === 429 || status === 503;
}

async function generateContentWithFallback(
  primaryModel: any,
  fallbackModel: any,
  content: any[]
) {
  try {
    return await primaryModel.generateContent(content);
  } catch (error) {
    if (!fallbackModel || !isOverloadedError(error)) {
      throw error;
    }
    console.warn("[Screenshot Agent] Primary model overloaded, falling back.");
    return fallbackModel.generateContent(content);
  }
}

function extractUsageMetadata(result: any): TokenUsageSummary {
  const response = result?.response ?? result;
  const usageMetadata = response?.usageMetadata ?? response?.usage_metadata;
  const usage = (usageMetadata || {}) as UsageMetadataShape;
  const inputTokens = Number(usage.promptTokenCount ?? usage.prompt_token_count ?? 0);
  const outputTokens = Number(usage.candidatesTokenCount ?? usage.candidates_token_count ?? 0);
  const totalTokensRaw = usage.totalTokenCount ?? usage.total_token_count;
  const totalTokens = Number(totalTokensRaw ?? inputTokens + outputTokens);

  return {
    inputTokens,
    outputTokens,
    totalTokens,
  };
}

// ============================================================================
// TEXT CLEANING UTILITY
// ============================================================================

/**
 * Removes markdown formatting from text
 */
function cleanMarkdown(text: string): string {
  if (!text) return text;
  let cleaned = text;

  // Remove markdown blockquotes (lines starting with >)
  cleaned = cleaned.replace(/^>\s+/gm, "");
  // Remove HTML blockquote tags
  cleaned = cleaned.replace(/<blockquote[^>]*>/gi, "");
  cleaned = cleaned.replace(/<\/blockquote>/gi, "");
  // Remove markdown bold (**text** or __text__)
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, "$1");
  cleaned = cleaned.replace(/__([^_]+)__/g, "$1");
  // Remove markdown italic (*text* or _text_)
  cleaned = cleaned.replace(/\*([^*]+)\*/g, "$1");
  cleaned = cleaned.replace(/_([^_]+)_/g, "$1");
  // Remove markdown code (`text`)
  cleaned = cleaned.replace(/`([^`]+)`/g, "$1");
  // Remove markdown links [text](url)
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");
  // Remove markdown strikethrough (~~text~~)
  cleaned = cleaned.replace(/~~([^~]+)~~/g, "$1");
  // Remove markdown headers (# ## ###)
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, "");
  // Remove markdown horizontal rules (--- or ***)
  cleaned = cleaned.replace(/^[-*]{3,}$/gm, "");
  // Remove leading/trailing quotes if the entire text is wrapped
  cleaned = cleaned.trim();
  if ((cleaned.startsWith("\"") && cleaned.endsWith("\"")) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1);
  }
  // Remove any remaining quote markers at the start/end
  cleaned = cleaned.replace(/^["']+/, "");
  cleaned = cleaned.replace(/["']+$/, "");

  return cleaned.trim();
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
  model: any,
  fallbackModel: any
): Promise<{
  analysis: Omit<ScreenshotAnalysis, "screenshotOrder" | "s3Key" | "s3Url" | "personaName">;
  usage: TokenUsageSummary;
}> {
  // Download image
  const imageBase64 = await downloadImageAsBase64(screenshot.s3Url);

  // Generate analysis prompt
  const prompt = generateScreenshotAnalysisPrompt(
    persona,
    previousContext,
    screenshot.description,
    screenshot.context
  );

  // Retry logic for empty responses
  const maxRetries = 2;
  let lastError: Error | null = null;
  const emptyUsage: TokenUsageSummary = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Use Gemini Vision API
      const result = await generateContentWithFallback(model, fallbackModel, [
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
      const usage = extractUsageMetadata(response);

      // Validate response
      if (!text || text.trim().length === 0) {
        if (attempt < maxRetries) {
          console.warn(`[Screenshot Agent] ⚠️ Empty response from LLM (attempt ${attempt + 1}/${maxRetries + 1}), retrying...`);
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        } else {
          console.error(`[Screenshot Agent] ❌ Empty response from LLM after ${maxRetries + 1} attempts`);
          // Return a default analysis instead of throwing
          return {
            analysis: {
              observations: ["Unable to analyze screenshot - LLM returned empty response"],
              positiveAspects: [],
              issues: [{
                severity: "medium" as const,
                description: "Analysis unavailable - empty response from AI model",
                recommendation: "Please try again or check API configuration",
              }],
              accessibilityNotes: [],
              thoughts: "The AI model did not return any analysis for this screenshot. This may be due to API issues or rate limiting.",
              userObservation: "Unable to generate observation - please retry the analysis",
              missionContext: "Analysis unavailable",
              expectedOutcome: "Unable to determine expected outcome",
            },
            usage,
          };
        }
      }

      // Log the raw response for debugging (first 1000 chars)
      console.log(`[Screenshot Agent] Raw response preview (first 1000 chars):\n${text.substring(0, 1000)}...`);

      // Parse structured response
      const parsed = parseAnalysisResponse(text, previousContext);

      // Log if new format fields are missing - this is critical for debugging
      const missingFields: string[] = [];
      if (!parsed.userObservation) missingFields.push("userObservation");
      if (!parsed.missionContext) missingFields.push("missionContext");
      if (!parsed.expectedOutcome) missingFields.push("expectedOutcome");

      if (missingFields.length > 0) {
        console.warn(`[Screenshot Agent] ⚠️ Missing new format fields:`, {
          missing: missingFields,
          hasUserObservation: !!parsed.userObservation,
          hasMissionContext: !!parsed.missionContext,
          hasExpectedOutcome: !!parsed.expectedOutcome,
          responseLength: text.length,
        });

        // Log a more detailed sample of the response to help debug parsing issues
        console.warn(`[Screenshot Agent] Full response (first 3000 chars) for debugging:\n${text.substring(0, 3000)}${text.length > 3000 ? "..." : ""}`);

        // Try to find what sections ARE present in the response
        const sectionHeaders = [
          "USER OBSERVATION",
          "MISSION/CONTEXT",
          "EXPECTED OUTCOME",
          "OBSERVATIONS",
          "POSITIVE ASPECTS",
          "ISSUES FOUND",
          "ACCESSIBILITY",
          "THOUGHTS",
        ];
        const foundSections = sectionHeaders.filter((header) =>
          new RegExp(header.replace(/\//g, "\\/"), "i").test(text)
        );
        console.warn(`[Screenshot Agent] Found sections in response:`, foundSections);

        // If we're missing critical fields, try to extract something useful from the response
        // This is a fallback to ensure we don't lose all the analysis
        if (!parsed.userObservation && !parsed.missionContext && !parsed.expectedOutcome) {
          // Try to extract the first meaningful paragraph as userObservation
          const firstParagraph = text.split("\n\n").find((p: string) => p.trim().length > 50);
          if (firstParagraph) {
            parsed.userObservation = cleanMarkdown(firstParagraph.trim().substring(0, 500));
            console.warn(`[Screenshot Agent] ⚠️ Extracted fallback userObservation from first paragraph`);
          }
        }
      } else {
        console.log(`[Screenshot Agent] ✅ Successfully extracted all new format fields`);
      }

      return {
        analysis: parsed,
        usage,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries) {
        console.warn(`[Screenshot Agent] ⚠️ Error on attempt ${attempt + 1}/${maxRetries + 1}:`, lastError.message);
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      } else {
        console.error(`[Screenshot Agent] ❌ Failed after ${maxRetries + 1} attempts:`, lastError);
        // Return a default analysis instead of throwing
        return {
          analysis: {
            observations: [`Error analyzing screenshot: ${lastError.message}`],
            positiveAspects: [],
            issues: [{
              severity: "high" as const,
              description: `Analysis failed: ${lastError.message}`,
              recommendation: "Please try again or check API configuration",
            }],
            accessibilityNotes: [],
            thoughts: `The AI model encountered an error while analyzing this screenshot: ${lastError.message}`,
            userObservation: "Unable to generate observation due to analysis error",
            missionContext: "Analysis unavailable due to error",
            expectedOutcome: "Unable to determine expected outcome",
          },
          usage: emptyUsage,
        };
      }
    }
  }

  // This should never be reached, but TypeScript needs it
  throw new Error("Unexpected error in analyzeScreenshotWithVision");
}

async function generateReflection(
  persona: UserPersona,
  recentAnalyses: ScreenshotAnalysis[],
  priorReflection: string,
  model: any,
  fallbackModel: any
): Promise<{ reflection: string; usage: TokenUsageSummary }> {
  const summary = recentAnalyses
    .map((analysis) => `Screenshot ${analysis.screenshotOrder + 1} thoughts: ${analysis.thoughts}`)
    .join("\n");

  const prompt = `You are ${persona.name}. Reflect on the last few screenshots you just analyzed.

${priorReflection ? `PREVIOUS REFLECTION:\n${priorReflection}\n\n` : ""}
RECENT THOUGHTS:\n${summary}

Write a concise reflection (3-5 sentences) covering:
1) What changed or progressed in the flow
2) The most important friction or confusion
3) What you expect or hope to see next
4) Any overall sentiment shift

IMPORTANT: Write in plain text format. Do NOT use markdown formatting like hash symbols (#), asterisks (*), backticks (\`), or other markdown syntax. Use plain text only.`;

  const result = await generateContentWithFallback(model, fallbackModel, [{ text: prompt }]);
  const response = await result.response;
  return {
    reflection: cleanMarkdown(response.text().trim()),
    usage: extractUsageMetadata(response),
  };
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
  const missionContext = persona.context || userDescription || screenshotContext;
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });


  return `You are ${persona.name}, a ${persona.age}-year-old ${persona.occupation} from ${persona.country}. You are participating in a user testing session where you'll analyze a series of screenshots.

IMPORTANT: TODAY'S DATE IS ${currentDate}. When evaluating this screenshot, you are analyzing it on this date. Screenshots may contain dates from before today (this is normal - screenshots can be captured at any time). Do not flag dates in the screenshot as errors or issues unless they represent actual functional problems. Focus on UX issues, not date discrepancies.

YOUR PROFILE:
- Tech Savviness: ${persona.techSavviness} (${persona.techSavviness === "beginner" ? "you struggle with complex interfaces and need things to be simple" : persona.techSavviness === "advanced" ? "you quickly spot UX issues and expect efficient workflows" : "you can navigate most apps but appreciate good design"})
- Goal: ${persona.financialGoal}
${missionContext ? `- Mission/Context: ${missionContext}` : ""}

WHAT FRUSTRATES YOU:
${persona.painPoints.map((p) => `- ${p}`).join("\n")}

${previousContext ? `PREVIOUS SCREENSHOT CONTEXT:\n${previousContext}\n\n` : ""}
${userDescription ? `USER'S DESCRIPTION:\n${userDescription}\n\n` : ""}
${screenshotContext ? `SCREENSHOT CONTEXT:\n${screenshotContext}\n\n` : ""}

ANALYZE THIS SCREENSHOT as if you were seeing it for the first time. Be concise and action-oriented.

IMPORTANT CONTEXT ABOUT DATA IN SCREENSHOTS:
- Screenshots may contain pre-filled data, user-entered information, or test data that was already present when the screenshot was captured.
- This is NORMAL and EXPECTED behavior - users often fill out forms, enter data, or interact with the platform before screenshots are taken.
- Pre-filled fields, populated dropdowns, entered text, or existing data in the interface are NOT errors or platform faults.
- Do NOT flag pre-filled data, user-entered information, or existing form values as issues, database errors, or platform problems.
- Only flag actual errors such as: broken functionality, missing elements, unclear UI, accessibility issues, or genuine platform bugs.
- If you see data already in fields or forms, assume this is intentional user input or pre-populated information, not a system error.

CRITICAL: You MUST provide these three sections in your response. They are required.

Provide your analysis in this EXACT format:

=== ANALYSIS ===

USER OBSERVATION:
[REQUIRED - Write a concise, action-oriented observation (2-4 sentences) as a direct quote. Start with what you would do next (e.g., "I would tap the 'Shop' link in the header to find available bowl packages. The hero image is visually appealing and communicates brand, but there are no product CTAs visible on this frame. The cart icon is visible but shows 0 items — I expect adding items will increment it."). Include what you notice, what you like, and any concerns. Be specific and brief. This should be written in first person as if you are speaking.]

${missionContext ? `MISSION/CONTEXT:
[REQUIRED - Explain the mission/goal (${missionContext}). What is the logical next step on this frame? Why does this action align with the scenario? What UX aspect does this action test (e.g., navigation discoverability, CTA clarity, consistency)? Keep it to 2-3 sentences. Example: "The mission is to purchase one bowl package; the logical next step is to navigate to the online shop. On this frame the top navigation clearly lists 'Shop' near the center; tapping it should reveal product listings or categories. This action aligns with the scenario and tests whether the header navigation is discoverable and consistent."]` : `MISSION/CONTEXT:
[REQUIRED - What is the logical next step on this frame? Why does this action make sense given your goal (${persona.financialGoal})? What UX aspect does this action test (e.g., navigation discoverability, CTA clarity, consistency)? Keep it to 2-3 sentences. Example: "The logical next step is to navigate to the online shop. On this frame the top navigation clearly lists 'Shop' near the center; tapping it should reveal product listings. This action tests whether the header navigation is discoverable and consistent."]`}

EXPECTED OUTCOME:
[REQUIRED - What do you expect to happen when you perform the next action? What do you plan to do after that? Keep it to 1-2 sentences. Example: "I expect the prototype to navigate to a product listing or shop category page showing bowls or frozen meals. From there I plan to select a single bowl package to add to the cart."]

OBSERVATIONS:
- [What you see and notice]
- [Key elements visible]

POSITIVE ASPECTS:
- [What you like about this screenshot. Be specific and pattern-able: "Clear navigation structure", "Helpful error messages", "Intuitive button placement"]

ISSUES FOUND:
- [Issue 1 - severity: low/medium/high/critical]
- [Issue 2 - severity: low/medium/high/critical]

IMPORTANT FOR ISSUES: Describe issues in a clear, specific, and pattern-able way. Focus on the core problem rather than personal interpretation. For example:
- ✅ GOOD: "Navigation menu has 8 top-level items making it hard to find specific sections"
- ✅ GOOD: "Form has 12 required fields with no progress indicator"
- ✅ GOOD: "Text size is too small (8px) for comfortable reading"
- ❌ BAD: "I found the navigation confusing" (too vague)
- ❌ BAD: "The form was hard" (not specific)
Use consistent terminology: "navigation menu", "form fields", "button size", "text contrast", etc.

ACCESSIBILITY CONCERNS:
- [Any issues with text size, colors, complexity, language? Be specific: "Text size is 8px", "Color contrast ratio is low", "No alt text on images"]

THOUGHTS:
[Your detailed stream of consciousness - what you're thinking as ${persona.name} looking at this screenshot. This can be longer and more detailed than the USER OBSERVATION above. Be honest and authentic.]

=== END ANALYSIS ===

IMPORTANT: 
- Keep USER OBSERVATION, MISSION/CONTEXT, and EXPECTED OUTCOME concise (as shown in examples)
- Write all text in plain format. Do NOT use markdown formatting like hash symbols (#), asterisks (*), backticks (\`), bold (**text**), italic (*text*), or other markdown syntax. Use plain text only.`;
}

/**
 * Helper function to escape regex special characters
 */
function escapeRegexSpecialChars(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Helper function to extract section content with multiple fallback patterns
 */
function extractSection(
  text: string,
  sectionName: string,
  nextSections: string[],
  allowEmpty: boolean = false
): string | undefined {
  if (!text || text.trim().length === 0) {
    return undefined;
  }

  // Try multiple patterns for flexibility
  const patterns = [
    // Primary pattern: exact match with lookahead
    new RegExp(`${sectionName}:\\s*([\\s\\S]*?)(?=\\n\\s*(?:${nextSections.join('|')}|===))`, 'i'),
    // Pattern with optional markdown formatting
    new RegExp(`(?:#+\\s*)?${sectionName}:\\s*([\\s\\S]*?)(?=\\n\\s*(?:${nextSections.join('|')}|===))`, 'i'),
    // Pattern with different spacing
    new RegExp(`${sectionName}\\s*:\\s*([\\s\\S]*?)(?=\\n\\s*(?:${nextSections.join('|')}|===))`, 'i'),
    // Pattern without lookahead (greedy, stops at next section or end)
    new RegExp(`${sectionName}:\\s*([\\s\\S]*?)(?=\\n\\s*(?:${nextSections.map(s => escapeRegexSpecialChars(s)).join('|')}|===|$))`, 'i'),
  ];

  for (const pattern of patterns) {
    try {
      const match = text.match(pattern);
      if (match && match[1]) {
        const content = cleanMarkdown(match[1].trim());
        if (content.length > 0 || allowEmpty) {
          return content;
        }
      }
    } catch (e) {
      // Skip invalid regex patterns - continue to next pattern
      continue;
    }
  }

  // Last resort: try to find the section header and extract until next header or end
  const headerPattern = new RegExp(`${sectionName}:`, 'i');
  const headerMatch = text.search(headerPattern);
  if (headerMatch !== -1) {
    const afterHeader = text.substring(headerMatch + sectionName.length + 1);
    // Find the next section or end
    const escapedSections = nextSections.map(s => escapeRegexSpecialChars(s));
    const sectionsPattern = escapedSections.join('|');
    const nextSectionPattern = new RegExp('\\n\\s*(?:' + sectionsPattern + '|===)', 'i');
    const nextMatch = afterHeader.search(nextSectionPattern);
    const content = nextMatch !== -1
      ? afterHeader.substring(0, nextMatch).trim()
      : afterHeader.trim();
    const cleaned = cleanMarkdown(content);
    if (cleaned.length > 0 || allowEmpty) {
      return cleaned;
    }
  }

  return undefined;
}

/**
 * Parses the agent's response into structured data
 */
function parseAnalysisResponse(
  responseText: string,
  previousContext: string
): Omit<ScreenshotAnalysis, "screenshotOrder" | "s3Key" | "s3Url" | "personaName"> {
  const result: Omit<ScreenshotAnalysis, "screenshotOrder" | "s3Key" | "s3Url" | "personaName"> = {
    observations: [],
    positiveAspects: [],
    issues: [],
    accessibilityNotes: [],
    thoughts: "",
    userObservation: undefined,
    missionContext: undefined,
    expectedOutcome: undefined,
  };

  // Early return if response is empty
  if (!responseText || responseText.trim().length === 0) {
    console.warn(`[Screenshot Agent] Empty response text received`);
    return result;
  }

  // Normalize the text: remove excessive whitespace but preserve structure
  const normalizedText = responseText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Extract user observation (new concise format) with multiple fallback patterns
  result.userObservation = extractSection(
    normalizedText,
    'USER\\s+OBSERVATION',
    ['MISSION\\s*/\\s*CONTEXT', 'EXPECTED\\s+OUTCOME', 'OBSERVATIONS', 'POSITIVE\\s+ASPECTS', 'ISSUES\\s+FOUND', 'ACCESSIBILITY', 'THOUGHTS']
  );

  // Extract mission context (new concise format) with multiple fallback patterns
  result.missionContext = extractSection(
    normalizedText,
    'MISSION\\s*/\\s*CONTEXT',
    ['EXPECTED\\s+OUTCOME', 'OBSERVATIONS', 'POSITIVE\\s+ASPECTS', 'ISSUES\\s+FOUND', 'ACCESSIBILITY', 'THOUGHTS']
  );

  // Extract expected outcome (new concise format) with multiple fallback patterns
  result.expectedOutcome = extractSection(
    normalizedText,
    'EXPECTED\\s+OUTCOME',
    ['OBSERVATIONS', 'POSITIVE\\s+ASPECTS', 'ISSUES\\s+FOUND', 'ACCESSIBILITY', 'THOUGHTS']
  );

  // Extract observations
  const obsText = extractSection(
    normalizedText,
    'OBSERVATIONS',
    ['POSITIVE\\s+ASPECTS', 'ISSUES\\s+FOUND', 'ACCESSIBILITY', 'THOUGHTS']
  );
  if (obsText) {
    result.observations = obsText
      .split("\n")
      .map((line) => line.replace(/^[-•*]\s*/, "").trim())
      .filter((line) => line.length > 0)
      .map(cleanMarkdown);
  }

  // Extract positive aspects
  const posText = extractSection(
    normalizedText,
    'POSITIVE\\s+ASPECTS',
    ['ISSUES\\s+FOUND', 'ACCESSIBILITY', 'THOUGHTS']
  );
  if (posText) {
    result.positiveAspects = posText
      .split("\n")
      .map((line) => line.replace(/^[-•*]\s*/, "").trim())
      .filter((line) => line.length > 0)
      .map(cleanMarkdown);
  }

  // Extract issues
  const issuesText = extractSection(
    normalizedText,
    'ISSUES\\s+FOUND',
    ['ACCESSIBILITY', 'THOUGHTS']
  );
  if (issuesText) {
    const issueLines = issuesText
      .split("\n")
      .map((line) => line.replace(/^[-•*]\s*/, "").trim())
      .filter((line) => line.length > 0);

    result.issues = issueLines.map((line) => {
      const severityMatch = line.match(/\b(low|medium|high|critical)\b/i);
      const severity = (severityMatch?.[1]?.toLowerCase() as "low" | "medium" | "high" | "critical") || "medium";
      const description = cleanMarkdown(line.replace(/\s*[-–]\s*severity:\s*(low|medium|high|critical)\s*/i, "").trim());
      return {
        severity,
        description,
        recommendation: cleanMarkdown(`Address this issue to improve user experience`),
      };
    });
  }

  // Extract accessibility notes
  const accText = extractSection(
    normalizedText,
    'ACCESSIBILITY\\s+CONCERNS',
    ['COMPARISON', 'THOUGHTS']
  );
  if (accText) {
    result.accessibilityNotes = accText
      .split("\n")
      .map((line) => line.replace(/^[-•*]\s*/, "").trim())
      .filter((line) => line.length > 0)
      .map(cleanMarkdown);
  }

  // Extract comparison
  if (previousContext) {
    result.comparisonWithPrevious = extractSection(
      normalizedText,
      'COMPARISON\\s+WITH\\s+PREVIOUS',
      ['THOUGHTS']
    );
  }

  // Extract thoughts
  const thoughtsText = extractSection(
    normalizedText,
    'THOUGHTS',
    [],
    true // Allow empty thoughts
  );
  if (thoughtsText) {
    result.thoughts = thoughtsText;
  } else {
    // Fallback: use the entire response as thoughts if no THOUGHTS section found
    result.thoughts = cleanMarkdown(normalizedText);
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
  const geminiClient = getGeminiClient();
  const model = geminiClient.getGenerativeModel({ model: "gemini-3-flash-preview" });
  const fallbackModel = geminiClient.getGenerativeModel({ model: "gemini-2.0-flash" });
  const analyses: ScreenshotAnalysis[] = [];
  const reflections: ScreenshotReflection[] = [];
  let previousContext = "";
  let latestReflection = "";
  const reflectionInterval = 3;
  const tokenUsage: TokenUsageSummary = {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
  };

  // Analyze each screenshot sequentially
  const orderedScreenshots = screenshots.sort((a, b) => a.order - b.order);
  for (let index = 0; index < orderedScreenshots.length; index += 1) {
    const screenshot = orderedScreenshots[index];
    console.log(`[Screenshot Agent] Analyzing screenshot ${screenshot.order}/${screenshots.length}...`);

    const { analysis, usage: analysisUsage } = await analyzeScreenshotWithVision(
      screenshot,
      persona,
      [previousContext, latestReflection].filter(Boolean).join("\n\n"),
      model,
      fallbackModel
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
    tokenUsage.inputTokens += analysisUsage.inputTokens;
    tokenUsage.outputTokens += analysisUsage.outputTokens;
    tokenUsage.totalTokens += analysisUsage.totalTokens;

    const shouldReflect = (index + 1) % reflectionInterval === 0 || index === orderedScreenshots.length - 1;
    if (shouldReflect) {
      const windowStart = Math.max(0, analyses.length - reflectionInterval);
      const recentAnalyses = analyses.slice(windowStart);
      const { reflection, usage: reflectionUsage } = await generateReflection(
        persona,
        recentAnalyses,
        latestReflection,
        model,
        fallbackModel
      );
      reflections.push({
        startOrder: recentAnalyses[0].screenshotOrder,
        endOrder: recentAnalyses[recentAnalyses.length - 1].screenshotOrder,
        reflection,
      });
      latestReflection = reflection;
      tokenUsage.inputTokens += reflectionUsage.inputTokens;
      tokenUsage.outputTokens += reflectionUsage.outputTokens;
      tokenUsage.totalTokens += reflectionUsage.totalTokens;
    }
  }

  // Generate overall report
  const overallReport = generateOverallReport(analyses, persona);

  return {
    analyses,
    reflections,
    ...overallReport,
    tokenUsage,
  };
}

/**
 * Generates an overall report from individual analyses
 */
function generateOverallReport(
  analyses: ScreenshotAnalysis[],
  persona: UserPersona
): Omit<ScreenshotTestResult, "analyses" | "reflections"> {
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

  // Aggregate accessibility concerns
  const allAccessibilityNotes = analyses.flatMap((a) => a.accessibilityNotes);

  // ============================================================================
  // IMPROVED SCORING ALGORITHM
  // ============================================================================
  // 
  // Score starts at 100 and gets reduced based on issues found.
  // This provides a more accurate representation of the UX quality.
  //
  // Factors considered:
  // 1. Total issue count weighted by severity
  // 2. Issue spread (how many screenshots are affected)
  // 3. Accessibility concerns
  // 4. Positive aspects (small bonus)
  // 5. Normalized by number of screenshots
  //

  let score = 100;
  const screenshotCount = analyses.length;

  // 1. Individual Issue Penalties (penalize EVERY issue, not just grouped ones)
  const severityPenalty = { low: 2, medium: 5, high: 10, critical: 20 };
  const allIssuesFlat = analyses.flatMap((a) => a.issues);

  allIssuesFlat.forEach((issue) => {
    score -= severityPenalty[issue.severity];
  });

  // 2. Common/Recurring Issue Multiplier
  // Issues that appear across many screenshots indicate systemic problems
  commonIssues.forEach((issue) => {
    const spreadRatio = issue.affectedScreenshots.length / screenshotCount;
    if (spreadRatio >= 0.5) {
      // Issue affects 50%+ of screenshots - additional penalty
      const additionalPenalty = severityPenalty[issue.severity] * 0.5;
      score -= additionalPenalty;
    }
  });

  // 3. Accessibility Penalty
  // Each unique accessibility concern reduces score
  const uniqueAccessibilityNotes = new Set(allAccessibilityNotes.map(n => n.toLowerCase().trim()));
  score -= uniqueAccessibilityNotes.size * 3;

  // 4. Positive Aspects Bonus (capped to prevent over-inflation)
  // Give credit for good UX elements, but cap the bonus
  const positiveBonus = Math.min(uniquePositiveAspects.length * 2, 15);
  score += positiveBonus;

  // 5. Normalize by screenshot count
  // More screenshots = more opportunities to find issues, so normalize
  // If we found very few issues across many screenshots, that's good
  const issueRatio = allIssuesFlat.length / screenshotCount;
  if (issueRatio < 1) {
    // Less than 1 issue per screenshot on average - small bonus
    score += 5;
  } else if (issueRatio > 3) {
    // More than 3 issues per screenshot on average - additional penalty
    score -= 10;
  }

  // 6. Critical issue floor
  // If there are critical issues, score cannot exceed 60
  const criticalCount = allIssuesFlat.filter(i => i.severity === "critical").length;
  const highCount = allIssuesFlat.filter(i => i.severity === "high").length;

  if (criticalCount > 0) {
    score = Math.min(score, 60 - (criticalCount - 1) * 10);
  } else if (highCount >= 3) {
    score = Math.min(score, 70);
  }

  // Clamp to 0-100
  score = Math.max(0, Math.min(100, Math.round(score)));

  // Generate descriptive rating
  const getRating = (s: number) => {
    if (s >= 90) return "excellent";
    if (s >= 75) return "good";
    if (s >= 60) return "acceptable";
    if (s >= 40) return "needs improvement";
    return "poor";
  };

  // Generate summary
  const totalIssueCount = allIssuesFlat.length;
  const criticalHighCount = criticalCount + highCount;
  const summary = `Analyzed ${analyses.length} screenshot${analyses.length !== 1 ? 's' : ''} as ${persona.name}. Found ${totalIssueCount} total issue${totalIssueCount !== 1 ? 's' : ''} (${criticalHighCount} critical/high severity) and ${uniquePositiveAspects.length} positive aspect${uniquePositiveAspects.length !== 1 ? 's' : ''}. Overall experience: ${getRating(score)}.`;

  // Generate recommendations - prioritize by severity and frequency
  const recommendations = commonIssues
    .slice(0, 5)
    .map((issue) => {
      const affectedCount = issue.affectedScreenshots.length;
      const urgency = issue.severity === "critical" ? "URGENT: " : issue.severity === "high" ? "Important: " : "";
      return `${urgency}${issue.description} (affects ${affectedCount} screenshot${affectedCount !== 1 ? 's' : ''})`;
    });

  // Add accessibility recommendations if needed
  if (uniqueAccessibilityNotes.size > 0) {
    recommendations.push(`Address ${uniqueAccessibilityNotes.size} accessibility concern${uniqueAccessibilityNotes.size !== 1 ? 's' : ''} for better inclusivity`);
  }

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
