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
  useUXAgent: boolean("use_ux_agent").default(false), // Whether UXAgent service was used
  // Shareable link fields
  shareToken: text("share_token").unique(), // Unique token for public sharing
  shareEnabled: boolean("share_enabled").default(false), // Whether sharing is enabled
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
  s3Key: text("s3_key"), // S3 object key for the screenshot
  s3Url: text("s3_url"), // Full S3 URL or presigned URL
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
// API KEYS - Internal service-to-service authentication
// ============================================================================

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull(),
  keyPrefix: text("key_prefix").notNull(),
  scopes: jsonb("scopes").$type<string[]>(),
  isActive: boolean("is_active").notNull().default(true),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ============================================================================
// UXAGENT RUNS - Store UXAgent execution data
// ============================================================================

export const uxagentRuns = pgTable("uxagent_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  testRunId: uuid("test_run_id").references(() => testRuns.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),

  // Run metadata
  runId: text("run_id").notNull(),
  intent: text("intent").notNull(),
  startUrl: text("start_url").notNull(),
  personaData: jsonb("persona_data"),

  // Status
  status: text("status").notNull().default("running"),
  score: integer("score"),
  terminated: boolean("terminated").default(false),
  stepsTaken: integer("steps_taken"),
  errorMessage: text("error_message"),

  // Traces (JSON data)
  basicInfo: jsonb("basic_info"),
  actionTrace: jsonb("action_trace"),
  memoryTrace: jsonb("memory_trace"),
  observationTrace: jsonb("observation_trace"),

  // Full log
  logContent: text("log_content"),

  // Timestamps
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const uxagentScreenshots = pgTable("uxagent_screenshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  uxagentRunId: uuid("uxagent_run_id")
    .notNull()
    .references(() => uxagentRuns.id, { onDelete: "cascade" }),
  stepNumber: integer("step_number").notNull(),
  filename: text("filename"),
  s3Key: text("s3_key"), // S3 object key for the screenshot
  s3Url: text("s3_url"), // Full S3 URL
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Individual thought pieces from UXAgent runs - structured storage
export const uxagentThoughts = pgTable("uxagent_thoughts", {
  id: uuid("id").primaryKey().defaultRandom(),
  uxagentRunId: uuid("uxagent_run_id")
    .notNull()
    .references(() => uxagentRuns.id, { onDelete: "cascade" }),

  // Thought metadata
  kind: text("kind").notNull(), // 'observation' | 'action' | 'plan' | 'thought' | 'reflection'
  content: text("content").notNull(),
  importance: integer("importance"), // 0-100 scale
  stepNumber: integer("step_number"),

  // For actions - store the raw action data
  rawAction: jsonb("raw_action"),

  // Timestamps
  agentTimestamp: integer("agent_timestamp"), // Agent's internal timestamp
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// AI-generated insights from UXAgent thought analysis
export const uxagentInsights = pgTable("uxagent_insights", {
  id: uuid("id").primaryKey().defaultRandom(),
  uxagentRunId: uuid("uxagent_run_id")
    .notNull()
    .references(() => uxagentRuns.id, { onDelete: "cascade" }),

  // Insight data
  category: text("category").notNull(), // 'usability' | 'accessibility' | 'performance' | 'content' | 'navigation'
  severity: text("severity").notNull(), // 'low' | 'medium' | 'high' | 'critical'
  title: text("title").notNull(),
  description: text("description").notNull(),
  recommendation: text("recommendation").notNull(),

  // Evidence - which thoughts support this insight
  supportingThoughtIds: jsonb("supporting_thought_ids").$type<string[]>(),

  // Metadata
  aiModel: text("ai_model"), // Which model generated this
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Chat messages with the simulated persona
export const uxagentChatMessages = pgTable("uxagent_chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  uxagentRunId: uuid("uxagent_run_id")
    .notNull()
    .references(() => uxagentRuns.id, { onDelete: "cascade" }),

  // Message data
  role: text("role").notNull(), // 'user' | 'assistant'
  content: text("content").notNull(),

  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ============================================================================
// SCREENSHOT FLOW TESTING
// ============================================================================

// Screenshot-based test runs (user uploads a sequence of screenshots)
export const screenshotTestRuns = pgTable("screenshot_test_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),

  // Test metadata
  testName: text("test_name"),
  userDescription: text("user_description"), // Context about what's being tested
  expectedTask: text("expected_task"), // Optional: What user is trying to accomplish

  // Persona
  personaData: jsonb("persona_data"), // Single persona for MVP
  generatedPersonas: jsonb("generated_personas").$type<any[]>(),
  selectedPersonaIndices: jsonb("selected_persona_indices").$type<number[]>(),
  agentCount: integer("agent_count").default(1),

  // Status
  status: text("status").notNull().default("pending"),
  // pending | uploading | analyzing | completed | failed

  // Results
  overallScore: integer("overall_score"), // 0-100
  summary: text("summary"),
  fullReport: jsonb("full_report"),

  // Shareable link fields
  shareToken: text("share_token").unique(), // Unique token for public sharing
  shareEnabled: boolean("share_enabled").default(false), // Whether sharing is enabled

  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  errorMessage: text("error_message"),
});

// Individual screenshots within a test run
export const screenshotFlowImages = pgTable("screenshot_flow_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  screenshotTestRunId: uuid("screenshot_test_run_id")
    .notNull()
    .references(() => screenshotTestRuns.id, { onDelete: "cascade" }),

  // Ordering & storage
  orderIndex: integer("order_index").notNull(), // 0-based order in the flow
  s3Key: text("s3_key").notNull(),
  s3Url: text("s3_url").notNull(),

  // User-provided context
  description: text("description"), // Optional: User's description of this screen
  context: text("context"), // Optional: What action led here

  // Analysis results (filled after processing)
  observations: jsonb("observations").$type<string[]>(),
  positiveAspects: jsonb("positive_aspects").$type<string[]>(),
  issues: jsonb("issues").$type<Array<{
    severity: "low" | "medium" | "high" | "critical";
    description: string;
    recommendation: string;
  }>>(),
  accessibilityNotes: jsonb("accessibility_notes").$type<string[]>(),
  thoughts: text("thoughts"), // Agent's stream of consciousness
  comparisonWithPrevious: text("comparison_with_previous"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Per-persona analysis results for screenshots
export const screenshotAnalysisResults = pgTable("screenshot_analysis_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  screenshotTestRunId: uuid("screenshot_test_run_id")
    .notNull()
    .references(() => screenshotTestRuns.id, { onDelete: "cascade" }),

  screenshotOrder: integer("screenshot_order").notNull(),
  s3Key: text("s3_key").notNull(),
  s3Url: text("s3_url").notNull(),
  personaIndex: integer("persona_index").notNull(),
  personaName: text("persona_name"),

  observations: jsonb("observations").$type<string[]>(),
  positiveAspects: jsonb("positive_aspects").$type<string[]>(),
  issues: jsonb("issues").$type<Array<{
    severity: "low" | "medium" | "high" | "critical";
    description: string;
    recommendation: string;
  }>>(),
  accessibilityNotes: jsonb("accessibility_notes").$type<string[]>(),
  thoughts: text("thoughts"),
  comparisonWithPrevious: text("comparison_with_previous"),
  // New concise format fields
  userObservation: text("user_observation"), // Action-oriented quoted feedback
  missionContext: text("mission_context"), // Why this action makes sense, what it tests
  expectedOutcome: text("expected_outcome"), // What happens next

  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Aggregated insights for screenshot test runs
export const screenshotAggregatedInsights = pgTable("screenshot_aggregated_insights", {
  id: uuid("id").primaryKey().defaultRandom(),
  screenshotTestRunId: uuid("screenshot_test_run_id")
    .notNull()
    .references(() => screenshotTestRuns.id, { onDelete: "cascade" }),

  // Insight categorization
  category: text("category").notNull(), // 'issues' | 'observations' | 'accessibility' | 'positives'
  severity: text("severity"), // Only for issues: 'low' | 'medium' | 'high' | 'critical'

  // Insight content
  title: text("title").notNull(),
  description: text("description").notNull(),
  recommendation: text("recommendation"),

  // Source tracking
  personaName: text("persona_name").notNull(),
  personaIndex: integer("persona_index").notNull(),
  screenshotOrder: integer("screenshot_order").notNull(),

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

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;

export type UxagentRun = typeof uxagentRuns.$inferSelect;
export type NewUxagentRun = typeof uxagentRuns.$inferInsert;

export type UxagentScreenshot = typeof uxagentScreenshots.$inferSelect;
export type NewUxagentScreenshot = typeof uxagentScreenshots.$inferInsert;

export type UxagentThought = typeof uxagentThoughts.$inferSelect;
export type NewUxagentThought = typeof uxagentThoughts.$inferInsert;

export type UxagentInsight = typeof uxagentInsights.$inferSelect;
export type NewUxagentInsight = typeof uxagentInsights.$inferInsert;

export type UxagentChatMessage = typeof uxagentChatMessages.$inferSelect;
export type NewUxagentChatMessage = typeof uxagentChatMessages.$inferInsert;

export type ScreenshotTestRun = typeof screenshotTestRuns.$inferSelect;
export type NewScreenshotTestRun = typeof screenshotTestRuns.$inferInsert;

export type ScreenshotFlowImage = typeof screenshotFlowImages.$inferSelect;
export type NewScreenshotFlowImage = typeof screenshotFlowImages.$inferInsert;

export type ScreenshotAnalysisResult = typeof screenshotAnalysisResults.$inferSelect;
export type NewScreenshotAnalysisResult = typeof screenshotAnalysisResults.$inferInsert;

export type ScreenshotAggregatedInsight = typeof screenshotAggregatedInsights.$inferSelect;
export type NewScreenshotAggregatedInsight = typeof screenshotAggregatedInsights.$inferInsert;

