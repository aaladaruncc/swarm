import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";

// ============================================================================
// BETTER AUTH TABLES
// ============================================================================

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================================
// APPLICATION TABLES
// ============================================================================

// Batch test runs - contains multiple persona tests
export const batchTestRuns = pgTable("batch_test_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  targetUrl: text("target_url").notNull(),
  userDescription: text("user_description"), // User's description of their target audience
  generatedPersonas: jsonb("generated_personas").$type<any[]>(), // 10 AI-generated personas
  selectedPersonaIndices: jsonb("selected_persona_indices").$type<number[]>(), // Which 5 were selected
  status: text("status").notNull().default("pending"), // pending, generating_personas, running_tests, aggregating, completed, failed
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  errorMessage: text("error_message"),
});

// Individual test runs for each persona in a batch
export const testRuns = pgTable("test_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  batchTestRunId: uuid("batch_test_run_id")
    .references(() => batchTestRuns.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  targetUrl: text("target_url").notNull(),
  personaIndex: integer("persona_index").notNull().default(0),
  personaData: jsonb("persona_data"), // Full persona object
  personaName: text("persona_name"),
  status: text("status").notNull().default("pending"), // pending, running, completed, failed
  browserbaseSessionId: text("browserbase_session_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  errorMessage: text("error_message"),
});

// Individual persona reports
export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  testRunId: uuid("test_run_id")
    .notNull()
    .references(() => testRuns.id, { onDelete: "cascade" }),
  score: integer("score"), // Stores score * 10 (e.g., 6.5 -> 65)
  summary: text("summary"),
  fullReport: jsonb("full_report"),
  positiveAspects: jsonb("positive_aspects").$type<string[]>(),
  usabilityIssues: jsonb("usability_issues").$type<
    Array<{
      severity: "low" | "medium" | "high" | "critical";
      description: string;
      recommendation: string;
    }>
  >(),
  accessibilityNotes: jsonb("accessibility_notes").$type<string[]>(),
  recommendations: jsonb("recommendations").$type<string[]>(),
  totalDuration: text("total_duration"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Aggregated reports for batch test runs
export const aggregatedReports = pgTable("aggregated_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  batchTestRunId: uuid("batch_test_run_id")
    .notNull()
    .references(() => batchTestRuns.id, { onDelete: "cascade" }),
  overallScore: integer("overall_score"),
  executiveSummary: text("executive_summary"),
  commonIssues: jsonb("common_issues").$type<
    Array<{
      issue: string;
      severity: "low" | "medium" | "high" | "critical";
      affectedPersonas: string[];
      recommendation: string;
    }>
  >(),
  personaSpecificInsights: jsonb("persona_specific_insights").$type<
    Array<{
      personaName: string;
      keyFindings: string[];
    }>
  >(),
  recommendations: jsonb("recommendations").$type<
    Array<{
      priority: "high" | "medium" | "low";
      recommendation: string;
      impact: string;
    }>
  >(),
  strengthsAcrossPersonas: jsonb("strengths_across_personas").$type<string[]>(),
  fullAnalysis: text("full_analysis"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const screenshots = pgTable("screenshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  testRunId: uuid("test_run_id")
    .notNull()
    .references(() => testRuns.id, { onDelete: "cascade" }),
  stepNumber: integer("step_number").notNull(),
  description: text("description"),
  url: text("url"), // URL to stored screenshot (S3, R2, etc.)
  base64Data: text("base64_data"), // Alternative: store as base64
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Swarms - Reusable groups of personas
export const swarms = pgTable("swarms", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  personas: jsonb("personas").$type<any[]>(), // Array of persona objects
  agentCount: integer("agent_count").notNull().default(3),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;

export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;

export type BatchTestRun = typeof batchTestRuns.$inferSelect;
export type NewBatchTestRun = typeof batchTestRuns.$inferInsert;

export type TestRun = typeof testRuns.$inferSelect;
export type NewTestRun = typeof testRuns.$inferInsert;

export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;

export type AggregatedReport = typeof aggregatedReports.$inferSelect;
export type NewAggregatedReport = typeof aggregatedReports.$inferInsert;

export type Screenshot = typeof screenshots.$inferSelect;
export type NewScreenshot = typeof screenshots.$inferInsert;

export type Swarm = typeof swarms.$inferSelect;
export type NewSwarm = typeof swarms.$inferInsert;
