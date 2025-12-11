# Stagehand SDK Streaming Data Research

## Executive Summary

This document outlines research findings on available data streams from Stagehand SDK v3.0.3 for implementing live transcript functionality during agent execution. The goal is to display real-time agent thoughts, reactions, tool calls, and actions to users.

## Current Implementation Analysis

### What We Currently Use

**File**: `apps/api/src/lib/agent.ts`

```typescript
const agentResult = await agent.execute({
  instruction: generateAgentInstructions(persona),
  maxSteps,
});

// Currently only accessing:
const agentMessage = agentResult.message || "";  // Final message/assessment
// agentResult.success - Boolean completion status
```

**Current Limitations:**
- Only receives data AFTER `agent.execute()` completes
- No real-time updates during execution
- No access to intermediate thoughts or actions
- `onProgress` callback only receives custom log messages, not agent internals

## Available Data Sources from Stagehand SDK

### 1. AgentResult Object (Post-Execution)

**Source**: Return value of `agent.execute()`

**Properties Available** (based on documentation and code analysis):

```typescript
interface AgentResult {
  message: string;           // Final assessment/feedback from agent
  success: boolean;          // Whether task completed successfully
  actions: AgentAction[];     // Array of all actions taken during execution
}
```

**AgentAction Structure** (from documentation):
```typescript
interface AgentAction {
  type: "act" | "extract" | "goto" | "wait" | "navback" | "refresh" | "close";
  parameters?: string;       // Instruction or parameters used
  playwrightArguments?: any; // Playwright action details
  description?: string;      // Human-readable description
  timestamp?: string;         // When action occurred (if available)
}
```

**Access Pattern**:
```typescript
const result = await agent.execute({ instruction: "...", maxSteps: 20 });
console.log(result.actions); // All actions taken
console.log(result.message);  // Final message
```

**Limitations**:
- ❌ Only available AFTER execution completes
- ❌ No intermediate thoughts/reasoning
- ❌ No real-time streaming
- ✅ Complete action history available post-execution

### 2. Stagehand History API

**Source**: `stagehand.history` (read-only array)

**Structure** (from documentation):
```typescript
interface HistoryEntry {
  method: "act" | "extract" | "observe" | "navigate" | "agent";
  parameters: any;          // Parameters passed to the method
  result: any;               // Result returned
  timestamp: string;         // ISO timestamp
}
```

**Access Pattern**:
```typescript
const history = await stagehand.history;
history.forEach((entry) => {
  console.log(`${entry.method} at ${entry.timestamp}`);
  console.log(`Parameters:`, entry.parameters);
  console.log(`Result:`, entry.result);
});
```

**Key Questions to Test**:
1. ⚠️ Does `history` update incrementally during `agent.execute()`?
2. ⚠️ Or does it only populate after execution completes?
3. ⚠️ Can we poll `history` during execution to get real-time updates?

**Potential Use Case**:
- If history updates incrementally, we could poll it every 1-2 seconds during execution
- Stream new entries to frontend via WebSocket/SSE
- Display as live transcript

### 3. Logging System (Verbose Mode)

**Source**: Stagehand `verbose` configuration option

**Configuration**:
```typescript
const stagehand = new Stagehand({
  env: "BROWSERBASE",
  verbose: 1,  // 0, 1, or 2
});
```

**Log Entry Structure** (from documentation):
```json
{
  "category": "action" | "llm" | "error",
  "message": "act completed successfully",
  "level": 0 | 1 | 2,
  "timestamp": "2025-01-27T12:35:00.123Z",
  "auxiliary": {
    "selector": { "value": "#btn-submit", "type": "string" },
    "executionTime": { "value": "1250", "type": "integer" },
    "model": { "value": "gpt-4o", "type": "string" },
    "promptTokens": { "value": "3451", "type": "integer" },
    "completionTokens": { "value": "45", "type": "integer" }
  }
}
```

**Limitations**:
- ❌ Logs go to console/stdout, not programmatically accessible
- ❌ Would require parsing console output or file logs
- ❌ Not designed for real-time streaming
- ✅ Contains detailed execution information

**Potential Workaround**:
- Redirect logs to file
- Use file watcher to read new log entries
- Parse and stream to frontend
- **Complexity**: High, not recommended

### 4. Metrics API

