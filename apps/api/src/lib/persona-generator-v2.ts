import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import {
  sampleDemographics,
  type DemographicDistribution,
  type DemographicSample,
} from "./demographic-sampler.js";
import { SAMPLE_PERSONAS } from "./personas.js";

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
  relevanceScore: z
    .number()
    .min(0)
    .max(10)
    .describe("How relevant this persona is to the target audience (0-10)"),
});

const PersonaGenerationResultSchema = z.object({
  personas: z.array(PersonaSchema),
  reasoning: z
    .string()
    .describe("Brief explanation of why these personas were selected"),
});

export type GeneratedPersonaV2 = z.infer<typeof PersonaSchema>;
export type PersonaGenerationResultV2 = z.infer<
  typeof PersonaGenerationResultSchema
>;

type GenerationOptions = {
  count?: number;
  maxConcurrency?: number;
  examplePersona?: string;
  demographicOverrides?: Partial<DemographicDistribution>;
};

function formatPersonaExample(persona: GeneratedPersonaV2): string {
  return [
    `${persona.name}, ${persona.age}, ${persona.occupation} from ${persona.country}.`,
    `Tech: ${persona.techSavviness}. Income: ${persona.incomeLevel}.`,
    `Goal: ${persona.primaryGoal}`,
    `Pain Points: ${persona.painPoints.slice(0, 3).join("; ")}`,
    `Context: ${persona.context}`,
  ].join("\n");
}

function buildSeedExample(): string {
  const fallback = SAMPLE_PERSONAS[0];
  return [
    `${fallback.name}, ${fallback.age}, ${fallback.occupation} from ${fallback.country}.`,
    `Tech: ${fallback.techSavviness}. Income: ${fallback.incomeLevel}.`,
    `Goal: ${fallback.primaryGoal}`,
    `Pain Points: ${fallback.painPoints.slice(0, 3).join("; ")}`,
    `Context: ${fallback.context || "Testing this website for usability."}`,
  ].join("\n");
}

const LAST_NAMES = [
  "Carter",
  "Nguyen",
  "Patel",
  "Garcia",
  "Kim",
  "Miller",
  "Rossi",
  "Silva",
  "Chen",
  "Khan",
  "Johnson",
  "Alvarez",
  "Brown",
  "Davis",
  "Lopez",
];

function ensureFullName(name: string): string {
  const cleaned = name.trim();
  if (!cleaned) {
    return cleaned;
  }
  if (cleaned.split(/\s+/).length >= 2) {
    return cleaned;
  }
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return `${cleaned} ${lastName}`;
}

function describeDemographicConstraints(sample: DemographicSample): string {
  return [
    `- Age between ${sample.ageRange.min}-${sample.ageRange.max} (target ${sample.age})`,
    `- Tech savviness: ${sample.techSavviness}`,
    `- Income level: ${sample.incomeLevel}`,
    `- Primary device: ${sample.device}`,
    `- Accessibility consideration: ${sample.accessibility}`,
    `- Region: ${sample.region} (choose a real country from this region)`,
  ].join("\n");
}

function getSampleSignature(sample: DemographicSample): string {
  return [
    sample.ageRange.label,
    sample.techSavviness,
    sample.incomeLevel,
    sample.device,
    sample.region,
    sample.accessibility,
  ].join("|");
}

function sampleWithDiversity(
  overrides: Partial<DemographicDistribution> | undefined,
  seenSignatures: Set<string>
): DemographicSample {
  let candidate = sampleDemographics(overrides);
  let signature = getSampleSignature(candidate);
  let attempts = 0;
  while (seenSignatures.has(signature) && attempts < 6) {
    candidate = sampleDemographics(overrides);
    signature = getSampleSignature(candidate);
    attempts += 1;
  }
  seenSignatures.add(signature);
  return candidate;
}

async function generateOnePersona(
  userDescription: string,
  targetUrl: string | undefined,
  sample: DemographicSample,
  exampleBlock: string
): Promise<GeneratedPersonaV2> {
  const urlContext = targetUrl ? `Target Website: ${targetUrl}\n` : "";

  const prompt = `You are a UX research expert. Generate ONE realistic user persona as JSON.

${urlContext}User's Target Audience Description: ${userDescription}

Persona must satisfy these constraints:
${describeDemographicConstraints(sample)}

Name requirement:
- Use a realistic first AND last name (e.g., "Jamie Chen", not just "Jamie").
- Avoid reusing first names or occupations from the examples below.

Ensure the persona feels real, distinct, and fits the target audience. 
If an accessibility need is present, reflect it in painPoints and context.
Make the device and accessibility clearly reflected in context.

EXAMPLES (be distinct from these):
${exampleBlock}

Output ONLY the JSON object matching the schema fields exactly.`;

  const result = await generateObject({
    model: openai("gpt-4o"),
    schema: PersonaSchema,
    prompt,
    temperature: 0.7,
  });

  return {
    ...result.object,
    name: ensureFullName(result.object.name),
  };
}

export async function generatePersonasV2(
  userDescription: string,
  targetUrl?: string,
  options: GenerationOptions = {}
): Promise<PersonaGenerationResultV2> {
  const count = options.count ?? 10;
  const maxConcurrency = options.maxConcurrency ?? 6;
  const exampleSeed = options.examplePersona || buildSeedExample();
  const debugEnabled = process.env.PERSONA_GEN_DEBUG === "true";

  const personas: GeneratedPersonaV2[] = [];
  const previousExamples: string[] = [];
  const seenSignatures = new Set<string>();

  if (debugEnabled) {
    console.log(
      `[PersonaGenV2] Starting generation: count=${count}, concurrency=${maxConcurrency}`
    );
  }

  for (let start = 0; start < count; start += maxConcurrency) {
    const end = Math.min(start + maxConcurrency, count);
    const batchTasks: Array<Promise<GeneratedPersonaV2>> = [];

    for (let i = start; i < end; i += 1) {
      const sample = sampleWithDiversity(
        options.demographicOverrides,
        seenSignatures
      );
      const examples = previousExamples.slice(-3);
      const exampleBlock = [exampleSeed, ...examples].filter(Boolean).join(
        "\n\n"
      );
      if (debugEnabled) {
        console.log(
          `[PersonaGenV2] Sampled: age=${sample.age} (${sample.ageRange.label}), tech=${sample.techSavviness}, income=${sample.incomeLevel}, device=${sample.device}, accessibility=${sample.accessibility}, region=${sample.region}`
        );
      }
      batchTasks.push(
        generateOnePersona(userDescription, targetUrl, sample, exampleBlock)
      );
    }

    const batchResults = await Promise.all(batchTasks);
    for (const persona of batchResults) {
      personas.push(persona);
      previousExamples.push(formatPersonaExample(persona));
      if (debugEnabled) {
        console.log(
          `[PersonaGenV2] Generated: ${persona.name} (${persona.age}, ${persona.country}) score=${persona.relevanceScore}`
        );
      }
    }
  }

  const reasoning = `Generated ${personas.length} personas using weighted demographic sampling and diversity constraints to cover varied ages, tech levels, and accessibility needs.`;

  return PersonaGenerationResultSchema.parse({
    personas,
    reasoning,
  });
}
