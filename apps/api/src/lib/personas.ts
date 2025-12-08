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
  primaryGoal: z.string(),
  painPoints: z.array(z.string()),
  context: z.string().optional(),
});

export type UserPersona = z.infer<typeof UserPersonaSchema>;

// ============================================================================
// PERSONA EXAMPLES
// ============================================================================

export const SAMPLE_PERSONAS: UserPersona[] = [
  {
    name: "Sarah",
    age: 42,
    country: "United States",
    occupation: "Busy Parent & Part-time Nurse",
    incomeLevel: "medium",
    techSavviness: "intermediate",
    primaryGoal: "Get things done quickly between work and family responsibilities",
    painPoints: [
      "Limited time - need things to be fast and obvious",
      "Easily distracted by kids, need to pick up where I left off",
      "Frustrated by unclear navigation or hidden features",
      "Prefer mobile-friendly designs I can use on the go",
    ],
    context: "Juggling work and kids, multitasking constantly, uses phone more than computer",
  },
  {
    name: "James",
    age: 67,
    country: "United Kingdom",
    occupation: "Retired Teacher",
    incomeLevel: "medium",
    techSavviness: "beginner",
    primaryGoal: "Complete tasks without feeling confused or making mistakes",
    painPoints: [
      "Small text and icons are hard to see",
      "Too many options or steps overwhelm me",
      "Worried about clicking wrong buttons or losing information",
      "Need clear instructions and confirmation messages",
    ],
    context: "New to smartphones, prefers simple interfaces, concerned about privacy and security",
  },
  {
    name: "Alex",
    age: 26,
    country: "Canada",
    occupation: "Software Developer",
    incomeLevel: "high",
    techSavviness: "advanced",
    primaryGoal: "Accomplish tasks efficiently with minimal friction",
    painPoints: [
      "Annoyed by slow loading times or clunky interfaces",
      "Want keyboard shortcuts and power user features",
      "Dislike unnecessary clicks or confirmation dialogs",
      "Expect modern, polished design and smooth animations",
    ],
    context: "Tech-savvy early adopter, expects best-in-class UX, compares to top apps",
  },
  {
    name: "Maria",
    age: 35,
    country: "Mexico",
    occupation: "Small Business Owner",
    incomeLevel: "medium",
    techSavviness: "intermediate",
    primaryGoal: "Find information and complete tasks without wasting time",
    painPoints: [
      "English is my second language - simple words help",
      "Need clear visuals and icons, not just text",
      "Frustrated by technical jargon or complex language",
      "Want things to work the same way on phone and computer",
    ],
    context: "Running a small shop, uses tech for business, prefers Spanish when available",
  },
  {
    name: "David",
    age: 23,
    country: "Nigeria",
    occupation: "University Student",
    incomeLevel: "low",
    techSavviness: "advanced",
    primaryGoal: "Get the most out of free or affordable services",
    painPoints: [
      "Concerned about data usage and battery drain",
      "Need things to work on older/slower devices",
      "Frustrated by paywalls or forced upgrades",
      "Want to share content easily with classmates",
    ],
    context: "Uses budget Android phone, relies on mobile data, expects app to work offline",
  },
  {
    name: "Yuki",
    age: 52,
    country: "Japan",
    occupation: "Office Manager",
    incomeLevel: "medium",
    techSavviness: "beginner",
    primaryGoal: "Complete work tasks correctly without making errors",
    painPoints: [
      "Nervous about technology, fear of breaking things",
      "Need reassurance that actions are saved/completed",
      "Prefer step-by-step guidance",
      "Uncomfortable with unexpected changes or updates",
    ],
    context: "Methodical and detail-oriented, prefers familiarity, avoids risky clicks",
  },
  {
    name: "Emma",
    age: 29,
    country: "Australia",
    occupation: "Marketing Specialist",
    incomeLevel: "high",
    techSavviness: "advanced",
    primaryGoal: "Discover features quickly and explore all capabilities",
    painPoints: [
      "Frustrated by hidden features or poor discoverability",
      "Want tooltips and hints for advanced options",
      "Dislike when apps assume I'm a beginner",
      "Expect responsive customer support if needed",
    ],
    context: "Early adopter, loves trying new tools, shares experiences on social media",
  },
  {
    name: "Carlos",
    age: 58,
    country: "Spain",
    occupation: "Restaurant Manager",
    incomeLevel: "medium",
    techSavviness: "beginner",
    primaryGoal: "Learn enough to get my job done without spending hours figuring it out",
    painPoints: [
      "Don't have time for long tutorials or manuals",
      "Need features to be obvious and labeled clearly",
      "Frustrated by apps that change layouts frequently",
      "Prefer phone calls or chat over reading documentation",
    ],
    context: "Practical and goal-focused, learns by doing, prefers consistency over novelty",
  },
  {
    name: "Aisha",
    age: 31,
    country: "Kenya",
    occupation: "Freelance Designer",
    incomeLevel: "medium",
    techSavviness: "advanced",
    primaryGoal: "Have a smooth, aesthetically pleasing experience",
    painPoints: [
      "Bothered by poor visual design or inconsistent styling",
      "Want dark mode and customization options",
      "Annoyed by unnecessary animations or bloat",
      "Expect accessibility features for screen readers",
    ],
    context: "Design-conscious, notices small details, values both form and function",
  },
  {
    name: "Robert",
    age: 71,
    country: "United States",
    occupation: "Retired Veteran",
    incomeLevel: "low",
    techSavviness: "beginner",
    primaryGoal: "Access information without getting lost or confused",
    painPoints: [
      "Vision problems - need large text and high contrast",
      "Hearing loss - need visual alternatives to audio",
      "Shaky hands - need large clickable areas",
      "Memory issues - need clear reminders of where I am",
    ],
    context: "Accessibility needs due to age, prefers simple layouts, needs help remembering steps",
  },
];

export function getPersonaByIndex(index: number): UserPersona {
  return SAMPLE_PERSONAS[index] || SAMPLE_PERSONAS[0];
}