**Source**: `stagehand.metrics` (from documentation)

**Available Metrics**:
```typescript
interface Metrics {
  actPromptTokens: number;
  actCompletionTokens: number;
  actInferenceTimeMs: number;
  extractPromptTokens: number;
  extractCompletionTokens: number;
  extractInferenceTimeMs: number;
  agentPromptTokens: number;
  agentCompletionTokens: number;
  agentInferenceTimeMs: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalInferenceTimeMs: number;
}
```

**Limitations**:
- ❌ Only token counts and timing
- ❌ No content/thoughts/reasoning
- ❌ Not useful for transcript

## Implementation Approaches

### Approach 1: Post-Execution Replay (Simplest)

**Concept**: After `agent.execute()` completes, parse `result.actions` and reconstruct timeline

**Implementation**:
```typescript
const result = await agent.execute({ instruction: "...", maxSteps: 20 });

// Parse actions into transcript entries
const transcript = result.actions.map((action, index) => ({
  step: index + 1,
  timestamp: action.timestamp || new Date().toISOString(),
  type: action.type,
  description: action.description || action.parameters,
  details: action.playwrightArguments,
}));

// Stream to frontend as "replay"
```

**Pros**:
- ✅ Simple to implement
- ✅ All data available
- ✅ No polling needed
- ✅ Reliable

**Cons**:
- ❌ Not real-time (only after completion)
- ❌ No intermediate thoughts/reasoning
- ❌ User sees transcript only after agent finishes

**Best For**: Post-execution analysis, debugging, audit trails

### Approach 2: History Polling During Execution (If Supported)

**Concept**: Poll `stagehand.history` every 1-2 seconds during `agent.execute()` to get incremental updates

**Implementation**:
```typescript
let transcriptEntries: any[] = [];
let lastHistoryLength = 0;

// Start agent execution in background
const agentPromise = agent.execute({ instruction: "...", maxSteps: 20 });

// Poll history during execution
const pollInterval = setInterval(async () => {
  const history = await stagehand.history;
  
  // Check for new entries
  if (history.length > lastHistoryLength) {
    const newEntries = history.slice(lastHistoryLength);
    
    // Process new entries
    newEntries.forEach(entry => {
      if (entry.method === 'agent' || entry.method === 'act') {
        transcriptEntries.push({
          timestamp: entry.timestamp,
          type: entry.method,
          description: entry.parameters,
          result: entry.result,
        });
        
        // Stream to frontend via WebSocket/SSE
        streamToFrontend(transcriptEntries[transcriptEntries.length - 1]);
      }
    });
    
    lastHistoryLength = history.length;
  }
}, 1000); // Poll every second

// Wait for completion
await agentPromise;
clearInterval(pollInterval);
```

**Pros**:
- ✅ Real-time updates (if history updates incrementally)
- ✅ Shows progress during execution
- ✅ Better user experience

**Cons**:
- ⚠️ **Unknown**: Does history update incrementally?
- ⚠️ Requires testing to confirm behavior
- ⚠️ Polling overhead
- ❌ May not include agent's internal reasoning/thoughts

**Best For**: Real-time progress display (if supported)

**Testing Required**:
```typescript
// Test script to verify history behavior
const stagehand = new Stagehand({ env: "BROWSERBASE" });
await stagehand.init();
const page = stagehand.context.pages()[0];
await page.goto("https://example.com");

const agent = stagehand.agent({ /* config */ });

// Check history before
console.log("History before:", (await stagehand.history).length);

// Start execution
const executePromise = agent.execute({ instruction: "Click around the page", maxSteps: 5 });

// Poll during execution
const checkHistory = setInterval(async () => {
  const history = await stagehand.history;
  console.log(`History length: ${history.length} at ${new Date().toISOString()}`);
}, 500);

await executePromise;
clearInterval(checkHistory);

// Check history after
console.log("History after:", (await stagehand.history).length);
```

### Approach 3: Custom Wrapper with Interception

**Concept**: Wrap Stagehand methods to intercept and log all operations

