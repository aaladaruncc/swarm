import { z } from "zod";

// ============================================================================
// SCHEMAS
// ============================================================================

export const UserPersonaSchema = z.object({
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

export type UserPersona = z.infer<typeof UserPersonaSchema>;

// ============================================================================
// PERSONA EXAMPLES
// ============================================================================

export const SAMPLE_PERSONAS: UserPersona[] = [
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

export function getPersonaByIndex(index: number): UserPersona {
  return SAMPLE_PERSONAS[index] || SAMPLE_PERSONAS[0];
}
