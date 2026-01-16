import { db } from "../db/index.js";
import { uxagentRuns, uxagentScreenshots } from "@ux-testing/db/schema";
import { desc, eq } from "drizzle-orm";

async function main() {
    console.log("Querying latest uxagent_runs with screenshots...\n");

    // Get the latest run
    const [run] = await db.select().from(uxagentRuns).orderBy(desc(uxagentRuns.createdAt)).limit(1);

    if (!run) {
        console.log("No runs found");
        process.exit(0);
    }

    console.log(`========== LATEST RUN ==========`);
    console.log(`ID: ${run.id}`);
    console.log(`RunID: ${run.runId}`);
    console.log(`Status: ${run.status}`);
    console.log(`Score: ${run.score}`);
    console.log(`Steps Taken: ${run.stepsTaken}`);
    console.log(`Terminated: ${run.terminated}`);
    console.log(`Start URL: ${run.startUrl}`);
    console.log(`Intent: ${run.intent}`);
    console.log(`Error: ${run.errorMessage || 'None'}`);
    console.log(`Created: ${run.createdAt}`);
    console.log(`Has BasicInfo: ${!!run.basicInfo}`);
    console.log(`Has ActionTrace: ${!!run.actionTrace} (${(run.actionTrace as any[])?.length || 0} items)`);
    console.log(`Has MemoryTrace: ${!!run.memoryTrace} (${(run.memoryTrace as any[])?.length || 0} items)`);
    console.log(`Has ObservationTrace: ${!!run.observationTrace} (${(run.observationTrace as any[])?.length || 0} items)`);
    console.log(`Has LogContent: ${!!run.logContent} (${run.logContent?.length || 0} chars)`);

    // Get screenshots for this run
    const screenshots = await db.select().from(uxagentScreenshots).where(eq(uxagentScreenshots.uxagentRunId, run.id));

    console.log(`\n--- SCREENSHOTS (${screenshots.length}) ---`);
    for (const s of screenshots) {
        console.log(`  Step ${s.stepNumber}: s3Key=${s.s3Key}, s3Url=${s.s3Url?.substring(0, 60)}...`);
    }

    // Sample observation trace
    if (run.observationTrace && (run.observationTrace as any[]).length > 0) {
        console.log(`\n--- SAMPLE OBSERVATION TRACE ---`);
        const obs = (run.observationTrace as any[])[0];
        console.log(`  Step ${obs.step}: html_length=${obs.html_length}, url=${obs.url}`);
    }

    process.exit(0);
}

main().catch(console.error);
