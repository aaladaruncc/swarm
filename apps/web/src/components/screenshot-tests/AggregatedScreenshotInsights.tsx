"use client";

import { useState, useEffect, useMemo } from "react";
import {
    Users,
    AlertCircle,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Eye,
    Accessibility,
    Loader2,
    Sparkles,
    Zap,
    TrendingUp,
    Image,
    ThumbsUp,
} from "lucide-react";
import { useTheme } from "@/contexts/theme-context";
import type { ScreenshotTestResult, ScreenshotAggregatedInsight } from "@/lib/screenshot-api";
import { getScreenshotInsights, generateScreenshotInsights } from "@/lib/screenshot-api";
import { cleanMarkdown } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { SeverityDistribution, InsightsSummaryCard, HorizontalBarChart } from "../insights/InsightCharts";

interface AggregatedScreenshotInsightsProps {
    result: ScreenshotTestResult;
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

const severityLabels: Record<string, string> = {
    critical: "Critical Issues",
    high: "High Priority",
    medium: "Medium Priority",
    low: "Low Priority",
};

export function AggregatedScreenshotInsights({ result }: AggregatedScreenshotInsightsProps) {
    const { theme } = useTheme();
    const isLight = theme === "light";
    const [expandedSeverities, setExpandedSeverities] = useState<Set<string>>(new Set(["critical", "high"]));
    const [insights, setInsights] = useState<ScreenshotAggregatedInsight[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const severityColors = getSeverityColors(isLight);
    const testId = result.testRun.id;

    // Fetch insights on load
    useEffect(() => {
        const fetchInsights = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await getScreenshotInsights(testId);
                setInsights(data.insights);
            } catch (err) {
                console.error("Failed to fetch insights:", err);
                setError(err instanceof Error ? err.message : "Failed to fetch insights");
            } finally {
                setLoading(false);
            }
        };

        if (testId) {
            fetchInsights();
        }
    }, [testId]);

    // Generate insights
    const handleGenerateInsights = async () => {
        try {
            setGenerating(true);
            setError(null);
            const data = await generateScreenshotInsights(testId);
            setInsights(data.insights);
        } catch (err) {
            console.error("Failed to generate insights:", err);
            setError(err instanceof Error ? err.message : "Failed to generate insights");
        } finally {
            setGenerating(false);
        }
    };

    // Computed statistics and grouped data
    const stats = useMemo(() => {
        const issues: ScreenshotAggregatedInsight[] = [];
        const positives: ScreenshotAggregatedInsight[] = [];
        const accessibility: ScreenshotAggregatedInsight[] = [];
        const observations: ScreenshotAggregatedInsight[] = [];

        insights.forEach((insight) => {
            switch (insight.category) {
                case "issues":
                    issues.push(insight);
                    break;
                case "positives":
                    positives.push(insight);
                    break;
                case "accessibility":
                    accessibility.push(insight);
                    break;
                case "observations":
                    observations.push(insight);
                    break;
            }
        });

        // Sort issues by severity
        issues.sort((a, b) =>
            (severityOrder[a.severity as keyof typeof severityOrder] ?? 3) -
            (severityOrder[b.severity as keyof typeof severityOrder] ?? 3)
        );

        // Group issues by severity
        const bySeverity = issues.reduce((acc, issue) => {
            const severity = issue.severity || "low";
            if (!acc[severity]) acc[severity] = [];
            acc[severity].push(issue);
            return acc;
        }, {} as Record<string, ScreenshotAggregatedInsight[]>);

        const severityCounts = {
            critical: bySeverity.critical?.length ?? 0,
            high: bySeverity.high?.length ?? 0,
            medium: bySeverity.medium?.length ?? 0,
            low: bySeverity.low?.length ?? 0,
        };

        return {
            issues,
            positives,
            accessibility,
            observations,
            issuesBySeverity: bySeverity,
            severityCounts,
            totalIssues: issues.length,
            criticalAndHigh: severityCounts.critical + severityCounts.high,
        };
    }, [insights]);

