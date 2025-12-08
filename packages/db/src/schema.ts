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

export const testRuns = pgTable("test_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  targetUrl: text("target_url").notNull(),
  personaIndex: integer("persona_index").notNull().default(0),
  personaName: text("persona_name"),
  status: text("status").notNull().default("pending"), // pending, running, completed, failed
  browserbaseSessionId: text("browserbase_session_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  errorMessage: text("error_message"),
});

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  testRunId: uuid("test_run_id")
    .notNull()
    .references(() => testRuns.id, { onDelete: "cascade" }),
  score: integer("score"),
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

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;

export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;

export type TestRun = typeof testRuns.$inferSelect;
export type NewTestRun = typeof testRuns.$inferInsert;

export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;

export type Screenshot = typeof screenshots.$inferSelect;
export type NewScreenshot = typeof screenshots.$inferInsert;
