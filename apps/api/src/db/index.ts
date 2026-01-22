// CRITICAL: Load .env before reading DATABASE_URL
// ES modules hoist imports, so we must load env in each module that needs it
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../.env") });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schemaModule from "@ux-testing/db/schema";

const databaseUrl = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/ux_testing";

const client = postgres(databaseUrl);
export const db = drizzle(client, { schema: schemaModule });

// Re-export schema as schema object and all individual exports
export * from "@ux-testing/db/schema";
export const schema = schemaModule;
