import { db } from "../db/index.js";
import { uxagentRuns } from "@ux-testing/db/schema";
import { desc } from "drizzle-orm";

async function main() {
    console.log("Querying latest uxagent_runs...\n");
    const runs = await db.select().from(uxagentRuns).orderBy(desc(uxagentRuns.createdAt)).limit(3);

    console.log(`Found ${runs.length} runs.\n`);
    runs.forEach((r, i) => {
        console.log(`========== RUN ${i + 1} ==========`);
        console.log(`ID: ${r.id}`);
        console.log(`RunID: ${r.runId}`);
        console.log(`Status: ${r.status}`);
        console.log(`Score: ${r.score}`);
        console.log(`Steps Taken: ${r.stepsToken}`);
        console.log(`Terminated: ${r.terminated}`);
        console.log(`Start URL: ${r.startUrl}`);
        console.log(`Intent: ${r.intent}`);
        console.log(`Error: ${r.errorMessage || 'None'}`);
        console.log(`Created: ${r.createdAt}`);
        console.log(`Started: ${r.startedAt}`);
        console.log(`Completed: ${r.completedAt}`);

        console.log(`\n--- ACTION TRACE ---`);
        if (r.actionTrace) {
            const actions = r.actionTrace as any[];
            actions.forEach((action, idx) => {
                console.log(`  Step ${idx}: ${JSON.stringify(action)}`);
            });
        } else {
            console.log('  No action trace');
        }

        console.log(`\n--- OBSERVATION TRACE ---`);
        if (r.observationTrace) {
            const obs = r.observationTrace as any[];
            obs.forEach((o, idx) => {
                console.log(`  Step ${idx}: ${JSON.stringify(o)}`);
            });
        } else {
            console.log('  No observation trace');
        }

        console.log(`\n--- MEMORY TRACE (last 5) ---`);
        if (r.memoryTrace) {
            const mems = r.memoryTrace as any[];
            const last5 = mems.slice(-5);
            last5.forEach((m, idx) => {
                console.log(`  ${mems.length - 5 + idx}: kind=${m.kind}, content=${m.content?.substring(0, 100)}...`);
            });
        } else {
            console.log('  No memory trace');
        }

        console.log('\n');
    });
    process.exit(0);
}

main().catch(console.error);
