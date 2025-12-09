import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

// ============================================================================
// SCHEMAS
// ============================================================================

const PersonaSchema = z.object({
  name: z.string(),
  age: z.number().min(18).max(100),
  country: z.string(),
  occupation: z.string(),
  incomeLevel: z.enum(["low", "medium", "high"]),
  techSavviness: z.enum(["beginner", "intermediate", "advanced"]),
  primaryGoal: z.string(),
  painPoints: z.array(z.string()),
  context: z.string(),
  relevanceScore: z.number().min(0).max(10).describe("How relevant this persona is to the target audience (0-10)"),
});

const PersonaGenerationResultSchema = z.object({
  personas: z.array(PersonaSchema),
  reasoning: z.string().describe("Brief explanation of why these personas were selected"),
});

export type GeneratedPersona = z.infer<typeof PersonaSchema>;
export type PersonaGenerationResult = z.infer<typeof PersonaGenerationResultSchema>;

// ============================================================================
// PERSONA GENERATION
// ============================================================================

export async function generatePersonas(
  userDescription: string,
  targetUrl: string
): Promise<PersonaGenerationResult> {
  console.log(`Generating personas for: "${userDescription}" (URL: ${targetUrl})`);

  const prompt = `You are a UX research expert. Based on the user's description of their target audience, generate 10 diverse, realistic user personas that represent potential users of their website.

Target Website: ${targetUrl}
User's Target Audience Description: ${userDescription}

Create 10 distinct personas that:
1. Cover a diverse range of demographics (age, location, occupation, income)
2. Include different tech savviness levels (beginner, intermediate, advanced)
3. Represent realistic users who would actually use this type of website
4. Have specific, actionable pain points and goals
5. Are ranked by relevance to the target audience (relevanceScore 0-10)

For each persona, provide:
- name: A realistic first name
- age: Between 18-100
- country: Full country name
- occupation: Specific job title or role
- incomeLevel: "low", "medium", or "high"
- techSavviness: "beginner", "intermediate", or "advanced"
- primaryGoal: What they want to accomplish (1 clear sentence)
- painPoints: 3-4 specific frustrations or challenges (as an array)
- context: Additional behavioral context (2-3 sentences)
- relevanceScore: 0-10, how relevant is this persona to the described audience

Ensure variety in:
- Age groups (young adults, middle-aged, seniors)
- Tech levels (mix of beginners, intermediate, advanced)
- Geographic diversity
- Accessibility needs (some personas should have accessibility considerations)
- Use case motivations

Make the personas feel like real people, not stereotypes.`;

  try {
    const result = await generateObject({
      model: openai("gpt-4o"),
      schema: PersonaGenerationResultSchema,
      prompt,
      temperature: 0.8, // Higher temperature for more creative/diverse personas
    });

    console.log(`✅ Generated ${result.object.personas.length} personas`);
    return result.object;
  } catch (error) {
    console.error("Failed to generate personas:", error);
    throw new Error("Failed to generate personas: " + (error instanceof Error ? error.message : "Unknown error"));
  }
}

// ============================================================================
// AUTO-SELECTION LOGIC
// ============================================================================

export function selectTopPersonas(
  personas: GeneratedPersona[],
  count: number = 5
): { selectedIndices: number[]; reasoning: string } {
  // Sort by relevance score (descending)
  const sortedWithIndices = personas
    .map((persona, index) => ({ persona, index }))
    .sort((a, b) => b.persona.relevanceScore - a.persona.relevanceScore);

  // Take top `count` most relevant personas
  // Ensure diversity in tech savviness
  const selected: { persona: GeneratedPersona; index: number }[] = [];
  const techLevels = new Set<string>();

  // First pass: Add highest scoring personas while ensuring tech diversity
  for (const item of sortedWithIndices) {
    if (selected.length >= count) break;
    
    // If we have less than 3 selected, or this tech level isn't represented yet
    if (selected.length < 3 || !techLevels.has(item.persona.techSavviness)) {
      selected.push(item);
      techLevels.add(item.persona.techSavviness);
    }
  }

  // Second pass: Fill remaining slots with highest scores
  for (const item of sortedWithIndices) {
    if (selected.length >= count) break;
    if (!selected.includes(item)) {
      selected.push(item);
    }
  }

  const selectedIndices = selected.map(s => s.index);
  const selectedPersonas = selected.map(s => s.persona);

  const reasoning = `Selected top ${count} personas based on relevance scores (${selectedPersonas.map(p => `${p.name}: ${p.relevanceScore}/10`).join(", ")}). ` +
    `Tech diversity: ${Array.from(new Set(selectedPersonas.map(p => p.techSavviness))).join(", ")}.`;

  console.log(`✅ Auto-selected ${count} personas: ${selectedPersonas.map(p => p.name).join(", ")}`);

  return { selectedIndices, reasoning };
}
