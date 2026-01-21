"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle, Share2, TrendingUp, Users, Target } from "lucide-react";

// Type definitions for shared batch test
interface SharedBatchTest {
    batchTestRun: {
        id: string;
        targetUrl: string;
        userDescription: string | null;
        status: string;
        createdAt: string;
        completedAt: string | null;
    };
    testRuns: Array<{
        id: string;
        personaName: string | null;
        personaData: any;
        status: string;
        report: {
            score: number | null;
            summary: string | null;
            positiveAspects: string[] | null;
            usabilityIssues: Array<{
                severity: "low" | "medium" | "high" | "critical";
                description: string;
                recommendation: string;
            }> | null;
            accessibilityNotes: string[] | null;
            recommendations: string[] | null;
        } | null;
    }>;
    aggregatedReport: {
        overallScore: number | null;
        executiveSummary: string | null;
        commonIssues: Array<{
            issue: string;
            severity: "low" | "medium" | "high" | "critical";
            affectedPersonas: string[];
            recommendation: string;
        }> | null;
        personaSpecificInsights: Array<{
            personaName: string;
            keyFindings: string[];
        }> | null;
        recommendations: Array<{
            priority: "high" | "medium" | "low";
            recommendation: string;
            impact: string;
        }> | null;
        strengthsAcrossPersonas: string[] | null;
    } | null;
    uxagentRuns: any[];
    isSharedView: boolean;
}

