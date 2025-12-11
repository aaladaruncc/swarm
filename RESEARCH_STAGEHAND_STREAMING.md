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

**AgentAction Structure** (from documentation and testing):
```typescript
interface AgentAction {
  type: string;              // Action type: "open_web_browser", "click", "keypress", etc.
  timestamp: number;         // Unix timestamp in milliseconds (ALWAYS present)
  pageUrl: string;          // Current page URL (ALWAYS present)
  
  // Optional properties (based on action type):
  x?: number;               // X coordinate for click actions
  y?: number;               // Y coordinate for click actions
  button?: string;          // Mouse button for click actions
  keys?: string;            // Keys pressed for keypress actions
}
```

**TEST RESULTS** (December 10, 2025):
- ✅ Actions array is always present
- ✅ Timestamps are included (Unix ms format)
- ✅ Actions are chronologically ordered
- ✅ Common action types: "open_web_browser", "click", "keypress"

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

**TEST RESULTS** (December 10, 2025):
- ❌ **History does NOT update incrementally** - confirmed by testing
- ❌ History remains empty (length: 0) during execution
- ❌ Cannot use history polling for real-time updates
- ✅ Must use post-execution approach instead

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
- ❌ **TESTED: History does NOT update incrementally** (confirmed Dec 10, 2025)
- ❌ Cannot be used for real-time updates
- ❌ Polling would be ineffective
- ❌ History remains empty during execution

**Best For**: ❌ **NOT RECOMMENDED** - Use Approach 1 instead

**TEST RESULTS**: History polling approach is not viable. History does not update during execution.

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

### ✅ Phase 1: Immediate Implementation (Post-Execution Replay)

**Status**: Ready to implement (tests confirm this approach works)

1. **Implement Approach 1** (Post-Execution Replay)
   - Parse `agentResult.actions` after completion
   - Use timestamps to reconstruct timeline
   - Display as transcript with chronological order
   - Simple, reliable, works immediately

**Why this approach**:
- ✅ Tests confirm `agentResult.actions` contains all needed data
- ✅ Timestamps are included and accurate
- ✅ No dependencies on history API
- ✅ Reliable and predictable

### ❌ Phase 2: History Polling (NOT VIABLE)

**Status**: Tested and confirmed NOT viable

2. **History Polling Test Results**:
   - ❌ History does NOT update incrementally (confirmed by testing)
   - ❌ History remains empty during execution
   - ❌ Cannot use for real-time updates
   - ✅ **Skip this approach**

### Phase 3: Enhancement (Optional)

3. **Simulated Real-Time Replay** (Approach 5)
   - Use timestamps from actions to replay with delays
   - Better UX than pure post-execution
   - Simulates real-time experience
   - All data available, just delayed display

## Key Questions - ANSWERED ✅

1. **Does `stagehand.history` update incrementally during `agent.execute()`?**
   - ✅ **ANSWERED**: ❌ NO - History does NOT update incrementally
   - ✅ **Decision**: Stick with Approach 1 (Post-Execution)
   - ✅ **Test Date**: December 10, 2025

2. **What's the full structure of `agentResult.actions`?**
   - ✅ **ANSWERED**: Structure confirmed by testing
   - ✅ Timestamps ARE included (Unix ms format)
   - ✅ Actions are chronologically ordered
   - ✅ Common types: "open_web_browser", "click", "keypress"
   - ✅ See TEST_RESULTS.md for full structure

3. **Can we access agent's internal reasoning?**
   - ✅ **ANSWERED**: Limited - only final `message` contains reasoning
   - ✅ `message` includes agent's thought process and final assessment
   - ❌ No step-by-step reasoning during execution
   - ⚠️ May need to parse `message` for structured data

4. **Is there an event emitter or callback system?**
   - ✅ **ANSWERED**: ❌ NO - No built-in streaming/events
   - ✅ Must use post-execution approach
   - ✅ See TEST_RESULTS.md for details

## Next Steps

1. ✅ **Tests Complete** - Both tests executed successfully
2. ✅ **Findings Documented** - See TEST_RESULTS.md
3. ⏳ **Implement Approach 1** - Post-execution replay (recommended)
4. ⏳ **Create transcript parser** - Parse agentResult.actions
5. ⏳ **Integrate into codebase** - Update apps/api/src/lib/agent.ts
6. ⏳ **Create frontend component** - Display transcript UI

