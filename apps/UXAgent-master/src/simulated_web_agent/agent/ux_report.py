"""
UX Report Module

Generates comprehensive UX testing reports from agent sessions.
Produces structured JSON output with findings, scores, and recommendations.
"""

import json
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional, Any

from .ux_heuristics import (
    UXEvaluation, 
    UsabilityIssue, 
    PositiveAspect,
    HeuristicScore,
    IssueSeverity,
    IssueCategory,
    parse_reflection_to_evaluation
)


@dataclass
class TimingMetrics:
    """Timing and behavior metrics from the session"""
    total_duration_ms: int = 0
    time_to_first_action_ms: int = 0
    time_per_page: List[Dict[str, Any]] = field(default_factory=list)
    hesitation_moments: List[Dict[str, Any]] = field(default_factory=list)
    backtrack_count: int = 0
    rage_clicks_detected: int = 0
    scroll_depth_percentage: float = 0.0
    
    def to_dict(self) -> Dict:
        return {
            "total_duration_ms": self.total_duration_ms,
            "time_to_first_action_ms": self.time_to_first_action_ms,
            "time_per_page": self.time_per_page,
            "hesitation_moments": self.hesitation_moments,
            "backtrack_count": self.backtrack_count,
            "rage_clicks_detected": self.rage_clicks_detected,
            "scroll_depth_percentage": self.scroll_depth_percentage
        }


@dataclass
class SessionSummary:
    """Summary of the testing session"""
    task_completed: bool = False
    completion_percentage: float = 0.0
    steps_taken: int = 0
    errors_encountered: int = 0
    pages_visited: List[str] = field(default_factory=list)
    final_outcome: str = ""
    termination_reason: Optional[str] = None
    
    def to_dict(self) -> Dict:
        return {
            "task_completed": self.task_completed,
            "completion_percentage": self.completion_percentage,
            "steps_taken": self.steps_taken,
            "errors_encountered": self.errors_encountered,
            "pages_visited": self.pages_visited,
            "final_outcome": self.final_outcome,
            "termination_reason": self.termination_reason
        }


@dataclass
class UXReport:
    """Complete UX testing report"""
    
    # Metadata
    report_id: str = ""
    generated_at: str = ""
    target_url: str = ""
    
    # Persona info
    persona_name: str = ""
    persona_details: Dict[str, Any] = field(default_factory=dict)
    intent: str = ""
    
    # Session data
    session_summary: SessionSummary = field(default_factory=SessionSummary)
    timing_metrics: TimingMetrics = field(default_factory=TimingMetrics)
    
    # UX Evaluation
    ux_evaluation: UXEvaluation = field(default_factory=UXEvaluation)
    
    # Raw data for analysis
    action_trace: List[Dict] = field(default_factory=list)
    memory_trace: List[Dict] = field(default_factory=list)
    screenshot_urls: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict:
        """Convert report to dictionary for JSON serialization"""
        return {
            "metadata": {
                "report_id": self.report_id,
                "generated_at": self.generated_at,
                "target_url": self.target_url
            },
            "persona": {
                "name": self.persona_name,
                "intent": self.intent,
                "details": self.persona_details
            },
            "session_summary": self.session_summary.to_dict(),
            "timing_metrics": self.timing_metrics.to_dict(),
            "ux_evaluation": self.ux_evaluation.to_dict(),
            "traces": {
                "action_count": len(self.action_trace),
                "memory_count": len(self.memory_trace),
                "screenshot_count": len(self.screenshot_urls)
            }
        }
    
    def to_json(self, indent: int = 2) -> str:
        """Convert report to JSON string"""
        return json.dumps(self.to_dict(), indent=indent)
    
    def get_executive_summary(self) -> str:
        """Generate a human-readable executive summary"""
        lines = [
            f"# UX Test Report: {self.target_url}",
            f"",
            f"**Persona**: {self.persona_name}",
            f"**Intent**: {self.intent}",
            f"**Date**: {self.generated_at}",
            f"",
            f"## Executive Summary",
            f"",
        ]
        
        # Overall score
        score = self.ux_evaluation.overall_score
        score_emoji = "🟢" if score >= 7 else "🟡" if score >= 5 else "🔴"
        lines.append(f"**Overall UX Score**: {score_emoji} {score:.1f}/10")
        lines.append(f"")
        
        # Task completion
        if self.session_summary.task_completed:
            lines.append(f"✅ **Task Completed** in {self.session_summary.steps_taken} steps")
        else:
            lines.append(f"❌ **Task Not Completed**: {self.session_summary.termination_reason or 'Unknown reason'}")
        lines.append(f"")
        
        # Key findings
        lines.append(f"## Key Findings")
        lines.append(f"")
        
        # Critical issues
        critical_issues = self.ux_evaluation.get_critical_issues()
        if critical_issues:
            lines.append(f"### 🚨 Critical Issues ({len(critical_issues)})")
            for issue in critical_issues[:3]:  # Top 3
                lines.append(f"- **{issue.severity.value.upper()}**: {issue.description}")
                lines.append(f"  - Location: {issue.location}")
                lines.append(f"  - Recommendation: {issue.recommendation}")
            lines.append(f"")
        
        # Positive aspects
        if self.ux_evaluation.positives:
            lines.append(f"### ✨ What Worked Well")
            for pos in self.ux_evaluation.positives[:3]:  # Top 3
                lines.append(f"- {pos.description}")
            lines.append(f"")
        
        # Heuristic highlights
        lines.append(f"## Heuristic Scores")
        lines.append(f"")
        for key, h in self.ux_evaluation.heuristic_scores.items():
            emoji = "🟢" if h.score >= 7 else "🟡" if h.score >= 5 else "🔴"
            lines.append(f"- {emoji} **{h.name}**: {h.score}/10")
        
        return "\n".join(lines)


