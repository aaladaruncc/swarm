import { generateText, Output } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";

// Create Google provider instance using existing environment variables
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || 
          process.env.GEMINI_API_KEY || 
          process.env.GOOGLE_API_KEY,
});

// ============================================================================
// SCHEMAS
// ============================================================================

const PersonaSchema = z.object({
  // Demographics (essential for testing)
  name: z.string(),
  age: z.number().min(18).max(100),
  gender: z.string().describe("Male, Female, or Non-binary"),
  maritalStatus: z.enum(["single", "married", "divorced", "widowed", "partnered"]).describe("Marital status"),
  country: z.string(),
  occupation: z.string(),
  education: z.string().describe("Education level or degree"),
  incomeLevel: z.enum(["low", "medium", "high"]),
  income: z.string().describe("Approximate annual income with currency"),
  techSavviness: z.enum(["beginner", "intermediate", "advanced"]),
  
  // Goals (essential for testing behavior)
  primaryGoal: z.string(),
  painPoints: z.array(z.string()),
  
  // Selection metric
  relevanceScore: z.number().min(0).max(10).describe("How relevant this persona is to the target audience (0-10)"),
});

const PersonaGenerationResultSchema = z.object({
  personas: z.array(PersonaSchema),
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
  const startTime = Date.now();
  console.log(`[Persona Gen] Starting generation for: "${userDescription}" (URL: ${targetUrl || "none"})`);

  const urlContext = targetUrl ? `Target: ${targetUrl}\n` : "";

  // Optimized prompt - only essential fields for faster generation
  const prompt = `Generate 6 diverse UX testing personas for: ${userDescription}

${urlContext}Requirements (demographics only - no narratives):
- Demographics: name, age (18-100), gender, maritalStatus (single/married/divorced/widowed/partnered), country, occupation, education, incomeLevel (low/medium/high), income (with currency), techSavviness (beginner/intermediate/advanced)
- Goals: primaryGoal (1 sentence), painPoints (3-4 items), relevanceScore (0-10)
- Diversity: mix ages, all tech levels, different countries, varied marital statuses

Keep it concise - demographics and goals only.`;

  try {
    const apiStartTime = Date.now();
    const result = await generateText({
      model: google("gemini-2.5-flash-lite") as any, // Fastest model: 4K RPM, 4M TPM, Unlimited RPD
      output: Output.object({
        schema: PersonaGenerationResultSchema,
      }) as any,
      prompt,
      temperature: 0.7, // Slightly lower for faster, more consistent generation
      maxOutputTokens: 3000, // Reduced since we removed narratives (6 personas × ~12 fields = ~72 fields)
    } as any);
    
    const apiTime = Date.now() - apiStartTime;
    console.log(`[Persona Gen] API call took ${apiTime}ms`);

    // In AI SDK v6, structured output is accessed via the output property
    const output = (result as any).output as PersonaGenerationResult;
    const totalTime = Date.now() - startTime;
    console.log(`[Persona Gen] ✅ Generated ${output.personas.length} personas in ${totalTime}ms (API: ${apiTime}ms)`);
    return output;
  } catch (error: any) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    console.error("Failed to generate personas:", message);
    if (stack) {
      console.error("Persona generation stack:", stack);
    }
    if (error?.text) {
      console.error("Persona generation raw text:", error.text);
    }

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