    // Stats
    const personaCount = result.personaResults?.length ?? 0;
    const screenshotCount = result.screenshots?.length ?? 0;

    const toggleSeverity = (severity: string) => {
        const newSet = new Set(expandedSeverities);
        if (newSet.has(severity)) {
            newSet.delete(severity);
        } else {
            newSet.add(severity);
        }
        setExpandedSeverities(newSet);
    };

    // Data for category distribution chart
    const categoryChartData = useMemo(() => [
        { label: "Issues", value: stats.totalIssues, color: "#ef4444" },
        { label: "Positives", value: stats.positives.length, color: "#10b981" },
        { label: "Accessibility", value: stats.accessibility.length, color: "#8b5cf6" },
        { label: "Observations", value: stats.observations.length, color: "#3b82f6" },
    ].filter(d => d.value > 0), [stats]);

    if (loading) {
        return (
            <div className={`border p-8 text-center rounded-xl ${isLight
                ? "border-neutral-200 bg-white"
                : "border-white/10 bg-[#1E1E1E]"
                }`}>
                <Loader2 className={`w-8 h-8 mx-auto mb-4 animate-spin ${isLight ? "text-neutral-400" : "text-neutral-500"}`} />
                <p className={`font-light text-sm ${isLight ? "text-neutral-600" : "text-neutral-400"}`}>
                    Loading insights...
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`border p-8 text-center rounded-xl ${isLight
                ? "border-red-200 bg-red-50"
                : "border-red-500/20 bg-red-500/10"
                }`}>
                <AlertCircle className={`w-12 h-12 mx-auto mb-4 ${isLight ? "text-red-500" : "text-red-400"}`} />
                <h3 className={`text-lg font-medium mb-2 ${isLight ? "text-red-900" : "text-red-300"}`}>
                    Error Loading Insights
                </h3>
                <p className={`font-light text-sm mb-4 ${isLight ? "text-red-700" : "text-red-400"}`}>
                    {error}
                </p>
                <button
                    onClick={handleGenerateInsights}
                    disabled={generating}
                    className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${isLight
                        ? "bg-neutral-900 text-white hover:bg-neutral-800"
                        : "bg-white text-neutral-900 hover:bg-neutral-200"
                        } disabled:opacity-50`}
                >
                    {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    {generating ? "Generating..." : "Retry"}
                </button>
            </div>
        );
    }

    // No insights yet - show generate button
    if (insights.length === 0) {
        return (
            <div className={`border p-8 text-center rounded-xl ${isLight
                ? "border-neutral-200 bg-white"
                : "border-white/10 bg-[#1E1E1E]"
                }`}>
                <Sparkles className={`w-12 h-12 mx-auto mb-4 ${isLight ? "text-neutral-400" : "text-neutral-500"}`} />
                <h3 className={`text-lg font-medium mb-2 ${isLight ? "text-neutral-900" : "text-white"}`}>
                    Generate Aggregated Insights
                </h3>
                <p className={`font-light text-sm mb-6 max-w-md mx-auto ${isLight ? "text-neutral-600" : "text-neutral-400"}`}>
                    Analyze persona results to generate aggregated insights across all screenshots.
                </p>
                <button
                    onClick={handleGenerateInsights}
                    disabled={generating}
                    className={`inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-lg transition-colors ${isLight
                        ? "bg-neutral-900 text-white hover:bg-neutral-800"
                        : "bg-white text-neutral-900 hover:bg-neutral-200"
                        } disabled:opacity-50`}
                >
                    {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    {generating ? "Generating Insights..." : "Generate Insights"}
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
                    className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${isLight
                        ? "border border-neutral-200 text-neutral-700 hover:border-neutral-400"
                        : "border border-white/10 text-neutral-300 hover:border-white/30"
                        } disabled:opacity-50`}
                >
                    {generating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    {generating ? "Regenerating..." : "Regenerate Insights"}
                </button>
            </div>

            {/* Summary Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <InsightsSummaryCard
                    icon={<Users size={20} className={isLight ? "text-neutral-500" : "text-neutral-400"} />}
                    value={personaCount}
                    label="Personas"
                />
                <InsightsSummaryCard
                    icon={<Image size={20} className={isLight ? "text-blue-500" : "text-blue-400"} />}
                    value={screenshotCount}
                    label="Screenshots"
                />
                <InsightsSummaryCard
                    icon={<Eye size={20} className={isLight ? "text-amber-500" : "text-amber-400"} />}
                    value={stats.totalIssues}
                    label="Total Issues"
                />
                <InsightsSummaryCard
                    icon={<AlertCircle size={20} className={isLight ? "text-red-500" : "text-red-400"} />}
                    value={stats.criticalAndHigh}
                    label="Critical + High"
                    highlight={stats.criticalAndHigh > 0}
                    highlightColor="red"
                />
                {(result.testRun.totalTokens ?? 0) > 0 && (
                    <InsightsSummaryCard
                        icon={<Zap size={20} className={isLight ? "text-amber-500" : "text-amber-400"} />}
                        value={result.testRun.totalTokens?.toLocaleString() ?? 0}
                        label="Tokens"
                    />
                )}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Severity Distribution Chart */}
                {stats.totalIssues > 0 && (
                    <motion.div
                        className={`border p-6 rounded-xl ${isLight
                            ? "bg-white border-neutral-200"
                            : "border-white/10 bg-[#1E1E1E]"
                            }`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        <h3 className={`text-sm font-medium mb-4 uppercase tracking-wide ${isLight ? "text-neutral-500" : "text-neutral-400"
                            }`}>
                            Issues by Severity
                        </h3>
                        <SeverityDistribution
                            critical={stats.severityCounts.critical}
                            high={stats.severityCounts.high}
                            medium={stats.severityCounts.medium}
                            low={stats.severityCounts.low}
                        />
                    </motion.div>
                )}

                {/* Category Distribution Chart */}
                {categoryChartData.length > 0 && (
                    <motion.div
                        className={`border p-6 rounded-xl ${isLight
                            ? "bg-white border-neutral-200"
                            : "border-white/10 bg-[#1E1E1E]"
                            }`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                    >
                        <h3 className={`text-sm font-medium mb-4 uppercase tracking-wide ${isLight ? "text-neutral-500" : "text-neutral-400"
                            }`}>
                            Findings by Type
                        </h3>
                        <HorizontalBarChart data={categoryChartData} />
                    </motion.div>
                )}
            </div>

            {/* Issues by Severity */}
            {stats.totalIssues > 0 && (
                <div className="space-y-4">
                    <h3 className={`text-lg font-medium ${isLight ? "text-neutral-900" : "text-white"}`}>
                        Issues by Priority
                    </h3>

                    {(["critical", "high", "medium", "low"] as const).map((severity) => {
                        const issues = stats.issuesBySeverity[severity] ?? [];
                        if (issues.length === 0) return null;

                        return (
                            <motion.div
                                key={severity}
                                className={`border rounded-xl overflow-hidden ${isLight
                                    ? "bg-white border-neutral-200"
                                    : "border-white/10 bg-[#1E1E1E]"
                                    }`}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <button
                                    onClick={() => toggleSeverity(severity)}
                                    className={`w-full flex items-center justify-between p-4 transition-colors ${isLight ? "hover:bg-neutral-50" : "hover:bg-white/5"
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={`px-2 py-0.5 text-xs font-medium border rounded ${severityColors[severity]}`}>
                                            {severity.toUpperCase()}
                                        </span>
                                        <span className={`font-medium ${isLight ? "text-neutral-900" : "text-white"}`}>
                                            {severityLabels[severity]}
                                        </span>
                                        <span className={`text-xs px-2 py-0.5 border rounded-lg ${isLight
                                            ? "bg-neutral-100 border-neutral-300 text-neutral-700"
                                            : "bg-[#252525] border-white/10 text-neutral-300"
                                            }`}>
                                            {issues.length} issue{issues.length !== 1 ? "s" : ""}
                                        </span>
                                    </div>
                                    {expandedSeverities.has(severity) ? (
                                        <ChevronUp size={16} className={isLight ? "text-neutral-500" : "text-neutral-400"} />
                                    ) : (
                                        <ChevronDown size={16} className={isLight ? "text-neutral-500" : "text-neutral-400"} />
                                    )}
                                </button>

                                <AnimatePresence>
                                    {expandedSeverities.has(severity) && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className={`border-t overflow-hidden ${isLight
                                                ? "border-neutral-200"
                                                : "border-white/10"
                                                }`}
                                        >
                                            <div className={`divide-y ${isLight
                                                ? "divide-neutral-100"
                                                : "divide-white/5"
                                                }`}>
                                                {issues.map((issue, idx) => (
                                                    <motion.div
                                                        key={issue.id}
                                                        className={`p-4 border-l-4 ${isLight ? "bg-white" : "bg-[#1E1E1E]"} ${severityBorderColors[issue.severity || "low"]}`}
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ duration: 0.2, delay: idx * 0.05 }}
                                                    >
                                                        <div className="flex items-start justify-between gap-4 mb-2">
                                                            <div className="flex-1">
                                                                <p className={`text-sm font-medium leading-relaxed ${isLight ? "text-neutral-900" : "text-white"}`}>
                                                                    {cleanMarkdown(issue.description)}
                                                                </p>
                                                                {issue.evidence && issue.evidence.length > 1 && (
                                                                    <p className={`text-xs mt-1.5 font-light ${isLight ? "text-neutral-500" : "text-neutral-400"}`}>
                                                                        Found by {issue.evidence.length} {issue.evidence.length === 1 ? 'persona' : 'personas'}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col items-end gap-2 shrink-0">
                                                                {issue.evidence && issue.evidence.length > 1 ? (
                                                                    <div className="flex flex-wrap gap-1 justify-end max-w-[200px]">
                                                                        {issue.evidence.map((ev, idx) => (
                                                                            <span
                                                                                key={idx}
                                                                                className={`text-xs px-2 py-0.5 border rounded-lg ${isLight
                                                                                    ? "bg-neutral-100 border-neutral-300 text-neutral-600"
                                                                                    : "bg-[#252525] border-white/10 text-neutral-400"
                                                                                    }`}
                                                                                title={`${ev.personaName} - Screen ${ev.screenshotOrder + 1}`}
                                                                            >
                                                                                {ev.personaName} • S{ev.screenshotOrder + 1}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        <span className={`text-xs px-2 py-0.5 border rounded-lg ${isLight
                                                                            ? "bg-neutral-100 border-neutral-300 text-neutral-700"
                                                                            : "bg-[#252525] border-white/10 text-neutral-300"
                                                                            }`}>
                                                                            {issue.personaName}
                                                                        </span>
                                                                        <span className={`text-xs px-2 py-0.5 border rounded-lg ${isLight
                                                                            ? "bg-neutral-100 border-neutral-300 text-neutral-600"
                                                                            : "bg-[#252525] border-white/10 text-neutral-400"
                                                                            }`}>
                                                                            Screen {issue.screenshotOrder + 1}
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {issue.recommendation && (
                                                            <div className={`border p-3 mt-3 rounded-lg ${isLight
                                                                ? "bg-emerald-50/50 border-emerald-200"
                                                                : "bg-emerald-500/5 border-emerald-500/20"
                                                                }`}>
                                                                <p className={`text-xs uppercase tracking-wide mb-1 font-medium flex items-center gap-1.5 ${isLight ? "text-emerald-700" : "text-emerald-400"
                                                                    }`}>
                                                                    <TrendingUp size={12} />
                                                                    Recommendation
                                                                </p>
                                                                <p className={`text-sm font-light ${isLight ? "text-neutral-700" : "text-neutral-300"}`}>
                                                                    {cleanMarkdown(issue.recommendation)}
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
            )}

            {/* Positive Aspects */}
            {stats.positives.length > 0 && (
                <motion.div
                    className={`border rounded-xl overflow-hidden ${isLight
                        ? "bg-white border-neutral-200"
                        : "border-white/10 bg-[#1E1E1E]"
                        }`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <div className={`p-4 border-b ${isLight
                        ? "bg-emerald-50 border-emerald-200"
                        : "bg-emerald-500/10 border-emerald-500/20"
                        }`}>
                        <div className="flex items-center gap-2">
                            <ThumbsUp size={18} className={isLight ? "text-emerald-600" : "text-emerald-400"} />
                            <h3 className={`font-medium ${isLight ? "text-emerald-900" : "text-emerald-300"}`}>
                                Positive Observations
                            </h3>
                            <span className={`text-xs px-2 py-0.5 rounded-lg ${isLight
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-emerald-500/20 text-emerald-400"
                                }`}>
                                {stats.positives.length}
                            </span>
                        </div>
                    </div>
                    <div className={`divide-y ${isLight ? "divide-neutral-100" : "divide-white/5"}`}>
                        {stats.positives.slice(0, 10).map((item, idx) => (
                            <motion.div
                                key={item.id}
                                className="p-4 flex items-start justify-between gap-4"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.2, delay: idx * 0.03 }}
                            >
                                <div className="flex-1">
                                    <p className={`text-sm font-light leading-relaxed ${isLight ? "text-neutral-700" : "text-neutral-300"}`}>
                                        {cleanMarkdown(item.description)}
                                    </p>
                                    {item.evidence && item.evidence.length > 1 && (
                                        <p className={`text-xs mt-1 font-light ${isLight ? "text-neutral-500" : "text-neutral-400"}`}>
                                            Found by {item.evidence.length} {item.evidence.length === 1 ? 'persona' : 'personas'}
                                        </p>
                                    )}
                                </div>
                                {item.evidence && item.evidence.length > 1 ? (
                                    <div className="flex flex-wrap gap-1 justify-end max-w-[200px]">
                                        {item.evidence.map((ev, idx) => (
                                            <span
                                                key={idx}
                                                className={`text-xs px-2 py-0.5 border rounded-lg shrink-0 ${isLight
                                                    ? "bg-neutral-100 border-neutral-300 text-neutral-600"
                                                    : "bg-[#252525] border-white/10 text-neutral-400"
                                                    }`}
                                                title={`${ev.personaName} - Screen ${ev.screenshotOrder + 1}`}
                                            >
                                                {ev.personaName} • S{ev.screenshotOrder + 1}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <span className={`text-xs px-2 py-0.5 border rounded-lg shrink-0 ${isLight
                                        ? "bg-neutral-100 border-neutral-300 text-neutral-600"
                                        : "bg-[#252525] border-white/10 text-neutral-400"
                                        }`}>
                                        {item.personaName} • Screen {item.screenshotOrder + 1}
                                    </span>
                                )}
                            </motion.div>
                        ))}
                        {stats.positives.length > 10 && (
                            <div className={`p-4 text-center text-sm font-light ${isLight ? "text-neutral-500" : "text-neutral-400"}`}>
                                +{stats.positives.length - 10} more positive observations
                            </div>
                        )}
                    </div>
                </motion.div>
            )}

            {/* Accessibility Notes */}
            {stats.accessibility.length > 0 && (
                <motion.div
                    className={`border rounded-xl overflow-hidden ${isLight
                        ? "bg-white border-neutral-200"
                        : "border-white/10 bg-[#1E1E1E]"
                        }`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <div className={`p-4 border-b ${isLight
                        ? "bg-purple-50 border-purple-200"
                        : "bg-purple-500/10 border-purple-500/20"
                        }`}>
                        <div className="flex items-center gap-2">
                            <Accessibility size={18} className={isLight ? "text-purple-600" : "text-purple-400"} />
                            <h3 className={`font-medium ${isLight ? "text-purple-900" : "text-purple-300"}`}>
                                Accessibility Notes
                            </h3>
                            <span className={`text-xs px-2 py-0.5 rounded-lg ${isLight
                                ? "bg-purple-100 text-purple-700"
                                : "bg-purple-500/20 text-purple-400"
                                }`}>
                                {stats.accessibility.length}
                            </span>
                        </div>
                    </div>
                    <div className={`divide-y ${isLight ? "divide-neutral-100" : "divide-white/5"}`}>
                        {stats.accessibility.slice(0, 8).map((item, idx) => (
                            <motion.div
                                key={item.id}
                                className="p-4 flex items-start justify-between gap-4"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.2, delay: idx * 0.03 }}
                            >
                                <div className="flex-1">
                                    <p className={`text-sm font-light leading-relaxed ${isLight ? "text-neutral-700" : "text-neutral-300"}`}>
                                        {cleanMarkdown(item.description)}
                                    </p>
                                    {item.evidence && item.evidence.length > 1 && (
                                        <p className={`text-xs mt-1 font-light ${isLight ? "text-neutral-500" : "text-neutral-400"}`}>
                                            Found by {item.evidence.length} {item.evidence.length === 1 ? 'persona' : 'personas'}
                                        </p>
                                    )}
                                </div>
                                {item.evidence && item.evidence.length > 1 ? (
                                    <div className="flex flex-wrap gap-1 justify-end max-w-[200px]">
                                        {item.evidence.map((ev, idx) => (
                                            <span
                                                key={idx}
                                                className={`text-xs px-2 py-0.5 border rounded-lg shrink-0 ${isLight
                                                    ? "bg-neutral-100 border-neutral-300 text-neutral-600"
                                                    : "bg-[#252525] border-white/10 text-neutral-400"
                                                    }`}
                                                title={`${ev.personaName} - Screen ${ev.screenshotOrder + 1}`}
                                            >
                                                {ev.personaName} • S{ev.screenshotOrder + 1}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <span className={`text-xs px-2 py-0.5 border rounded-lg shrink-0 ${isLight
                                        ? "bg-neutral-100 border-neutral-300 text-neutral-600"
                                        : "bg-[#252525] border-white/10 text-neutral-400"
                                        }`}>
                                        {item.personaName} • Screen {item.screenshotOrder + 1}
                                    </span>
                                )}
                            </motion.div>
                        ))}
                        {stats.accessibility.length > 8 && (
                            <div className={`p-4 text-center text-sm font-light ${isLight ? "text-neutral-500" : "text-neutral-400"}`}>
                                +{stats.accessibility.length - 8} more accessibility notes
                            </div>
                        )}
                    </div>
                </motion.div>
            )}

            {/* Empty state for no issues */}
            {stats.totalIssues === 0 && stats.positives.length === 0 && stats.accessibility.length === 0 && (
                <div className={`border p-8 text-center rounded-xl ${isLight
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-emerald-500/20 bg-emerald-500/10"
                    }`}>
                    <CheckCircle2 className={`w-12 h-12 mx-auto mb-4 ${isLight ? "text-emerald-600" : "text-emerald-400"}`} />
                    <h3 className={`text-lg font-medium mb-2 ${isLight ? "text-emerald-900" : "text-emerald-300"}`}>
                        No issues found!
                    </h3>
                    <p className={`font-light text-sm ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>
                        All personas completed the flow without identifying any issues.
                    </p>
                </div>
            )}
        </div>
    );
}
