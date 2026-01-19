"use client";

import { useState, useEffect } from "react";
import { type UXAgentRun, type UXAgentInsight, getUXAgentInsights, generateUXAgentInsights } from "@/lib/batch-api";
import {
    Users,
    Lightbulb,
    AlertCircle,
    AlertTriangle,
    CheckCircle2,
    Loader2,
    ChevronDown,
    ChevronUp,
    Target,
    TrendingUp,
    BarChart3,
    Sparkles
} from "lucide-react";

interface AggregatedInsightsProps {
    uxagentRuns: UXAgentRun[];
}

interface CombinedInsight {
    insight: UXAgentInsight;
    agentName: string;
    runId: string;
}

const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
const severityColors: Record<string, string> = {
    critical: "text-red-400 bg-red-500/10 border-red-500/20",
    high: "text-orange-400 bg-orange-500/10 border-orange-500/20",
    medium: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
    low: "text-neutral-400 bg-neutral-500/10 border-neutral-500/20",
};
const severityBorderColors: Record<string, string> = {
    critical: "border-l-red-500",
    high: "border-l-orange-500",
    medium: "border-l-yellow-500",
    low: "border-l-neutral-400",
};

const categoryLabels: Record<string, string> = {
    usability: "Usability",
    accessibility: "Accessibility",
    performance: "Performance",
    content: "Content",
    navigation: "Navigation",
};

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

