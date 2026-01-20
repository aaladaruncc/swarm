"use client";

import { useState } from "react";
import Image from "next/image";
import { type UXAgentRun, type TestRunWithReport } from "@/lib/batch-api";
import { ChevronDown, ChevronUp, Brain, Eye, MousePointer, Image as ImageIcon, AlertCircle, CheckCircle2, Clock, User, Loader2, ChevronLeft, ChevronRight, Lightbulb, MessageCircle, LayoutDashboard } from "lucide-react";
import { InsightsTab } from "./InsightsTab";
import { ThoughtsTab } from "./ThoughtsTab";
import { ChatTab } from "./ChatTab";
import { AggregatedInsights } from "./AggregatedInsights";
import { useTheme } from "@/contexts/theme-context";

interface UXAgentReportViewProps {
    uxagentRuns: UXAgentRun[];
    targetUrl: string;
    testRuns?: TestRunWithReport[];
}

// Helper to extract persona name from personaData or basicInfo
function getPersonaName(run: UXAgentRun, index: number): string {
    const personaData = run.personaData as any;
    if (personaData?.name) return personaData.name;
    const basicInfo = run.basicInfo as any;
    if (basicInfo?.persona) {
        // Try to extract name from persona string
        const match = basicInfo.persona.match(/(?:name[:\s]+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
        if (match) return match[1];
    }
    return `Agent ${index + 1}`;
}

// Helper to get status icon
function getStatusIcon(status: string, isLight: boolean = false) {
    switch (status) {
        case "completed": return <CheckCircle2 size={14} className={isLight ? "text-emerald-600" : "text-emerald-400"} />;
        case "failed": return <AlertCircle size={14} className={isLight ? "text-red-600" : "text-red-400"} />;
        case "running": return <Loader2 size={14} className={`animate-spin ${isLight ? "text-blue-600" : "text-blue-400"}`} />;
        default: return <Clock size={14} className={isLight ? "text-neutral-500" : "text-neutral-400"} />;
    }
}

export function UXAgentReportView({ uxagentRuns, targetUrl, testRuns }: UXAgentReportViewProps) {
    const { theme } = useTheme();
    const isLight = theme === "light";
    const [viewMode, setViewMode] = useState<"aggregate" | "individual">(uxagentRuns.length > 1 ? "aggregate" : "individual");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [activeTab, setActiveTab] = useState<"overview" | "thoughts" | "actions" | "memory" | "screenshots" | "insights" | "chat">("overview");

    if (uxagentRuns.length === 0) {
        return (
            <div className={`border p-8 text-center rounded-xl ${
                isLight
                    ? "bg-white border-neutral-200"
                    : "border-white/10 bg-[#1E1E1E]"
            }`}>
                <p className={`font-light ${
                    isLight ? "text-neutral-600" : "text-neutral-400"
                }`}>No UXAgent data available yet.</p>
            </div>
        );
    }

    const selectedRun = uxagentRuns[selectedIndex];


    const getStatusColor = (status: string) => {
        switch (status) {
            case "completed": return isLight ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
            case "failed": return isLight ? "text-red-700 bg-red-50 border-red-200" : "text-red-400 bg-red-500/10 border-red-500/20";
            case "running": return isLight ? "text-blue-700 bg-blue-50 border-blue-200" : "text-blue-400 bg-blue-500/10 border-blue-500/20";
            default: return isLight ? "text-neutral-600 bg-neutral-50 border-neutral-200" : "text-neutral-400 bg-neutral-500/10 border-neutral-500/20";
        }
    };

    const handlePrev = () => setSelectedIndex(Math.max(0, selectedIndex - 1));
    const handleNext = () => setSelectedIndex(Math.min(uxagentRuns.length - 1, selectedIndex + 1));

    return (
        <div className="space-y-6">
            {/* View Mode Toggle - Only show for multi-agent runs */}
            {uxagentRuns.length > 1 && (
                <div className={`flex items-center gap-2 border-b pb-4 ${
                    isLight ? "border-neutral-200" : "border-white/10"
                }`}>
                    <button
                        onClick={() => setViewMode("aggregate")}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all rounded-lg ${
                            viewMode === "aggregate"
                                ? isLight
                                    ? "bg-neutral-900 text-white border border-neutral-900"
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
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all rounded-lg ${
                            viewMode === "individual"
                                ? isLight
                                    ? "bg-neutral-900 text-white border border-neutral-900"
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
            {viewMode === "aggregate" && uxagentRuns.length > 1 && (
                <AggregatedInsights uxagentRuns={uxagentRuns} />
            )}

            {/* Individual View - Agent Selector */}
            {(viewMode === "individual" || uxagentRuns.length === 1) && (
                <>
                    <div className={`border p-4 rounded-xl ${
                        isLight
                            ? "bg-white border-neutral-200"
                            : "bg-[#1E1E1E] border-white/10"
                    }`}>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className={`text-sm font-medium uppercase tracking-wide ${
                                isLight ? "text-neutral-500" : "text-neutral-400"
                            }`}>
                                Agent Runs ({uxagentRuns.length})
                            </h3>
                            {uxagentRuns.length > 3 && (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handlePrev}
                                        disabled={selectedIndex === 0}
                                        className={`p-1 disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded ${
                                            isLight
                                                ? "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                                                : "text-neutral-400 hover:bg-white/5 hover:text-white"
                                        }`}
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <span className={`text-xs font-mono ${
                                        isLight ? "text-neutral-400" : "text-neutral-500"
                                    }`}>
                                        {selectedIndex + 1}/{uxagentRuns.length}
                                    </span>
                                    <button
                                        onClick={handleNext}
                                        disabled={selectedIndex === uxagentRuns.length - 1}
                                        className={`p-1 disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded ${
                                            isLight
                                                ? "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                                                : "text-neutral-400 hover:bg-white/5 hover:text-white"
                                        }`}
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            )}
                        </div>


                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {uxagentRuns.map((run, idx) => {
                                const isSelected = idx === selectedIndex;
                                const personaName = getPersonaName(run, idx);
                                const duration = run.startedAt && run.completedAt
                                    ? Math.round((new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)
                                    : null;

                                return (
                                    <button
                                        key={run.id}
                                        onClick={() => setSelectedIndex(idx)}
                                        className={`group relative p-4 text-left transition-all duration-200 rounded-lg ${
                                            isSelected
                                                ? isLight
                                                    ? "bg-neutral-900 text-white border-2 border-neutral-900 shadow-lg"
                                                    : "bg-[#252525] text-white border-2 border-white/20 shadow-lg"
                                                : isLight
                                                    ? "bg-white border border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50"
                                                    : "bg-[#1E1E1E] border border-white/10 hover:border-white/20 hover:bg-[#252525]"
                                        }`}
                                    >
                                        {/* Selection indicator */}
                                        {isSelected && !isLight && (
                                            <div className="absolute top-0 left-0 w-0 h-0 border-t-[20px] border-r-[20px] border-t-white/20 border-r-transparent opacity-30" />
                                        )}

                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                                    isSelected
                                                        ? isLight ? "bg-white/20" : "bg-white/10"
                                                        : isLight ? "bg-neutral-100" : "bg-white/5"
                                                }`}>
                                                    <User size={16} className={
                                                        isSelected
                                                            ? isLight ? "text-white" : "text-white"
                                                            : isLight ? "text-neutral-500" : "text-neutral-400"
                                                    } />
                                                </div>
                                                <div>
                                                    <h4 className={`font-medium text-sm ${
                                                        isSelected
                                                            ? isLight ? "text-white" : "text-white"
                                                            : isLight ? "text-neutral-700" : "text-neutral-300"
                                                    }`}>
                                                        {personaName}
                                                    </h4>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        {getStatusIcon(run.status, isLight)}
                                                        <span className={`text-xs capitalize ${
                                                            isSelected
                                                                ? isLight ? "text-white/80" : "text-neutral-300"
                                                                : isLight ? "text-neutral-500" : "text-neutral-500"
                                                        }`}>
                                                            {run.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {run.score !== null && (
                                                <div className={`text-right ${
                                                    isSelected
                                                        ? isLight ? "text-white" : "text-white"
                                                        : isLight ? "text-neutral-700" : "text-neutral-300"
                                                }`}>
                                                    <span className="text-lg font-light">{run.score}</span>
                                                    <span className={`text-xs ${
                                                        isSelected
                                                            ? isLight ? "text-white/80" : "text-neutral-400"
                                                            : isLight ? "text-neutral-500" : "text-neutral-500"
                                                    }`}>/10</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className={`flex items-center gap-4 text-xs pt-2 border-t ${
                                            isSelected
                                                ? isLight ? "border-white/20" : "border-white/10"
                                                : isLight ? "border-neutral-200" : "border-white/5"
                                        }`}>
                                            <span className={
                                                isSelected
                                                    ? isLight ? "text-white/80" : "text-neutral-300"
                                                    : isLight ? "text-neutral-500" : "text-neutral-500"
                                            }>
                                                {run.stepsTaken || 0} steps
                                            </span>
                                            <span className={
                                                isSelected
                                                    ? isLight ? "text-white/80" : "text-neutral-300"
                                                    : isLight ? "text-neutral-500" : "text-neutral-500"
                                            }>
                                                {run.screenshots?.length || 0} screenshots
                                            </span>
                                            {duration && (
                                                <span className={
                                                    isSelected
                                                        ? isLight ? "text-white/80" : "text-neutral-300"
                                                        : isLight ? "text-neutral-500" : "text-neutral-500"
                                                }>
                                                    {duration}s
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Current Run Details */}
                    {selectedRun && (
                        <div className="space-y-6">
                            {/* Run Header */}
                            <div className={`border p-6 rounded-xl ${
                                isLight
                                    ? "bg-white border-neutral-200"
                                    : "border-white/10 bg-[#1E1E1E]"
                            }`}>
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h2 className={`text-xl font-light mb-1 ${
                                            isLight ? "text-neutral-900" : "text-white"
                                        }`}>{selectedRun.intent}</h2>
                                        <p className={`text-sm font-light ${
                                            isLight ? "text-neutral-600" : "text-neutral-400"
                                        }`}>{selectedRun.startUrl}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className={`px-3 py-1 text-xs font-medium border rounded-lg ${getStatusColor(selectedRun.status)}`}>
                                            {selectedRun.status}
                                        </span>
                                        {selectedRun.score !== null && (
                                            <div className="text-right">
                                                <span className={`text-3xl font-light ${
                                                    isLight ? "text-neutral-900" : "text-white"
                                                }`}>{selectedRun.score}</span>
                                                <span className={`text-sm ${
                                                    isLight ? "text-neutral-500" : "text-neutral-400"
                                                }`}>/10</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-6 text-sm">
                                    <div>
                                        <p className={`text-xs uppercase tracking-wide mb-1 font-light ${
                                            isLight ? "text-neutral-500" : "text-neutral-400"
                                        }`}>Steps Taken</p>
                                        <p className={`font-light ${
                                            isLight ? "text-neutral-900" : "text-white"
                                        }`}>{selectedRun.stepsTaken || 0} steps</p>
                                    </div>
                                    <div>
                                        <p className={`text-xs uppercase tracking-wide mb-1 font-light ${
                                            isLight ? "text-neutral-500" : "text-neutral-400"
                                        }`}>Screenshots</p>
                                        <p className={`font-light ${
                                            isLight ? "text-neutral-900" : "text-white"
                                        }`}>{selectedRun.screenshots?.length || 0} captured</p>
                                    </div>
                                    <div>
                                        <p className={`text-xs uppercase tracking-wide mb-1 font-light ${
                                            isLight ? "text-neutral-500" : "text-neutral-400"
                                        }`}>Duration</p>
                                        <p className={`font-light ${
                                            isLight ? "text-neutral-900" : "text-white"
                                        }`}>
                                            {selectedRun.startedAt && selectedRun.completedAt
                                                ? `${Math.round((new Date(selectedRun.completedAt).getTime() - new Date(selectedRun.startedAt).getTime()) / 1000)}s`
                                                : "N/A"
                                            }
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className={`border-b ${
                                isLight ? "border-neutral-200" : "border-white/10"
                            }`}>
                                <div className="flex gap-1 overflow-x-auto">
                                    {[
                                        { key: "overview", label: "Overview", icon: Eye },
                                        { key: "thoughts", label: "Thoughts", icon: Brain },
                                        { key: "actions", label: "Actions", icon: MousePointer },
                                        { key: "screenshots", label: "Screenshots", icon: ImageIcon },
                                        { key: "insights", label: "Insights", icon: Lightbulb },
                                        { key: "chat", label: "Chat", icon: MessageCircle },
                                    ].map(({ key, label, icon: Icon }) => (
                                        <button
                                            key={key}
                                            onClick={() => setActiveTab(key as any)}
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

                            {/* Tab Content */}
                            <div className="min-h-[400px]">
                                {activeTab === "overview" && (
                                    <OverviewTab run={selectedRun} />
                                )}
                                {activeTab === "thoughts" && (
                                    <ThoughtsTab run={selectedRun} />
                                )}
                                {activeTab === "actions" && (
                                    <ActionsTab actions={selectedRun.actionTrace || []} />
                                )}
                                {activeTab === "memory" && (
                                    <MemoryTab memories={selectedRun.memoryTrace || []} />
                                )}
                                {activeTab === "screenshots" && (
                                    <ScreenshotsTab screenshots={selectedRun.screenshots || []} />
                                )}
                                {activeTab === "insights" && (
                                    <InsightsTab run={selectedRun} />
                                )}
                                {activeTab === "chat" && (
                                    <ChatTab run={selectedRun} />
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}


// Overview Tab
function OverviewTab({ run }: { run: UXAgentRun }) {
    const { theme } = useTheme();
    const isLight = theme === "light";
    const observations = run.observationTrace || [];
    const basicInfo = run.basicInfo as any || {};
    const timingMetrics = basicInfo.timing_metrics || {};
    const persona = basicInfo.persona || "";

    return (
        <div className="space-y-6">
            {/* Error if any */}
            {run.errorMessage && (
                <div className={`border-l-4 p-4 rounded-lg ${
                    isLight
                        ? "border-red-500 bg-red-50"
                        : "border-red-500 bg-red-500/10"
                }`}>
                    <div className={`flex items-center gap-2 font-medium mb-1 ${
                        isLight ? "text-red-700" : "text-red-400"
                    }`}>
                        <AlertCircle size={16} />
                        Error
                    </div>
                    <p className={`text-sm font-light ${
                        isLight ? "text-red-600" : "text-red-300"
                    }`}>{run.errorMessage}</p>
                </div>
            )}

            {/* Timing Metrics */}
            {Object.keys(timingMetrics).length > 0 && (
                <div className={`border p-6 rounded-xl ${
                    isLight
                        ? "bg-white border-neutral-200"
                        : "border-white/10 bg-[#1E1E1E]"
                }`}>
                    <h3 className={`text-lg font-medium mb-4 flex items-center gap-2 ${
                        isLight ? "text-neutral-900" : "text-white"
                    }`}>
                        <Clock size={18} />
                        Timing Metrics
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className={`p-4 border rounded-lg ${
                            isLight
                                ? "bg-neutral-50 border-neutral-200"
                                : "bg-[#252525] border-white/5"
                        }`}>
                            <p className={`text-xs uppercase tracking-wide font-light ${
                                isLight ? "text-neutral-500" : "text-neutral-400"
                            }`}>Total Duration</p>
                            <p className={`text-xl font-light ${
                                isLight ? "text-neutral-900" : "text-white"
                            }`}>{(timingMetrics.total_duration_ms / 1000).toFixed(1)}s</p>
                        </div>
                        <div className={`p-4 border rounded-lg ${
                            isLight
                                ? "bg-neutral-50 border-neutral-200"
                                : "bg-[#252525] border-white/5"
                        }`}>
                            <p className={`text-xs uppercase tracking-wide font-light ${
                                isLight ? "text-neutral-500" : "text-neutral-400"
                            }`}>Time to First Action</p>
                            <p className={`text-xl font-light ${
                                isLight ? "text-neutral-900" : "text-white"
                            }`}>{(timingMetrics.time_to_first_action_ms / 1000).toFixed(1)}s</p>
                        </div>
                        <div className={`p-4 border rounded-lg ${
                            isLight
                                ? "bg-neutral-50 border-neutral-200"
                                : "bg-[#252525] border-white/5"
                        }`}>
                            <p className={`text-xs uppercase tracking-wide font-light ${
                                isLight ? "text-neutral-500" : "text-neutral-400"
                            }`}>Avg Action Interval</p>
                            <p className={`text-xl font-light ${
                                isLight ? "text-neutral-900" : "text-white"
                            }`}>{(timingMetrics.average_action_interval_ms / 1000).toFixed(1)}s</p>
                        </div>
                        <div className={`p-4 border rounded-lg ${
                            isLight
                                ? "bg-neutral-50 border-neutral-200"
                                : "bg-[#252525] border-white/5"
                        }`}>
                            <p className={`text-xs uppercase tracking-wide font-light ${
                                isLight ? "text-neutral-500" : "text-neutral-400"
                            }`}>Backtracks</p>
                            <p className={`text-xl font-light ${
                                isLight ? "text-neutral-900" : "text-white"
                            }`}>{timingMetrics.backtrack_count || 0}</p>
                        </div>
                    </div>

                    {/* Hesitation Moments */}
                    {timingMetrics.hesitation_moments?.length > 0 && (
                        <div className="mt-4">
                            <p className={`text-sm font-medium mb-2 ${
                                isLight ? "text-amber-700" : "text-amber-400"
                            }`}>
                                ⚠️ {timingMetrics.hesitation_moments.length} Hesitation Moment(s) Detected
                            </p>
                            <div className="space-y-2">
                                {timingMetrics.hesitation_moments.slice(0, 3).map((h: any, idx: number) => (
                                    <div key={idx} className={`text-xs border p-2 rounded-lg ${
                                        isLight
                                            ? "bg-amber-50 border-amber-200 text-amber-700"
                                            : "bg-amber-500/10 border-amber-500/20 text-amber-300"
                                    }`}>
                                        <span className="font-medium">Step {h.step}:</span> Paused for {(h.duration_ms / 1000).toFixed(1)}s
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Persona Information */}
            {persona && (
                <div className={`border p-6 rounded-xl ${
                    isLight
                        ? "bg-white border-neutral-200"
                        : "border-white/10 bg-[#1E1E1E]"
                }`}>
                    <h3 className={`text-lg font-medium mb-4 ${
                        isLight ? "text-neutral-900" : "text-white"
                    }`}>Agent Persona</h3>
                    <div className={`p-4 max-h-40 overflow-y-auto rounded-lg border ${
                        isLight
                            ? "bg-neutral-50 border-neutral-200"
                            : "bg-[#252525] border-white/5"
                    }`}>
                        <pre className={`text-sm whitespace-pre-wrap font-light ${
                            isLight ? "text-neutral-700" : "text-neutral-300"
                        }`}>
                            {typeof persona === 'string' ? persona.slice(0, 1000) : JSON.stringify(persona, null, 2)}
                        </pre>
                    </div>
                </div>
            )}

            {/* Journey Summary */}
            <div className={`border p-6 rounded-xl ${
                isLight
                    ? "bg-white border-neutral-200"
                    : "border-white/10 bg-[#1E1E1E]"
            }`}>
                <h3 className={`text-lg font-medium mb-4 ${
                    isLight ? "text-neutral-900" : "text-white"
                }`}>Agent Journey</h3>
                <div className="space-y-4">
                    {observations.slice(0, 5).map((obs: any, idx: number) => (
                        <div key={idx} className="flex gap-4">
                            <div className="flex flex-col items-center">
                                <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-sm font-medium ${
                                    isLight
                                        ? "bg-neutral-900 border-neutral-900 text-white"
                                        : "bg-[#252525] border-white/10 text-white"
                                }`}>
                                    {idx + 1}
                                </div>
                                {idx < observations.length - 1 && (
                                    <div className={`w-0.5 h-full my-1 ${
                                        isLight ? "bg-neutral-200" : "bg-white/10"
                                    }`} />
                                )}
                            </div>
                            <div className="flex-1 pb-4">
                                <p className={`text-sm font-medium mb-1 ${
                                    isLight ? "text-neutral-900" : "text-white"
                                }`}>
                                    {obs.url || "Page Visit"}
                                </p>
                                <p className={`text-xs font-light ${
                                    isLight ? "text-neutral-500" : "text-neutral-400"
                                }`}>
                                    HTML Length: {obs.html_length?.toLocaleString() || 0} chars
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Log Summary */}
            {run.logContent && (
                <div className={`border p-6 rounded-xl ${
                    isLight
                        ? "bg-white border-neutral-200"
                        : "border-white/10 bg-[#1E1E1E]"
                }`}>
                    <h3 className={`text-lg font-medium mb-4 ${
                        isLight ? "text-neutral-900" : "text-white"
                    }`}>Session Log</h3>
                    <div className={`p-4 max-h-80 overflow-y-auto rounded-lg border ${
                        isLight
                            ? "bg-neutral-50 border-neutral-200"
                            : "bg-[#252525] border-white/5"
                    }`}>
                        <pre className={`text-xs font-mono whitespace-pre-wrap ${
                            isLight ? "text-neutral-700" : "text-neutral-300"
                        }`}>
                            {run.logContent.slice(0, 3000)}
                            {run.logContent.length > 3000 && "..."}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
}

// Actions Tab
function ActionsTab({ actions }: { actions: any[] }) {
    const { theme } = useTheme();
    const isLight = theme === "light";
    
    const getActionColor = (action: string) => {
        if (action === "click") return isLight ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-blue-500/10 text-blue-400 border-blue-500/20";
        if (action === "type") return isLight ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-purple-500/10 text-purple-400 border-purple-500/20";
        if (action === "goto_url") return isLight ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
        if (action === "terminate") return isLight ? "bg-red-50 text-red-700 border-red-200" : "bg-red-500/10 text-red-400 border-red-500/20";
        return isLight ? "bg-neutral-50 text-neutral-700 border-neutral-200" : "bg-neutral-500/10 text-neutral-400 border-neutral-500/20";
    };
    
    return (
        <div className={`border rounded-xl overflow-hidden ${
            isLight
                ? "bg-white border-neutral-200"
                : "border-white/10 bg-[#1E1E1E]"
        }`}>
            <div className={`p-4 border-b ${
                isLight
                    ? "bg-neutral-50 border-neutral-200"
                    : "bg-[#252525] border-white/10"
            }`}>
                <h3 className={`font-medium ${
                    isLight ? "text-neutral-900" : "text-white"
                }`}>Action Timeline</h3>
                <p className={`text-sm font-light ${
                    isLight ? "text-neutral-600" : "text-neutral-400"
                }`}>{actions.length} actions recorded</p>
            </div>
            <div className={`divide-y max-h-[500px] overflow-y-auto ${
                isLight ? "divide-neutral-100" : "divide-white/5"
            }`}>
                {actions.map((action, idx) => (
                    <div key={idx} className={`p-4 transition-colors ${
                        isLight ? "hover:bg-neutral-50" : "hover:bg-white/5"
                    }`}>
                        <div className="flex items-start gap-4">
                            <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-sm font-medium shrink-0 ${
                                isLight
                                    ? "bg-neutral-900 border-neutral-900 text-white"
                                    : "bg-[#252525] border-white/10 text-white"
                            }`}>
                                {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`px-2 py-0.5 text-xs font-medium border rounded ${getActionColor(action.action)}`}>
                                        {action.action}
                                    </span>
                                    {action.target && (
                                        <span className={`text-xs truncate font-light ${
                                            isLight ? "text-neutral-600" : "text-neutral-400"
                                        }`}>
                                            Target: {action.target}
                                        </span>
                                    )}
                                </div>
                                <p className={`text-sm font-light ${
                                    isLight ? "text-neutral-700" : "text-neutral-300"
                                }`}>
                                    {action.description || JSON.stringify(action)}
                                </p>
                                {action.url && (
                                    <p className={`text-xs mt-1 truncate font-light ${
                                        isLight ? "text-neutral-500" : "text-neutral-500"
                                    }`}>
                                        URL: {action.url}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                {actions.length === 0 && (
                    <div className={`p-8 text-center font-light ${
                        isLight ? "text-neutral-600" : "text-neutral-400"
                    }`}>
                        No actions recorded
                    </div>
                )}
            </div>
        </div>
    );
}

// Memory Tab
function MemoryTab({ memories }: { memories: any[] }) {
    const { theme } = useTheme();
    const isLight = theme === "light";
    const [expanded, setExpanded] = useState<number | null>(null);

    const getMemoryTypeColor = (kind: string) => {
        switch (kind) {
            case "Observation": return isLight ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-blue-500/10 text-blue-400 border-blue-500/20";
            case "Plan": return isLight ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-purple-500/10 text-purple-400 border-purple-500/20";
            case "Reflection": return isLight ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-amber-500/10 text-amber-400 border-amber-500/20";
            case "Action": return isLight ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
            default: return isLight ? "bg-neutral-50 text-neutral-700 border-neutral-200" : "bg-neutral-500/10 text-neutral-400 border-neutral-500/20";
        }
    };

    // Group by kind for summary
    const kindCounts: Record<string, number> = {};
    memories.forEach(m => {
        kindCounts[m.kind] = (kindCounts[m.kind] || 0) + 1;
    });

    return (
        <div className="space-y-4">
            {/* Summary */}
            <div className="flex flex-wrap gap-2">
                {Object.entries(kindCounts).map(([kind, count]) => (
                    <span key={kind} className={`px-3 py-1 text-xs font-medium rounded-lg ${getMemoryTypeColor(kind)}`}>
                        {kind}: {count}
                    </span>
                ))}
            </div>

            {/* Memory List */}
            <div className={`border rounded-xl max-h-[500px] overflow-y-auto ${
                isLight
                    ? "bg-white border-neutral-200"
                    : "border-white/10 bg-[#1E1E1E]"
            }`}>
                {memories.slice(-50).reverse().map((memory, idx) => (
                    <div
                        key={idx}
                        className={`border-b last:border-0 ${
                            isLight ? "border-neutral-100" : "border-white/5"
                        }`}
                    >
                        <button
                            onClick={() => setExpanded(expanded === idx ? null : idx)}
                            className={`w-full p-4 flex items-center justify-between transition-colors text-left ${
                                isLight ? "hover:bg-neutral-50" : "hover:bg-white/5"
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <span className={`px-2 py-0.5 text-xs font-medium border rounded ${getMemoryTypeColor(memory.kind)}`}>
                                    {memory.kind}
                                </span>
                                <span className={`text-sm truncate max-w-md font-light ${
                                    isLight ? "text-neutral-700" : "text-neutral-300"
                                }`}>
                                    {memory.content?.substring(0, 80)}...
                                </span>
                            </div>
                            {expanded === idx ? (
                                <ChevronUp size={16} className={isLight ? "text-neutral-500" : "text-neutral-400"} />
                            ) : (
                                <ChevronDown size={16} className={isLight ? "text-neutral-500" : "text-neutral-400"} />
                            )}
                        </button>
                        {expanded === idx && (
                            <div className={`px-4 pb-4 ${
                                isLight ? "bg-neutral-50" : "bg-[#252525]"
                            }`}>
                                <pre className={`text-xs font-mono whitespace-pre-wrap ${
                                    isLight ? "text-neutral-700" : "text-neutral-300"
                                }`}>
                                    {memory.content}
                                </pre>
                            </div>
                        )}
                    </div>
                ))}
                {memories.length === 0 && (
                    <div className={`p-8 text-center font-light ${
                        isLight ? "text-neutral-600" : "text-neutral-400"
                    }`}>
                        No memory traces recorded
                    </div>
                )}
            </div>
        </div>
    );
}

// Screenshots Tab
function ScreenshotsTab({ screenshots }: { screenshots: any[] }) {
    const { theme } = useTheme();
    const isLight = theme === "light";
    const [selectedIdx, setSelectedIdx] = useState(0);

    if (screenshots.length === 0) {
        return (
            <div className={`border p-8 text-center rounded-xl ${
                isLight
                    ? "bg-white border-neutral-200"
                    : "border-white/10 bg-[#1E1E1E]"
            }`}>
                <ImageIcon size={48} className={`mx-auto mb-3 ${
                    isLight ? "text-neutral-500" : "text-neutral-400"
                }`} />
                <p className={`font-light ${
                    isLight ? "text-neutral-600" : "text-neutral-400"
                }`}>No screenshots captured</p>
            </div>
        );
    }

    const currentScreenshot = screenshots[selectedIdx];

    return (
        <div className="grid grid-cols-4 gap-4">
            {/* Thumbnail sidebar */}
            <div className={`col-span-1 border p-2 max-h-[500px] overflow-y-auto rounded-xl ${
                isLight
                    ? "bg-white border-neutral-200"
                    : "border-white/10 bg-[#1E1E1E]"
            }`}>
                <div className="space-y-2">
                    {screenshots.map((ss, idx) => (
                        <button
                            key={ss.id}
                            onClick={() => setSelectedIdx(idx)}
                            className={`w-full p-2 border transition-colors rounded-lg ${
                                selectedIdx === idx
                                    ? isLight
                                        ? "border-neutral-900 bg-neutral-900"
                                        : "border-white/20 bg-[#252525]"
                                    : isLight
                                        ? "border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50"
                                        : "border-white/10 hover:border-white/20 hover:bg-white/5"
                            }`}
                        >
                            <div className={`text-xs font-medium mb-1 ${
                                selectedIdx === idx
                                    ? isLight ? "text-white" : "text-neutral-300"
                                    : isLight ? "text-neutral-700" : "text-neutral-300"
                            }`}>Step {ss.stepNumber}</div>
                            {(ss.signedUrl || ss.s3Url) && (
                                <img
                                    src={ss.signedUrl || ss.s3Url}
                                    alt={`Step ${ss.stepNumber}`}
                                    className="w-full h-16 object-cover object-top rounded"
                                />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main view */}
            <div className={`col-span-3 border rounded-xl overflow-hidden ${
                isLight
                    ? "bg-white border-neutral-200"
                    : "border-white/10 bg-[#1E1E1E]"
            }`}>
                <div className={`p-4 border-b flex justify-between items-center ${
                    isLight
                        ? "bg-neutral-50 border-neutral-200"
                        : "bg-[#252525] border-white/10"
                }`}>
                    <div>
                        <h3 className={`font-medium ${
                            isLight ? "text-neutral-900" : "text-white"
                        }`}>Step {currentScreenshot.stepNumber}</h3>
                        <p className={`text-xs font-light ${
                            isLight ? "text-neutral-500" : "text-neutral-400"
                        }`}>{currentScreenshot.filename || "Screenshot"}</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setSelectedIdx(Math.max(0, selectedIdx - 1))}
                            disabled={selectedIdx === 0}
                            className={`px-3 py-1 border text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-lg ${
                                isLight
                                    ? "bg-white border-neutral-200 text-neutral-900 hover:bg-neutral-50"
                                    : "bg-[#1E1E1E] border-white/10 text-white hover:bg-[#252525]"
                            }`}
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setSelectedIdx(Math.min(screenshots.length - 1, selectedIdx + 1))}
                            disabled={selectedIdx === screenshots.length - 1}
                            className={`px-3 py-1 border text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-lg ${
                                isLight
                                    ? "bg-white border-neutral-200 text-neutral-900 hover:bg-neutral-50"
                                    : "bg-[#1E1E1E] border-white/10 text-white hover:bg-[#252525]"
                            }`}
                        >
                            Next
                        </button>
                    </div>
                </div>
                {(currentScreenshot.signedUrl || currentScreenshot.s3Url) ? (
                    <div className={`p-4 ${
                        isLight ? "bg-neutral-50" : "bg-[#252525]"
                    }`}>
                        <img
                            src={currentScreenshot.signedUrl || currentScreenshot.s3Url}
                            alt={`Step ${currentScreenshot.stepNumber}`}
                            className={`w-full h-auto border shadow-lg rounded-lg ${
                                isLight ? "border-neutral-200" : "border-white/10"
                            }`}
                        />
                    </div>
                ) : (
                    <div className={`p-8 text-center font-light ${
                        isLight ? "text-neutral-600" : "text-neutral-400"
                    }`}>
                        Screenshot not available
                    </div>
                )}
            </div>
        </div>
    );
}
