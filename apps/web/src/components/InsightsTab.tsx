"use client";

import { useState, useEffect } from "react";
import {
    type UXAgentRun,
    type UXAgentInsight,
    generateUXAgentInsights,
    getUXAgentInsights,
} from "@/lib/batch-api";
import {
    Lightbulb,
    CheckCircle2,
    AlertTriangle,
    AlertCircle,
    Loader2,
    Sparkles,
    Navigation,
    Accessibility,
    Gauge,
    FileText,
    RefreshCw
} from "lucide-react";

interface InsightsTabProps {
    run: UXAgentRun;
}

const categoryIcons: Record<string, React.ReactNode> = {
    usability: <AlertCircle size={16} />,
    accessibility: <Accessibility size={16} />,
    performance: <Gauge size={16} />,
    content: <FileText size={16} />,
    navigation: <Navigation size={16} />,
};

const categoryColors: Record<string, string> = {
    usability: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    accessibility: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    performance: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    content: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    navigation: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
};

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

export function InsightsTab({ run }: InsightsTabProps) {
    const [insights, setInsights] = useState<UXAgentInsight[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
        } catch (err: any) {
            console.error("Failed to generate insights:", err);
            setError(err.message || "Failed to generate insights");
        } finally {
            setGenerating(false);
        }
    };

    if (loading) {
        return (
            <div className="border border-white/10 bg-[#1E1E1E] p-12 text-center rounded-xl">
                <Loader2 size={32} className="mx-auto text-neutral-400 mb-3 animate-spin" />
                <p className="text-neutral-400 font-light">Loading insights...</p>
            </div>
        );
    }

    // No insights yet - show generate button
    if (insights.length === 0) {
        return (
            <div className="border border-white/10 bg-[#1E1E1E] p-8 text-center rounded-xl">
                <div className="w-16 h-16 rounded-full bg-[#252525] mx-auto mb-4 flex items-center justify-center border border-white/10">
                    <Sparkles size={32} className="text-neutral-400" />
                </div>
                <h3 className="text-white font-medium mb-2 text-lg">Generate AI Insights</h3>
                <p className="text-neutral-400 font-light text-sm max-w-md mx-auto mb-6">
                    Analyze the agent's thoughts and observations to identify actionable UX improvements using AI.
                </p>
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg mb-4 max-w-md mx-auto">
                        {error}
                    </div>
                )}
                <button
                    onClick={handleGenerateInsights}
                    disabled={generating}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#252525] text-white border border-white/10 font-medium hover:bg-[#333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
                >
                    {generating ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            Analyzing thoughts...
                        </>
                    ) : (
                        <>
                            <Sparkles size={18} />
                            Generate Insights
                        </>
                    )}
                </button>
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
                <div className="bg-[#252525] text-white p-4 border border-white/10 rounded-lg">
                    <p className="text-3xl font-light">{insights.length}</p>
                    <p className="text-xs text-neutral-400 uppercase tracking-wide font-light">Total Insights</p>
                </div>
                {['critical', 'high', 'medium', 'low'].map(severity => (
                    <div key={severity} className={`p-4 border rounded-lg ${severityColors[severity]}`}>
                        <p className="text-2xl font-light">{severityCounts[severity] || 0}</p>
                        <p className="text-xs uppercase tracking-wide capitalize font-light">{severity}</p>
                    </div>
                ))}
            </div>

            {/* Regenerate button */}
            <div className="flex justify-end">
                <button
                    onClick={handleGenerateInsights}
                    disabled={generating}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-white/10 bg-[#252525] text-white hover:bg-[#333] transition-colors disabled:opacity-50 rounded-lg"
                >
                    {generating ? (
                        <Loader2 size={14} className="animate-spin" />
                    ) : (
                        <RefreshCw size={14} />
                    )}
                    Regenerate
                </button>
            </div>

            {/* Insights by Category */}
            {Object.entries(byCategory).map(([category, categoryInsights]) => (
                <div key={category} className="border border-white/10 bg-[#1E1E1E] rounded-xl overflow-hidden">
                    <div className={`p-4 border-b border-white/10 flex items-center gap-3 ${categoryColors[category] || 'bg-[#252525]'}`}>
                        {categoryIcons[category] || <Lightbulb size={16} />}
                        <h3 className="font-medium capitalize text-white">{category}</h3>
                        <span className="ml-auto text-sm opacity-70 text-neutral-400">{categoryInsights.length} issue{categoryInsights.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="divide-y divide-white/5">
                        {categoryInsights.map((insight) => (
                            <div
                                key={insight.id}
                                className={`p-5 bg-[#1E1E1E] border-l-4 ${severityBorderColors[insight.severity] || 'border-l-neutral-400'}`}
                            >
                                <div className="flex items-start justify-between gap-4 mb-3">
                                    <h4 className="font-medium text-white">{insight.title}</h4>
                                    <span className={`shrink-0 text-[10px] px-2 py-1 uppercase font-bold tracking-wider rounded ${severityColors[insight.severity]}`}>
                                        {insight.severity}
                                    </span>
                                </div>
                                <p className="text-sm text-neutral-300 font-light mb-4">
                                    {insight.description}
                                </p>
                                <div className="flex gap-2 items-start bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg">
                                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                                    <div>
                                        <span className="text-xs font-medium text-emerald-400 uppercase tracking-wide block mb-1">Recommendation</span>
                                        <p className="text-sm text-emerald-300 font-light">{insight.recommendation}</p>
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