**Implementation**:
```typescript
class StagehandWrapper {
  private stagehand: Stagehand;
  private transcript: TranscriptEntry[] = [];
  private listeners: ((entry: TranscriptEntry) => void)[] = [];

  constructor(config: any) {
    this.stagehand = new Stagehand(config);
  }

  async init() {
    await this.stagehand.init();
  }

  async act(instruction: string) {
    const timestamp = new Date().toISOString();
    this.addTranscriptEntry({
      timestamp,
      type: 'thinking',
      content: `Planning to: ${instruction}`,
    });

    const result = await this.stagehand.act(instruction);
    
    this.addTranscriptEntry({
      timestamp: new Date().toISOString(),
      type: 'action',
      content: `Executed: ${instruction}`,
      result,
    });

    return result;
  }

  agent(config: any) {
    const originalAgent = this.stagehand.agent(config);
    
    return {
      ...originalAgent,
      execute: async (options: any) => {
        // Intercept agent execution
        // This is complex - would need to hook into internal agent methods
        return originalAgent.execute(options);
      },
    };
  }

  private addTranscriptEntry(entry: TranscriptEntry) {
    this.transcript.push(entry);
    this.listeners.forEach(listener => listener(entry));
  }

  onTranscriptUpdate(listener: (entry: TranscriptEntry) => void) {
    this.listeners.push(listener);
  }

  getTranscript() {
    return [...this.transcript];
  }
}
```

**Pros**:
- ✅ Full control over what's logged
- ✅ Can add custom metadata
- ✅ Real-time updates

**Cons**:
- ❌ Very complex to implement
- ❌ Requires deep knowledge of Stagehand internals
- ❌ May break with SDK updates
- ❌ Doesn't capture agent's internal reasoning (only actions)

**Best For**: Advanced use cases requiring custom logging

### Approach 4: Browserbase Session Recording (External)

**Concept**: Use Browserbase's built-in session recording for visual replay

**Current Usage**:
```typescript
const sessionId = stagehand.browserbaseSessionID;
// URL: https://browserbase.com/sessions/${sessionId}
```

**Pros**:
- ✅ Visual replay available
- ✅ Shows actual browser interactions
- ✅ No additional implementation needed

**Cons**:
- ❌ No transcript of thoughts/reasoning
- ❌ External service (not integrated)
- ❌ No programmatic access to events

**Best For**: Visual debugging, not transcript generation

### Approach 5: Hybrid: Post-Execution + Simulated Real-Time

**Concept**: After execution, replay actions with timestamps to simulate real-time

**Implementation**:
```typescript
const result = await agent.execute({ instruction: "...", maxSteps: 20 });

// Reconstruct timeline with estimated timestamps
const startTime = Date.now() - (estimatedDuration * 1000);
const actionsWithTimestamps = result.actions.map((action, index) => ({
  ...action,
  estimatedTimestamp: new Date(startTime + (index * averageStepDuration)),
}));

// Stream to frontend with delays to simulate real-time
for (const action of actionsWithTimestamps) {
  const delay = action.estimatedTimestamp.getTime() - Date.now();
  if (delay > 0) {
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  streamToFrontend(action);
}
```

**Pros**:
- ✅ Simulates real-time experience
- ✅ All data available
- ✅ Simple implementation

**Cons**:
- ❌ Not actually real-time
- ❌ Estimated timestamps may be inaccurate
- ❌ User must wait for execution to complete

**Best For**: Better UX than pure post-execution, but still not true real-time

## Recommended Testing Plan

### Test 1: History Incremental Updates
**Goal**: Determine if `stagehand.history` updates during `agent.execute()`

```typescript
// Test script
const stagehand = new Stagehand({ env: "BROWSERBASE", verbose: 2 });
await stagehand.init();
const page = stagehand.context.pages()[0];
await page.goto("https://example.com");

const agent = stagehand.agent({
  cua: true,
  model: { modelName: "google/gemini-2.5-computer-use-preview-10-2025" },
});

const initialHistoryLength = (await stagehand.history).length;
console.log("Initial history length:", initialHistoryLength);

// Poll during execution
const pollHistory = setInterval(async () => {
  const history = await stagehand.history;
  const newEntries = history.slice(initialHistoryLength);
  if (newEntries.length > 0) {
    console.log(`[${new Date().toISOString()}] New history entries:`, newEntries.length);
    newEntries.forEach(entry => {
      console.log(`  - ${entry.method}: ${JSON.stringify(entry.parameters).substring(0, 100)}`);
    });
  }
}, 1000);

const result = await agent.execute({
  instruction: "Click on 3 different links and describe what you see",
  maxSteps: 10,
});

clearInterval(pollHistory);

const finalHistory = await stagehand.history;
console.log("\nFinal history length:", finalHistory.length);
console.log("Total new entries:", finalHistory.length - initialHistoryLength);
console.log("\nAgent result actions:", result.actions?.length || 0);
```

