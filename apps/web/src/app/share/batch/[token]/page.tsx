"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle, Share2, Users, Target, Brain, ChevronDown, ChevronUp, Eye, MousePointer, Image as ImageIcon, User, Clock, LayoutDashboard, Lightbulb, Navigation, Accessibility, Gauge, FileText } from "lucide-react";
import { useTheme } from "@/contexts/theme-context";

interface UXAgentScreenshot {
    id: string;
    stepNumber: number;
    signedUrl?: string;
    s3Url?: string;
}

interface UXAgentInsight {
    id: string;
    uxagentRunId: string;
    category: 'usability' | 'accessibility' | 'performance' | 'content' | 'navigation';
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    recommendation: string;
    createdAt: string;
}

interface UXAgentRun {
    id: string;
    personaData: any;
    basicInfo: any;
    status: string;
    score: number | null;
    intent: string;
    startUrl: string;
    stepsTaken: number | null;
    actionTrace: any[];
    memoryTrace: any[];
    observationTrace: any[];
    logContent: string | null;
    errorMessage: string | null;
    startedAt: string | null;
    completedAt: string | null;
    screenshots: UXAgentScreenshot[];
    insights?: UXAgentInsight[];
}

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
    uxagentRuns: UXAgentRun[];
    isSharedView: boolean;
}

