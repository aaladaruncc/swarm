"use client";

import { useState, useEffect, useMemo } from "react";
import {
    type UXAgentRun,
    type UXAgentInsight,
    generateUXAgentInsights,
    getUXAgentInsights,
} from "@/lib/batch-api";
import {
    Lightbulb,
    Loader2,
    Sparkles,
    Navigation,
    Accessibility,
    Gauge,
    FileText,
    ChevronDown,
    ChevronUp,
    TrendingUp,
    Target,
    AlertCircle,
} from "lucide-react";
import { useTheme } from "@/contexts/theme-context";
import { motion, AnimatePresence } from "framer-motion";
import { SeverityDistribution, CategoryBreakdown, InsightsSummaryCard } from "./insights/InsightCharts";

interface InsightsTabProps {
    run: UXAgentRun;
}

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

export function InsightsTab({ run }: InsightsTabProps) {
    const { theme } = useTheme();
    const isLight = theme === "light";
    const [insights, setInsights] = useState<UXAgentInsight[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["usability", "accessibility", "navigation"]));

    const severityColors = getSeverityColors(isLight);

    useEffect(() => {
        loadInsights();
    }, [run.id]);

    const loadInsights = async () => {
        try {
            setLoading(true);
            const result = await getUXAgentInsights(run.id);
            setInsights(result.insights || []);
            setError(null);
        } catch (err) {
            console.error("Failed to load insights:", err);
            setError("Failed to load insights");
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateInsights = async () => {
        try {
            setGenerating(true);
            setError(null);
            const result = await generateUXAgentInsights(run.id);
            setInsights(result.insights || []);
        } catch (err: unknown) {
            console.error("Failed to generate insights:", err);
            setError(err instanceof Error ? err.message : "Failed to generate insights");
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
            critical: insights.filter(i => i.severity === "critical").length,
            high: insights.filter(i => i.severity === "high").length,
            medium: insights.filter(i => i.severity === "medium").length,
            low: insights.filter(i => i.severity === "low").length,
        };

        const byCategory = insights.reduce((acc, insight) => {
            const cat = insight.category || "usability";
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(insight);
            return acc;
        }, {} as Record<string, UXAgentInsight[]>);

        return {
            total: insights.length,
            bySeverity,
            byCategory,
            criticalAndHigh: bySeverity.critical + bySeverity.high,
            categoryCount: Object.keys(byCategory).length,
        };
    }, [insights]);

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
            <div className={`border p-8 text-center rounded-xl ${
                isLight ? "border-neutral-200 bg-white" : "border-white/10 bg-[#1E1E1E]"
            }`}>
                <Loader2 className={`w-8 h-8 mx-auto mb-4 animate-spin ${isLight ? "text-neutral-400" : "text-neutral-500"}`} />
                <p className={`font-light text-sm ${isLight ? "text-neutral-600" : "text-neutral-400"}`}>
                    Loading insights...
                </p>
            </div>
        );
    }

    // No insights yet - show generate button
    if (insights.length === 0) {
        return (
            <div className={`border p-8 text-center rounded-xl ${
                isLight ? "border-neutral-200 bg-white" : "border-white/10 bg-[#1E1E1E]"
            }`}>
                <Sparkles className={`w-12 h-12 mx-auto mb-4 ${isLight ? "text-neutral-400" : "text-neutral-500"}`} />
                <h3 className={`text-lg font-medium mb-2 ${isLight ? "text-neutral-900" : "text-white"}`}>
                    Generate AI Insights
                </h3>
                <p className={`font-light text-sm mb-6 max-w-md mx-auto ${isLight ? "text-neutral-600" : "text-neutral-400"}`}>
                    Analyze the agent's thoughts and observations to identify actionable UX improvements.
                </p>
                {error && (
                    <div className={`text-sm p-3 rounded-lg mb-4 max-w-md mx-auto border ${
                        isLight ? "bg-red-50 border-red-200 text-red-700" : "bg-red-500/10 border-red-500/20 text-red-400"
                    }`}>
                        {error}
                    </div>
                )}
                <button
                    onClick={handleGenerateInsights}
                    disabled={generating}
                    className={`inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                        isLight
                            ? "bg-neutral-900 text-white hover:bg-neutral-800"
                            : "bg-white text-neutral-900 hover:bg-neutral-200"
                    } disabled:opacity-50`}
                >
                    {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    {generating ? "Generating..." : "Generate Insights"}
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Regenerate Button */}
            <div className="flex justify-end">
                <button
                    onClick={handleGenerateInsights}
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
                    icon={<Lightbulb size={20} className={isLight ? "text-amber-500" : "text-amber-400"} />}
                    value={stats.total}
                    label="Total Insights"
                />
                <InsightsSummaryCard
                    icon={<Target size={20} className={isLight ? "text-blue-500" : "text-blue-400"} />}
                    value={stats.categoryCount}
                    label="Categories"
                />
                <InsightsSummaryCard
                    icon={<AlertCircle size={20} className={isLight ? "text-red-500" : "text-red-400"} />}
                    value={stats.criticalAndHigh}
                    label="Critical + High"
                    highlight={stats.criticalAndHigh > 0}
                    highlightColor="red"
                />
                <InsightsSummaryCard
                    icon={<TrendingUp size={20} className={isLight ? "text-emerald-500" : "text-emerald-400"} />}
                    value={stats.bySeverity.low + stats.bySeverity.medium}
                    label="Medium + Low"
                    highlight={stats.bySeverity.low + stats.bySeverity.medium > 0}
                    highlightColor="green"
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Severity Distribution Chart */}
                <motion.div
                    className={`border p-6 rounded-xl ${
                        isLight ? "bg-white border-neutral-200" : "border-white/10 bg-[#1E1E1E]"
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
                        isLight ? "bg-white border-neutral-200" : "border-white/10 bg-[#1E1E1E]"
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

            {/* Insights by Category */}
            <div className="space-y-4">
                <h3 className={`text-lg font-medium ${isLight ? "text-neutral-900" : "text-white"}`}>
                    Detailed Insights
                </h3>

                {Object.entries(stats.byCategory)
                    .sort(([a], [b]) => {
                        // Sort by severity of most severe insight in category
                        const aInsights = stats.byCategory[a];
                        const bInsights = stats.byCategory[b];
                        const aMinSeverity = Math.min(...aInsights.map(i => severityOrder[i.severity] || 3));
                        const bMinSeverity = Math.min(...bInsights.map(i => severityOrder[i.severity] || 3));
                        return aMinSeverity - bMinSeverity;
                    })
                    .map(([category, categoryInsights]) => {
                        const criticalInCategory = categoryInsights.filter(i => i.severity === "critical" || i.severity === "high").length;

                        return (
                            <motion.div
                                key={category}
                                className={`border rounded-xl overflow-hidden ${
                                    isLight ? "bg-white border-neutral-200" : "border-white/10 bg-[#1E1E1E]"
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
                                            isLight ? "bg-neutral-100 text-neutral-600" : "bg-[#252525] text-neutral-400"
                                        }`}>
                                            {categoryIcons[category] || <Lightbulb size={16} />}
                                        </div>
                                        <span className={`font-medium ${isLight ? "text-neutral-900" : "text-white"}`}>
                                            {categoryLabels[category] || category}
                                        </span>
                                        <span className={`text-xs px-2 py-0.5 border rounded-lg ${
                                            isLight
                                                ? "bg-neutral-100 border-neutral-300 text-neutral-700"
                                                : "bg-[#252525] border-white/10 text-neutral-300"
                                        }`}>
                                            {categoryInsights.length} issue{categoryInsights.length !== 1 ? 's' : ''}
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
                                                isLight ? "border-neutral-200" : "border-white/10"
                                            }`}
                                        >
                                            <div className={`divide-y ${isLight ? "divide-neutral-100" : "divide-white/5"}`}>
                                                {categoryInsights
                                                    .sort((a, b) => (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3))
                                                    .map((insight, idx) => (
                                                        <motion.div
                                                            key={insight.id}
                                                            className={`p-4 border-l-4 ${
                                                                isLight ? "bg-white" : "bg-[#1E1E1E]"
                                                            } ${severityBorderColors[insight.severity]}`}
                                                            initial={{ opacity: 0, x: -10 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ duration: 0.2, delay: idx * 0.05 }}
                                                        >
                                                            <div className="flex items-start justify-between gap-4 mb-2">
                                                                <h4 className={`font-medium text-sm ${
                                                                    isLight ? "text-neutral-900" : "text-white"
                                                                }`}>
                                                                    {insight.title}
                                                                </h4>
                                                                <span className={`px-2 py-0.5 text-xs font-medium border rounded capitalize shrink-0 ${severityColors[insight.severity]}`}>
                                                                    {insight.severity}
                                                                </span>
                                                            </div>
                                                            <p className={`text-sm font-light mb-3 leading-relaxed ${
                                                                isLight ? "text-neutral-700" : "text-neutral-300"
                                                            }`}>
                                                                {insight.description}
                                                            </p>
                                                            {insight.recommendation && (
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
                                                                        {insight.recommendation}
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
