import { generateObject, generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import type { AgentResult } from "./agent.js";

// ============================================================================
// SCHEMAS
// ============================================================================

const AggregatedReportSchema = z.object({
  overallScore: z.number().min(0).max(10).describe("Overall UX score across all personas"),
  executiveSummary: z.string().describe("2-3 paragraph executive summary of findings"),
  commonIssues: z.array(
    z.object({
      issue: z.string(),
      severity: z.enum(["low", "medium", "high", "critical"]),
      affectedPersonas: z.array(z.string()),
      recommendation: z.string(),
    })
  ).describe("Issues that affected multiple personas"),
  personaSpecificInsights: z.array(
    z.object({
      personaName: z.string(),
      keyFindings: z.array(z.string()),
    })
  ).describe("Unique insights from each persona"),
  recommendations: z.array(
    z.object({
      priority: z.enum(["high", "medium", "low"]),
      recommendation: z.string(),
      impact: z.string(),
    })
  ).describe("Prioritized recommendations for improvement"),
  strengthsAcrossPersonas: z.array(z.string()).describe("What worked well across all personas"),
});

export type AggregatedReportData = z.infer<typeof AggregatedReportSchema>;

// ============================================================================
// REPORT AGGREGATION
// ============================================================================

export async function aggregateReports(
  results: AgentResult[],
  targetUrl: string
): Promise<{ aggregatedReport: AggregatedReportData; fullAnalysis: string }> {
  console.log(`Aggregating reports from ${results.length} personas...`);

  if (results.length === 0) {
    throw new Error("No results to aggregate");
  }

  // Build a comprehensive summary of all results
  const resultsSummary = results
    .map((result, index) => {
      return `
=== PERSONA ${index + 1}: ${result.persona.name} ===
Profile: ${result.persona.age}yo ${result.persona.occupation} from ${result.persona.country}
Tech Level: ${result.persona.techSavviness}
Primary Goal: ${result.persona.primaryGoal}

Score: ${result.overallExperience.score}/10
Summary: ${result.overallExperience.summary}

Positive Aspects:
${result.positiveAspects.map(p => `- ${p}`).join("\n")}

Usability Issues:
${result.usabilityIssues.map(i => `- [${i.severity}] ${i.description}`).join("\n")}

Accessibility/Confusion:
${result.accessibilityNotes.map(a => `- ${a}`).join("\n")}

Recommendations:
${result.recommendations.map(r => `- ${r}`).join("\n")}

Persona-Specific Feedback:
${result.personaSpecificFeedback}
`;
    })
    .join("\n\n" + "=".repeat(80) + "\n\n");

  const prompt = `You are a senior UX researcher analyzing user testing results from multiple personas testing a website.

Website: ${targetUrl}

Below are the detailed test results from ${results.length} different user personas with varying backgrounds, tech levels, and needs:

${resultsSummary}

Your task is to:
1. Identify COMMON ISSUES that affected multiple personas
2. Calculate an overall UX score (weighted average, with more weight to critical issues)
3. Extract unique insights from each persona
4. Provide prioritized, actionable recommendations
5. Highlight what worked well across all personas

Focus on:
- Patterns across different user types
- Issues that affect beginners vs advanced users differently  
- Accessibility concerns
- Critical vs nice-to-have improvements
- Quick wins vs long-term improvements

Be specific and actionable in your recommendations.`;

  try {
    // Generate structured report
    const structuredResult = await generateObject({
      model: openai("gpt-4o"),
      schema: AggregatedReportSchema,
      prompt,
      temperature: 0.3, // Lower temperature for more consistent analysis
    });

    // Generate full narrative analysis
    const narrativePrompt = `Based on the user testing results above, write a comprehensive 4-5 paragraph analysis covering:

1. Overall Assessment: What's the current state of the UX?
2. Key Findings: Most important discoveries across personas
3. Critical Issues: What needs immediate attention?
4. Strengths: What's working well?
5. Strategic Recommendations: Roadmap for improvements

Write in a professional but accessible tone, as if presenting to stakeholders.`;

    const narrativeResult = await generateText({
      model: openai("gpt-4o"),
      prompt: `${prompt}\n\n${narrativePrompt}`,
      temperature: 0.4,
    });

    console.log(`✅ Aggregated report generated. Overall score: ${structuredResult.object.overallScore}/10`);

    return {
      aggregatedReport: structuredResult.object,
      fullAnalysis: narrativeResult.text,
    };
  } catch (error) {
    console.error("Failed to aggregate reports:", error);
    throw new Error("Failed to aggregate reports: " + (error instanceof Error ? error.message : "Unknown error"));
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function calculateAverageScore(results: AgentResult[]): number {
  if (results.length === 0) return 0;
  const sum = results.reduce((acc, result) => acc + result.overallExperience.score, 0);
  return Math.round(sum / results.length);
}

export function extractCommonIssues(results: AgentResult[]): Array<{
  issue: string;
  count: number;
  personas: string[];
}> {
  const issueMap = new Map<string, { count: number; personas: string[] }>();

  results.forEach((result) => {
    result.usabilityIssues.forEach((issue) => {
      const key = issue.description.toLowerCase();
      if (issueMap.has(key)) {
        const existing = issueMap.get(key)!;
        existing.count++;
        existing.personas.push(result.persona.name);
      } else {
        issueMap.set(key, { count: 1, personas: [result.persona.name] });
      }
    });
  });

  // Return issues that affected more than 1 persona
  return Array.from(issueMap.entries())
    .filter(([_, data]) => data.count > 1)
    .map(([issue, data]) => ({ issue, ...data }))
    .sort((a, b) => b.count - a.count);
}
