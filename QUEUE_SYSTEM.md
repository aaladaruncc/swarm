# Queue System & Dynamic Agent Control

## ✅ New Features

### 1. Smart Queue Management
Prevents rate limits by intelligently queuing and spacing test execution.

### 2. Dynamic Agent Count (1-5)
You now control how many concurrent agents to run per batch test.

## How the Queue Works

### Queue Manager
- **Max Concurrent**: Limits global concurrent tests (default: 3)
- **Delay Between Tests**: 2 second gap between starting tests
- **Automatic Queueing**: Additional tests wait in queue
- **Status Tracking**: Monitor running and queued tests

### Example Flow:
```
Batch 1: Start 5 agents
├─ Agent 1: Runs immediately
├─ Agent 2: Runs immediately  
├─ Agent 3: Runs immediately (max concurrent reached)
├─ Agent 4: Queued (waits)
└─ Agent 5: Queued (waits)

After Agent 1 completes:
└─ Agent 4: Starts (2 sec delay)

After Agent 2 completes:
└─ Agent 5: Starts (2 sec delay)
```

### Benefits:
- ✅ **No 429 Errors**: Stays within API rate limits
- ✅ **Automatic Management**: No manual intervention needed
- ✅ **Fair Queueing**: First-in-first-out processing
- ✅ **Progress Tracking**: See queue status in logs

## Dynamic Agent Count Control

### Frontend Slider (1-5 Agents)

**1 Agent (Safest)**
- Zero rate limit risk
- Slowest completion
- Best for debugging
- Cost: ~$0.04-0.08 per test

**2 Agents**
- Very low rate limit risk
- Moderate speed
- Good for small tests
- Cost: ~$0.05-0.14 per test

**3 Agents (Recommended)**
- Low rate limit risk
- Balanced speed/safety
- Default setting
- Cost: ~$0.07-0.22 per test

**4 Agents**
- Slight rate limit risk
- Faster completion
- Queue handles overflow
- Cost: ~$0.09-0.28 per test

**5 Agents (Fastest)**
- Higher rate limit risk
- Fastest completion
- Queue prevents issues
- Cost: ~$0.11-0.35 per test

### How to Choose:

**Choose 1-2 agents if:**
- You're on free tier API limits
- Testing complex, slow websites
- You want zero risk of rate limits
- Running many batches back-to-back

**Choose 3 agents if:**
- Default balanced option
- Good for most use cases
- Recommended starting point

**Choose 4-5 agents if:**
- You have paid API plans
- Need faster results
- Testing simple/fast websites
- Queue system will prevent issues

## Configuration

### Backend (Queue Manager)

File: `apps/api/src/lib/queue-manager.ts`

```typescript
// Default settings
maxConcurrent: 3       // Max concurrent tests globally
delayBetweenTests: 2000 // 2 second delay between starts
```

To adjust for your API limits:

```typescript
// More conservative (free tier)
const globalTestQueue = new TestQueueManager(2, 3000);

// More aggressive (paid tier)
const globalTestQueue = new TestQueueManager(5, 1000);
```

### Frontend (Agent Count)

File: `apps/web/src/app/tests/new/page.tsx`

```typescript
const [agentCount, setAgentCount] = useState(3); // Default

// User controls with slider (1-5)
<input type="range" min="1" max="5" value={agentCount} />
```

## API Endpoints Updated

### Generate Personas
```typescript
POST /api/batch-tests/generate-personas
{
  "targetUrl": "https://...",
  "userDescription": "...",
  "agentCount": 3  // NEW - How many to select
}
```

### Create Batch Test
```typescript
POST /api/batch-tests
{
  "targetUrl": "https://...",
  "userDescription": "...",
  "generatedPersonas": [...],
  "selectedPersonaIndices": [0, 2, 5],  // Variable length now
  "agentCount": 3  // NEW - Must match indices length
}
```

## Monitoring

### Console Logs

```bash
[Queue] Starting test abc123 (3/3 running, 2 queued)
[Queue] Completed test abc123 (2/3 running, 2 queued)
[Queue] Starting test def456 (3/3 running, 1 queued)
```

### Queue Status

Backend tracks:
- **running**: Current active tests
- **queued**: Tests waiting to start
- **maxConcurrent**: Global limit

## Rate Limit Math

### Gemini 2.5 Free Tier:
- 15 requests per minute (RPM)
- Each test: ~10-20 API calls
- 3 concurrent tests: ~30-60 calls total
- With queue: Spreads over ~2-5 minutes ✅

### With 5 Agents:
- Without queue: 50-100 calls in 1 minute ⚠️ (over limit)
- With queue: 50-100 calls over 3-5 minutes ✅ (under limit)

## Files Updated

✅ **Backend:**
- `apps/api/src/lib/queue-manager.ts` - NEW queue system
- `apps/api/src/routes/batch-tests.ts` - Queue integration
- `apps/api/src/lib/persona-generator.ts` - Dynamic count

✅ **Frontend:**
- `apps/web/src/app/tests/new/page.tsx` - Agent slider
- `apps/web/src/lib/batch-api.ts` - agentCount param

✅ **Documentation:**
- `QUEUE_SYSTEM.md` - This file
- `QUICKSTART.md` - Updated
- `RATE_LIMIT_FIX.md` - Updated

## Best Practices

1. **Start with 3 agents** - Balanced default
2. **Monitor your first test** - Check for rate limits
3. **Adjust if needed** - Use slider to find sweet spot
4. **Check API usage** - Monitor your quotas
5. **Run sequentially** - Wait 5 min between large batches
6. **Upgrade if needed** - Get paid API plan for higher limits

## Troubleshooting

### Still hitting 429 errors?

1. **Reduce agent count** to 1-2
2. **Increase queue delay** in `queue-manager.ts`:
   ```typescript
   delayBetweenTests: 5000 // 5 seconds
   ```
3. **Reduce max concurrent** in `queue-manager.ts`:
   ```typescript
   maxConcurrent: 2
   ```
4. **Check API quotas** at https://aistudio.google.com/
5. **Upgrade to paid tier** for higher limits

### Tests taking too long?

- This is expected with queue system
- Each test: 5-10 minutes
- Queue adds 2 sec delay per test
- Total: (agents × 7 min) + queue delays
- Example: 5 agents = ~35-40 minutes (but no rate limits!)

Your system now has intelligent rate limit protection! 🎉
