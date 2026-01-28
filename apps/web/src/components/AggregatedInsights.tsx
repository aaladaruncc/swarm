"use client";

import { useState, useEffect, useMemo } from "react";
import { type UXAgentRun, type UXAgentInsight, getUXAgentInsights, generateUXAgentInsights } from "@/lib/batch-api";
import {
    Users,
    Lightbulb,
    AlertCircle,
    Loader2,
    ChevronDown,
    ChevronUp,
    BarChart3,
    Sparkles,
    TrendingUp,
    Target,
    Navigation,
    Accessibility,
    FileText,
    Gauge,
} from "lucide-react";
import { useTheme } from "@/contexts/theme-context";
import { motion, AnimatePresence } from "framer-motion";
import { SeverityDistribution, CategoryBreakdown, ScoreGauge, InsightsSummaryCard } from "./insights/InsightCharts";

interface AggregatedInsightsProps {
    uxagentRuns: UXAgentRun[];
}

interface CombinedInsight {
    insight: UXAgentInsight;
    agentName: string;
    runId: string;
}

const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
const getSeverityColors = (isLight: boolean): Record<string, string> => ({
    critical: isLight ? "text-red-700 bg-red-50 border-red-200" : "text-red-400 bg-red-500/10 border-red-500/20",
    high: isLight ? "text-orange-700 bg-orange-50 border-orange-200" : "text-orange-400 bg-orange-500/10 border-orange-500/20",
    medium: isLight ? "text-yellow-700 bg-yellow-50 border-yellow-200" : "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
    low: isLight ? "text-neutral-600 bg-neutral-50 border-neutral-200" : "text-neutral-400 bg-neutral-500/10 border-neutral-500/20",
});
const severityBorderColors: Record<string, string> = {
    critical: "border-l-red-500",
    high: "border-l-orange-500",
    medium: "border-l-yellow-500",
    low: "border-l-neutral-400",
};

const categoryIcons: Record<string, React.ReactNode> = {
    usability: <Target size={16} />,
    accessibility: <Accessibility size={16} />,
    performance: <Gauge size={16} />,
    content: <FileText size={16} />,
    navigation: <Navigation size={16} />,
};

const categoryLabels: Record<string, string> = {
    usability: "Usability",
    accessibility: "Accessibility",
    performance: "Performance",
    content: "Content",
    navigation: "Navigation",
};

