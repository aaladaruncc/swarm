import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

// ============================================================================
// SCHEMAS
// ============================================================================

const PersonaSchema = z.object({
  name: z.string(),
  age: z.number().min(18).max(100),
  gender: z.string().describe("Male, Female, or Non-binary"),
  country: z.string(),
  occupation: z.string(),
  education: z.string().describe("Education level or degree"),
  incomeLevel: z.enum(["low", "medium", "high"]),
  income: z.string().describe("Approximate annual income with currency"),
  techSavviness: z.enum(["beginner", "intermediate", "advanced"]),
  primaryGoal: z.string(),
  painPoints: z.array(z.string()),

  // Detailed narrative sections (matching UXAgent format)
  background: z.string().describe("2-3 sentences about their life story, role, and what drives them"),
  financialSituation: z.string().describe("Their financial habits, spending patterns, and budget considerations"),
  browsingHabits: z.string().describe("How they typically browse/shop online, their preferences and frustrations"),
  professionalLife: z.string().describe("Their work environment, responsibilities, and how they manage time"),
  personalStyle: z.string().describe("Their personality traits, preferences, and behavioral patterns"),

  // Original fields
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
  targetUrl?: string
): Promise<PersonaGenerationResult> {
  console.log(`Generating personas for: "${userDescription}" (URL: ${targetUrl || "none"})`);

  const urlContext = targetUrl ? `Target Website: ${targetUrl}\n` : "";

  const prompt = `You are a UX research expert creating detailed, realistic personas for user testing. Based on the target audience description, generate 10 diverse personas with rich narrative backstories.

${urlContext}User's Target Audience Description: ${userDescription}

Create 10 distinct personas with DETAILED narrative profiles. Each persona should feel like a real person with a complete life story. Include:

DEMOGRAPHICS:
- name: A realistic full first name
- age: Between 18-100  
- gender: Male, Female, or Non-binary
- country: Full country name
- occupation: Specific job title or role
- education: Their education level or degree
- incomeLevel: "low", "medium", or "high"
- income: Approximate annual income with currency (e.g., "$45,000", "£35,000")
- techSavviness: "beginner", "intermediate", or "advanced"

NARRATIVE SECTIONS (2-3 detailed sentences each):
- background: Their life story - who they are, what drives them, their passions and goals
- financialSituation: How they manage money, spending habits, budget consciousness, saving patterns
- browsingHabits: How they shop/browse online, preferences for efficiency vs exploration, frustrations with websites
- professionalLife: Work environment, daily responsibilities, time management, work-life balance
- personalStyle: Personality traits, decision-making style, communication preferences, comfort with technology

GOALS & PAIN POINTS:
- primaryGoal: Their main objective when visiting this type of website (1 clear sentence)
- painPoints: 3-4 specific frustrations or challenges (as an array)
- context: Additional behavioral context relevant to testing (2-3 sentences)
- relevanceScore: 0-10, how relevant is this persona to the described audience

DIVERSITY REQUIREMENTS:
- Mix of age groups (young adults, middle-aged, seniors)
- All tech levels (beginners who struggle, intermediate users, power users)
- Geographic diversity across different countries
- Include accessibility considerations (vision, hearing, motor, cognitive)
- Varied browsing styles (quick/efficient shoppers vs careful researchers)

Make each persona feel authentic with specific details, not generic stereotypes.`;

  try {
    const result = await generateObject({
      model: openai("gpt-4o-mini"), // Using mini for faster generation
      schema: PersonaGenerationResultSchema,
      prompt,
      temperature: 0.8, // Higher temperature for more creative/diverse personas
    });

    console.log(`✅ Generated ${result.object.personas.length} personas`);
    return result.object;
  } catch (error: any) {
    console.error("Failed to generate personas:", error);

    // If the error contains the response text, try to extract it manually
    if (error?.text) {
      try {
        const parsed = JSON.parse(error.text);
        if (parsed.properties && parsed.properties.personas) {
          console.log("Extracting data from nested properties structure");
          return parsed.properties as PersonaGenerationResult;
        }
      } catch (parseError) {
        // Ignore parse errors
      }
    }

    throw new Error("Failed to generate personas: " + (error instanceof Error ? error.message : "Unknown error"));
  }
}

// ============================================================================
// AUTO-SELECTION LOGIC
// ============================================================================

export function selectTopPersonas(
  personas: GeneratedPersona[],
  count: number = 3
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