export function AggregatedInsights({ uxagentRuns }: AggregatedInsightsProps) {
    const [allInsights, setAllInsights] = useState<CombinedInsight[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["usability", "accessibility"]));

    useEffect(() => {
        loadAllInsights();
    }, [uxagentRuns]);

    const loadAllInsights = async () => {
        setLoading(true);
        setError(null);
        const combined: CombinedInsight[] = [];

        try {
            await Promise.all(uxagentRuns.map(async (run, idx) => {
                try {
                    const response = await getUXAgentInsights(run.id);
                    const agentName = getPersonaName(run, idx);
                    response.insights.forEach(insight => {
                        combined.push({ insight, agentName, runId: run.id });
                    });
                } catch (e) {
                    console.warn(`Failed to load insights for run ${run.id}:`, e);
                }
            }));

            // Sort by severity
            combined.sort((a, b) =>
                (severityOrder[a.insight.severity] || 3) - (severityOrder[b.insight.severity] || 3)
            );

            setAllInsights(combined);
        } catch (e) {
            setError("Failed to load insights");
        } finally {
            setLoading(false);
        }
    };

    const generateAllInsights = async () => {
        setGenerating(true);
        try {
            await Promise.all(uxagentRuns.map(async (run) => {
                try {
                    await generateUXAgentInsights(run.id);
                } catch (e) {
                    console.warn(`Failed to generate insights for run ${run.id}:`, e);
                }
            }));
            await loadAllInsights();
        } catch (e) {
            setError("Failed to generate insights");
        } finally {
            setGenerating(false);
        }
    };

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
    const avgScore = uxagentRuns.filter(r => r.score !== null).reduce((sum, r) => sum + (r.score || 0), 0) / (uxagentRuns.filter(r => r.score !== null).length || 1);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="animate-spin w-8 h-8 text-neutral-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="border border-white/10 p-4 bg-[#1E1E1E] rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-[#252525] border border-white/10 flex items-center justify-center rounded-lg">
                            <Users size={20} className="text-neutral-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-light text-white">{completedRuns}/{uxagentRuns.length}</p>
                            <p className="text-xs text-neutral-400 uppercase tracking-wide font-light">Agents Completed</p>
                        </div>
                    </div>
                </div>

                <div className="border border-white/10 p-4 bg-[#1E1E1E] rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-[#252525] border border-white/10 flex items-center justify-center rounded-lg">
                            <BarChart3 size={20} className="text-neutral-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-light text-white">{avgScore.toFixed(1)}<span className="text-sm text-neutral-400">/10</span></p>
                            <p className="text-xs text-neutral-400 uppercase tracking-wide font-light">Avg Score</p>
                        </div>
                    </div>
                </div>

                <div className="border border-white/10 p-4 bg-[#1E1E1E] rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-[#252525] border border-white/10 flex items-center justify-center rounded-lg">
                            <Lightbulb size={20} className="text-neutral-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-light text-white">{totalInsights}</p>
                            <p className="text-xs text-neutral-400 uppercase tracking-wide font-light">Total Insights</p>
                        </div>
                    </div>
                </div>

                <div className="border border-white/10 p-4 bg-[#1E1E1E] rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-red-500/10 border border-red-500/20 flex items-center justify-center rounded-lg">
                            <AlertCircle size={20} className="text-red-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-light text-red-400">{criticalCount + highCount}</p>
                            <p className="text-xs text-neutral-400 uppercase tracking-wide font-light">Critical Issues</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Generate Insights Button */}
            {totalInsights === 0 && (
                <div className="border border-white/10 bg-[#1E1E1E] p-6 text-center rounded-xl">
                    <Sparkles className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2 text-white">No Insights Generated Yet</h3>
                    <p className="text-neutral-400 font-light text-sm mb-4">
                        Generate AI-powered insights from all agent sessions
                    </p>
                    <button
                        onClick={generateAllInsights}
                        disabled={generating}
                        className="inline-flex items-center gap-2 bg-[#252525] text-white border border-white/10 px-5 py-2.5 hover:bg-[#333] transition-colors text-sm font-medium disabled:opacity-50 rounded-lg"
                    >
                        {generating ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles size={16} />
                                Generate Insights for All Agents
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Insights by Category */}
            {Object.entries(insightsByCategory).length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-white">Insights Across All Agents</h3>
                        <button
                            onClick={generateAllInsights}
                            disabled={generating}
                            className="text-xs text-neutral-400 hover:text-white transition-colors flex items-center gap-1"
                        >
                            {generating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                            Regenerate
                        </button>
                    </div>

                    {Object.entries(insightsByCategory)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([category, insights]) => (
                            <div key={category} className="border border-white/10 bg-[#1E1E1E] rounded-xl overflow-hidden">
                                <button
                                    onClick={() => toggleCategory(category)}
                                    className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="font-medium capitalize text-white">{categoryLabels[category] || category}</span>
                                        <span className="text-xs px-2 py-0.5 bg-[#252525] border border-white/10 text-neutral-300 rounded-lg">
                                            {insights.length} issue{insights.length !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                    {expandedCategories.has(category) ? (
                                        <ChevronUp size={16} className="text-neutral-400" />
                                    ) : (
                                        <ChevronDown size={16} className="text-neutral-400" />
                                    )}
                                </button>

                                {expandedCategories.has(category) && (
                                    <div className="border-t border-white/10 divide-y divide-white/5">
                                        {insights.map((item, idx) => (
                                            <div
                                                key={`${item.runId}-${idx}`}
                                                className={`p-4 border-l-4 bg-[#1E1E1E] ${severityBorderColors[item.insight.severity]}`}
                                            >
                                                <div className="flex items-start justify-between gap-4 mb-2">
                                                    <h4 className="font-medium text-sm text-white">{item.insight.title}</h4>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <span className={`px-2 py-0.5 text-xs font-medium border rounded ${severityColors[item.insight.severity]}`}>
                                                            {item.insight.severity}
                                                        </span>
                                                        <span className="text-xs px-2 py-0.5 bg-[#252525] border border-white/10 text-neutral-300 rounded-lg">
                                                            {item.agentName}
                                                        </span>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-neutral-300 font-light mb-2">
                                                    {item.insight.description}
                                                </p>
                                                {item.insight.recommendation && (
                                                    <div className="bg-[#252525] border border-white/10 p-3 mt-2 rounded-lg">
                                                        <p className="text-xs text-neutral-400 uppercase tracking-wide mb-1 font-light">Recommendation</p>
                                                        <p className="text-sm text-neutral-300 font-light">{item.insight.recommendation}</p>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                </div>
            )}

            {error && (
                <div className="border border-red-500/20 bg-red-500/10 p-4 text-red-400 text-sm rounded-lg">
                    {error}
                </div>
            )}
        </div>
    );
}
