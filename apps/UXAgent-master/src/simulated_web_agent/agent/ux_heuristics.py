"""
UX Heuristics Module

Implements Nielsen's 10 Usability Heuristics for UX evaluation.
Used by the agent to score and assess website usability.
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any
from enum import Enum


class IssueSeverity(Enum):
    """Severity levels for usability issues"""
    CRITICAL = "critical"  # Blocks task completion or causes data loss
    HIGH = "high"          # Significantly impairs usability
    MEDIUM = "medium"      # Noticeable problem that slows users down
    LOW = "low"            # Minor inconvenience


class IssueCategory(Enum):
    """Categories for usability issues"""
    NAVIGATION = "navigation"
    FORMS = "forms"
    CONTENT = "content"
    VISUAL = "visual"
    ACCESSIBILITY = "accessibility"
    PERFORMANCE = "performance"
    INTERACTION = "interaction"


@dataclass
class HeuristicScore:
    """Score for a single Nielsen heuristic"""
    name: str
    score: int  # 1-10
    observation: str
    
    def to_dict(self) -> Dict:
        return {
            "name": self.name,
            "score": self.score,
            "observation": self.observation
        }


@dataclass
class UsabilityIssue:
    """A specific usability issue found during testing"""
    severity: IssueSeverity
    category: IssueCategory
    description: str
    location: str
    recommendation: str
    
    def to_dict(self) -> Dict:
        return {
            "severity": self.severity.value,
            "category": self.category.value,
            "description": self.description,
            "location": self.location,
            "recommendation": self.recommendation
        }


@dataclass
class PositiveAspect:
    """A positive UX aspect found during testing"""
    category: IssueCategory
    description: str
    impact: str
    
    def to_dict(self) -> Dict:
        return {
            "category": self.category.value,
            "description": self.description,
            "impact": self.impact
        }


# Nielsen's 10 Usability Heuristics
NIELSEN_HEURISTICS = {
    "visibility_of_system_status": {
        "name": "Visibility of System Status",
        "description": "The design should always keep users informed about what is going on, through appropriate feedback within a reasonable amount of time.",
        "questions": [
            "Does the system show loading states?",
            "Is there feedback after user actions?",
            "Can users tell where they are in the system?",
            "Are progress indicators shown for long operations?"
        ]
    },
    "match_between_system_and_real_world": {
        "name": "Match Between System and Real World",
        "description": "The design should speak the users' language. Use words, phrases, and concepts familiar to the user, rather than internal jargon.",
        "questions": [
            "Is the language user-friendly and jargon-free?",
            "Do icons and symbols make sense?",
            "Does information appear in a logical order?",
            "Are metaphors appropriate and understandable?"
        ]
    },
    "user_control_and_freedom": {
        "name": "User Control and Freedom",
        "description": "Users often perform actions by mistake. They need a clearly marked 'emergency exit' to leave the unwanted action without having to go through an extended process.",
        "questions": [
            "Can users easily undo actions?",
            "Is there a clear way to go back?",
            "Can users cancel operations in progress?",
            "Are there easy ways to reset or start over?"
        ]
    },
    "consistency_and_standards": {
        "name": "Consistency and Standards",
        "description": "Users should not have to wonder whether different words, situations, or actions mean the same thing. Follow platform and industry conventions.",
        "questions": [
            "Are design patterns consistent across pages?",
            "Do similar elements behave the same way?",
            "Does the site follow web conventions?",
            "Is terminology used consistently?"
        ]
    },
    "error_prevention": {
        "name": "Error Prevention",
        "description": "Good error messages are important, but the best designs carefully prevent problems from occurring in the first place.",
        "questions": [
            "Does the design prevent user errors?",
            "Are destructive actions confirmed?",
            "Are form inputs validated before submission?",
            "Are common mistakes anticipated and prevented?"
        ]
    },
    "recognition_over_recall": {
        "name": "Recognition Rather Than Recall",
        "description": "Minimize the user's memory load by making elements, actions, and options visible. The user should not have to remember information from one part to another.",
        "questions": [
            "Are options and actions visible?",
            "Is context maintained across screens?",
            "Are previous choices shown when relevant?",
            "Are helpful defaults provided?"
        ]
    },
    "flexibility_and_efficiency": {
        "name": "Flexibility and Efficiency of Use",
        "description": "Shortcuts — hidden from novice users — may speed up the interaction for the expert user so that the design can cater to both inexperienced and experienced users.",
        "questions": [
            "Are there shortcuts for power users?",
            "Can users customize their experience?",
            "Are frequent actions easy to access?",
            "Does the system support different workflows?"
        ]
    },
    "aesthetic_and_minimalist_design": {
        "name": "Aesthetic and Minimalist Design",
        "description": "Interfaces should not contain information that is irrelevant or rarely needed. Every extra unit of information competes with the relevant units of information.",
        "questions": [
            "Is the interface clean and uncluttered?",
            "Is only essential information shown?",
            "Is the visual hierarchy clear?",
            "Are there distracting elements?"
        ]
    },
    "help_users_recognize_and_recover_from_errors": {
        "name": "Help Users Recognize, Diagnose, and Recover from Errors",
        "description": "Error messages should be expressed in plain language (no error codes), precisely indicate the problem, and constructively suggest a solution.",
        "questions": [
            "Are error messages clear and helpful?",
            "Do they explain what went wrong?",
            "Do they suggest how to fix the problem?",
            "Are they shown near the relevant element?"
        ]
    },
    "help_and_documentation": {
        "name": "Help and Documentation",
        "description": "It's best if the system doesn't need any additional explanation. However, it may be necessary to provide documentation to help users understand how to complete their tasks.",
        "questions": [
            "Is help easily accessible?",
            "Are tooltips and hints available?",
            "Is documentation clear and searchable?",
            "Are FAQs or guides provided?"
        ]
    }
}


@dataclass
class UXEvaluation:
    """Complete UX evaluation results"""
    heuristic_scores: Dict[str, HeuristicScore] = field(default_factory=dict)
    issues: List[UsabilityIssue] = field(default_factory=list)
    positives: List[PositiveAspect] = field(default_factory=list)
    overall_score: float = 0.0
    task_completed: bool = False
    time_to_completion_ms: int = 0
    error_count: int = 0
    confusion_points: List[str] = field(default_factory=list)
    
    def calculate_overall_score(self) -> float:
        """Calculate overall score from heuristic scores"""
        if not self.heuristic_scores:
            return 0.0
        scores = [h.score for h in self.heuristic_scores.values()]
        self.overall_score = sum(scores) / len(scores)
        return self.overall_score
    
    def get_critical_issues(self) -> List[UsabilityIssue]:
        """Get issues with critical or high severity"""
        return [i for i in self.issues if i.severity in [IssueSeverity.CRITICAL, IssueSeverity.HIGH]]
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization"""
        self.calculate_overall_score()
        return {
            "heuristic_scores": {
                k: v.to_dict() for k, v in self.heuristic_scores.items()
            },
            "issues": [i.to_dict() for i in self.issues],
            "positives": [p.to_dict() for p in self.positives],
            "overall_score": round(self.overall_score, 1),
            "task_completed": self.task_completed,
            "time_to_completion_ms": self.time_to_completion_ms,
            "error_count": self.error_count,
            "confusion_points": self.confusion_points,
            "critical_issue_count": len(self.get_critical_issues())
        }