### Test 2: AgentResult.actions Structure
**Goal**: Understand full structure of `result.actions` array

```typescript
const result = await agent.execute({ instruction: "...", maxSteps: 5 });

console.log("Result structure:", Object.keys(result));
console.log("Actions count:", result.actions?.length || 0);

if (result.actions && result.actions.length > 0) {
  console.log("\nFirst action structure:", JSON.stringify(result.actions[0], null, 2));
  console.log("\nAll action types:", result.actions.map(a => a.type));
}
```

### Test 3: Verbose Logging Capture
**Goal**: Test if we can capture verbose logs programmatically

```typescript
import { createWriteStream } from 'fs';
import { Writable } from 'stream';

// Redirect console to capture logs
const logFile = createWriteStream('stagehand-logs.txt');
const originalConsoleLog = console.log;

console.log = (...args) => {
  originalConsoleLog(...args);
  logFile.write(args.join(' ') + '\n');
};

const stagehand = new Stagehand({
  env: "BROWSERBASE",
  verbose: 2, // Maximum verbosity
});

// ... execute agent ...

console.log = originalConsoleLog;
logFile.end();

// Parse log file for transcript data
```

## Data Availability Summary

| Data Source | Available During Execution? | Available After Execution? | Contains Thoughts? | Contains Actions? | Real-Time? |
|------------|---------------------------|---------------------------|-------------------|------------------|-----------|
| `agentResult.message` | ❌ | ✅ | ✅ (final assessment) | ❌ | ❌ |
| `agentResult.actions` | ❌ | ✅ | ❌ | ✅ | ❌ |
| `stagehand.history` | ⚠️ **Unknown** | ✅ | ❌ | ✅ | ⚠️ **Unknown** |
| Verbose logs | ✅ (to console) | ✅ | ⚠️ Partial | ✅ | ✅ (but not accessible) |
| Browserbase recording | ✅ | ✅ | ❌ | ✅ (visual) | ✅ |

## Recommended Implementation Strategy

### Phase 1: Immediate (Post-Execution)
1. **Implement Approach 1** (Post-Execution Replay)
   - Parse `agentResult.actions` after completion
   - Display as transcript with timestamps
   - Simple, reliable, works immediately

### Phase 2: Research (Testing)
2. **Test History Polling** (Approach 2)
   - Run Test 1 to determine if history updates incrementally
   - If yes, implement polling-based real-time updates
   - If no, stick with post-execution replay

### Phase 3: Enhancement (If Needed)
3. **Hybrid Approach** (Approach 5)
   - Combine post-execution data with simulated real-time
   - Better UX than pure post-execution
   - Fallback if history doesn't update incrementally

## Key Questions to Answer

1. **Does `stagehand.history` update incrementally during `agent.execute()`?**
   - This is the critical question
   - If yes → Approach 2 (Polling) is viable
   - If no → Stick with Approach 1 (Post-Execution)

2. **What's the full structure of `agentResult.actions`?**
   - Need to inspect actual return value
   - Determine if timestamps are included
   - Check for any reasoning/thoughts data

3. **Can we access agent's internal reasoning?**
   - Current evidence suggests no
   - Only final `message` contains assessment
   - May need to parse `message` for intermediate thoughts

4. **Is there an event emitter or callback system?**
   - Documentation doesn't mention one
   - Would need to inspect SDK source code
   - Unlikely but worth checking

## Next Steps

1. **Run Test 1** to determine history update behavior
2. **Run Test 2** to understand `agentResult.actions` structure
3. **Implement Approach 1** as baseline (works regardless)
4. **If history updates incrementally**, implement Approach 2
5. **If not**, enhance Approach 1 with better formatting/timeline reconstruction

## References

- Stagehand v3 Documentation: https://github.com/browserbase/stagehand
- Current Implementation: `apps/api/src/lib/agent.ts`
- SDK Version: `@browserbasehq/stagehand@3.0.3`