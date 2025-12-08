import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@ux-testing/db/schema";

const databaseUrl = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/ux_testing";

const client = postgres(databaseUrl);
export const db = drizzle(client, { schema });

export * from "@ux-testing/db/schema";
export { schema };
