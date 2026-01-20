# Screenshot Testing Implementation Guide

## Quick Start

This guide walks through implementing screenshot-based testing, where agents analyze user-uploaded screenshots instead of navigating live websites.

## Files Created

1. **`SCREENSHOT_TESTING_DESIGN.md`** - Complete design document with architecture, use cases, and technical considerations
2. **`apps/api/src/lib/screenshot-agent.ts`** - Core agent implementation for analyzing screenshots
3. **`apps/api/src/routes/screenshot-tests.ts.example`** - Example API routes (copy to `screenshot-tests.ts` to use)

## Implementation Steps

### Step 1: Install Dependencies

```bash
cd apps/api
pnpm add @google/generative-ai
```

### Step 2: Database Schema Changes

Add the new tables to `packages/db/src/schema.ts`:

```typescript
// Add after existing tables

export const screenshotTestRuns = pgTable("screenshot_test_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  testName: text("test_name"),
  userDescription: text("user_description"),
  screenshotSequence: jsonb("screenshot_sequence").$type<Array<{
    order: number;
    s3Key: string;
    s3Url: string;
    description?: string;
    context?: string;
  }>>(),
  personaData: jsonb("persona_data"),
  generatedPersonas: jsonb("generated_personas").$type<any[]>(),
  selectedPersonaIndices: jsonb("selected_persona_indices").$type<number[]>(),
  status: text("status").notNull().default("pending"),
  agentCount: integer("agent_count").default(1),
  overallScore: integer("overall_score"),
  summary: text("summary"),
  fullReport: jsonb("full_report"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  errorMessage: text("error_message"),
});

export const screenshotAnalysisResults = pgTable("screenshot_analysis_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  screenshotTestRunId: uuid("screenshot_test_run_id")
    .notNull()
    .references(() => screenshotTestRuns.id, { onDelete: "cascade" }),
  screenshotOrder: integer("screenshot_order").notNull(),
  s3Key: text("s3_key").notNull(),
  s3Url: text("s3_url").notNull(),
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
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

Then run:

```bash
pnpm db:push
```

### Step 3: Fix Screenshot Agent Implementation

The `screenshot-agent.ts` file needs a small fix for Gemini API usage. Update the `analyzeScreenshotWithVision` function:

```typescript
// In apps/api/src/lib/screenshot-agent.ts

async function analyzeScreenshotWithVision(
  screenshot: ScreenshotInput,
  persona: UserPersona,
  previousContext: string,
  model: any
): Promise<Omit<ScreenshotAnalysis, "screenshotOrder" | "s3Key" | "s3Url" | "personaName">> {
  // Download image
  const imageBase64 = await downloadImageAsBase64(screenshot.s3Url);
  
  // Generate analysis prompt
  const prompt = generateScreenshotAnalysisPrompt(
    persona,
    previousContext,
    screenshot.description,
    screenshot.context
  );

  // Use Gemini Vision API - correct format
  const result = await model.generateContent([
    {
      inlineData: {
        data: imageBase64,
        mimeType: "image/png",
      },
    },
    { text: prompt },
  ]);

  const response = await result.response;
  const text = response.text();

  // Parse structured response
  return parseAnalysisResponse(text, previousContext);
}
```

### Step 4: Create API Routes

Copy the example file:

```bash
cp apps/api/src/routes/screenshot-tests.ts.example apps/api/src/routes/screenshot-tests.ts
```

Then register it in `apps/api/src/index.ts`:

```typescript
import { screenshotTestsRoutes } from "./routes/screenshot-tests.js";

// ... existing code ...

app.route("/api/screenshot-tests", screenshotTestsRoutes);
```

### Step 5: Update S3 Helper (if needed)

Ensure `uploadScreenshot` in `apps/api/src/lib/s3.ts` accepts Buffer:

```typescript
export async function uploadScreenshot(
  key: string,
  data: string | Buffer, // Should already support Buffer
  contentType: string = "image/png"
): Promise<{ s3Key: string; s3Url: string }> {
  // ... existing implementation
}
```

### Step 6: Frontend Implementation

Create UI components for screenshot upload and results display. See `SCREENSHOT_TESTING_DESIGN.md` for component structure.

## Testing

### Manual Test Flow

1. **Upload Screenshots**:
```bash
curl -X POST http://localhost:8080/api/screenshot-tests/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "screenshots": [
      {
        "base64": "iVBORw0KGgoAAAANS...",
        "description": "Homepage",
        "order": 1
      }
    ]
  }'
```

2. **Create Test**:
```bash
curl -X POST http://localhost:8080/api/screenshot-tests \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userDescription": "Testing checkout flow mockup",
    "screenshotSequence": [
      {
        "order": 1,
        "s3Key": "...",
        "s3Url": "..."
      }
    ],
    "generatedPersonas": [...],
    "selectedPersonaIndices": [0],
    "agentCount": 1
  }'
```

3. **Get Results**:
```bash
curl http://localhost:8080/api/screenshot-tests/TEST_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Key Differences from Live Testing

| Feature | Live Testing | Screenshot Testing |
|---------|--------------|-------------------|
| **Input** | URL string | Array of images |
| **Browser** | Required (Stagehand) | Not needed |
| **Cost** | Higher (browser + LLM) | Lower (just LLM) |
| **Speed** | Slower (navigation time) | Faster (just analysis) |
| **Actions** | Click, type, scroll | Observe, analyze |
| **Flow** | Agent decides | User-defined sequence |

## Environment Variables

Ensure these are set:

```env
GEMINI_API_KEY=your-key-here
# or
GOOGLE_API_KEY=your-key-here

AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=...
```

## Next Steps

1. ✅ Database schema
2. ✅ Agent implementation
3. ✅ API routes
4. ⏳ Frontend UI
5. ⏳ Integration with batch tests
6. ⏳ Error handling & retries
7. ⏳ Cost optimization (caching, batching)

## Troubleshooting

### Gemini API Errors

- **"Invalid API key"**: Check `GEMINI_API_KEY` or `GOOGLE_API_KEY`
- **"Image too large"**: Compress images before upload (max ~4MB for Gemini)
- **"Rate limit"**: Implement exponential backoff

### S3 Upload Errors

- **"Access denied"**: Check AWS credentials and bucket permissions
- **"Invalid key"**: Ensure S3 key format is correct

### Analysis Failures

- **"Failed to download image"**: Check S3 URL accessibility (presigned URLs)
- **"Parse error"**: Agent response format may vary; improve parsing logic

## Future Enhancements

1. **Batch Analysis**: Analyze multiple screenshots in parallel
2. **Comparison Mode**: Side-by-side comparison of design variants
3. **Design System Validation**: Check against design tokens
4. **Video Analysis**: Support screen recordings
5. **Interactive Prototypes**: Support Figma/Prototype links