export default function SharedBatchTestPage() {
    const params = useParams();
    const token = params.token as string;

    const [result, setResult] = useState<SharedBatchTest | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState<"overview" | "personas" | "issues">("overview");

    useEffect(() => {
        if (!token) return;

        const fetchResults = async () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
                const response = await fetch(`${apiUrl}/api/share/batch/${token}`);

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || "Report not found");
                }

                const data = await response.json();
                setResult(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load report");
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [token]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-neutral-950">
                <Loader2 className="animate-spin w-8 h-8 text-neutral-400" />
            </div>
        );
    }

    if (error || !result) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-neutral-950">
                <div className="text-center max-w-md text-white">
                    <AlertCircle size={48} className="mx-auto mb-4 text-red-400" />
                    <h1 className="text-2xl font-light mb-4">Report Not Available</h1>
                    <p className="mb-6 text-neutral-400">
                        {error || "This report doesn't exist or is no longer shared."}
                    </p>
                </div>
            </div>
        );
    }

    const { batchTestRun, testRuns, aggregatedReport } = result;
    const isCompleted = batchTestRun.status === "completed";

    const getScoreColor = (score: number) => {
        if (score >= 80) return "text-green-400";
        if (score >= 60) return "text-yellow-400";
        if (score >= 40) return "text-orange-400";
        return "text-red-400";
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case "critical": return "bg-red-500 text-white";
            case "high": return "bg-orange-400 text-black";
            case "medium": return "bg-yellow-400 text-black";
            default: return "bg-neutral-500 text-black";
        }
    };

    return (
        <div className="min-h-screen bg-neutral-950 text-white">
            {/* Shared Badge */}
            <div className="bg-blue-500/10 border-b border-blue-500/20">
                <div className="max-w-7xl mx-auto px-8 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-blue-300">
                        <Share2 size={16} />
                        <span>Shared Report</span>
                    </div>
                    <span className="text-xs text-neutral-500">
                        Created {new Date(batchTestRun.createdAt).toLocaleDateString()}
                    </span>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-light tracking-tight mb-2">
                        UX Test Results
                    </h1>
                    <p className="font-light text-neutral-400">
                        {batchTestRun.targetUrl}
                    </p>
                    {batchTestRun.userDescription && (
                        <p className="mt-2 text-sm text-neutral-500">
                            {batchTestRun.userDescription}
                        </p>
                    )}
                </div>

                {/* Overall Score Card */}
                {isCompleted && aggregatedReport && (
                    <div className="mb-8 p-8 border rounded-2xl border-white/10 bg-[#1E1E1E]">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                            {/* Score */}
                            <div className="text-center md:text-left">
                                <p className="text-sm text-neutral-400 mb-2">Overall Score</p>
                                <div className={`text-6xl font-light ${getScoreColor(aggregatedReport.overallScore || 0)}`}>
                                    {aggregatedReport.overallScore || 0}
                                </div>
                                <p className="text-xs text-neutral-500 mt-1">out of 100</p>
                            </div>

                            {/* Stats */}
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-[#252525] flex items-center justify-center">
                                    <Users size={20} className="text-neutral-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-light">{testRuns.length}</p>
                                    <p className="text-xs text-neutral-500">Personas Tested</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-[#252525] flex items-center justify-center">
                                    <AlertCircle size={20} className="text-neutral-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-light">{aggregatedReport.commonIssues?.length || 0}</p>
                                    <p className="text-xs text-neutral-500">Common Issues</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-[#252525] flex items-center justify-center">
                                    <CheckCircle2 size={20} className="text-neutral-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-light">{aggregatedReport.strengthsAcrossPersonas?.length || 0}</p>
                                    <p className="text-xs text-neutral-500">Strengths Found</p>
                                </div>
                            </div>
                        </div>

                        {aggregatedReport.executiveSummary && (
                            <div className="mt-6 pt-6 border-t border-white/10">
                                <p className="text-sm font-light text-neutral-300 leading-relaxed">
                                    {aggregatedReport.executiveSummary}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Tab Navigation */}
                <div className="mb-6 flex gap-2 border-b border-white/10 pb-4">
                    {["overview", "personas", "issues"].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab
                                ? "bg-white text-neutral-900"
                                : "bg-[#252525] text-neutral-400 hover:text-white"
                                }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Overview Tab */}
                {activeTab === "overview" && aggregatedReport && (
                    <div className="space-y-6">
                        {/* Strengths */}
                        {aggregatedReport.strengthsAcrossPersonas && aggregatedReport.strengthsAcrossPersonas.length > 0 && (
                            <div className="p-6 border rounded-xl border-green-500/20 bg-green-500/5">
                                <h3 className="text-lg font-medium mb-4 flex items-center gap-2 text-green-400">
                                    <CheckCircle2 size={20} />
                                    Strengths Across All Personas
                                </h3>
                                <ul className="space-y-2">
                                    {aggregatedReport.strengthsAcrossPersonas.map((strength, i) => (
                                        <li key={i} className="text-sm text-neutral-300 flex items-start gap-2">
                                            <span className="text-green-400">✓</span>
                                            {strength}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Recommendations */}
                        {aggregatedReport.recommendations && aggregatedReport.recommendations.length > 0 && (
                            <div className="p-6 border rounded-xl border-white/10 bg-[#1E1E1E]">
                                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                                    <Target size={20} />
                                    Recommendations
                                </h3>
                                <div className="space-y-4">
                                    {aggregatedReport.recommendations.map((rec, i) => (
                                        <div key={i} className="flex items-start gap-3">
                                            <span className={`text-xs font-medium px-2 py-1 rounded ${rec.priority === "high" ? "bg-red-500/20 text-red-400" :
                                                rec.priority === "medium" ? "bg-yellow-500/20 text-yellow-400" :
                                                    "bg-neutral-500/20 text-neutral-400"
                                                }`}>
                                                {rec.priority}
                                            </span>
                                            <div>
                                                <p className="text-sm text-neutral-200">{rec.recommendation}</p>
                                                <p className="text-xs text-neutral-500 mt-1">{rec.impact}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Personas Tab */}
                {activeTab === "personas" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {testRuns.map((run) => (
                            <div
                                key={run.id}
                                className="p-6 border rounded-xl border-white/10 bg-[#1E1E1E]"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="text-lg font-medium">
                                            {run.personaName || "Anonymous User"}
                                        </h3>
                                        {run.personaData?.occupation && (
                                            <p className="text-sm text-neutral-500">
                                                {run.personaData.age} y/o {run.personaData.occupation}
                                            </p>
                                        )}
                                    </div>
                                    {run.report?.score != null && (
                                        <div className={`text-2xl font-light ${getScoreColor(run.report.score)}`}>
                                            {run.report.score}
                                        </div>
                                    )}
                                </div>

                                {run.report?.summary && (
                                    <p className="text-sm text-neutral-400 mb-4">
                                        {run.report.summary}
                                    </p>
                                )}

                                {run.report?.positiveAspects && run.report.positiveAspects.length > 0 && (
                                    <div className="mb-3">
                                        <p className="text-xs font-medium text-green-400 mb-1">Positives:</p>
                                        <ul className="text-xs text-neutral-400 space-y-1">
                                            {run.report.positiveAspects.slice(0, 3).map((p, i) => (
                                                <li key={i}>• {p}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {run.report?.usabilityIssues && run.report.usabilityIssues.length > 0 && (
                                    <div>
                                        <p className="text-xs font-medium text-red-400 mb-1">Issues:</p>
                                        <ul className="text-xs text-neutral-400 space-y-1">
                                            {run.report.usabilityIssues.slice(0, 3).map((issue, i) => (
                                                <li key={i}>• {issue.description}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Issues Tab */}
                {activeTab === "issues" && aggregatedReport?.commonIssues && (
                    <div className="space-y-4">
                        {aggregatedReport.commonIssues.map((issue, i) => (
                            <div
                                key={i}
                                className="p-6 border rounded-xl border-white/10 bg-[#1E1E1E]"
                            >
                                <div className="flex items-start gap-3">
                                    <span className={`text-xs font-medium px-2 py-1 rounded ${getSeverityColor(issue.severity)}`}>
                                        {issue.severity}
                                    </span>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-neutral-200 mb-2">
                                            {issue.issue}
                                        </p>
                                        <p className="text-xs text-neutral-400 mb-3">
                                            → {issue.recommendation}
                                        </p>
                                        <div className="flex flex-wrap gap-1">
                                            {issue.affectedPersonas.map((persona, j) => (
                                                <span
                                                    key={j}
                                                    className="text-xs px-2 py-0.5 rounded bg-[#252525] text-neutral-400"
                                                >
                                                    {persona}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {(!aggregatedReport.commonIssues || aggregatedReport.commonIssues.length === 0) && (
                            <div className="text-center py-12 text-neutral-500">
                                No common issues found across personas.
                            </div>
                        )}
                    </div>
                )}

                {/* Footer */}
                <div className="mt-12 pt-8 border-t border-white/10 text-center">
                    <p className="text-sm text-neutral-500">
                        Report generated by UX Testing Agent
                    </p>
                </div>
            </div>
        </div>
    );
}