def get_heuristic_prompt_section() -> str:
    """Generate prompt text for heuristic evaluation"""
    lines = ["## Nielsen's 10 Usability Heuristics\n"]
    for key, heuristic in NIELSEN_HEURISTICS.items():
        lines.append(f"### {heuristic['name']}")
        lines.append(f"*{heuristic['description']}*\n")
        lines.append("Key questions:")
        for q in heuristic['questions']:
            lines.append(f"  - {q}")
        lines.append("")
    return "\n".join(lines)


def parse_reflection_to_evaluation(reflection_json: Dict[str, Any]) -> UXEvaluation:
    """Parse agent's reflection output into structured UXEvaluation"""
    evaluation = UXEvaluation()
    
    # Parse heuristic scores
    if "heuristic_scores" in reflection_json:
        for key, data in reflection_json["heuristic_scores"].items():
            evaluation.heuristic_scores[key] = HeuristicScore(
                name=NIELSEN_HEURISTICS.get(key, {}).get("name", key),
                score=data.get("score", 5),
                observation=data.get("observation", "")
            )
    
    # Parse issues
    if "issues_found" in reflection_json:
        for issue_data in reflection_json["issues_found"]:
            try:
                evaluation.issues.append(UsabilityIssue(
                    severity=IssueSeverity(issue_data.get("severity", "medium")),
                    category=IssueCategory(issue_data.get("category", "interaction")),
                    description=issue_data.get("description", ""),
                    location=issue_data.get("location", ""),
                    recommendation=issue_data.get("recommendation", "")
                ))
            except ValueError:
                # Invalid enum value, skip
                pass
    
    # Parse positives
    if "positive_aspects" in reflection_json:
        for pos_data in reflection_json["positive_aspects"]:
            try:
                evaluation.positives.append(PositiveAspect(
                    category=IssueCategory(pos_data.get("category", "interaction")),
                    description=pos_data.get("description", ""),
                    impact=pos_data.get("impact", "")
                ))
            except ValueError:
                pass
    
    # Parse overall assessment
    if "overall_assessment" in reflection_json:
        assessment = reflection_json["overall_assessment"]
        evaluation.overall_score = assessment.get("overall_score", 0)
        evaluation.task_completed = assessment.get("would_recommend", False)
        
    evaluation.calculate_overall_score()
    return evaluation