def generate_report(
    run_data: Dict[str, Any],
    persona_data: Dict[str, Any],
    reflection_data: Optional[Dict[str, Any]] = None
) -> UXReport:
    """
    Generate a UX report from agent run data.
    
    Args:
        run_data: The agent run output including traces
        persona_data: The persona used for the run
        reflection_data: Optional parsed reflection from the agent
    
    Returns:
        UXReport: Complete UX testing report
    """
    report = UXReport(
        report_id=run_data.get("run_id", ""),
        generated_at=datetime.now().isoformat(),
        target_url=run_data.get("start_url", ""),
        persona_name=persona_data.get("name", "Unknown"),
        persona_details=persona_data,
        intent=run_data.get("intent", persona_data.get("intent", "")),
    )
    
    # Session summary
    report.session_summary = SessionSummary(
        task_completed=run_data.get("terminated", False) and not run_data.get("error"),
        steps_taken=run_data.get("steps_taken", 0),
        errors_encountered=len(run_data.get("errors", [])),
        pages_visited=list(set(
            obs.get("url", "") 
            for obs in run_data.get("observation_trace", [])
        )),
        termination_reason=run_data.get("termination_reason")
    )
    
    # Timing metrics
    report.timing_metrics = TimingMetrics(
        total_duration_ms=run_data.get("duration_ms", 0),
    )
    
    # Parse reflection into UX evaluation
    if reflection_data:
        report.ux_evaluation = parse_reflection_to_evaluation(reflection_data)
    
    # Store traces
    report.action_trace = run_data.get("action_trace", [])
    report.memory_trace = run_data.get("memory_trace", [])
    report.screenshot_urls = [
        s.get("url", "") for s in run_data.get("screenshots", [])
    ]
    
    return report


def aggregate_reports(reports: List[UXReport]) -> Dict[str, Any]:
    """
    Aggregate multiple UX reports into a summary.
    
    Args:
        reports: List of individual UX reports
    
    Returns:
        Dict containing aggregated findings
    """
    if not reports:
        return {}
    
    # Aggregate heuristic scores
    heuristic_averages = {}
    for report in reports:
        for key, score in report.ux_evaluation.heuristic_scores.items():
            if key not in heuristic_averages:
                heuristic_averages[key] = []
            heuristic_averages[key].append(score.score)
    
    avg_scores = {
        key: sum(scores) / len(scores)
        for key, scores in heuristic_averages.items()
    }
    
    # Aggregate issues by severity
    all_issues = []
    for report in reports:
        all_issues.extend(report.ux_evaluation.issues)
    
    issues_by_severity = {
        "critical": [i for i in all_issues if i.severity == IssueSeverity.CRITICAL],
        "high": [i for i in all_issues if i.severity == IssueSeverity.HIGH],
        "medium": [i for i in all_issues if i.severity == IssueSeverity.MEDIUM],
        "low": [i for i in all_issues if i.severity == IssueSeverity.LOW],
    }
    
    # Task completion rate
    completed = sum(1 for r in reports if r.session_summary.task_completed)
    completion_rate = completed / len(reports) * 100
    
    # Overall score
    overall_scores = [r.ux_evaluation.overall_score for r in reports if r.ux_evaluation.overall_score > 0]
    avg_overall = sum(overall_scores) / len(overall_scores) if overall_scores else 0
    
    return {
        "report_count": len(reports),
        "overall_score_average": round(avg_overall, 1),
        "task_completion_rate": round(completion_rate, 1),
        "heuristic_score_averages": {k: round(v, 1) for k, v in avg_scores.items()},
        "issue_counts": {k: len(v) for k, v in issues_by_severity.items()},
        "top_issues": [
            i.to_dict() for i in (issues_by_severity["critical"] + issues_by_severity["high"])[:5]
        ],
        "personas_tested": [r.persona_name for r in reports]
    }
