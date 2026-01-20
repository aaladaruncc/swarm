# Screenshot-Based Testing Framework

## Overview

This document outlines the design for a new testing mode where agents analyze a series of user-uploaded screenshots instead of navigating a live website. This enables testing of mockups, designs, competitor sites, and historical states without requiring a live URL.

## Use Cases

1. **Design Mockups**: Test Figma/design tool mockups before implementation
2. **Competitor Analysis**: Analyze competitor designs with AI personas
3. **Historical Testing**: Test previous versions of a site using archived screenshots
4. **Prototype Testing**: Test static prototypes or wireframes
5. **A/B Test Variants**: Compare different design variations side-by-side

## Architecture

### High-Level Flow

```
User Uploads Screenshots
    ↓
Screenshots Stored in S3
    ↓
Agent Analyzes Each Screenshot Sequentially
    ↓
Agent Provides Feedback per Screenshot
    ↓
Agent Generates Overall Report
    ↓
Results Stored & Displayed
```

### Key Differences from Live Testing

| Aspect | Live Testing | Screenshot Testing |
|--------|--------------|-------------------|
| **Input** | URL | Array of screenshots |
| **Navigation** | Agent clicks/navigates | Agent analyzes static images |
| **Actions** | Click, type, scroll | Observe, analyze, compare |
| **Flow** | Dynamic (agent decides path) | Sequential (user-defined order) |
| **Browser** | Required (Stagehand/Browserbase) | Not required |
| **Cost** | Higher (browser sessions) | Lower (just LLM calls) |

## Database Schema Changes

### New Table: `screenshot_test_runs`

```typescript
export const screenshotTestRuns = pgTable("screenshot_test_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  
  // Test metadata
  testName: text("test_name"), // Optional name for the test
  userDescription: text("user_description"), // Context about what's being tested
  
  // Screenshot sequence
  screenshotSequence: jsonb("screenshot_sequence").$type<Array<{
    order: number;
    s3Key: string;
    s3Url: string;
    description?: string; // User-provided description
    context?: string; // User-provided context for this screenshot
  }>>(),
  
  // Persona configuration
  personaData: jsonb("persona_data"), // Selected persona
  generatedPersonas: jsonb("generated_personas").$type<any[]>(),
  selectedPersonaIndices: jsonb("selected_persona_indices").$type<number[]>(),
  
  // Status
  status: text("status").notNull().default("pending"), // pending, analyzing, completed, failed
  agentCount: integer("agent_count").default(1),
  
  // Results
  overallScore: integer("overall_score"), // 0-100
  summary: text("summary"),
  fullReport: jsonb("full_report"),
  
  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  errorMessage: text("error_message"),
});
```

### New Table: `screenshot_analysis_results`

```typescript
export const screenshotAnalysisResults = pgTable("screenshot_analysis_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  screenshotTestRunId: uuid("screenshot_test_run_id")
    .notNull()
    .references(() => screenshotTestRuns.id, { onDelete: "cascade" }),
  
  // Which screenshot in the sequence
  screenshotOrder: integer("screenshot_order").notNull(),
  s3Key: text("s3_key").notNull(),
  s3Url: text("s3_url").notNull(),
  
  // Agent analysis
  personaName: text("persona_name"),
  observations: jsonb("observations").$type<string[]>(),
  positiveAspects: jsonb("positive_aspects").$type<string[]>(),
  issues: jsonb("issues").$type<Array<{
    severity: "low" | "medium" | "high" | "critical";
    description: string;
    recommendation: string;
  }>>(),
  accessibilityNotes: jsonb("accessibility_notes").$type<string[]>(),
  thoughts: text("thoughts"), // Agent's stream of consciousness
  
  // Comparison with previous screenshots
  comparisonWithPrevious: text("comparison_with_previous"),
  
  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

### Modified: `batch_test_runs`

Add optional field to support screenshot-based tests:

```typescript
export const batchTestRuns = pgTable("batch_test_runs", {
  // ... existing fields ...
  testType: text("test_type").notNull().default("url"), // "url" | "screenshots"
  screenshotSequence: jsonb("screenshot_sequence").$type<Array<{
    order: number;
    s3Key: string;
    s3Url: string;
    description?: string;
  }>>(), // Only populated if testType === "screenshots"
});
```

## API Design

### 1. Upload Screenshots Endpoint

**POST** `/api/screenshot-tests/upload`

Uploads screenshots and returns S3 keys/URLs.

```typescript
// Request
{
  screenshots: Array<{
    file: File, // or base64 string
    description?: string,
    context?: string,
    order?: number, // Optional, defaults to upload order
  }>
}