## Implementation Recommendations

### Recommended Approach: Phased Implementation

Based on the research findings, we recommend a phased approach that starts with what works immediately and evolves based on testing results.

#### Phase 1: Immediate Implementation (Post-Execution Replay)

**Priority**: High  
**Complexity**: Low  
**Timeline**: 1-2 days

**Implementation Steps**:

1. **Modify `apps/api/src/lib/agent.ts`** to capture and parse `agentResult.actions`:
   ```typescript
   const agentResult = await agent.execute({ instruction, maxSteps });
   
   // Parse actions into transcript
   const transcript = parseAgentActionsToTranscript(
     agentResult.actions || [],
     executionStartTime
   );
   ```

2. **Create transcript parser utility** (`apps/api/src/lib/transcript-parser.ts`):
   - Parse `agentResult.actions` array
   - Reconstruct timeline with timestamps
   - Format entries for frontend consumption
   - See `examples/approach-1-post-execution-replay.ts` for reference

3. **Update `AgentResult` interface** to include transcript:
   ```typescript
   export interface AgentResult {
     // ... existing fields
     transcript?: TranscriptEntry[];
   }
   ```

4. **Frontend integration**:
   - Display transcript after test completion
   - Show as scrollable timeline
   - Include action types, descriptions, timestamps

**Benefits**:
- ✅ Works immediately (no testing required)
- ✅ Reliable and predictable
- ✅ All action data available
- ✅ Good foundation for future enhancements

**Limitations**:
- ❌ Not real-time (only after completion)
- ❌ No intermediate thoughts/reasoning

#### Phase 2: Testing & Validation

**Priority**: Medium  
**Complexity**: Low  
**Timeline**: 1 day

**Action Items**:

1. **Run test scripts**:
   - Execute `test-stagehand-history.ts` to verify history update behavior
   - Execute `test-agent-result-structure.ts` to understand actions structure
   - Document findings

2. **Validate assumptions**:
   - Confirm `agentResult.actions` structure
   - Check if timestamps are included
   - Verify data completeness

**Decision Point**: Based on test results, choose Phase 3A or 3B

#### Phase 3A: Real-Time History Polling (If Supported)

**Priority**: High (if history updates incrementally)  
**Complexity**: Medium  
**Timeline**: 2-3 days

**Prerequisites**: Test 1 confirms history updates incrementally

**Implementation Steps**:

1. **Create `HistoryPollingTranscript` class** (see `examples/approach-2-history-polling.ts`):
   - Poll `stagehand.history` every 1-2 seconds during execution
   - Emit new entries via EventEmitter
   - Filter for relevant operations (agent, act, extract, observe)

2. **Integrate with agent execution**:
   ```typescript
   const transcriptPoller = new HistoryPollingTranscript(stagehand);
   transcriptPoller.on('entry', (entry) => {
     // Stream to frontend via WebSocket/SSE
     streamToFrontend(entry);
   });
   
   await transcriptPoller.startPolling(1000);
   const result = await agent.execute({ instruction, maxSteps });
   transcriptPoller.stopPolling();
   ```

3. **Frontend real-time updates**:
   - Use WebSocket or Server-Sent Events (SSE)
   - Update transcript UI as entries arrive
   - Show "live" indicator during execution

**Benefits**:
- ✅ True real-time updates
- ✅ Better user experience
- ✅ Shows progress during execution

**Limitations**:
- ⚠️ Only works if history updates incrementally
- ⚠️ May not include agent's internal reasoning
- ⚠️ Polling overhead (minimal)

#### Phase 3B: Enhanced Post-Execution (If History Doesn't Update)

**Priority**: Medium  
**Complexity**: Low  
**Timeline**: 1-2 days

**Prerequisites**: Test 1 confirms history does NOT update incrementally

**Implementation Steps**:

1. **Enhance transcript with better timeline reconstruction**:
   - Use actual execution duration to estimate timestamps
   - Add progress indicators
   - Include estimated time per action

2. **Simulated real-time replay** (optional):
   - Stream transcript entries with delays
   - Simulate real-time experience
   - See `examples/approach-1-post-execution-replay.ts` for `streamTranscriptEntries`

3. **Better formatting**:
   - Group related actions
   - Show action sequences
   - Highlight key milestones

**Benefits**:
- ✅ Better UX than pure post-execution
- ✅ All data available
- ✅ No polling overhead

