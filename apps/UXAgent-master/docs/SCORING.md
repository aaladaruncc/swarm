# UXAgent Scoring System

This document describes how UXAgent evaluates and scores websites based on user experience principles.

## Overview

Each UXAgent persona evaluates the website independently based on their browsing session. At the end of each session, an LLM-based evaluation generates scores using **Nielsen's 10 Usability Heuristics** framework.

## Scoring Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        UXAgent Session                           │
├─────────────────────────────────────────────────────────────────┤
│  1. Agent browses website with persona & intent                  │
│  2. Collects observations, actions, thoughts (memories)          │
│  3. Session ends (max steps or task complete)                    │
│  4. Final UX evaluation generates heuristic scores               │
│  5. Overall score = average of all heuristic scores              │
└─────────────────────────────────────────────────────────────────┘
```

## Nielsen's 10 Usability Heuristics

Each heuristic is scored from **1-10**:

| Score | Rating | Description |
|-------|--------|-------------|
| 9-10 | Excellent | Exemplary implementation |
| 7-8 | Good | Minor issues only |
| 5-6 | Average | Noticeable problems but functional |
| 3-4 | Poor | Significant issues affecting usability |
| 1-2 | Critical | Severe problems, unusable |

### The 10 Heuristics

1. **Visibility of System Status**
   - Does the system keep users informed about what's happening?
   - Loading states, feedback after actions, progress indicators

2. **Match Between System and Real World**
   - Does the system use language and concepts familiar to users?
   - User-friendly language, appropriate icons and symbols

3. **User Control and Freedom**
   - Can users easily undo mistakes or go back?
   - Clear exit paths, cancel operations, reset options

4. **Consistency and Standards**
   - Are design patterns consistent across pages?
   - Follows platform and industry conventions

5. **Error Prevention**
   - Does the design prevent errors before they happen?
   - Input validation, destructive action confirmation

6. **Recognition Rather Than Recall**
   - Are options and actions visible?
   - Context maintained, previous choices shown

7. **Flexibility and Efficiency of Use**
   - Are there shortcuts for experienced users?
   - Customization options, frequent actions accessible

8. **Aesthetic and Minimalist Design**
   - Is the interface clean and uncluttered?
   - Only essential information, clear visual hierarchy

9. **Help Users Recognize, Diagnose, and Recover from Errors**
   - Are error messages clear and helpful?
   - Plain language, suggestions for fixes

10. **Help and Documentation**
    - Is help easily accessible?
    - Tooltips, FAQs, searchable documentation

## Overall Score Calculation

The **overall score** is calculated as the arithmetic mean of all 10 heuristic scores:

```
Overall Score = (H1 + H2 + H3 + H4 + H5 + H6 + H7 + H8 + H9 + H10) / 10
```

### Example

| Heuristic | Score |
|-----------|-------|
| Visibility of System Status | 7 |
| Match with Real World | 8 |
| User Control and Freedom | 6 |
| Consistency and Standards | 7 |
| Error Prevention | 5 |
| Recognition over Recall | 8 |
| Flexibility and Efficiency | 6 |
| Aesthetic Design | 9 |
| Error Recovery Help | 4 |
| Help and Documentation | 5 |

**Overall Score** = (7+8+6+7+5+8+6+9+4+5) / 10 = **6.5/10**

## Aggregate Scoring (Multi-Agent)

When multiple personas test the same website, the aggregate score is calculated:

```
Aggregate Score = Σ(Agent Overall Scores) / Number of Agents
```

This provides a more comprehensive view since:
- Different personas have different tech savviness levels
- Different personas focus on different aspects of the site
- Diverse perspectives reveal more issues

## Implementation Details

### Evaluation Timing

The UX evaluation runs at the **end of each agent session**, after:
1. All steps have been completed or max steps reached
2. Memory trace has been saved
3. Before the environment is closed

### LLM Model

- Uses `gpt-4o-mini` for fast evaluation
- JSON mode enabled for structured output
- Context includes: last 30 memories, persona info, session metadata

### Data Flow

```
Experiment (Python)
    │
    ▼
evaluate_ux_score()
    │
    ▼
LLM generates heuristic_scores + overall_score
    │
    ▼
Stored in collected_data["score"] and collected_data["ux_evaluation"]
    │
    ▼
Sent to API callback as basicInfo.ux_evaluation
    │
    ▼
Stored in uxagentRuns.score and uxagentRuns.basicInfo
    │
    ▼
Displayed in frontend AggregatedInsights component
```

## Response Format

The evaluation returns a JSON structure:

```json
{
  "heuristic_scores": {
    "visibility_of_system_status": {"score": 7, "observation": "Good loading indicators"},
    "match_between_system_and_real_world": {"score": 8, "observation": "Clear language"},
    "user_control_and_freedom": {"score": 6, "observation": "Back button works but no undo"},
    "consistency_and_standards": {"score": 7, "observation": "Consistent design"},
    "error_prevention": {"score": 5, "observation": "No form validation"},
    "recognition_over_recall": {"score": 8, "observation": "Good menu visibility"},
    "flexibility_and_efficiency": {"score": 6, "observation": "No keyboard shortcuts"},
    "aesthetic_and_minimalist_design": {"score": 9, "observation": "Clean interface"},
    "help_users_recognize_and_recover_from_errors": {"score": 4, "observation": "Generic error messages"},
    "help_and_documentation": {"score": 5, "observation": "No visible help section"}
  },
  "overall_score": 6.5,
  "summary": "The website has a clean design but lacks proper error handling and help documentation."
}
```

## Related Files

- `experiment.py` - Contains `evaluate_ux_score()` function
- `ux_heuristics.py` - Nielsen heuristic definitions and parsing
- `shop_prompts/reflect.txt` - Reflection prompt with scoring guidelines
- `AggregatedInsights.tsx` - Frontend aggregate score display

## Issue Severity Levels

In addition to heuristic scores, individual issues are classified by severity:

| Severity | Description |
|----------|-------------|
| **Critical** | Blocks task completion or causes data loss |
| **High** | Significantly impairs usability, causes major frustration |
| **Medium** | Noticeable problem that slows users down |
| **Low** | Minor inconvenience, cosmetic issue |

---

*Last updated: January 2026*
