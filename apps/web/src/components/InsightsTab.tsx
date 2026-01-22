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
import { useTheme } from "@/contexts/theme-context";
import { FlickeringGrid } from "@/components/ui/flickering-grid";

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

const getCategoryColors = (isLight: boolean): Record<string, string> => ({
    usability: isLight ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-blue-500/10 text-blue-400 border-blue-500/20",
    accessibility: isLight ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-purple-500/10 text-purple-400 border-purple-500/20",
    performance: isLight ? "bg-orange-50 text-orange-700 border-orange-200" : "bg-orange-500/10 text-orange-400 border-orange-500/20",
    content: isLight ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    navigation: isLight ? "bg-cyan-50 text-cyan-700 border-cyan-200" : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
});

const getSeverityColors = (isLight: boolean): Record<string, string> => ({
    critical: isLight ? "bg-red-50 text-red-700 border-red-200" : "bg-red-500/10 text-red-400 border-red-500/20",
    high: isLight ? "bg-orange-50 text-orange-700 border-orange-200" : "bg-orange-500/10 text-orange-400 border-orange-500/20",
    medium: isLight ? "bg-yellow-50 text-yellow-700 border-yellow-200" : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    low: isLight ? "bg-neutral-50 text-neutral-700 border-neutral-200" : "bg-neutral-500/10 text-neutral-400 border-neutral-500/20",
});

const getSeverityBorderColors = (isLight: boolean): Record<string, string> => ({
    critical: isLight ? "border-l-red-600" : "border-l-red-500",
    high: isLight ? "border-l-orange-600" : "border-l-orange-500",
    medium: isLight ? "border-l-yellow-600" : "border-l-yellow-500",
    low: isLight ? "border-l-neutral-500" : "border-l-neutral-400",
});