**Limitations**:
- ❌ Still not truly real-time
- ❌ Estimated timestamps may be inaccurate

### Code Examples Provided

The following example implementations are available in the `examples/` directory:

1. **`approach-1-post-execution-replay.ts`**:
   - Complete implementation of post-execution transcript parsing
   - Timeline reconstruction
   - Simulated streaming for better UX
   - Ready to integrate

2. **`approach-2-history-polling.ts`**:
   - `HistoryPollingTranscript` class for real-time polling
   - EventEmitter-based streaming
   - Integration example
   - Use if history updates incrementally

### Integration Points

#### Backend (`apps/api/src/lib/agent.ts`)

**Current code location**: Line 561-611

**Recommended changes**:

```typescript
// After agent.execute() completes
const agentResult = await agent.execute({
  instruction: generateAgentInstructions(persona),
  maxSteps,
});

// NEW: Parse transcript
const transcript = parseAgentActionsToTranscript(
  agentResult.actions || [],
  new Date(startTime)
);

// Include in return value
return {
  // ... existing fields
  transcript, // NEW
};
```

#### Frontend (`apps/web/src/app/tests/[id]/page.tsx`)

**Recommended additions**:

1. **Transcript component**:
   - Display transcript entries in timeline format
   - Show action types, descriptions, timestamps
   - Scrollable, searchable

2. **Real-time updates** (if Phase 3A):
   - WebSocket/SSE connection during execution
   - Live transcript updates
   - Progress indicator

### Data Flow Architecture

```
┌─────────────────┐
│  Agent Execute  │
└────────┬────────┘
         │
         ├─► [If History Polling]
         │   └─► Poll stagehand.history
         │       └─► Stream entries → WebSocket/SSE → Frontend
         │
         └─► [After Completion]
             └─► Parse agentResult.actions
                 └─► Return transcript → API Response → Frontend
```

### Performance Considerations

1. **Polling Frequency**: 1-2 seconds is optimal
   - Too frequent: Unnecessary overhead
   - Too slow: Poor user experience

2. **Transcript Size**: 
   - Typical execution: 10-20 actions
   - Each entry: ~200-500 bytes
   - Total: ~5-10 KB (negligible)

3. **Frontend Rendering**:
   - Virtual scrolling for long transcripts
   - Lazy load action details
   - Debounce updates if needed

### Testing Checklist

- [ ] Run `test-stagehand-history.ts` to verify history behavior
- [ ] Run `test-agent-result-structure.ts` to understand actions structure
- [ ] Test post-execution transcript parsing
- [ ] Test transcript formatting and display
- [ ] (If Phase 3A) Test history polling during execution
- [ ] (If Phase 3A) Test WebSocket/SSE streaming
- [ ] Test with various agent instructions and maxSteps
- [ ] Test error handling (timeouts, failures)
- [ ] Test with multiple concurrent agents

### Success Metrics

1. **Functionality**:
   - ✅ Transcript displays all agent actions
   - ✅ Timestamps are accurate (or estimated reasonably)
   - ✅ Action descriptions are clear and readable

2. **User Experience**:
   - ✅ Transcript is easy to read and navigate
   - ✅ (If Phase 3A) Real-time updates work smoothly
   - ✅ No performance degradation

3. **Reliability**:
   - ✅ Works consistently across different scenarios
   - ✅ Handles errors gracefully
   - ✅ No memory leaks or performance issues

## References

- Stagehand v3 Documentation: https://github.com/browserbase/stagehand
- Current Implementation: `apps/api/src/lib/agent.ts`
- SDK Version: `@browserbasehq/stagehand@3.0.3`
- Test Scripts: `test-stagehand-history.ts`, `test-agent-result-structure.ts`
- Test Results: `TEST_RESULTS.md` (December 10, 2025)
- Example Implementations: `examples/approach-1-post-execution-replay.ts`, `examples/approach-2-history-polling.ts`

## Test Results Summary

**Date**: December 10, 2025

**Key Findings**:
- ❌ `stagehand.history` does NOT update incrementally during execution
- ✅ `agentResult.actions` contains all actions with timestamps
- ✅ Timestamps are accurate and can reconstruct timeline
- ✅ Post-execution approach (Approach 1) is viable and recommended

**See `TEST_RESULTS.md` for complete test findings.**