// Response
{
  uploadedScreenshots: Array<{
    order: number;
    s3Key: string;
    s3Url: string;
    description?: string;
  }>,
  uploadId: string, // Temporary ID to reference in test creation
}
```

### 2. Create Screenshot Test Endpoint

**POST** `/api/screenshot-tests`

Creates a screenshot-based test run.

```typescript
// Request
{
  testName?: string,
  userDescription: string,
  screenshotSequence: Array<{
    order: number;
    s3Key: string;
    s3Url: string;
    description?: string;
    context?: string;
  }>,
  generatedPersonas: any[],
  selectedPersonaIndices: number[],
  agentCount?: number,
}

// Response
{
  screenshotTestRun: ScreenshotTestRun,
  message: string,
}
```

### 3. Get Screenshot Test Results

**GET** `/api/screenshot-tests/:id`

Returns test run with all analysis results.

```typescript
// Response
{
  testRun: ScreenshotTestRun,
  analyses: ScreenshotAnalysisResult[],
  overallReport: {
    score: number,
    summary: string,
    commonIssues: Array<...>,
    positiveAspects: string[],
    recommendations: string[],
  }
}
```

## Agent Flow

### Screenshot Analysis Agent

Instead of browser automation, the agent will:

1. **Receive Screenshot Sequence**: Get ordered list of screenshots with context
2. **Analyze Each Screenshot**: Use vision model (Gemini 2.0 Flash with vision) to:
   - Observe what's visible
   - Identify interactive elements (even if static)
   - Note design patterns, colors, typography
   - Assess accessibility concerns
   - Generate persona-specific reactions
3. **Compare Across Screenshots**: 
   - Note progression/changes between screenshots
   - Identify consistency issues
   - Track user journey flow
4. **Generate Report**: 
   - Overall assessment
   - Screenshot-by-screenshot feedback
   - Cross-screenshot patterns
   - Recommendations

### Agent Implementation

```typescript
async function analyzeScreenshotSequence(
  screenshots: Array<{ order: number; s3Url: string; description?: string }>,
  persona: UserPersona
): Promise<ScreenshotAnalysisResult[]> {
  const results: ScreenshotAnalysisResult[] = [];
  let previousContext = "";

  for (const screenshot of screenshots) {
    // Use Gemini vision API to analyze screenshot
    const analysis = await analyzeScreenshotWithVision(
      screenshot.s3Url,
      persona,
      previousContext,
      screenshot.description
    );

    results.push({
      screenshotOrder: screenshot.order,
      s3Key: screenshot.s3Key,
      s3Url: screenshot.s3Url,
      personaName: persona.name,
      observations: analysis.observations,
      positiveAspects: analysis.positiveAspects,
      issues: analysis.issues,
      accessibilityNotes: analysis.accessibilityNotes,
      thoughts: analysis.thoughts,
      comparisonWithPrevious: analysis.comparison,
    });

    previousContext = analysis.summary;
  }

  return results;
}

