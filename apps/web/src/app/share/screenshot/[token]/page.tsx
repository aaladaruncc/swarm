"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle, Lightbulb, MessageCircle, ChevronLeft, ChevronRight, Share2, X, Settings, FileText } from "lucide-react";
import { useTheme } from "@/contexts/theme-context";
import { AggregatedScreenshotInsights } from "@/components/screenshot-tests/AggregatedScreenshotInsights";
import { ShineBorder } from "@/components/ui/shine-border";
import { motion, AnimatePresence } from "framer-motion";
import { cleanMarkdown } from "@/lib/utils";

// Type definitions for shared screenshot test
interface SharedScreenshotTest {
    testRun: {
        id: string;
        testName: string | null;
        userDescription: string | null;
        expectedTask: string | null;
        status: string;
        overallScore: number | null;
        summary: string | null;
        createdAt: string;
        completedAt: string | null;
    };
    screenshots: Array<{
        id: string;
        orderIndex: number;
        s3Key: string;
        s3Url: string;
        signedUrl?: string;
        description: string | null;
        context: string | null;
    }>;
    personaResults: Array<{
        personaIndex: number;
        personaName: string;
        analyses: Array<{
            screenshotOrder: number;
            observations: string[] | null;
            positiveAspects: string[] | null;
            issues: Array<{
                severity: "low" | "medium" | "high" | "critical";
                description: string;
                recommendation: string;
            }> | null;
            thoughts: string | null;
            comparisonWithPrevious: string | null;
        }>;
    }>;
    overallReport: {
        score: number | null;
        summary: string | null;
        fullReport: any;
    } | null;
    isSharedView: boolean;
}

