# Platform Comparison: Frame-by-Frame Evaluation

## Overview
This document compares our current screenshot evaluation approach with another platform that evaluates testers per frame/screenshot.

## Response Structure Comparison

### Other Platform (from image)
Their responses include three key sections:

1. **User Observation/Feedback** (quoted statement)
   - Format: Direct quote in speech bubble format
   - Content: User's immediate thoughts, what they notice, what they would do
   - Example: *"I would tap the 'Shop' link in the header to find available bowl packages. The hero image is visually appealing and communicates brand, but there are no product CTAs visible on this frame..."*

2. **Mission/Context** (structured explanation)
   - Format: Paragraph with gear icon
   - Content: 
     - What the mission/goal is
     - What the logical next step should be
     - Why that action aligns with the scenario
     - What this action tests (discoverability, consistency, etc.)
   - Example: *"The mission is to purchase one bowl package; the logical next step is to navigate to the online shop. On this frame the top navigation clearly lists 'Shop' near the center; tapping it should reveal product listings or categories. This action aligns with the scenario (discovering a local pre-made frozen meal and wanting to buy one) and is the most direct path to selecting a bowl package. It also tests whether the header navigation is discoverable and consistent."*

3. **Expected Outcome** (forward-looking)
   - Format: Paragraph with lightbulb icon
   - Content:
     - What the user expects to happen next
     - What they plan to do after that
   - Example: *"I expect the prototype to navigate to a product listing or shop category page showing bowls or frozen meals. From there I plan to select a single bowl package to add to the cart."*

### Our Current Platform
Our responses include:

1. **Observations** (list format)
   - What they see and notice
   - Key elements visible
   - Overall layout and design

2. **Positive Aspects** (list format)
   - What they like
   - What works well

3. **Issues Found** (list format with severity)
   - Issues with severity ratings
   - Recommendations

4. **Accessibility Concerns** (list format)
   - Text size, colors, complexity issues

5. **Comparison with Previous** (optional paragraph)
   - How this compares to previous screenshot
   - What changed

6. **Thoughts** (stream of consciousness)
   - Raw thoughts as the persona
   - More narrative but less structured

## Key Differences in Prompt Injection

### Other Platform's Context Injection
Based on the structure, they likely inject:

1. **Mission/Goal Context**
   ```
   "The mission is to [specific goal]"
   "The scenario is: [user scenario]"
   ```

2. **Action Guidance**
   ```
   "What is the logical next step?"
   "What action aligns with the scenario?"
   "What does this action test?"
   ```

3. **Expected Outcome Guidance**
   ```
   "What do you expect to happen next?"
   "What do you plan to do after that?"
   ```

4. **Testing Focus**
   ```
   "This action tests whether [specific UX aspect]"
   "It tests [discoverability/consistency/clarity/etc.]"
   ```

### Our Current Context Injection
Looking at `generateScreenshotAnalysisPrompt()`:

1. **Persona Context**
   - Name, age, occupation, country
   - Tech savviness
   - Financial goal
   - Pain points

2. **Previous Context**
   - Previous screenshot thoughts
   - Recent reflections

3. **Screenshot Context** (optional)
   - User description
   - Screenshot context
   - Expected task (if provided)

4. **Analysis Instructions**
   - What to notice
   - What to think about
   - Format requirements

## What We're Missing

### 1. Mission/Goal Context Section
We don't explicitly structure responses to include:
- What the mission/goal is for this specific frame
- What the logical next step should be
- Why that step aligns with the scenario
- What UX aspect this tests

### 2. Expected Outcome Section
We don't ask for:
- What the user expects to happen next
- What they plan to do after the next action
- Forward-looking expectations

### 3. Action-Oriented Feedback
Our feedback is more observational ("I see X, I notice Y") rather than action-oriented ("I would tap X because Y, which should lead to Z").

### 4. Testing Focus
We don't explicitly call out what UX aspect is being tested (discoverability, consistency, clarity, etc.).

## Recommendations

### 1. Add Mission/Context Section to Prompt
Inject explicit mission context:
```typescript
${missionContext ? `
MISSION/CONTEXT:
The mission is to ${missionContext}.
On this frame, the logical next step is to [action].
This action aligns with the scenario because [reason].
This action tests whether [UX aspect - e.g., navigation is discoverable, CTAs are clear, etc.].
` : ""}
```

### 2. Add Expected Outcome Section
Request forward-looking expectations:
```typescript
EXPECTED OUTCOME:
What do you expect to happen when you perform the next action?
What do you plan to do after that?
```

### 3. Restructure Response Format
Update the prompt to request:
- **USER OBSERVATION**: Direct quote format (what they would do)
- **MISSION/CONTEXT**: Why this action makes sense
- **EXPECTED OUTCOME**: What they expect next

### 4. Add Action Guidance
Instead of just "what do you notice", ask:
- "What would you do next on this frame?"
- "Why would you take that action?"
- "What does this test about the UX?"

### 5. Parse New Sections
Update `parseAnalysisResponse()` to extract:
- `userObservation` (quoted feedback)
- `missionContext` (structured explanation)
- `expectedOutcome` (forward-looking)

## Implementation Priority

1. **High Priority**: Add mission/context and expected outcome sections to prompt
2. **High Priority**: Update response parsing to extract these sections
3. **Medium Priority**: Restructure user observation to be more action-oriented
4. **Medium Priority**: Add testing focus guidance
5. **Low Priority**: Update UI to display these new sections with appropriate icons