function getPersonaName(run: UXAgentRun, index: number): string {
    const personaData = run.personaData as Record<string, unknown>;
    if (personaData?.name) return personaData.name as string;
    const basicInfo = run.basicInfo as Record<string, unknown>;
    if (basicInfo?.persona) {
        const match = (basicInfo.persona as string).match(/(?:name[:\s]+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
        if (match) return match[1];
    }
    return `Agent ${index + 1}`;
}

export function AggregatedInsights({ uxagentRuns }: AggregatedInsightsProps) {
    const { theme } = useTheme();
    const isLight = theme === "light";
    const [allInsights, setAllInsights] = useState<CombinedInsight[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["usability", "accessibility"]));

    const severityColors = getSeverityColors(isLight);

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

    // Computed statistics
    const stats = useMemo(() => {
        const bySeverity = {
            critical: allInsights.filter(i => i.insight.severity === "critical").length,
            high: allInsights.filter(i => i.insight.severity === "high").length,
            medium: allInsights.filter(i => i.insight.severity === "medium").length,
            low: allInsights.filter(i => i.insight.severity === "low").length,
        };

        const byCategory = allInsights.reduce((acc, item) => {
            const cat = item.insight.category || "other";
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(item);
            return acc;
        }, {} as Record<string, CombinedInsight[]>);

        const completedRuns = uxagentRuns.filter(r => r.status === "completed").length;
        const runsWithScore = uxagentRuns.filter(r => r.score !== null);
        const avgScore = runsWithScore.length > 0
            ? runsWithScore.reduce((sum, r) => sum + (r.score || 0), 0) / runsWithScore.length
            : 0;

        return {
            total: allInsights.length,
            bySeverity,
            byCategory,
            completedRuns,
            avgScore,
            criticalAndHigh: bySeverity.critical + bySeverity.high,
        };
    }, [allInsights, uxagentRuns]);

    // Category data for chart
    const categoryChartData = useMemo(() => {
        return Object.entries(stats.byCategory)
            .map(([name, items]) => ({
                name: categoryLabels[name] || name,
                count: items.length,
            }))
            .sort((a, b) => b.count - a.count);
    }, [stats.byCategory]);

    if (loading) {
        return (
            <div className="relative w-full min-h-[400px] flex items-center justify-center overflow-hidden rounded-2xl"
                style={{
                    background: isLight
                        ? "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)"
                        : "linear-gradient(135deg, #451a03 0%, #292524 100%)"
                }}
            >
                <div className="absolute inset-0 pointer-events-none">
                    <div
                        className="absolute top-1/3 left-1/3 w-64 h-64 rounded-full blur-3xl"
                        style={{
                            background: "radial-gradient(circle, #f59e0b 0%, #ef4444 100%)",
                            opacity: 0.2,
                            animation: "pulse 3s ease-in-out infinite"
                        }}
                    />
                </div>
                <div className="relative z-10 text-center">
                    <Loader2 size={48} className="mx-auto mb-4 animate-spin"
                        style={{
                            color: isLight ? "#f59e0b" : "#fbbf24",
                            filter: "drop-shadow(0 0 20px rgba(251, 191, 36, 0.4))"
                        }}
                    />
                    <p className={`text-lg font-semibold ${isLight ? "text-amber-900" : "text-amber-200"}`}
                        style={{
                            fontFamily: "'Syne', -apple-system, BlinkMacSystemFont, sans-serif",
                            letterSpacing: "0.05em"
                        }}
                    >
                        Loading insights...
                    </p>
                </div>
                <style jsx>{`
                    @keyframes pulse {
                        0%, 100% { transform: scale(1); opacity: 0.2; }
                        50% { transform: scale(1.1); opacity: 0.3; }
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Generate Insights Button (when no insights) */}
            {stats.total === 0 && (
                <div className={`border p-8 text-center rounded-xl ${
                    isLight
                        ? "bg-white border-neutral-200"
                        : "border-white/10 bg-[#1E1E1E]"
                }`}>
                    <Sparkles className={`w-12 h-12 mx-auto mb-4 ${
                        isLight ? "text-neutral-400" : "text-neutral-500"
                    }`} />
                    <h3 className={`text-lg font-medium mb-2 ${
                        isLight ? "text-neutral-900" : "text-white"
                    }`}>No Insights Generated Yet</h3>
                    <p className={`font-light text-sm mb-6 max-w-md mx-auto ${
                        isLight ? "text-neutral-600" : "text-neutral-400"
                    }`}>
                        Generate AI-powered insights from all agent sessions to discover patterns and actionable recommendations.
                    </p>
                    <button
                        onClick={generateAllInsights}
                        disabled={generating}
                        className={`inline-flex items-center gap-2 border px-6 py-3 transition-colors text-sm font-medium disabled:opacity-50 rounded-lg ${
                            isLight
                                ? "bg-neutral-900 text-white border-neutral-900 hover:bg-neutral-800"
                                : "bg-white text-neutral-900 border-white hover:bg-neutral-100"
                        }`}
                    >
                        {generating ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Generating Insights...
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

            {/* Main Content (when insights exist) */}
            {stats.total > 0 && (
                <>
                    {/* Regenerate Button */}
                    <div className="flex justify-end">
                        <button
                            onClick={generateAllInsights}
                            disabled={generating}
                            className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                                isLight
                                    ? "border border-neutral-200 text-neutral-700 hover:border-neutral-400"
                                    : "border border-white/10 text-neutral-300 hover:border-white/30"
                            } disabled:opacity-50`}
                        >
                            {generating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                            {generating ? "Regenerating..." : "Regenerate Insights"}
                        </button>
                    </div>

                    {/* Summary Stats Row */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <InsightsSummaryCard
                            icon={<Users size={20} className={isLight ? "text-neutral-500" : "text-neutral-400"} />}
                            value={`${stats.completedRuns}/${uxagentRuns.length}`}
                            label="Agents Completed"
                        />
                        <InsightsSummaryCard
                            icon={<BarChart3 size={20} className={isLight ? "text-blue-500" : "text-blue-400"} />}
                            value={stats.avgScore > 0 ? `${stats.avgScore.toFixed(1)}/10` : "N/A"}
                            label="Avg Score"
                            highlight={stats.avgScore > 0 && stats.avgScore < 5}
                            highlightColor="amber"
                        />
                        <InsightsSummaryCard
                            icon={<Lightbulb size={20} className={isLight ? "text-amber-500" : "text-amber-400"} />}
                            value={stats.total}
                            label="Total Insights"
                        />
                        <InsightsSummaryCard
                            icon={<AlertCircle size={20} className={isLight ? "text-red-500" : "text-red-400"} />}
                            value={stats.criticalAndHigh}
                            label="Critical + High"
                            highlight={stats.criticalAndHigh > 0}
                            highlightColor="red"
                        />
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Severity Distribution Chart */}
                        <motion.div
                            className={`border p-6 rounded-xl ${
                                isLight
                                    ? "bg-white border-neutral-200"
                                    : "border-white/10 bg-[#1E1E1E]"
                            }`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                        >
                            <h3 className={`text-sm font-medium mb-4 uppercase tracking-wide ${
                                isLight ? "text-neutral-500" : "text-neutral-400"
                            }`}>
                                Issues by Severity
                            </h3>
                            <SeverityDistribution
                                critical={stats.bySeverity.critical}
                                high={stats.bySeverity.high}
                                medium={stats.bySeverity.medium}
                                low={stats.bySeverity.low}
                            />
                        </motion.div>

                        {/* Category Breakdown Chart */}
                        <motion.div
                            className={`border p-6 rounded-xl ${
                                isLight
                                    ? "bg-white border-neutral-200"
                                    : "border-white/10 bg-[#1E1E1E]"
                            }`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.1 }}
                        >
                            <h3 className={`text-sm font-medium mb-4 uppercase tracking-wide ${
                                isLight ? "text-neutral-500" : "text-neutral-400"
                            }`}>
                                Issues by Category
                            </h3>
                            {categoryChartData.length > 0 ? (
                                <CategoryBreakdown categories={categoryChartData} />
                            ) : (
                                <p className={`text-sm ${isLight ? "text-neutral-500" : "text-neutral-400"}`}>
                                    No category data available
                                </p>
                            )}
                        </motion.div>
                    </div>

                    {/* Score Gauge (if scores exist) */}
                    {stats.avgScore > 0 && (
                        <motion.div
                            className={`border p-6 rounded-xl ${
                                isLight
                                    ? "bg-white border-neutral-200"
                                    : "border-white/10 bg-[#1E1E1E]"
                            }`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.2 }}
                        >
                            <h3 className={`text-sm font-medium mb-4 uppercase tracking-wide ${
                                isLight ? "text-neutral-500" : "text-neutral-400"
                            }`}>
                                Overall UX Score
                            </h3>
                            <div className="flex flex-col sm:flex-row items-center gap-6">
                                <ScoreGauge score={stats.avgScore} maxScore={10} size={140} label="Average" />
                                <div className="flex-1 space-y-3">
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {uxagentRuns.filter(r => r.score !== null).map((run, idx) => (
                                            <div
                                                key={run.id}
                                                className={`border p-3 rounded-lg text-center ${
                                                    isLight
                                                        ? "bg-neutral-50 border-neutral-200"
                                                        : "bg-[#252525] border-white/10"
                                                }`}
                                            >
                                                <p className={`text-lg font-medium ${
                                                    (run.score || 0) >= 7
                                                        ? "text-emerald-500"
                                                        : (run.score || 0) >= 5
                                                            ? "text-amber-500"
                                                            : "text-red-500"
                                                }`}>
                                                    {(run.score || 0).toFixed(1)}
                                                </p>
                                                <p className={`text-xs truncate ${
                                                    isLight ? "text-neutral-500" : "text-neutral-400"
                                                }`}>
                                                    {getPersonaName(run, idx)}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Insights by Category */}
                    <div className="space-y-4">
                        <h3 className={`text-lg font-medium ${
                            isLight ? "text-neutral-900" : "text-white"
                        }`}>
                            Detailed Insights
                        </h3>

                        {Object.entries(stats.byCategory)
                            .sort(([a], [b]) => {
                                // Sort by severity of most severe insight in category
                                const aInsights = stats.byCategory[a];
                                const bInsights = stats.byCategory[b];
                                const aMinSeverity = Math.min(...aInsights.map(i => severityOrder[i.insight.severity] || 3));
                                const bMinSeverity = Math.min(...bInsights.map(i => severityOrder[i.insight.severity] || 3));
                                return aMinSeverity - bMinSeverity;
                            })
                            .map(([category, insights]) => {
                                const criticalInCategory = insights.filter(i => i.insight.severity === "critical" || i.insight.severity === "high").length;

                                return (
                                    <motion.div
                                        key={category}
                                        className={`border rounded-xl overflow-hidden ${
                                            isLight
                                                ? "bg-white border-neutral-200"
                                                : "border-white/10 bg-[#1E1E1E]"
                                        }`}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <button
                                            onClick={() => toggleCategory(category)}
                                            className={`w-full flex items-center justify-between p-4 transition-colors ${
                                                isLight ? "hover:bg-neutral-50" : "hover:bg-white/5"
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 flex items-center justify-center rounded-lg ${
                                                    isLight
                                                        ? "bg-neutral-100 text-neutral-600"
                                                        : "bg-[#252525] text-neutral-400"
                                                }`}>
                                                    {categoryIcons[category] || <Lightbulb size={16} />}
                                                </div>
                                                <span className={`font-medium ${
                                                    isLight ? "text-neutral-900" : "text-white"
                                                }`}>
                                                    {categoryLabels[category] || category}
                                                </span>
                                                <span className={`text-xs px-2 py-0.5 border rounded-lg ${
                                                    isLight
                                                        ? "bg-neutral-100 border-neutral-300 text-neutral-700"
                                                        : "bg-[#252525] border-white/10 text-neutral-300"
                                                }`}>
                                                    {insights.length} issue{insights.length !== 1 ? 's' : ''}
                                                </span>
                                                {criticalInCategory > 0 && (
                                                    <span className={`text-xs px-2 py-0.5 border rounded-lg ${
                                                        isLight
                                                            ? "bg-red-50 border-red-200 text-red-700"
                                                            : "bg-red-500/10 border-red-500/20 text-red-400"
                                                    }`}>
                                                        {criticalInCategory} critical/high
                                                    </span>
                                                )}
                                            </div>
                                            {expandedCategories.has(category) ? (
                                                <ChevronUp size={16} className={isLight ? "text-neutral-500" : "text-neutral-400"} />
                                            ) : (
                                                <ChevronDown size={16} className={isLight ? "text-neutral-500" : "text-neutral-400"} />
                                            )}
                                        </button>

                                        <AnimatePresence>
                                            {expandedCategories.has(category) && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                    className={`border-t overflow-hidden ${
                                                        isLight
                                                            ? "border-neutral-200"
                                                            : "border-white/10"
                                                    }`}
                                                >
                                                    <div className={`divide-y ${
                                                        isLight
                                                            ? "divide-neutral-100"
                                                            : "divide-white/5"
                                                    }`}>
                                                        {insights
                                                            .sort((a, b) => (severityOrder[a.insight.severity] || 3) - (severityOrder[b.insight.severity] || 3))
                                                            .map((item, idx) => (
                                                                <motion.div
                                                                    key={`${item.runId}-${idx}`}
                                                                    className={`p-4 border-l-4 ${
                                                                        isLight
                                                                            ? "bg-white"
                                                                            : "bg-[#1E1E1E]"
                                                                    } ${severityBorderColors[item.insight.severity]}`}
                                                                    initial={{ opacity: 0, x: -10 }}
                                                                    animate={{ opacity: 1, x: 0 }}
                                                                    transition={{ duration: 0.2, delay: idx * 0.05 }}
                                                                >
                                                                    <div className="flex items-start justify-between gap-4 mb-2">
                                                                        <h4 className={`font-medium text-sm ${
                                                                            isLight ? "text-neutral-900" : "text-white"
                                                                        }`}>
                                                                            {item.insight.title}
                                                                        </h4>
                                                                        <div className="flex items-center gap-2 shrink-0">
                                                                            <span className={`px-2 py-0.5 text-xs font-medium border rounded capitalize ${severityColors[item.insight.severity]}`}>
                                                                                {item.insight.severity}
                                                                            </span>
                                                                            <span className={`text-xs px-2 py-0.5 border rounded-lg ${
                                                                                isLight
                                                                                    ? "bg-neutral-100 border-neutral-300 text-neutral-700"
                                                                                    : "bg-[#252525] border-white/10 text-neutral-300"
                                                                            }`}>
                                                                                {item.agentName}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <p className={`text-sm font-light mb-3 leading-relaxed ${
                                                                        isLight ? "text-neutral-700" : "text-neutral-300"
                                                                    }`}>
                                                                        {item.insight.description}
                                                                    </p>
                                                                    {item.insight.recommendation && (
                                                                        <div className={`border p-3 rounded-lg ${
                                                                            isLight
                                                                                ? "bg-emerald-50/50 border-emerald-200"
                                                                                : "bg-emerald-500/5 border-emerald-500/20"
                                                                        }`}>
                                                                            <p className={`text-xs uppercase tracking-wide mb-1 font-medium flex items-center gap-1.5 ${
                                                                                isLight ? "text-emerald-700" : "text-emerald-400"
                                                                            }`}>
                                                                                <TrendingUp size={12} />
                                                                                Recommendation
                                                                            </p>
                                                                            <p className={`text-sm font-light ${
                                                                                isLight ? "text-neutral-700" : "text-neutral-300"
                                                                            }`}>
                                                                                {item.insight.recommendation}
                                                                            </p>
                                                                        </div>
                                                                    )}
                                                                </motion.div>
                                                            ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                );
                            })}
                    </div>
                </>
            )}

            {error && (
                <div className={`border p-4 text-sm rounded-lg ${
                    isLight
                        ? "border-red-200 bg-red-50 text-red-600"
                        : "border-red-500/20 bg-red-500/10 text-red-400"
                }`}>
                    {error}
                </div>
            )}
        </div>
    );
}