export default function SharedScreenshotTestPage() {
    const params = useParams();
    const token = params.token as string;
    const { theme } = useTheme();
    const isLight = theme === "light";

    const [result, setResult] = useState<SharedScreenshotTest | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [activePersonaIndex, setActivePersonaIndex] = useState<number>(0);
    const [activeTab, setActiveTab] = useState<"insights" | "agent-sessions">("insights");
    const [selectedStepIndex, setSelectedStepIndex] = useState<number>(0);
    const [selectedScreenshotModal, setSelectedScreenshotModal] = useState<number | null>(null);
    const [selectedThoughtsIndex, setSelectedThoughtsIndex] = useState<number | null>(null);

    useEffect(() => {
        if (!token) return;

        const fetchResults = async () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
                const response = await fetch(`${apiUrl}/api/share/screenshot/${token}`);

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

    const personaResults = result?.personaResults ?? [];

    useEffect(() => {
        if (personaResults.length > 0) {
            setActivePersonaIndex(personaResults[0].personaIndex);
        }
    }, [personaResults.length]);

    const personaSummaries = useMemo(() => {
        const summaries = new Map<number, { summary?: string; overallScore?: number; reflections?: any[] }>();
        const fullReport = result?.overallReport?.fullReport as any;
        if (fullReport?.personaResults) {
            fullReport.personaResults.forEach((entry: any) => {
                summaries.set(entry.personaIndex, {
                    summary: entry.summary,
                    overallScore: entry.overallScore,
                    reflections: entry.reflections,
                });
            });
        }
        return summaries;
    }, [result?.overallReport]);

    const hasMultiplePersonas = personaResults.length > 0;
    const activePersona = hasMultiplePersonas
        ? personaResults.find((persona) => persona.personaIndex === activePersonaIndex) || personaResults[0]
        : null;
    const activeAnalysesByOrder = useMemo(() => {
        if (!activePersona) return new Map<number, any>();
        const map = new Map<number, any>();
        activePersona.analyses.forEach((analysis) => {
            map.set(analysis.screenshotOrder, analysis);
        });
        return map;
    }, [activePersona]);


    if (loading) {
        return (
            <div className={`h-full flex items-center justify-center ${isLight ? "bg-neutral-50" : "bg-neutral-950"}`}>
                <Loader2 className={`animate-spin w-8 h-8 ${isLight ? "text-neutral-500" : "text-neutral-400"}`} />
            </div>
        );
    }

    if (error || !result) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8">
                <div className={`text-center max-w-md ${isLight ? "text-neutral-900" : "text-white"}`}>
                    <h1 className="text-2xl font-light mb-4">Report Not Available</h1>
                    <p className={`mb-6 ${isLight ? "text-neutral-600" : "text-neutral-400"}`}>
                        {error || "This report doesn't exist or is no longer shared."}
                    </p>
                </div>
            </div>
        );
    }

    const { testRun, screenshots, overallReport } = result;
    const isCompleted = testRun.status === "completed";
    const isFailed = testRun.status === "failed";

    // Convert to format expected by AggregatedScreenshotInsights
    const resultForInsights = {
        testRun,
        screenshots,
        personaResults,
        overallReport,
    } as any;

    return (
        <div className={`${isLight ? "bg-neutral-50" : "bg-neutral-950"} ${isLight ? "text-neutral-900" : "text-white"}`} style={{ minHeight: '100vh' }}>
            {/* Shared Badge */}
            <div className={isLight ? "bg-blue-50 border-b border-blue-200" : "bg-blue-500/10 border-b border-blue-500/20"}>
                <div className="max-w-7xl mx-auto px-8 py-3 flex items-center justify-between">
                    <div className={`flex items-center gap-2 text-sm ${isLight ? "text-blue-700" : "text-blue-300"}`}>
                        <Share2 size={16} />
                        <span>Shared Report</span>
                    </div>
                    <span className={`text-xs ${isLight ? "text-neutral-600" : "text-neutral-500"}`}>
                        Created {new Date(testRun.createdAt).toLocaleDateString()}
                    </span>
                </div>
            </div>

            <div className="flex flex-col p-8 pb-32 max-w-7xl mx-auto w-full">
                {/* Header */}
                <div className="mb-8 flex-shrink-0">
                    <div>
                        <h1 className={`text-3xl font-light tracking-tight mb-2 ${isLight ? "text-neutral-900" : "text-white"}`}>
                            {testRun.testName || "Screenshot Test Results"}
                        </h1>
                        {testRun.userDescription && (
                            <p className={`font-light ${isLight ? "text-neutral-500" : "text-neutral-400"}`}>
                                {testRun.userDescription}
                            </p>
                        )}
                    </div>
                </div>

                {/* Failed State */}
                {isFailed && (
                    <div className={`mb-6 p-4 border rounded-lg ${isLight
                        ? "border-red-200 bg-red-50 text-red-700"
                        : "border-red-500/20 bg-red-500/10 text-red-400"
                        }`}>
                        <div className="flex items-start gap-3">
                            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-sm">Analysis Failed</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Screenshots Analysis - Only show when completed */}
                {isCompleted && (
                    <div className="flex flex-col">
                        {/* Tabs - Fixed at top */}
                        <div className={`border-b flex-shrink-0 ${isLight ? "border-neutral-200" : "border-white/10"}`}>
                            <div className="flex gap-1 overflow-x-auto">
                                {[
                                    { key: "insights", label: "Insights", icon: Lightbulb },
                                    { key: "agent-sessions", label: "Agent Sessions", icon: MessageCircle },
                                ].map(({ key, label, icon: Icon }) => (
                                    <button
                                        key={key}
                                        onClick={() => setActiveTab(key as "insights" | "agent-sessions")}
                                        className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                                            activeTab === key
                                                ? isLight
                                                    ? "border-b-2 border-neutral-900 text-neutral-900"
                                                    : "border-b-2 border-white text-white"
                                                : isLight
                                                    ? "text-neutral-500 hover:text-neutral-700"
                                                    : "text-neutral-500 hover:text-neutral-300"
                                        }`}
                                    >
                                        <Icon size={16} />
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Persona Selector - Fixed outside scrollable area */}
                        {activeTab === "agent-sessions" && hasMultiplePersonas && (
                            <div className={`mb-6 p-4 border rounded-xl flex-shrink-0 ${isLight
                                ? "border-neutral-200 bg-white"
                                : "border-white/10 bg-[#1E1E1E]"
                                }`}>
                                <div className="flex flex-wrap items-center gap-2">
                                    {personaResults.map((persona) => {
                                        const summary = personaSummaries.get(persona.personaIndex);
                                        const isActive = persona.personaIndex === activePersonaIndex;
                                        return (
                                            <button
                                                key={persona.personaIndex}
                                                onClick={() => setActivePersonaIndex(persona.personaIndex)}
                                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${isActive
                                                    ? isLight
                                                        ? "bg-neutral-900 text-white"
                                                        : "bg-white text-neutral-900"
                                                    : isLight
                                                        ? "bg-neutral-100 text-neutral-600 hover:text-neutral-900"
                                                        : "bg-[#252525] text-neutral-400 hover:text-white"
                                                    }`}
                                            >
                                                {persona.personaName}
                                            </button>
                                        );
                                    })}
                                </div>
                                {activePersona && personaSummaries.get(activePersona.personaIndex)?.summary && (
                                    <p className={`mt-3 text-sm font-light ${isLight ? "text-neutral-600" : "text-neutral-400"}`}>
                                        {personaSummaries.get(activePersona.personaIndex)?.summary}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Tab Content */}
                        <div className="flex flex-col">
                            {/* Insights Tab */}
                            {activeTab === "insights" && result && (
                                <div>
                                    <AggregatedScreenshotInsights result={resultForInsights} />
                                </div>
                            )}

                            {/* Agent Sessions Tab */}
                            {activeTab === "agent-sessions" && (
                                <div className="flex flex-col lg:flex-row gap-6">
                                    {/* Left Panel - Dotted Container with Step Modules - Scrollable */}
                                    <div className={`lg:w-[65%] border-2 border-dashed rounded-xl h-[500px] lg:h-[600px] ${isLight ? "border-neutral-300 bg-neutral-50/50" : "border-white/20 bg-[#1E1E1E]/50"}`}>
                                        <div 
                                            className="h-full overflow-y-scroll px-6 py-6"
                                            style={{ 
                                                scrollbarWidth: 'thin',
                                                scrollbarColor: isLight ? '#d4d4d4 #f5f5f5' : '#404040 #1E1E1E',
                                                WebkitOverflowScrolling: 'touch'
                                            }}
                                        >
                                            <div className="space-y-4">
                                            {screenshots.map((screenshot, index) => {
                                                const analysis = hasMultiplePersonas && activePersona
                                                    ? activeAnalysesByOrder.get(screenshot.orderIndex)
                                                    : screenshot;
                                                const isSelected = selectedStepIndex === index;
                                                
                                                return (
                                                    <div
                                                        key={screenshot.id}
                                                        onClick={() => setSelectedStepIndex(index)}
                                                        className={`rounded-xl p-6 cursor-pointer transition-all relative overflow-hidden ${
                                                            isSelected
                                                                ? isLight
                                                                    ? "bg-white border border-neutral-200 shadow-lg"
                                                                    : "bg-[#1E1E1E] border border-white/10 shadow-lg"
                                                                : isLight
                                                                    ? "bg-white border border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300"
                                                                    : "bg-[#1E1E1E] border border-white/10 hover:bg-[#252525] hover:border-white/20"
                                                        }`}
                                                    >
                                                        {/* Blue Shine Border for Selected */}
                                                        {isSelected && (
                                                            <ShineBorder
                                                                borderWidth={2}
                                                                duration={3}
                                                                shineColor={["#3b82f6", "#60a5fa", "#3b82f6"]}
                                                            />
                                                        )}
                                                        {/* Step Header */}
                                                        <div className={`mb-4 pb-3 border-b flex items-center justify-between ${isLight ? "border-neutral-200" : "border-white/10"}`}>
                                                            <span className={`text-sm font-medium px-2 py-1 rounded ${isLight ? "bg-neutral-100 text-neutral-600" : "bg-[#252525] text-neutral-400"}`}>
                                                                Step {index + 1}
                                                            </span>
                                                            {analysis?.thoughts && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSelectedThoughtsIndex(index);
                                                                    }}
                                                                    className={`text-xs font-medium px-3 py-1.5 rounded transition-colors ${isLight
                                                                        ? "bg-neutral-900 text-white hover:bg-neutral-800"
                                                                        : "bg-white text-neutral-900 hover:bg-neutral-200"
                                                                    }`}
                                                                >
                                                                    Full thoughts
                                                                </button>
                                                            )}
                                                        </div>

                                                        {/* User Observation - New concise format */}
                                                        {analysis?.userObservation && (
                                                            <div className="mb-4">
                                                                <div className="flex items-start gap-2 mb-2">
                                                                    <MessageCircle size={16} className={`mt-0.5 flex-shrink-0 ${isLight ? "text-green-600" : "text-green-400"}`} />
                                                                    <h4 className={`text-sm font-medium ${isLight ? "text-neutral-900" : "text-white"}`}>
                                                                        User Observation
                                                                    </h4>
                                                                </div>
                                                                <p className={`text-sm font-light leading-relaxed pl-6 ${isLight ? "text-neutral-600" : "text-neutral-400"}`}>
                                                                    "{cleanMarkdown(analysis.userObservation)}"
                                                                </p>
                                                            </div>
                                                        )}

                                                        {/* Mission/Context - New concise format */}
                                                        {analysis?.missionContext && (
                                                            <div className="mb-4">
                                                                <div className="flex items-start gap-2 mb-2">
                                                                    <Settings size={16} className={`mt-0.5 flex-shrink-0 ${isLight ? "text-neutral-600" : "text-neutral-400"}`} />
                                                                    <h4 className={`text-sm font-medium ${isLight ? "text-neutral-900" : "text-white"}`}>
                                                                        Mission/Context
                                                                    </h4>
                                                                </div>
                                                                <p className={`text-sm font-light leading-relaxed pl-6 ${isLight ? "text-neutral-600" : "text-neutral-400"}`}>
                                                                    {cleanMarkdown(analysis.missionContext)}
                                                                </p>
                                                            </div>
                                                        )}

                                                        {/* Expected Outcome - New concise format */}
                                                        {analysis?.expectedOutcome && (
                                                            <div className="mb-4">
                                                                <div className="flex items-start gap-2 mb-2">
                                                                    <FileText size={16} className={`mt-0.5 flex-shrink-0 ${isLight ? "text-blue-600" : "text-blue-400"}`} />
                                                                    <h4 className={`text-sm font-medium ${isLight ? "text-neutral-900" : "text-white"}`}>
                                                                        Expected Outcome
                                                                    </h4>
                                                                </div>
                                                                <p className={`text-sm font-light leading-relaxed pl-6 ${isLight ? "text-neutral-600" : "text-neutral-400"}`}>
                                                                    {cleanMarkdown(analysis.expectedOutcome)}
                                                                </p>
                                                            </div>
                                                        )}

                                                        {/* Thoughts */}
                                                        {analysis?.thoughts && (
                                                            <div className="mb-4">
                                                                <h4 className={`text-sm font-medium mb-2 ${isLight ? "text-neutral-900" : "text-white"}`}>
                                                                    Thoughts
                                                                </h4>
                                                                <p className={`text-sm font-light leading-relaxed ${isLight ? "text-neutral-600" : "text-neutral-400"}`}>
                                                                    {cleanMarkdown(analysis.thoughts)}
                                                                </p>
                                                            </div>
                                                        )}

                                                        {/* Old format - only show if new format fields are not available */}
                                                        {!analysis?.userObservation && (
                                                            <>
                                                                {/* Observations */}
                                                                {analysis?.observations && analysis.observations.length > 0 && (
                                                                    <div className="mb-4">
                                                                        <h4 className={`text-sm font-medium mb-2 ${isLight ? "text-neutral-900" : "text-white"}`}>
                                                                            Observations
                                                                        </h4>
                                                                        <ul className="space-y-1">
                                                                            {analysis.observations.map((obs: string, i: number) => (
                                                                                <li key={i} className={`text-xs font-light flex items-start gap-2 ${isLight ? "text-neutral-600" : "text-neutral-400"}`}>
                                                                                    <span>•</span>
                                                                                    <span>{cleanMarkdown(obs)}</span>
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                )}

                                                                {/* Positive Aspects */}
                                                                {analysis?.positiveAspects && analysis.positiveAspects.length > 0 && (
                                                                    <div className="mb-4">
                                                                        <h4 className={`text-sm font-medium mb-2 flex items-center gap-2 ${isLight ? "text-green-700" : "text-green-400"}`}>
                                                                            <CheckCircle2 size={16} />
                                                                            Positive Aspects
                                                                        </h4>
                                                                        <ul className="space-y-1">
                                                                            {analysis.positiveAspects.map((aspect: string, i: number) => (
                                                                                <li key={i} className={`text-xs font-light flex items-start gap-2 ${isLight ? "text-green-600" : "text-green-400"}`}>
                                                                                    <span>•</span>
                                                                                    <span>{cleanMarkdown(aspect)}</span>
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                )}

                                                                {/* Issues */}
                                                                {analysis?.issues && analysis.issues.length > 0 && (
                                                                    <div>
                                                                        <h4 className={`text-sm font-medium mb-2 flex items-center gap-2 ${isLight ? "text-red-700" : "text-red-400"}`}>
                                                                            <AlertCircle size={16} />
                                                                            Issues Found
                                                                        </h4>
                                                                        <div className="space-y-2">
                                                                            {analysis.issues.slice(0, 2).map((issue: any, i: number) => (
                                                                                <div
                                                                                    key={i}
                                                                                    className={`p-2 border rounded-lg ${isLight ? "border-red-200 bg-red-50" : "border-red-500/20 bg-red-500/10"}`}
                                                                                >
                                                                                    <div className="flex items-start gap-2 mb-1">
                                                                                        <span className={`text-[10px] font-medium uppercase px-1.5 py-0.5 rounded ${issue.severity === "critical"
                                                                                            ? isLight ? "bg-red-600 text-white" : "bg-red-500 text-white"
                                                                                            : issue.severity === "high"
                                                                                                ? isLight ? "bg-orange-500 text-white" : "bg-orange-400 text-black"
                                                                                                : isLight ? "bg-neutral-400 text-white" : "bg-neutral-500 text-black"
                                                                                            }`}>
                                                                                            {issue.severity}
                                                                                        </span>
                                                                                        <p className={`text-xs font-medium flex-1 ${isLight ? "text-red-900" : "text-red-300"}`}>
                                                                                            {cleanMarkdown(issue.description)}
                                                                                        </p>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                            {analysis.issues.length > 2 && (
                                                                                <p className={`text-xs font-light ${isLight ? "text-neutral-500" : "text-neutral-400"}`}>
                                                                                    +{analysis.issues.length - 2} more issues
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Panel - Simple Screenshot Carousel */}
                                    <div className="lg:w-[35%] relative lg:sticky lg:top-6 h-[500px] lg:h-[600px] flex-shrink-0">
                                        {screenshots.length > 0 && (
                                            <div className={`relative w-full h-full rounded-xl overflow-hidden ${isLight ? "bg-neutral-100" : "bg-[#1E1E1E]"}`}>
                                                {/* Screenshot Display */}
                                                <div className="w-full h-full flex items-center justify-center p-4">
                                                    <div className={`relative rounded-lg overflow-hidden shadow-lg border-2 transition-all ${isLight ? "bg-white border-neutral-300" : "bg-[#1E1E1E] border-white/20"}`}>
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <img
                                                                src={screenshots[selectedStepIndex].signedUrl || screenshots[selectedStepIndex].s3Url}
                                                                alt={`Screenshot ${selectedStepIndex + 1}`}
                                                                className="max-w-full max-h-full object-contain block cursor-pointer"
                                                                draggable={false}
                                                                onClick={() => setSelectedScreenshotModal(selectedStepIndex)}
                                                            />
                                                        </div>
                                                        {/* Step Number Badge */}
                                                        <div className={`absolute bottom-2 right-2 px-3 py-1 rounded-lg text-xs font-medium ${isLight ? "bg-black/60 text-white" : "bg-white/20 text-white"}`}>
                                                            {selectedStepIndex + 1} / {screenshots.length}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Navigation Controls */}
                                                {screenshots.length > 1 && (
                                                    <>
                                                        {/* Previous Button */}
                                                        <button
                                                            onClick={() => {
                                                                if (selectedStepIndex > 0) {
                                                                    setSelectedStepIndex(selectedStepIndex - 1);
                                                                }
                                                            }}
                                                            disabled={selectedStepIndex === 0}
                                                            className={`absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isLight ? "bg-white/90 hover:bg-white border border-neutral-200 text-neutral-700" : "bg-[#1E1E1E]/90 hover:bg-[#1E1E1E] border border-white/10 text-neutral-300"}`}
                                                        >
                                                            <ChevronLeft size={20} />
                                                        </button>
                                                        {/* Next Button */}
                                                        <button
                                                            onClick={() => {
                                                                if (selectedStepIndex < screenshots.length - 1) {
                                                                    setSelectedStepIndex(selectedStepIndex + 1);
                                                                }
                                                            }}
                                                            disabled={selectedStepIndex === screenshots.length - 1}
                                                            className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isLight ? "bg-white/90 hover:bg-white border border-neutral-200 text-neutral-700" : "bg-[#1E1E1E]/90 hover:bg-[#1E1E1E] border border-white/10 text-neutral-300"}`}
                                                        >
                                                            <ChevronRight size={20} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

            {/* Thoughts Modal */}
            <AnimatePresence>
                {selectedThoughtsIndex !== null && screenshots[selectedThoughtsIndex] && (() => {
                    // Get analysis - works for both single and multiple personas
                    const analysis = activePersona
                        ? activeAnalysesByOrder.get(screenshots[selectedThoughtsIndex].orderIndex)
                        : null;
                    return analysis?.thoughts ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4"
                            onClick={() => setSelectedThoughtsIndex(null)}
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className={`relative max-w-2xl w-full rounded-xl shadow-2xl ${isLight ? "bg-white" : "bg-[#1E1E1E] border border-white/10"}`}
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Header */}
                                <div className={`flex items-center justify-between p-6 border-b ${isLight ? "border-neutral-200" : "border-white/10"}`}>
                                    <div>
                                        <h2 className={`text-lg font-semibold ${isLight ? "text-neutral-900" : "text-white"}`}>
                                            Full Thoughts - Step {selectedThoughtsIndex + 1}
                                        </h2>
                                        <p className={`text-sm font-light mt-1 ${isLight ? "text-neutral-500" : "text-neutral-400"}`}>
                                            {activePersona?.personaName || "Agent"}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setSelectedThoughtsIndex(null)}
                                        className={`p-2 rounded-lg transition-colors ${isLight
                                            ? "hover:bg-neutral-100 text-neutral-600"
                                            : "hover:bg-white/10 text-neutral-400"
                                        }`}
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                                {/* Content */}
                                <div className="p-6 max-h-[60vh] overflow-y-auto">
                                    <p className={`text-sm font-light leading-relaxed whitespace-pre-wrap ${isLight ? "text-neutral-600" : "text-neutral-400"}`}>
                                        {cleanMarkdown(analysis.thoughts)}
                                    </p>
                                </div>
                            </motion.div>
                        </motion.div>
                    ) : null;
                })()}
            </AnimatePresence>

            {/* Screenshot Modal */}
            <AnimatePresence>
                {selectedScreenshotModal !== null && screenshots[selectedScreenshotModal] && (
                    <div
                        className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4"
                        onClick={() => setSelectedScreenshotModal(null)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="max-w-7xl max-h-[90vh] relative"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setSelectedScreenshotModal(null)}
                                className="absolute top-4 right-4 p-2 bg-white/90 hover:bg-white text-black rounded-full transition-colors z-10 shadow-lg"
                            >
                                <X size={24} />
                            </button>
                            {selectedScreenshotModal > 0 && (
                                <button
                                    onClick={() => setSelectedScreenshotModal(selectedScreenshotModal - 1)}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/90 hover:bg-white text-black rounded-full transition-colors z-10 shadow-lg"
                                >
                                    <ChevronLeft size={24} />
                                </button>
                            )}
                            {selectedScreenshotModal < screenshots.length - 1 && (
                                <button
                                    onClick={() => setSelectedScreenshotModal(selectedScreenshotModal + 1)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/90 hover:bg-white text-black rounded-full transition-colors z-10 shadow-lg"
                                >
                                    <ChevronRight size={24} />
                                </button>
                            )}
                            <img
                                src={screenshots[selectedScreenshotModal].signedUrl || screenshots[selectedScreenshotModal].s3Url}
                                alt={`Screenshot ${selectedScreenshotModal + 1}`}
                                className="max-w-full max-h-[90vh] object-contain rounded-lg"
                            />
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-lg text-sm">
                                Step {selectedScreenshotModal + 1} of {screenshots.length}
                                {screenshots[selectedScreenshotModal].description && (
                                    <span className="ml-2 text-neutral-300">
                                        - {screenshots[selectedScreenshotModal].description}
                                    </span>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            </div>
        </div>
    );
}