async function analyzeScreenshotWithVision(
  imageUrl: string,
  persona: UserPersona,
  previousContext: string,
  userDescription?: string
) {
  const prompt = generateScreenshotAnalysisPrompt(persona, previousContext, userDescription);
  
  // Use Gemini 2.0 Flash with vision capabilities
  const response = await geminiClient.generateContent({
    contents: [{
      role: "user",
      parts: [
        { text: prompt },
        { fileData: { fileUri: imageUrl, mimeType: "image/png" } }
      ]
    }]
  });

  return parseAnalysisResponse(response);
}
```

### Prompt Engineering

The agent prompt should:

1. **Establish Persona Context**: "You are [persona name], a [age]-year-old [occupation]..."
2. **Set Analysis Goals**: "Analyze this screenshot as if you were seeing it for the first time..."
3. **Request Structured Output**: Observations, issues, positive aspects, accessibility notes
4. **Enable Comparison**: "Compare this to the previous screenshot you saw..."
5. **Encourage Honest Feedback**: "Be honest about what confuses you or what you like..."

## Frontend UI Changes

### New Screenshot Upload Flow

1. **Upload Screen**:
   - Drag-and-drop or file picker for multiple screenshots
   - Ability to reorder screenshots
   - Optional description/context per screenshot
   - Preview of uploaded screenshots

2. **Test Configuration**:
   - Same persona generation/selection as URL tests
   - Option to add overall context about the screenshots
   - Test name (optional)

3. **Results View**:
   - Screenshot-by-screenshot analysis
   - Side-by-side comparison view
   - Overall summary
   - Same insights/chat features as URL tests

### Component Structure

```
apps/web/src/
  components/
    screenshot-tests/
      ScreenshotUploader.tsx      # Upload & reorder screenshots
      ScreenshotTestConfig.tsx    # Test configuration
      ScreenshotTestResults.tsx   # Results display
      ScreenshotAnalysisCard.tsx  # Individual screenshot analysis
      ScreenshotComparison.tsx     # Side-by-side comparison
```

## Implementation Phases

### Phase 1: Core Infrastructure
- [ ] Database schema changes
- [ ] S3 upload endpoint for screenshots
- [ ] Basic screenshot test creation endpoint
- [ ] Screenshot storage and retrieval

### Phase 2: Agent Analysis
- [ ] Screenshot analysis agent implementation
- [ ] Vision model integration (Gemini 2.0 Flash)
- [ ] Structured output parsing
- [ ] Comparison logic between screenshots

### Phase 3: Frontend
- [ ] Screenshot upload UI
- [ ] Test configuration UI
- [ ] Results display UI
- [ ] Comparison view

### Phase 4: Advanced Features
- [ ] Batch screenshot tests (multiple personas)
- [ ] Screenshot annotations/highlights
- [ ] Export reports with screenshots
- [ ] Integration with existing batch test system

## Technical Considerations

### Vision Model Selection

**Recommended**: Google Gemini 2.0 Flash
- Excellent vision capabilities
- Cost-effective
- Fast response times
- Good at structured output

**Alternative**: OpenAI GPT-4 Vision
- High quality but more expensive
- Slower response times

### Image Processing

- **Format Support**: PNG, JPEG, WebP
- **Size Limits**: Max 10MB per screenshot, max 20 screenshots per test
- **Optimization**: Compress images before storage to reduce costs
- **Thumbnails**: Generate thumbnails for UI preview

### Cost Optimization

- **Caching**: Cache analysis results for identical screenshots
- **Batch Processing**: Analyze multiple screenshots in parallel where possible
- **Model Selection**: Use cheaper models for initial analysis, premium for detailed reports

### Error Handling

- **Invalid Images**: Validate image format and size before processing
- **Failed Analysis**: Retry with exponential backoff
- **Partial Results**: Allow tests to complete even if some screenshots fail

## Example Usage Flow

1. **User uploads 5 screenshots** of a checkout flow mockup
2. **User selects persona**: "Tech-savvy millennial"
3. **Agent analyzes each screenshot**:
   - Screenshot 1 (Landing): "I see a clean homepage. The navigation is clear..."
   - Screenshot 2 (Product): "I notice the product images are large, which I like..."
   - Screenshot 3 (Cart): "The cart page is confusing - I can't find the checkout button..."
   - Screenshot 4 (Checkout): "The form is too long, I'm getting frustrated..."
   - Screenshot 5 (Confirmation): "Good! Clear confirmation message..."
4. **Agent generates overall report**:
   - Score: 6/10
   - Main issues: Cart navigation, form length
   - Positive: Clean design, good product images
   - Recommendations: Add prominent checkout button, shorten form

## Future Enhancements

1. **Interactive Mockups**: Support for clickable prototypes (Figma links)
2. **Video Analysis**: Analyze screen recordings of user flows
3. **A/B Comparison**: Side-by-side analysis of design variants
4. **Design System Validation**: Check screenshots against design system rules
5. **Accessibility Scanning**: Automated WCAG compliance checking on screenshots

## Migration Path

For existing users:
- Add "Test Type" selector in UI: "Live Website" or "Screenshots"
- Reuse existing persona generation/selection
- Reuse existing report structure where possible
- Gradually migrate batch test system to support both types
