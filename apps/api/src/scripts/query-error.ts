import { db } from "../db/index.js";
import { uxagentRuns } from "@ux-testing/db/schema";
import { desc } from "drizzle-orm";

async function main() {
    console.log("Querying uxagent_runs...");
    const runs = await db.select().from(uxagentRuns).orderBy(desc(uxagentRuns.createdAt)).limit(5);

    console.log(`Found ${runs.length} runs.`);
    runs.forEach(r => {
        console.log(`ID: ${r.id}`);
        console.log(`TestRunID: ${r.testRunId}`);
        console.log(`RunID: ${r.runId}`);
        console.log(`Status: ${r.status}`);
        console.log(`Error: ${r.errorMessage}`);
        console.log(`CreatedAt: ${r.createdAt}`);
        console.log('-------------------');
    });
    process.exit(0);
}

main().catch(console.error);
