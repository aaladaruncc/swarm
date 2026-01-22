# Screenshot Test - New Format Implementation Checklist

## ✅ Completed Changes

### 1. Database Schema
- ✅ Added `user_observation` column (text, nullable)
- ✅ Added `mission_context` column (text, nullable)  
- ✅ Added `expected_outcome` column (text, nullable)
- ✅ Migration applied via `pnpm db:push`

### 2. Backend (API)
- ✅ Updated `ScreenshotAnalysis` interface with new fields
- ✅ Enhanced prompt to request new format with:
  - "REQUIRED" labels on each section
  - Concrete examples matching the target format
  - Always includes MISSION/CONTEXT (even if no mission provided)
- ✅ Improved regex patterns for parsing
- ✅ Added debug logging to track AI responses
- ✅ Saves all three fields to database

### 3. Frontend (UI)
- ✅ Updated TypeScript types to include new fields
- ✅ Displays User Observation with MessageCircle icon (quoted)
- ✅ Displays Mission/Context with Settings icon
- ✅ Displays Expected Outcome with FileText icon
- ✅ Falls back to old format if new fields missing
- ✅ "Full thoughts" button styled (black/white inverted)
- ✅ Thoughts modal implemented

### 4. Canvas & Progress
- ✅ Dotted border around canvas container
- ✅ Starts centered on Step 1
- ✅ Auto-pans to current analyzing screenshot
- ✅ Live progress indicator shows "Analyzing Step X of Y"
- ✅ Polling every 1.5 seconds for updates
- ✅ Step calculation memoized for reactivity

## 🧪 Testing Steps

### 1. Create New Screenshot Test
- Go to `/dashboard/tests/screenshot/new`
- Upload 2-3 screenshots
- Fill in "User Description" or "Expected Task" (this becomes mission context)
- Select a persona
- Click "Start Analysis"

### 2. Watch Analyzing Page
- Should see dotted border around canvas
- Should start with Step 1 centered
- Progress indicator should show "Analyzing Step 1 of X"
- Canvas should auto-pan as each step is analyzed
- Step number should update in real-time

### 3. Check Server Console
Look for these logs:
- `[Screenshot Agent] Raw response preview:` - Shows what AI generated
- `[Screenshot Agent] ✅ Successfully extracted all new format fields` - Success
- `[Screenshot Agent] ⚠️ Missing new format fields:` - If parsing fails

### 4. Verify Results Page
After analysis completes, check the "Agent Sessions" tab:
- Should see **User Observation** section (quoted, with speech bubble icon)
- Should see **Mission/Context** section (with gear icon)
- Should see **Expected Outcome** section (with document icon)
- Should see "Full thoughts" button (black/white)
- Clicking "Full thoughts" should open modal with detailed thoughts

## 🔍 Debugging

If new format doesn't appear:

1. **Check Server Logs**
   - Look for `[Screenshot Agent] Raw response preview`
   - Verify AI is generating the sections
   - Check for parsing warnings

2. **Verify Database**
   - Check if columns exist: `user_observation`, `mission_context`, `expected_outcome`
   - Query: `SELECT user_observation, mission_context, expected_outcome FROM screenshot_analysis_results LIMIT 1;`

3. **Check API Response**
   - Open Network tab in browser
   - Check `/api/screenshot-tests/:id` response
   - Verify `personaResults[].analyses[]` has the new fields

4. **Verify Test is New**
   - Old tests won't have new format
   - Must create a NEW test after code changes

## 📝 Expected Format

Each screenshot analysis should have:

```
USER OBSERVATION:
"I would tap the 'Shop' link in the header to find available bowl packages. The hero image is visually appealing and communicates brand, but there are no product CTAs visible on this frame..."

MISSION/CONTEXT:
"The mission is to purchase one bowl package; the logical next step is to navigate to the online shop. On this frame the top navigation clearly lists 'Shop' near the center; tapping it should reveal product listings or categories. This action aligns with the scenario and tests whether the header navigation is discoverable and consistent."

EXPECTED OUTCOME:
"I expect the prototype to navigate to a product listing or shop category page showing bowls or frozen meals. From there I plan to select a single bowl package to add to the cart."
```

## 🚀 Ready to Test

Everything is implemented and ready. Create a new screenshot test to see the new format in action!