// Helper to extract persona name
function getPersonaName(run: UXAgentRun, index: number): string {
    const personaData = run.personaData as any;
    if (personaData?.name) return personaData.name;
    const basicInfo = run.basicInfo as any;
    if (basicInfo?.persona) {
        const match = basicInfo.persona.match(/(?:name[:\s]+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
        if (match) return match[1];
    }
    return `Agent ${index + 1}`;
}

// Helper to get status icon
function getStatusIcon(status: string) {
    switch (status) {
        case "completed": return <CheckCircle2 size={14} className="text-emerald-400" />;
        case "failed": return <AlertCircle size={14} className="text-red-400" />;
        case "running": return <Loader2 size={14} className="animate-spin text-blue-400" />;
        default: return <Clock size={14} className="text-neutral-400" />;
    }
}

// Category icons for insights
const categoryIcons: Record<string, React.ReactNode> = {
    usability: <AlertCircle size={16} />,
    accessibility: <Accessibility size={16} />,
    performance: <Gauge size={16} />,
    content: <FileText size={16} />,
    navigation: <Navigation size={16} />,
};

// Category colors
const categoryColors: Record<string, string> = {
    usability: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    accessibility: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    performance: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    content: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    navigation: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
};

// Severity colors
const severityColors: Record<string, string> = {
    critical: "bg-red-500/10 text-red-400 border-red-500/20",
    high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    low: "bg-neutral-500/10 text-neutral-400 border-neutral-500/20",
};

const severityBorderColors: Record<string, string> = {
    critical: "border-l-red-500",
    high: "border-l-orange-500",
    medium: "border-l-yellow-500",
    low: "border-l-neutral-400",
};

// Insights Tab Content Component
function InsightsTabContent({ insights, isLight = false }: { insights: UXAgentInsight[]; isLight?: boolean }) {
    if (insights.length === 0) {
        return (
            <div className={`border p-8 text-center rounded-xl ${isLight ? "border-neutral-200 bg-white" : "border-white/10 bg-[#1E1E1E]"}`}>
                <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center border ${isLight ? "bg-neutral-100 border-neutral-200" : "bg-[#252525] border-white/10"}`}>
                    <Lightbulb size={32} className={isLight ? "text-neutral-500" : "text-neutral-400"} />
                </div>
                <h3 className={`font-medium mb-2 text-lg ${isLight ? "text-neutral-900" : "text-white"}`}>No Insights Generated</h3>
                <p className={`font-light text-sm max-w-md mx-auto ${isLight ? "text-neutral-600" : "text-neutral-400"}`}>
                    No AI insights have been generated for this agent run yet.
                </p>
            </div>
        );
    }

    // Group insights by category
    const byCategory = insights.reduce((acc, insight) => {
        const cat = insight.category || 'usability';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(insight);
        return acc;
    }, {} as Record<string, UXAgentInsight[]>);

    // Count by severity
    const severityCounts = insights.reduce((acc, i) => {
        acc[i.severity] = (acc[i.severity] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="space-y-6">
            {/* Summary Header */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className={`p-4 border rounded-lg ${isLight ? "bg-neutral-100 border-neutral-200 text-neutral-900" : "bg-[#252525] text-white border-white/10"}`}>
                    <p className="text-3xl font-light">{insights.length}</p>
                    <p className={`text-xs uppercase tracking-wide font-light ${isLight ? "text-neutral-600" : "text-neutral-400"}`}>Total Insights</p>
                </div>
                {['critical', 'high', 'medium', 'low'].map(severity => (
                    <div key={severity} className={`p-4 border rounded-lg ${severityColors[severity]}`}>
                        <p className="text-2xl font-light">{severityCounts[severity] || 0}</p>
                        <p className={`text-xs uppercase tracking-wide capitalize font-light ${isLight ? "text-neutral-600" : "text-neutral-400"}`}>{severity}</p>
                    </div>
                ))}
            </div>

            {/* Insights by Category */}
            {Object.entries(byCategory).map(([category, categoryInsights]) => (
                <div key={category} className={`border rounded-xl overflow-hidden ${isLight ? "border-neutral-200 bg-white" : "border-white/10 bg-[#1E1E1E]"}`}>
                    <div className={`p-4 border-b flex items-center gap-3 ${categoryColors[category] || (isLight ? "bg-neutral-100 border-neutral-200" : "bg-[#252525] border-white/10")}`}>
                        {categoryIcons[category] || <Lightbulb size={16} />}
                        <h3 className="font-medium capitalize">{category}</h3>
                        <span className={`ml-auto text-sm opacity-70 ${isLight ? "text-neutral-600" : "text-neutral-400"}`}>{categoryInsights.length} issue{categoryInsights.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className={isLight ? "divide-y divide-neutral-200" : "divide-y divide-white/5"}>
                        {categoryInsights.map((insight) => (
                            <div
                                key={insight.id}
                                className={`p-5 border-l-4 ${isLight ? "bg-white" : "bg-[#1E1E1E]"} ${severityBorderColors[insight.severity] || 'border-l-neutral-400'}`}
                            >
                                <div className="flex items-start justify-between gap-4 mb-3">
                                    <h4 className={`font-medium ${isLight ? "text-neutral-900" : "text-white"}`}>{insight.title}</h4>
                                    <span className={`shrink-0 text-[10px] px-2 py-1 uppercase font-bold tracking-wider rounded ${severityColors[insight.severity]}`}>
                                        {insight.severity}
                                    </span>
                                </div>
                                <p className={`text-sm font-light mb-4 ${isLight ? "text-neutral-700" : "text-neutral-300"}`}>
                                    {insight.description}
                                </p>
                                <div className={`flex gap-2 items-start border p-3 rounded-lg ${isLight ? "bg-emerald-50 border-emerald-200" : "bg-emerald-500/10 border-emerald-500/20"}`}>
                                    <CheckCircle2 size={16} className={`shrink-0 mt-0.5 ${isLight ? "text-emerald-600" : "text-emerald-400"}`} />
                                    <div>
                                        <span className={`text-xs font-medium uppercase tracking-wide block mb-1 ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>Recommendation</span>
                                        <p className={`text-sm font-light ${isLight ? "text-emerald-800" : "text-emerald-300"}`}>{insight.recommendation}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

// Combined Insight interface for aggregate view
interface CombinedInsight {
    insight: UXAgentInsight;
    agentName: string;
    runId: string;
}

// Category labels
const categoryLabels: Record<string, string> = {
    usability: "Usability",
    accessibility: "Accessibility",
    performance: "Performance",
    content: "Content",
    navigation: "Navigation",
};

// Aggregate Insights Component for Shared View
function AggregateInsightsShared({ uxagentRuns, isLight = false }: { uxagentRuns: UXAgentRun[]; isLight?: boolean }) {
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["usability", "accessibility"]));

    // Combine insights from all runs
    const allInsights: CombinedInsight[] = [];
    uxagentRuns.forEach((run, idx) => {
        const agentName = getPersonaName(run, idx);
        (run.insights || []).forEach(insight => {
            allInsights.push({ insight, agentName, runId: run.id });
        });
    });

    // Sort by severity
    const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    allInsights.sort((a, b) =>
        (severityOrder[a.insight.severity] || 3) - (severityOrder[b.insight.severity] || 3)
    );

    const toggleCategory = (category: string) => {
        const newSet = new Set(expandedCategories);
        if (newSet.has(category)) {
            newSet.delete(category);
        } else {
            newSet.add(category);
        }
        setExpandedCategories(newSet);
    };

    // Group insights by category
    const insightsByCategory = allInsights.reduce((acc, item) => {
        const cat = item.insight.category || "other";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {} as Record<string, CombinedInsight[]>);

    // Calculate stats
    const totalInsights = allInsights.length;
    const criticalCount = allInsights.filter(i => i.insight.severity === "critical").length;
    const highCount = allInsights.filter(i => i.insight.severity === "high").length;
    const completedRuns = uxagentRuns.filter(r => r.status === "completed").length;
    const avgScore = uxagentRuns.filter(r => r.score !== null).length > 0
        ? Math.round(uxagentRuns.filter(r => r.score !== null).reduce((sum, r) => sum + (r.score || 0), 0) / uxagentRuns.filter(r => r.score !== null).length * 10) / 10
        : 0;

    if (totalInsights === 0) {
        return (
            <div className={`border p-6 text-center rounded-xl ${isLight ? "border-neutral-200 bg-white" : "border-white/10 bg-[#1E1E1E]"}`}>
                <Lightbulb className={`w-12 h-12 mx-auto mb-4 ${isLight ? "text-neutral-500" : "text-neutral-400"}`} />
                <h3 className={`text-lg font-medium mb-2 ${isLight ? "text-neutral-900" : "text-white"}`}>No Insights Available</h3>
                <p className={`font-light text-sm ${isLight ? "text-neutral-600" : "text-neutral-400"}`}>
                    No AI insights have been generated for these agent runs yet.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className={`border p-4 rounded-xl ${isLight ? "border-neutral-200 bg-white" : "border-white/10 bg-[#1E1E1E]"}`}>
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`w-10 h-10 border flex items-center justify-center rounded-lg ${isLight ? "bg-neutral-100 border-neutral-200" : "bg-[#252525] border-white/10"}`}>
                            <Users size={20} className={isLight ? "text-neutral-600" : "text-neutral-400"} />
                        </div>
                        <div>
                            <p className={`text-2xl font-light ${isLight ? "text-neutral-900" : "text-white"}`}>{completedRuns}/{uxagentRuns.length}</p>
                            <p className={`text-xs uppercase tracking-wide font-light ${isLight ? "text-neutral-600" : "text-neutral-400"}`}>Agents Completed</p>
                        </div>
                    </div>
                </div>

                <div className={`border p-4 rounded-xl ${isLight ? "border-neutral-200 bg-white" : "border-white/10 bg-[#1E1E1E]"}`}>
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`w-10 h-10 border flex items-center justify-center rounded-lg ${isLight ? "bg-neutral-100 border-neutral-200" : "bg-[#252525] border-white/10"}`}>
                            <Target size={20} className={isLight ? "text-neutral-600" : "text-neutral-400"} />
                        </div>
                        <div>
                            <p className={`text-2xl font-light ${isLight ? "text-neutral-900" : "text-white"}`}>{avgScore}<span className={`text-sm ${isLight ? "text-neutral-600" : "text-neutral-400"}`}>/10</span></p>
                            <p className={`text-xs uppercase tracking-wide font-light ${isLight ? "text-neutral-600" : "text-neutral-400"}`}>Avg Score</p>
                        </div>
                    </div>
                </div>

                <div className={`border p-4 rounded-xl ${isLight ? "border-neutral-200 bg-white" : "border-white/10 bg-[#1E1E1E]"}`}>
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`w-10 h-10 border flex items-center justify-center rounded-lg ${isLight ? "bg-neutral-100 border-neutral-200" : "bg-[#252525] border-white/10"}`}>
                            <Lightbulb size={20} className={isLight ? "text-neutral-600" : "text-neutral-400"} />
                        </div>
                        <div>
                            <p className={`text-2xl font-light ${isLight ? "text-neutral-900" : "text-white"}`}>{totalInsights}</p>
                            <p className={`text-xs uppercase tracking-wide font-light ${isLight ? "text-neutral-600" : "text-neutral-400"}`}>Total Insights</p>
                        </div>
                    </div>
                </div>

                <div className={`border p-4 rounded-xl ${isLight ? "border-neutral-200 bg-white" : "border-white/10 bg-[#1E1E1E]"}`}>
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`w-10 h-10 border flex items-center justify-center rounded-lg ${isLight ? "bg-red-50 border-red-200" : "bg-red-500/10 border-red-500/20"}`}>
                            <AlertCircle size={20} className={isLight ? "text-red-600" : "text-red-400"} />
                        </div>
                        <div>
                            <p className={`text-2xl font-light ${isLight ? "text-red-700" : "text-red-400"}`}>{criticalCount + highCount}</p>
                            <p className={`text-xs uppercase tracking-wide font-light ${isLight ? "text-neutral-600" : "text-neutral-400"}`}>Critical Issues</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Insights by Category */}
            <div className="space-y-4">
                <h3 className={`text-lg font-medium ${isLight ? "text-neutral-900" : "text-white"}`}>Insights Across All Agents</h3>

                {Object.entries(insightsByCategory)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([category, insights]) => (
                        <div key={category} className={`border rounded-xl overflow-hidden ${isLight ? "border-neutral-200 bg-white" : "border-white/10 bg-[#1E1E1E]"}`}>
                            <button
                                onClick={() => toggleCategory(category)}
                                className={`w-full flex items-center justify-between p-4 transition-colors ${isLight ? "hover:bg-neutral-50" : "hover:bg-white/5"}`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className={`font-medium capitalize ${isLight ? "text-neutral-900" : "text-white"}`}>{categoryLabels[category] || category}</span>
                                    <span className={`text-xs px-2 py-0.5 border rounded-lg ${isLight ? "bg-neutral-100 border-neutral-200 text-neutral-700" : "bg-[#252525] border-white/10 text-neutral-300"}`}>
                                        {insights.length} issue{insights.length !== 1 ? 's' : ''}
                                    </span>
                                </div>
                                {expandedCategories.has(category) ? (
                                    <ChevronUp size={16} className={isLight ? "text-neutral-600" : "text-neutral-400"} />
                                ) : (
                                    <ChevronDown size={16} className={isLight ? "text-neutral-600" : "text-neutral-400"} />
                                )}
                            </button>

                            {expandedCategories.has(category) && (
                                <div className={`border-t ${isLight ? "divide-y divide-neutral-200 border-neutral-200" : "divide-y border-white/10 divide-white/5"}`}>
                                    {insights.map((item, idx) => (
                                        <div
                                            key={`${item.runId}-${idx}`}
                                            className={`p-4 border-l-4 ${isLight ? "bg-white" : "bg-[#1E1E1E]"} ${severityBorderColors[item.insight.severity]}`}
                                        >
                                            <div className="flex items-start justify-between gap-4 mb-2">
                                                <h4 className={`font-medium text-sm ${isLight ? "text-neutral-900" : "text-white"}`}>{item.insight.title}</h4>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className={`px-2 py-0.5 text-xs font-medium border rounded ${severityColors[item.insight.severity]}`}>
                                                        {item.insight.severity}
                                                    </span>
                                                    <span className={`text-xs px-2 py-0.5 border rounded-lg ${isLight ? "bg-neutral-100 border-neutral-200 text-neutral-700" : "bg-[#252525] border-white/10 text-neutral-300"}`}>
                                                        {item.agentName}
                                                    </span>
                                                </div>
                                            </div>
                                            <p className={`text-sm font-light mb-2 ${isLight ? "text-neutral-700" : "text-neutral-300"}`}>
                                                {item.insight.description}
                                            </p>
                                            {item.insight.recommendation && (
                                                <div className={`border p-3 mt-2 rounded-lg ${isLight ? "bg-neutral-50 border-neutral-200" : "bg-[#252525] border-white/10"}`}>
                                                    <p className={`text-xs uppercase tracking-wide mb-1 font-light ${isLight ? "text-neutral-600" : "text-neutral-400"}`}>Recommendation</p>
                                                    <p className={`text-sm font-light ${isLight ? "text-neutral-700" : "text-neutral-300"}`}>{item.insight.recommendation}</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
            </div>
        </div>
    );
}

export default function SharedBatchTestPage() {
    const params = useParams();
    const token = params.token as string;
    const { theme } = useTheme();
    const isLight = theme === "light";

    const [result, setResult] = useState<SharedBatchTest | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [viewMode, setViewMode] = useState<"aggregate" | "individual">("aggregate");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [activeTab, setActiveTab] = useState<"overview" | "actions" | "screenshots" | "insights">("overview");

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

    // Calculate aggregate data from UXAgent runs
    const uxAgentStats = useMemo(() => {
        if (!result?.uxagentRuns?.length) return null;

        const completedRuns = result.uxagentRuns.filter(r => r.status === "completed" && r.score != null);
        if (completedRuns.length === 0) return null;

        const avgScore = Math.round(
            completedRuns.reduce((sum, r) => sum + (r.score || 0), 0) / completedRuns.length
        );

        const totalSteps = completedRuns.reduce((sum, r) => sum + (r.stepsTaken || 0), 0);

        return {
            avgScore,
            totalAgents: result.uxagentRuns.length,
            completedAgents: completedRuns.length,
            totalSteps,
        };
    }, [result?.uxagentRuns]);

    const isUXAgentTest = result?.uxagentRuns && result.uxagentRuns.length > 0;
    const selectedRun = isUXAgentTest ? result.uxagentRuns[selectedIndex] : null;

    const getStatusColor = (status: string) => {
        switch (status) {
            case "completed": return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
            case "failed": return "text-red-400 bg-red-500/10 border-red-500/20";
            case "running": return "text-blue-400 bg-blue-500/10 border-blue-500/20";
            default: return "text-neutral-400 bg-neutral-500/10 border-neutral-500/20";
        }
    };

    const getActionColor = (action: string) => {
        if (action === "click") return "bg-blue-500/10 text-blue-400 border-blue-500/20";
        if (action === "type") return "bg-purple-500/10 text-purple-400 border-purple-500/20";
        if (action === "goto_url") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
        if (action === "terminate") return "bg-red-500/10 text-red-400 border-red-500/20";
        return "bg-neutral-500/10 text-neutral-400 border-neutral-500/20";
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case "critical": return "bg-red-500 text-white";
            case "high": return "bg-orange-400 text-black";
            case "medium": return "bg-yellow-400 text-black";
            default: return "bg-neutral-500 text-black";
        }
    };

    if (loading) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${isLight ? "bg-neutral-50" : "bg-neutral-950"}`}>
                <Loader2 className={`animate-spin w-8 h-8 ${isLight ? "text-neutral-500" : "text-neutral-400"}`} />
            </div>
        );
    }

    if (error || !result) {
        return (
            <div className={`min-h-screen flex flex-col items-center justify-center p-8 ${isLight ? "bg-neutral-50" : "bg-neutral-950"}`}>
                <div className={`text-center max-w-md ${isLight ? "text-neutral-900" : "text-white"}`}>
                    <AlertCircle size={48} className={`mx-auto mb-4 ${isLight ? "text-red-600" : "text-red-400"}`} />
                    <h1 className="text-2xl font-light mb-4">Report Not Available</h1>
                    <p className={`mb-6 ${isLight ? "text-neutral-600" : "text-neutral-400"}`}>
                        {error || "This report doesn't exist or is no longer shared."}
                    </p>
                </div>
            </div>
        );
    }

    const { batchTestRun, testRuns, aggregatedReport, uxagentRuns } = result;
    const isCompleted = batchTestRun.status === "completed";

    return (
        <div className={`min-h-screen ${isLight ? "bg-neutral-50" : "bg-neutral-950"} ${isLight ? "text-neutral-900" : "text-white"}`}>
            {/* Shared Badge */}
            <div className={isLight ? "bg-blue-50 border-b border-blue-200" : "bg-blue-500/10 border-b border-blue-500/20"}>
                <div className="max-w-7xl mx-auto px-8 py-3 flex items-center justify-between">
                    <div className={`flex items-center gap-2 text-sm ${isLight ? "text-blue-700" : "text-blue-300"}`}>
                        <Share2 size={16} />
                        <span>Shared Report</span>
                    </div>
                    <span className={`text-xs ${isLight ? "text-neutral-600" : "text-neutral-500"}`}>
                        Created {new Date(batchTestRun.createdAt).toLocaleDateString()}
                    </span>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className={`text-3xl font-light tracking-tight mb-2 ${isLight ? "text-neutral-900" : "text-white"}`}>
                        UX Test Results
                    </h1>
                    <p className={`font-light ${isLight ? "text-neutral-500" : "text-neutral-400"}`}>
                        {batchTestRun.targetUrl}
                    </p>
                    {batchTestRun.userDescription && (
                        <p className={`mt-2 text-sm ${isLight ? "text-neutral-600" : "text-neutral-500"}`}>
                            {batchTestRun.userDescription}
                        </p>
                    )}
                </div>

                {/* UXAgent View */}
                {isCompleted && isUXAgentTest && uxAgentStats && (
                    <div className="space-y-6">
                        {/* Score Card */}
                        <div className={`p-8 border rounded-2xl ${isLight ? "border-neutral-200 bg-white" : "border-white/10 bg-[#1E1E1E]"}`}>
                            <div className="flex items-center gap-2 mb-6">
                                <Brain size={20} className={isLight ? "text-purple-600" : "text-purple-400"} />
                                <span className={`text-sm font-medium ${isLight ? "text-purple-700" : "text-purple-400"}`}>AI Agent Testing</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                                <div className="text-center md:text-left">
                                    <p className={`text-sm mb-2 ${isLight ? "text-neutral-600" : "text-neutral-400"}`}>Average Score</p>
                                    <div className={`text-6xl font-light ${isLight ? "text-neutral-900" : "text-white"}`}>
                                        {uxAgentStats.avgScore}
                                        <span className={`text-xl ${isLight ? "text-neutral-600" : "text-neutral-400"}`}>/10</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isLight ? "bg-neutral-100" : "bg-[#252525]"}`}>
                                        <Users size={20} className={isLight ? "text-neutral-600" : "text-neutral-400"} />
                                    </div>
                                    <div>
                                        <p className={`text-2xl font-light ${isLight ? "text-neutral-900" : "text-white"}`}>{uxAgentStats.totalAgents}</p>
                                        <p className={`text-xs ${isLight ? "text-neutral-600" : "text-neutral-500"}`}>AI Agents</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isLight ? "bg-neutral-100" : "bg-[#252525]"}`}>
                                        <CheckCircle2 size={20} className={isLight ? "text-neutral-600" : "text-neutral-400"} />
                                    </div>
                                    <div>
                                        <p className={`text-2xl font-light ${isLight ? "text-neutral-900" : "text-white"}`}>{uxAgentStats.completedAgents}</p>
                                        <p className={`text-xs ${isLight ? "text-neutral-600" : "text-neutral-500"}`}>Completed</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isLight ? "bg-neutral-100" : "bg-[#252525]"}`}>
                                        <Target size={20} className={isLight ? "text-neutral-600" : "text-neutral-400"} />
                                    </div>
                                    <div>
                                        <p className={`text-2xl font-light ${isLight ? "text-neutral-900" : "text-white"}`}>{uxAgentStats.totalSteps}</p>
                                        <p className={`text-xs ${isLight ? "text-neutral-600" : "text-neutral-500"}`}>Total Steps</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* View Mode Toggle */}
                        {uxagentRuns.length > 1 && (
                            <div className={`flex items-center gap-2 border-b ${isLight ? "border-neutral-200" : "border-white/10"} pb-4`}>
                                <button
                                    onClick={() => setViewMode("aggregate")}
                                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all rounded-lg ${viewMode === "aggregate"
                                        ? isLight
                                            ? "bg-neutral-900 text-white border border-neutral-300"
                                            : "bg-[#252525] text-white border border-white/10"
                                        : isLight
                                            ? "bg-white border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50"
                                        : "bg-[#1E1E1E] border border-white/10 text-neutral-400 hover:text-white hover:bg-[#252525]"
                                        }`}
                                >
                                    <LayoutDashboard size={16} />
                                    Aggregate View
                                </button>
                                <button
                                    onClick={() => setViewMode("individual")}
                                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all rounded-lg ${viewMode === "individual"
                                        ? isLight
                                            ? "bg-neutral-900 text-white border border-neutral-300"
                                            : "bg-[#252525] text-white border border-white/10"
                                        : isLight
                                            ? "bg-white border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50"
                                        : "bg-[#1E1E1E] border border-white/10 text-neutral-400 hover:text-white hover:bg-[#252525]"
                                        }`}
                                >
                                    <User size={16} />
                                    Individual Agents
                                </button>
                            </div>
                        )}

                        {/* Aggregate View */}
                        {viewMode === "aggregate" && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {uxagentRuns.map((run, idx) => {
                                        const name = getPersonaName(run, idx);
                                        const duration = run.startedAt && run.completedAt
                                            ? Math.round((new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)
                                            : null;

                                        return (
                                            <div
                                                key={run.id}
                                                onClick={() => {
                                                    setSelectedIndex(idx);
                                                    setViewMode("individual");
                                                }}
                                                className={`p-4 border rounded-xl cursor-pointer transition-all ${isLight
                                                    ? "border-neutral-200 bg-white hover:border-neutral-300"
                                                    : "border-white/10 bg-[#1E1E1E] hover:border-white/20"
                                                    }`}
                                            >
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isLight ? "bg-neutral-100" : "bg-[#252525]"}`}>
                                                            <User size={16} className={isLight ? "text-neutral-600" : "text-neutral-400"} />
                                                        </div>
                                                        <div>
                                                            <h4 className={`font-medium text-sm ${isLight ? "text-neutral-900" : "text-white"}`}>{name}</h4>
                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                {getStatusIcon(run.status)}
                                                                <span className={`text-xs capitalize ${isLight ? "text-neutral-600" : "text-neutral-500"}`}>{run.status}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {run.score !== null && (
                                                        <div className="text-right">
                                                            <span className={`text-lg font-light ${isLight ? "text-neutral-900" : "text-white"}`}>{run.score}</span>
                                                            <span className={`text-xs ${isLight ? "text-neutral-600" : "text-neutral-400"}`}>/10</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className={`flex items-center gap-4 text-xs pt-2 border-t ${isLight ? "text-neutral-600 border-neutral-200" : "text-neutral-500 border-white/5"}`}>
                                                    <span>{run.stepsTaken || 0} steps</span>
                                                    <span>{run.screenshots?.length || 0} screenshots</span>
                                                    {duration && <span>{duration}s</span>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Aggregate Insights */}
                                <AggregateInsightsShared uxagentRuns={uxagentRuns} isLight={isLight} />
                            </>
                        )}

                        {/* Individual View */}
                        {(viewMode === "individual" || uxagentRuns.length === 1) && selectedRun && (
                            <div className="space-y-6">
                                {/* Agent Selector */}
                                {uxagentRuns.length > 1 && (
                                    <div className={`border p-4 rounded-xl ${isLight ? "bg-white border-neutral-200" : "bg-[#1E1E1E] border-white/10"}`}>
                                        <h3 className={`text-sm font-medium uppercase tracking-wide mb-3 ${isLight ? "text-neutral-600" : "text-neutral-400"}`}>
                                            Agent Runs ({uxagentRuns.length})
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                            {uxagentRuns.map((run, idx) => {
                                                const isSelected = idx === selectedIndex;
                                                const personaName = getPersonaName(run, idx);

                                                return (
                                                    <button
                                                        key={run.id}
                                                        onClick={() => setSelectedIndex(idx)}
                                                        className={`group relative p-4 text-left transition-all duration-200 rounded-lg ${isSelected
                                                            ? isLight
                                                                ? "bg-neutral-900 text-white border-2 border-neutral-700 shadow-lg"
                                                                : "bg-[#252525] text-white border-2 border-white/20 shadow-lg"
                                                            : isLight
                                                                ? "bg-white border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
                                                            : "bg-[#1E1E1E] border border-white/10 hover:border-white/20 hover:bg-[#252525]"
                                                            }`}
                                                    >
                                                        <div className="flex items-start justify-between mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isSelected
                                                                    ? isLight ? "bg-white/20" : "bg-white/10"
                                                                    : isLight ? "bg-neutral-100" : "bg-white/5"
                                                                    }`}>
                                                                    <User size={16} className={isLight && !isSelected ? "text-neutral-600" : "text-neutral-400"} />
                                                                </div>
                                                                <div>
                                                                    <h4 className={`font-medium text-sm ${isSelected
                                                                        ? "text-white"
                                                                        : isLight ? "text-neutral-900" : "text-neutral-300"
                                                                        }`}>
                                                                        {personaName}
                                                                    </h4>
                                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                                        {getStatusIcon(run.status)}
                                                                        <span className={`text-xs capitalize ${isLight && !isSelected ? "text-neutral-600" : "text-neutral-500"}`}>{run.status}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {run.score !== null && (
                                                                <div className="text-right">
                                                                    <span className={`text-lg font-light ${isSelected ? "text-white" : isLight ? "text-neutral-900" : "text-white"}`}>{run.score}</span>
                                                                    <span className={`text-xs ${isSelected ? "text-neutral-300" : isLight ? "text-neutral-600" : "text-neutral-400"}`}>/10</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className={`flex items-center gap-4 text-xs pt-2 border-t ${isLight && !isSelected
                                                            ? "text-neutral-600 border-neutral-200"
                                                            : isSelected
                                                                ? "text-neutral-300 border-white/10"
                                                                : "text-neutral-500 border-white/10"
                                                            }`}>
                                                            <span>{run.stepsTaken || 0} steps</span>
                                                            <span>{run.screenshots?.length || 0} screenshots</span>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Run Header */}
                                <div className={`border p-6 rounded-xl ${isLight ? "border-neutral-200 bg-white" : "border-white/10 bg-[#1E1E1E]"}`}>
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <h2 className={`text-xl font-light mb-1 ${isLight ? "text-neutral-900" : "text-white"}`}>{selectedRun.intent}</h2>
                                            <p className={`text-sm font-light ${isLight ? "text-neutral-600" : "text-neutral-400"}`}>{selectedRun.startUrl}</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className={`px-3 py-1 text-xs font-medium border rounded-lg ${getStatusColor(selectedRun.status)}`}>
                                                {selectedRun.status}
                                            </span>
                                            {selectedRun.score !== null && (
                                                <div className="text-right">
                                                    <span className={`text-3xl font-light ${isLight ? "text-neutral-900" : "text-white"}`}>{selectedRun.score}</span>
                                                    <span className={`text-sm ${isLight ? "text-neutral-600" : "text-neutral-400"}`}>/10</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-6 text-sm">
                                        <div>
                                            <p className={`text-xs uppercase tracking-wide mb-1 font-light ${isLight ? "text-neutral-600" : "text-neutral-400"}`}>Steps Taken</p>
                                            <p className={`font-light ${isLight ? "text-neutral-900" : "text-white"}`}>{selectedRun.stepsTaken || 0} steps</p>
                                        </div>
                                        <div>
                                            <p className={`text-xs uppercase tracking-wide mb-1 font-light ${isLight ? "text-neutral-600" : "text-neutral-400"}`}>Screenshots</p>
                                            <p className={`font-light ${isLight ? "text-neutral-900" : "text-white"}`}>{selectedRun.screenshots?.length || 0} captured</p>
                                        </div>
                                        <div>
                                            <p className={`text-xs uppercase tracking-wide mb-1 font-light ${isLight ? "text-neutral-600" : "text-neutral-400"}`}>Duration</p>
                                            <p className={`font-light ${isLight ? "text-neutral-900" : "text-white"}`}>
                                                {selectedRun.startedAt && selectedRun.completedAt
                                                    ? `${Math.round((new Date(selectedRun.completedAt).getTime() - new Date(selectedRun.startedAt).getTime()) / 1000)}s`
                                                    : "N/A"
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Tabs */}
                                <div className={`border-b ${isLight ? "border-neutral-200" : "border-white/10"}`}>
                                    <div className="flex gap-1 overflow-x-auto">
                                        {[
                                            { key: "overview", label: "Overview", icon: Eye },
                                            { key: "actions", label: "Actions", icon: MousePointer },
                                            { key: "screenshots", label: "Screenshots", icon: ImageIcon },
                                            { key: "insights", label: "Insights", icon: Lightbulb },
                                        ].map(({ key, label, icon: Icon }) => (
                                            <button
                                                key={key}
                                                onClick={() => setActiveTab(key as any)}
                                                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === key
                                                    ? isLight
                                                        ? "border-b-2 border-neutral-900 text-neutral-900"
                                                        : "border-b-2 border-white text-white"
                                                    : isLight
                                                        ? "text-neutral-600 hover:text-neutral-900"
                                                    : "text-neutral-500 hover:text-neutral-300"
                                                    }`}
                                            >
                                                <Icon size={16} />
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Tab Content */}
                                <div className="min-h-[400px]">
                                    {/* Overview Tab */}
                                    {activeTab === "overview" && (
                                        <div className="space-y-6">
                                            {selectedRun.errorMessage && (
                                                <div className={`border-l-4 p-4 rounded-lg ${isLight ? "border-red-500 bg-red-50" : "border-red-500 bg-red-500/10"}`}>
                                                    <div className={`flex items-center gap-2 font-medium mb-1 ${isLight ? "text-red-700" : "text-red-400"}`}>
                                                        <AlertCircle size={16} />
                                                        Error
                                                    </div>
                                                    <p className={`text-sm font-light ${isLight ? "text-red-800" : "text-red-300"}`}>{selectedRun.errorMessage}</p>
                                                </div>
                                            )}

                                            {/* Persona Info */}
                                            {selectedRun.personaData && (
                                                <div className={`border p-6 rounded-xl ${isLight ? "border-neutral-200 bg-white" : "border-white/10 bg-[#1E1E1E]"}`}>
                                                    <h3 className={`text-lg font-medium mb-4 ${isLight ? "text-neutral-900" : "text-white"}`}>Agent Persona</h3>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                        {selectedRun.personaData.name && (
                                                            <div>
                                                                <p className={`text-xs mb-1 ${isLight ? "text-neutral-600" : "text-neutral-500"}`}>Name</p>
                                                                <p className={`text-sm ${isLight ? "text-neutral-900" : "text-white"}`}>{selectedRun.personaData.name}</p>
                                                            </div>
                                                        )}
                                                        {selectedRun.personaData.age && (
                                                            <div>
                                                                <p className={`text-xs mb-1 ${isLight ? "text-neutral-600" : "text-neutral-500"}`}>Age</p>
                                                                <p className={`text-sm ${isLight ? "text-neutral-900" : "text-white"}`}>{selectedRun.personaData.age}</p>
                                                            </div>
                                                        )}
                                                        {selectedRun.personaData.occupation && (
                                                            <div>
                                                                <p className={`text-xs mb-1 ${isLight ? "text-neutral-600" : "text-neutral-500"}`}>Occupation</p>
                                                                <p className={`text-sm ${isLight ? "text-neutral-900" : "text-white"}`}>{selectedRun.personaData.occupation}</p>
                                                            </div>
                                                        )}
                                                        {selectedRun.personaData.techSavviness && (
                                                            <div>
                                                                <p className={`text-xs mb-1 ${isLight ? "text-neutral-600" : "text-neutral-500"}`}>Tech Savviness</p>
                                                                <p className={`text-sm capitalize ${isLight ? "text-neutral-900" : "text-white"}`}>{selectedRun.personaData.techSavviness}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {selectedRun.personaData.primaryGoal && (
                                                        <div className={`mt-4 pt-4 border-t ${isLight ? "border-neutral-200" : "border-white/5"}`}>
                                                            <p className={`text-xs mb-1 ${isLight ? "text-neutral-600" : "text-neutral-500"}`}>Primary Goal</p>
                                                            <p className={`text-sm ${isLight ? "text-neutral-700" : "text-neutral-300"}`}>{selectedRun.personaData.primaryGoal}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Journey Summary */}
                                            {selectedRun.observationTrace && selectedRun.observationTrace.length > 0 && (
                                                <div className={`border p-6 rounded-xl ${isLight ? "border-neutral-200 bg-white" : "border-white/10 bg-[#1E1E1E]"}`}>
                                                    <h3 className={`text-lg font-medium mb-4 ${isLight ? "text-neutral-900" : "text-white"}`}>Agent Journey</h3>
                                                    <div className="space-y-4">
                                                        {selectedRun.observationTrace.slice(0, 5).map((obs: any, idx: number) => (
                                                            <div key={idx} className="flex gap-4">
                                                                <div className="flex flex-col items-center">
                                                                    <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-sm font-medium ${isLight ? "bg-neutral-900 border-neutral-300 text-white" : "bg-[#252525] border-white/10 text-white"}`}>
                                                                        {idx + 1}
                                                                    </div>
                                                                    {idx < selectedRun.observationTrace.length - 1 && (
                                                                        <div className={`w-0.5 h-full my-1 ${isLight ? "bg-neutral-200" : "bg-white/10"}`} />
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 pb-4">
                                                                    <p className={`text-sm font-medium mb-1 ${isLight ? "text-neutral-900" : "text-white"}`}>{obs.url || "Page Visit"}</p>
                                                                    <p className={`text-xs font-light ${isLight ? "text-neutral-600" : "text-neutral-400"}`}>
                                                                        HTML Length: {obs.html_length?.toLocaleString() || 0} chars
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Actions Tab */}
                                    {activeTab === "actions" && (
                                        <div className={`border rounded-xl overflow-hidden ${isLight ? "border-neutral-200 bg-white" : "border-white/10 bg-[#1E1E1E]"}`}>
                                            <div className={`p-4 border-b ${isLight ? "bg-neutral-50 border-neutral-200" : "bg-[#252525] border-white/10"}`}>
                                                <h3 className={`font-medium ${isLight ? "text-neutral-900" : "text-white"}`}>Action Timeline</h3>
                                                <p className={`text-sm font-light ${isLight ? "text-neutral-600" : "text-neutral-400"}`}>{selectedRun.actionTrace?.length || 0} actions recorded</p>
                                            </div>
                                            <div className={`${isLight ? "divide-y divide-neutral-200" : "divide-y divide-white/5"} max-h-[500px] overflow-y-auto`}>
                                                {(selectedRun.actionTrace || []).map((action: any, idx: number) => (
                                                    <div key={idx} className={`p-4 transition-colors ${isLight ? "hover:bg-neutral-50" : "hover:bg-white/5"}`}>
                                                        <div className="flex items-start gap-4">
                                                            <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-sm font-medium shrink-0 ${isLight ? "bg-neutral-900 border-neutral-300 text-white" : "bg-[#252525] border-white/10 text-white"}`}>
                                                                {idx + 1}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className={`px-2 py-0.5 text-xs font-medium border rounded ${getActionColor(action.action)}`}>
                                                                        {action.action}
                                                                    </span>
                                                                    {action.target && (
                                                                        <span className={`text-xs truncate font-light ${isLight ? "text-neutral-600" : "text-neutral-400"}`}>
                                                                            Target: {action.target}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className={`text-sm font-light ${isLight ? "text-neutral-700" : "text-neutral-300"}`}>
                                                                    {action.description || JSON.stringify(action)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {(!selectedRun.actionTrace || selectedRun.actionTrace.length === 0) && (
                                                    <div className={`p-8 text-center font-light ${isLight ? "text-neutral-600" : "text-neutral-400"}`}>
                                                        No actions recorded
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Screenshots Tab */}
                                    {activeTab === "screenshots" && (
                                        <div className="space-y-4">
                                            {selectedRun.screenshots && selectedRun.screenshots.length > 0 ? (
                                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                                    {selectedRun.screenshots.map((s, i) => (
                                                        <div key={s.id} className="group relative">
                                                            <div className={`aspect-video rounded-lg overflow-hidden border ${isLight ? "bg-neutral-100 border-neutral-200" : "bg-[#252525] border-white/10"}`}>
                                                                <img
                                                                    src={s.signedUrl || s.s3Url}
                                                                    alt={`Step ${s.stepNumber}`}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </div>
                                                            <p className={`text-xs mt-2 ${isLight ? "text-neutral-600" : "text-neutral-500"}`}>Step {s.stepNumber}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className={`p-8 text-center font-light border rounded-xl ${isLight ? "text-neutral-600 border-neutral-200 bg-white" : "text-neutral-400 border-white/10 bg-[#1E1E1E]"}`}>
                                                    No screenshots captured
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Insights Tab */}
                                    {activeTab === "insights" && (
                                        <InsightsTabContent insights={selectedRun.insights || []} isLight={isLight} />
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Traditional Aggregated Report View */}
                {isCompleted && aggregatedReport && !isUXAgentTest && (
                    <div className="space-y-6">
                        <div className={`p-8 border rounded-xl ${isLight ? "border-neutral-200 bg-white" : "border-white/10 bg-[#1E1E1E]"}`}>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                                <div className="text-center md:text-left">
                                    <p className={`text-sm mb-2 ${isLight ? "text-neutral-600" : "text-neutral-400"}`}>Overall Score</p>
                                    <div className={`text-6xl font-light ${isLight ? "text-neutral-900" : "text-white"}`}>
                                        {aggregatedReport.overallScore || 0}
                                    </div>
                                    <p className={`text-xs mt-1 ${isLight ? "text-neutral-600" : "text-neutral-500"}`}>out of 100</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isLight ? "bg-neutral-100" : "bg-[#252525]"}`}>
                                        <Users size={20} className={isLight ? "text-neutral-600" : "text-neutral-400"} />
                                    </div>
                                    <div>
                                        <p className={`text-2xl font-light ${isLight ? "text-neutral-900" : "text-white"}`}>{testRuns.length}</p>
                                        <p className={`text-xs ${isLight ? "text-neutral-600" : "text-neutral-500"}`}>Personas Tested</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isLight ? "bg-neutral-100" : "bg-[#252525]"}`}>
                                        <AlertCircle size={20} className={isLight ? "text-neutral-600" : "text-neutral-400"} />
                                    </div>
                                    <div>
                                        <p className={`text-2xl font-light ${isLight ? "text-neutral-900" : "text-white"}`}>{aggregatedReport.commonIssues?.length || 0}</p>
                                        <p className={`text-xs ${isLight ? "text-neutral-600" : "text-neutral-500"}`}>Common Issues</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isLight ? "bg-neutral-100" : "bg-[#252525]"}`}>
                                        <CheckCircle2 size={20} className={isLight ? "text-neutral-600" : "text-neutral-400"} />
                                    </div>
                                    <div>
                                        <p className={`text-2xl font-light ${isLight ? "text-neutral-900" : "text-white"}`}>{aggregatedReport.strengthsAcrossPersonas?.length || 0}</p>
                                        <p className={`text-xs ${isLight ? "text-neutral-600" : "text-neutral-500"}`}>Strengths Found</p>
                                    </div>
                                </div>
                            </div>
                            {aggregatedReport.executiveSummary && (
                                <div className={`mt-6 pt-6 border-t ${isLight ? "border-neutral-200" : "border-white/10"}`}>
                                    <p className={`text-sm font-light leading-relaxed ${isLight ? "text-neutral-700" : "text-neutral-300"}`}>
                                        {aggregatedReport.executiveSummary}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Strengths */}
                        {aggregatedReport.strengthsAcrossPersonas && aggregatedReport.strengthsAcrossPersonas.length > 0 && (
                            <div className={`p-6 border rounded-xl ${isLight ? "border-green-200 bg-green-50" : "border-green-500/20 bg-green-500/5"}`}>
                                <h3 className={`text-lg font-medium mb-4 flex items-center gap-2 ${isLight ? "text-green-700" : "text-green-400"}`}>
                                    <CheckCircle2 size={20} />
                                    Strengths Across All Personas
                                </h3>
                                <ul className="space-y-2">
                                    {aggregatedReport.strengthsAcrossPersonas.map((strength, i) => (
                                        <li key={i} className={`text-sm flex items-start gap-2 ${isLight ? "text-neutral-700" : "text-neutral-300"}`}>
                                            <span className={isLight ? "text-green-600" : "text-green-400"}>✓</span>
                                            {strength}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Common Issues */}
                        {aggregatedReport.commonIssues && aggregatedReport.commonIssues.length > 0 && (
                            <div className="space-y-4">
                                <h3 className={`text-lg font-medium flex items-center gap-2 ${isLight ? "text-neutral-900" : "text-white"}`}>
                                    <AlertCircle size={20} />
                                    Common Issues
                                </h3>
                                {aggregatedReport.commonIssues.map((issue, i) => (
                                    <div key={i} className={`p-6 border rounded-xl ${isLight ? "border-neutral-200 bg-white" : "border-white/10 bg-[#1E1E1E]"}`}>
                                        <div className="flex items-start gap-3">
                                            <span className={`text-xs font-medium px-2 py-1 rounded ${getSeverityColor(issue.severity)}`}>
                                                {issue.severity}
                                            </span>
                                            <div className="flex-1">
                                                <p className={`text-sm font-medium mb-2 ${isLight ? "text-neutral-900" : "text-neutral-200"}`}>{issue.issue}</p>
                                                <p className={`text-xs mb-3 ${isLight ? "text-neutral-600" : "text-neutral-400"}`}>→ {issue.recommendation}</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {issue.affectedPersonas.map((persona, j) => (
                                                        <span key={j} className={`text-xs px-2 py-0.5 rounded ${isLight ? "bg-neutral-100 text-neutral-700" : "bg-[#252525] text-neutral-400"}`}>
                                                            {persona}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Recommendations */}
                        {aggregatedReport.recommendations && aggregatedReport.recommendations.length > 0 && (
                            <div className={`p-6 border rounded-xl ${isLight ? "border-neutral-200 bg-white" : "border-white/10 bg-[#1E1E1E]"}`}>
                                <h3 className={`text-lg font-medium mb-4 flex items-center gap-2 ${isLight ? "text-neutral-900" : "text-white"}`}>
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
                                                <p className={`text-sm ${isLight ? "text-neutral-900" : "text-neutral-200"}`}>{rec.recommendation}</p>
                                                <p className={`text-xs mt-1 ${isLight ? "text-neutral-600" : "text-neutral-500"}`}>{rec.impact}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Footer */}
                <div className={`mt-12 pt-8 border-t ${isLight ? "border-neutral-200" : "border-white/10"} text-center`}>
                    <p className={`text-sm ${isLight ? "text-neutral-500" : "text-neutral-500"}`}>
                        Report generated by UX Testing Agent
                    </p>
                </div>
            </div>
        </div>
    );
}
