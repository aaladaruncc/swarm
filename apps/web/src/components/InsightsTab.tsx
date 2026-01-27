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
    RefreshCw,
    TrendingUp,
    Zap
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
            <div className="relative w-full min-h-[500px] flex items-center justify-center overflow-hidden">
                {/* Gradient orb background */}
                <div className="absolute inset-0 pointer-events-none">
                    <div
                        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20"
                        style={{
                            background: "radial-gradient(circle, #f59e0b 0%, #ef4444 50%, #ec4899 100%)",
                            animation: "pulse 4s ease-in-out infinite"
                        }}
                    />
                </div>
                <div className="relative z-10 text-center">
                    <div className="relative inline-block mb-6">
                        <Loader2 size={48} className="animate-spin" style={{
                            color: isLight ? "#f59e0b" : "#fbbf24",
                            filter: "drop-shadow(0 0 20px rgba(251, 191, 36, 0.3))"
                        }} />
                    </div>
                    <p className={`text-lg tracking-wide ${
                        isLight ? "text-neutral-800" : "text-neutral-200"
                    }`} style={{
                        fontFamily: "'Syne', -apple-system, BlinkMacSystemFont, sans-serif",
                        fontWeight: 600,
                        letterSpacing: "0.05em"
                    }}>Analyzing Insights...</p>
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

    // No insights yet - show generate button
    if (insights.length === 0) {
        return (
            <div className="relative w-full min-h-[500px] flex items-center justify-center overflow-hidden">
                {/* Animated gradient background */}
                <div className="absolute inset-0 pointer-events-none">
                    <div
                        className="absolute -top-1/4 -right-1/4 w-[600px] h-[600px] rounded-full blur-3xl"
                        style={{
                            background: "radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, rgba(239, 68, 68, 0.1) 50%, rgba(236, 72, 153, 0.05) 100%)",
                            animation: "float 8s ease-in-out infinite"
                        }}
                    />
                    <div
                        className="absolute -bottom-1/4 -left-1/4 w-[500px] h-[500px] rounded-full blur-3xl"
                        style={{
                            background: "radial-gradient(circle, rgba(236, 72, 153, 0.12) 0%, rgba(139, 92, 246, 0.08) 100%)",
                            animation: "float 10s ease-in-out infinite reverse"
                        }}
                    />
                </div>

                <div className="relative z-10 p-8 max-w-2xl mx-auto w-full text-center">
                    {/* Gradient icon */}
                    <div className="relative inline-block mb-8">
                        <div
                            className="w-24 h-24 rounded-2xl mx-auto flex items-center justify-center relative overflow-hidden"
                            style={{
                                background: isLight
                                    ? "linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #ef4444 100%)"
                                    : "linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #ef4444 100%)",
                                boxShadow: "0 20px 60px -15px rgba(245, 158, 11, 0.4)",
                            }}
                        >
                            <Sparkles size={48} className="text-white relative z-10" style={{
                                filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.2))"
                            }} />
                            {/* Shine effect */}
                            <div
                                className="absolute inset-0"
                                style={{
                                    background: "linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%)",
                                    animation: "shine 3s ease-in-out infinite"
                                }}
                            />
                        </div>
                    </div>

                    <h3 className={`mb-4 text-3xl ${
                        isLight ? "text-neutral-900" : "text-white"
                    }`} style={{
                        fontFamily: "'Syne', -apple-system, BlinkMacSystemFont, sans-serif",
                        fontWeight: 700,
                        letterSpacing: "-0.02em"
                    }}>Generate AI Insights</h3>

                    <p className={`text-base max-w-md mx-auto mb-8 leading-relaxed ${
                        isLight ? "text-neutral-600" : "text-neutral-400"
                    }`} style={{
                        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                        fontWeight: 400
                    }}>
                        Analyze the agent's thoughts and observations to identify actionable UX improvements using AI.
                    </p>

                    {error && (
                        <div className={`text-sm p-4 rounded-xl mb-6 max-w-md mx-auto border ${
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
                        className="group relative inline-flex items-center gap-3 px-8 py-4 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed rounded-xl overflow-hidden"
                        style={{
                            background: isLight
                                ? "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)"
                                : "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
                            boxShadow: "0 10px 40px -10px rgba(245, 158, 11, 0.4)",
                            color: "white",
                            fontFamily: "'Syne', -apple-system, BlinkMacSystemFont, sans-serif",
                            fontWeight: 600,
                            letterSpacing: "0.02em"
                        }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                        {generating ? (
                            <>
                                <Loader2 size={20} className="animate-spin relative z-10" />
                                <span className="relative z-10">Analyzing thoughts...</span>
                            </>
                        ) : (
                            <>
                                <Sparkles size={20} className="relative z-10" />
                                <span className="relative z-10">Generate Insights</span>
                            </>
                        )}
                    </button>
                </div>

                <style jsx>{`
                    @keyframes float {
                        0%, 100% { transform: translate(0, 0) rotate(0deg); }
                        33% { transform: translate(30px, -30px) rotate(5deg); }
                        66% { transform: translate(-20px, 20px) rotate(-5deg); }
                    }
                    @keyframes shine {
                        0% { transform: translateX(-100%) translateY(-100%); }
                        100% { transform: translateX(100%) translateY(100%); }
                    }
                `}</style>
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
        <div className="relative w-full min-h-[400px] overflow-hidden">
            {/* Ambient gradient background */}
            <div className="absolute inset-0 pointer-events-none">
                <div
                    className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-3xl opacity-10"
                    style={{
                        background: "radial-gradient(circle, #f59e0b 0%, #ef4444 100%)"
                    }}
                />
            </div>

            <div className="relative z-10 p-8 space-y-8">
                {/* Header with title and regenerate */}
                <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                        <h2 className={`text-4xl mb-2 ${
                            isLight ? "text-neutral-900" : "text-white"
                        }`} style={{
                            fontFamily: "'Syne', -apple-system, BlinkMacSystemFont, sans-serif",
                            fontWeight: 700,
                            letterSpacing: "-0.02em"
                        }}>
                            Insights Overview
                        </h2>
                        <p className={`text-base ${
                            isLight ? "text-neutral-600" : "text-neutral-400"
                        }`}>
                            {insights.length} insights discovered across {Object.keys(byCategory).length} categories
                        </p>
                    </div>
                    <button
                        onClick={handleGenerateInsights}
                        disabled={generating}
                        className={`group relative inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium border transition-all disabled:opacity-50 rounded-xl ${
                            isLight
                                ? "border-neutral-200 bg-white text-neutral-900 hover:border-neutral-300 hover:shadow-lg"
                                : "border-white/10 bg-[#1a1a1a] text-white hover:border-white/20 hover:bg-[#222]"
                        }`} style={{
                            fontFamily: "'Syne', -apple-system, BlinkMacSystemFont, sans-serif",
                            fontWeight: 600
                        }}>
                        {generating ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-500" />
                        )}
                        {generating ? "Regenerating..." : "Regenerate"}
                    </button>
                </div>

                {/* Summary Stats - Editorial Grid */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {/* Total - Large feature card */}
                    <div className="relative group md:col-span-1 overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02]"
                        style={{
                            background: isLight
                                ? "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)"
                                : "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
                            boxShadow: "0 10px 40px -10px rgba(245, 158, 11, 0.3)"
                        }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative z-10">
                            <TrendingUp size={24} className="text-white/80 mb-3" />
                            <p className="text-5xl font-bold text-white mb-1" style={{
                                fontFamily: "'Syne', -apple-system, BlinkMacSystemFont, sans-serif",
                                textShadow: "0 2px 10px rgba(0,0,0,0.1)"
                            }}>{insights.length}</p>
                            <p className="text-xs uppercase tracking-wider font-semibold text-white/90" style={{
                                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                                letterSpacing: "0.1em"
                            }}>Total Insights</p>
                        </div>
                    </div>

                    {/* Severity cards */}
                    {(['critical', 'high', 'medium', 'low'] as const).map((severity, idx) => {
                        const gradients = {
                            critical: isLight ? "from-red-50 to-red-100" : "from-red-950/30 to-red-900/20",
                            high: isLight ? "from-orange-50 to-orange-100" : "from-orange-950/30 to-orange-900/20",
                            medium: isLight ? "from-yellow-50 to-yellow-100" : "from-yellow-950/30 to-yellow-900/20",
                            low: isLight ? "from-neutral-50 to-neutral-100" : "from-neutral-900/30 to-neutral-800/20"
                        };
                        const textColors = {
                            critical: isLight ? "text-red-700" : "text-red-400",
                            high: isLight ? "text-orange-700" : "text-orange-400",
                            medium: isLight ? "text-yellow-700" : "text-yellow-400",
                            low: isLight ? "text-neutral-700" : "text-neutral-400"
                        };
                        const borderColors = {
                            critical: isLight ? "border-red-200" : "border-red-900/30",
                            high: isLight ? "border-orange-200" : "border-orange-900/30",
                            medium: isLight ? "border-yellow-200" : "border-yellow-900/30",
                            low: isLight ? "border-neutral-200" : "border-neutral-700/30"
                        };

                        return (
                            <div key={severity}
                                className={`relative group p-5 border rounded-2xl bg-gradient-to-br ${gradients[severity]} ${borderColors[severity]} transition-all duration-300 hover:scale-[1.02] hover:shadow-lg`}
                                style={{
                                    animationDelay: `${idx * 100}ms`,
                                    animation: "fadeInUp 0.6s ease-out forwards",
                                    opacity: 0
                                }}
                            >
                                <p className={`text-3xl font-bold ${textColors[severity]} mb-1`} style={{
                                    fontFamily: "'Syne', -apple-system, BlinkMacSystemFont, sans-serif"
                                }}>{severityCounts[severity] || 0}</p>
                                <p className={`text-[10px] uppercase tracking-widest font-bold ${textColors[severity]} opacity-70`} style={{
                                    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                                    letterSpacing: "0.15em"
                                }}>{severity}</p>
                            </div>
                        );
                    })}
                </div>

            {/* Insights by Category - Editorial Cards */}
            <div className="space-y-6">
                {Object.entries(byCategory).map(([category, categoryInsights], catIdx) => (
                    <div key={category}
                        className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-2xl ${
                            isLight
                                ? "border-neutral-200 bg-white"
                                : "border-white/10 bg-gradient-to-br from-[#1a1a1a] to-[#151515]"
                        }`}
                        style={{
                            animationDelay: `${catIdx * 150}ms`,
                            animation: "fadeInUp 0.6s ease-out forwards",
                            opacity: 0
                        }}
                    >
                        {/* Category header with gradient accent */}
                        <div className="relative overflow-hidden">
                            <div className={`absolute inset-0 opacity-50 ${
                                isLight ? "bg-gradient-to-r from-orange-50 via-rose-50 to-pink-50" : "bg-gradient-to-r from-orange-950/20 via-rose-950/20 to-pink-950/20"
                            }`} />
                            <div className={`relative p-5 border-b flex items-center gap-4 ${
                                isLight ? "border-neutral-200" : "border-white/10"
                            }`}>
                                <div className="p-2.5 rounded-xl"
                                    style={{
                                        background: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
                                        boxShadow: "0 4px 14px rgba(245, 158, 11, 0.25)"
                                    }}
                                >
                                    <div className="text-white">
                                        {categoryIcons[category] || <Lightbulb size={18} />}
                                    </div>
                                </div>
                                <h3 className={`text-xl font-bold capitalize ${
                                    isLight ? "text-neutral-900" : "text-white"
                                }`} style={{
                                    fontFamily: "'Syne', -apple-system, BlinkMacSystemFont, sans-serif",
                                    letterSpacing: "-0.01em"
                                }}>{category}</h3>
                                <div className={`ml-auto px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wider ${
                                    isLight
                                        ? "bg-neutral-100 border-neutral-300 text-neutral-700"
                                        : "bg-[#252525] border-white/10 text-neutral-300"
                                }`} style={{
                                    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                                    letterSpacing: "0.1em"
                                }}>
                                    {categoryInsights.length} {categoryInsights.length === 1 ? 'Issue' : 'Issues'}
                                </div>
                            </div>
                        </div>

                        {/* Insights list */}
                        <div className={`divide-y ${
                            isLight ? "divide-neutral-100" : "divide-white/5"
                        }`}>
                            {categoryInsights.map((insight, idx) => {
                                const borderGradients = {
                                    critical: "linear-gradient(to bottom, #ef4444, #dc2626)",
                                    high: "linear-gradient(to bottom, #f97316, #ea580c)",
                                    medium: "linear-gradient(to bottom, #eab308, #ca8a04)",
                                    low: "linear-gradient(to bottom, #a3a3a3, #737373)"
                                };

                                return (
                                    <div
                                        key={insight.id}
                                        className={`relative p-6 transition-all duration-300 hover:bg-gradient-to-r ${
                                            isLight
                                                ? "hover:from-orange-50/50 hover:to-transparent"
                                                : "hover:from-orange-950/10 hover:to-transparent"
                                        }`}
                                        style={{
                                            borderLeft: `4px solid transparent`,
                                            borderImage: borderGradients[insight.severity as keyof typeof borderGradients] || borderGradients.low,
                                            borderImageSlice: 1
                                        }}
                                    >
                                        {/* Title and severity badge */}
                                        <div className="flex items-start justify-between gap-4 mb-3">
                                            <h4 className={`text-lg font-semibold leading-tight ${
                                                isLight ? "text-neutral-900" : "text-white"
                                            }`} style={{
                                                fontFamily: "'Syne', -apple-system, BlinkMacSystemFont, sans-serif",
                                                letterSpacing: "-0.01em"
                                            }}>{insight.title}</h4>
                                            <span className={`shrink-0 text-[10px] px-3 py-1.5 uppercase font-bold tracking-widest rounded-lg border ${severityColors[insight.severity]}`}
                                                style={{
                                                    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                                                    letterSpacing: "0.15em"
                                                }}
                                            >
                                                {insight.severity}
                                            </span>
                                        </div>

                                        {/* Description */}
                                        <p className={`text-sm leading-relaxed mb-5 ${
                                            isLight ? "text-neutral-700" : "text-neutral-300"
                                        }`} style={{
                                            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
                                        }}>
                                            {insight.description}
                                        </p>

                                        {/* Recommendation box */}
                                        <div className="relative overflow-hidden rounded-xl p-4"
                                            style={{
                                                background: isLight
                                                    ? "linear-gradient(135deg, #ecfccb 0%, #d9f99d 100%)"
                                                    : "linear-gradient(135deg, rgba(132, 204, 22, 0.1) 0%, rgba(101, 163, 13, 0.1) 100%)",
                                                border: isLight ? "1px solid #d9f99d" : "1px solid rgba(132, 204, 22, 0.2)"
                                            }}
                                        >
                                            <div className="flex gap-3 items-start">
                                                <div className="p-2 rounded-lg"
                                                    style={{
                                                        background: isLight ? "#bef264" : "rgba(132, 204, 22, 0.2)"
                                                    }}
                                                >
                                                    <CheckCircle2 size={16} className={
                                                        isLight ? "text-lime-700" : "text-lime-400"
                                                    } />
                                                </div>
                                                <div className="flex-1">
                                                    <span className={`text-[10px] font-bold uppercase tracking-widest block mb-2 ${
                                                        isLight ? "text-lime-700" : "text-lime-400"
                                                    }`} style={{
                                                        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                                                        letterSpacing: "0.15em"
                                                    }}>Recommendation</span>
                                                    <p className={`text-sm leading-relaxed ${
                                                        isLight ? "text-lime-900" : "text-lime-200"
                                                    }`} style={{
                                                        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
                                                    }}>{insight.recommendation}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
            </div>

            {/* Keyframes for animations */}
            <style jsx>{`
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </div>
    );
}