export function InsightsTab({ run }: InsightsTabProps) {
    const { theme } = useTheme();
    const isLight = theme === "light";
    const [insights, setInsights] = useState<UXAgentInsight[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const categoryColors = getCategoryColors(isLight);
    const severityColors = getSeverityColors(isLight);
    const severityBorderColors = getSeverityBorderColors(isLight);

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
            <div className="relative w-full min-h-[400px] flex items-center justify-center">
                {/* Flickering grid background */}
                <div 
                    className="absolute inset-0 pointer-events-none"
                    style={{ 
                        zIndex: 0,
                        maskImage: "linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%), linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)",
                        WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%), linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)",
                        maskComposite: "intersect",
                        WebkitMaskComposite: "source-in"
                    }}
                >
                    <FlickeringGrid
                        squareSize={4}
                        gridGap={6}
                        flickerChance={0.1}
                        color={isLight ? "rgb(38, 38, 38)" : "rgb(229, 229, 229)"}
                        maxOpacity={isLight ? 0.08 : 0.1}
                        className="h-full w-full"
                    />
                </div>
                <div className="relative z-10 text-center">
                <Loader2 size={32} className={`mx-auto mb-3 animate-spin ${
                    isLight ? "text-neutral-500" : "text-neutral-400"
                }`} />
                <p className={`font-light ${
                    isLight ? "text-neutral-600" : "text-neutral-400"
                }`}>Loading insights...</p>
                </div>
            </div>
        );
    }

    // No insights yet - show generate button
    if (insights.length === 0) {
        return (
            <div className="relative w-full min-h-[400px] flex items-center justify-center">
                {/* Flickering grid background */}
                <div 
                    className="absolute inset-0 pointer-events-none"
                    style={{ 
                        zIndex: 0,
                        maskImage: "linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%), linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)",
                        WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%), linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)",
                        maskComposite: "intersect",
                        WebkitMaskComposite: "source-in"
                    }}
                >
                    <FlickeringGrid
                        squareSize={4}
                        gridGap={6}
                        flickerChance={0.1}
                        color={isLight ? "rgb(38, 38, 38)" : "rgb(229, 229, 229)"}
                        maxOpacity={isLight ? 0.08 : 0.1}
                        className="h-full w-full"
                    />
                </div>
                <div className="relative z-10 p-8 max-w-2xl mx-auto w-full text-center">
                <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center border ${
                    isLight
                        ? "bg-neutral-50 border-neutral-200"
                        : "bg-[#252525] border-white/10"
                }`}>
                    <Sparkles size={32} className={isLight ? "text-neutral-500" : "text-neutral-400"} />
                </div>
                <h3 className={`font-medium mb-2 text-lg ${
                    isLight ? "text-neutral-900" : "text-white"
                }`}>Generate AI Insights</h3>
                <p className={`font-light text-sm max-w-md mx-auto mb-6 ${
                    isLight ? "text-neutral-600" : "text-neutral-400"
                }`}>
                    Analyze the agent's thoughts and observations to identify actionable UX improvements using AI.
                </p>
                {error && (
                    <div className={`border text-sm p-3 rounded-lg mb-4 max-w-md mx-auto ${
                        isLight
                            ? "bg-red-50 border-red-200 text-red-700"
                            : "bg-red-500/10 border-red-500/20 text-red-400"
                    }`}>
                        {error}
                    </div>
                )}
                <button
                    onClick={handleGenerateInsights}
                    disabled={generating}
                    className={`inline-flex items-center gap-2 px-6 py-3 border font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-lg ${
                        isLight
                            ? "bg-neutral-900 text-white border-neutral-900 hover:bg-neutral-800"
                            : "bg-[#252525] text-white border-white/10 hover:bg-[#333]"
                    }`}
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
        <div className="relative w-full min-h-[400px]">
            {/* Flickering grid background */}
            <div 
                className="absolute inset-0 pointer-events-none"
                style={{ 
                    zIndex: 0,
                    maskImage: "linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%), linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)",
                    WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%), linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)",
                    maskComposite: "intersect",
                    WebkitMaskComposite: "source-in"
                }}
            >
                <FlickeringGrid
                    squareSize={4}
                    gridGap={6}
                    flickerChance={0.1}
                    color={isLight ? "rgb(38, 38, 38)" : "rgb(229, 229, 229)"}
                    maxOpacity={isLight ? 0.08 : 0.1}
                    className="h-full w-full"
                />
            </div>
            
            <div className="relative z-10 p-8 space-y-6">
            {/* Summary Header */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className={`p-4 border rounded-lg ${
                    isLight
                        ? "bg-neutral-900 text-white border-neutral-900"
                        : "bg-[#252525] text-white border-white/10"
                }`}>
                    <p className="text-3xl font-light">{insights.length}</p>
                    <p className={`text-xs uppercase tracking-wide font-light ${
                        isLight ? "text-white/80" : "text-neutral-400"
                    }`}>Total Insights</p>
                </div>
                {['critical', 'high', 'medium', 'low'].map(severity => (
                    <div key={severity} className={`p-4 border rounded-lg ${severityColors[severity]}`}>
                        <p className="text-2xl font-light">{severityCounts[severity] || 0}</p>
                        <p className={`text-xs uppercase tracking-wide capitalize font-light ${
                            isLight ? "text-neutral-600" : "text-neutral-400"
                        }`}>{severity}</p>
                    </div>
                ))}
            </div>

            {/* Regenerate button */}
            <div className="flex justify-end">
                <button
                    onClick={handleGenerateInsights}
                    disabled={generating}
                    className={`inline-flex items-center gap-2 px-4 py-2 text-sm border transition-colors disabled:opacity-50 rounded-lg ${
                        isLight
                            ? "border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-50"
                            : "border-white/10 bg-[#252525] text-white hover:bg-[#333]"
                    }`}
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
                <div key={category} className={`border rounded-xl overflow-hidden ${
                    isLight
                        ? "border-neutral-200 bg-white"
                        : "border-white/10 bg-[#1E1E1E]"
                }`}>
                    <div className={`p-4 border-b flex items-center gap-3 ${
                        categoryColors[category] || (isLight ? "bg-neutral-50 border-neutral-200" : "bg-[#252525] border-white/10")
                    }`}>
                        {categoryIcons[category] || <Lightbulb size={16} />}
                        <h3 className={`font-medium capitalize ${
                            isLight ? "text-neutral-900" : "text-white"
                        }`}>{category}</h3>
                        <span className={`ml-auto text-sm opacity-70 ${
                            isLight ? "text-neutral-600" : "text-neutral-400"
                        }`}>{categoryInsights.length} issue{categoryInsights.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className={`divide-y ${
                        isLight ? "divide-neutral-200" : "divide-white/5"
                    }`}>
                        {categoryInsights.map((insight) => (
                            <div
                                key={insight.id}
                                className={`p-5 border-l-4 ${
                                    isLight
                                        ? "bg-white"
                                        : "bg-[#1E1E1E]"
                                } ${severityBorderColors[insight.severity] || (isLight ? 'border-l-neutral-400' : 'border-l-neutral-400')}`}
                            >
                                <div className="flex items-start justify-between gap-4 mb-3">
                                    <h4 className={`font-medium ${
                                        isLight ? "text-neutral-900" : "text-white"
                                    }`}>{insight.title}</h4>
                                    <span className={`shrink-0 text-[10px] px-2 py-1 uppercase font-bold tracking-wider rounded ${severityColors[insight.severity]}`}>
                                        {insight.severity}
                                    </span>
                                </div>
                                <p className={`text-sm font-light mb-4 ${
                                    isLight ? "text-neutral-700" : "text-neutral-300"
                                }`}>
                                    {insight.description}
                                </p>
                                <div className={`flex gap-2 items-start border p-3 rounded-lg ${
                                    isLight
                                        ? "bg-emerald-50 border-emerald-200"
                                        : "bg-emerald-500/10 border-emerald-500/20"
                                }`}>
                                    <CheckCircle2 size={16} className={`shrink-0 mt-0.5 ${
                                        isLight ? "text-emerald-600" : "text-emerald-400"
                                    }`} />
                                    <div>
                                        <span className={`text-xs font-medium uppercase tracking-wide block mb-1 ${
                                            isLight ? "text-emerald-700" : "text-emerald-400"
                                        }`}>Recommendation</span>
                                        <p className={`text-sm font-light ${
                                            isLight ? "text-emerald-800" : "text-emerald-300"
                                        }`}>{insight.recommendation}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
            </div>
        </div>
    );
}
