"use client";

import { useState } from "react";
import Image from "next/image";
import { type UXAgentRun } from "@/lib/batch-api";
import { ChevronDown, ChevronUp, Brain, Eye, MousePointer, Image as ImageIcon, AlertCircle, CheckCircle2, Clock } from "lucide-react";

interface UXAgentReportViewProps {
    uxagentRuns: UXAgentRun[];
    targetUrl: string;
}

export function UXAgentReportView({ uxagentRuns, targetUrl }: UXAgentReportViewProps) {
    const [expandedRun, setExpandedRun] = useState<string | null>(uxagentRuns[0]?.id || null);
    const [activeTab, setActiveTab] = useState<"overview" | "actions" | "memory" | "screenshots">("overview");

    if (uxagentRuns.length === 0) {
        return (
            <div className="border border-neutral-200 p-8 text-center">
                <p className="text-neutral-500 font-light">No UXAgent data available yet.</p>
            </div>
        );
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case "completed": return "text-emerald-700 bg-emerald-50 border-emerald-200";
            case "failed": return "text-red-700 bg-red-50 border-red-200";
            case "running": return "text-blue-700 bg-blue-50 border-blue-200";
            default: return "text-neutral-700 bg-neutral-50 border-neutral-200";
        }
    };

    return (
        <div className="space-y-6">
            {/* Agent Run Selector */}
            <div className="border border-neutral-200 p-4">
                <h3 className="text-sm font-medium text-neutral-500 uppercase tracking-wide mb-3">Agent Runs</h3>
                <div className="flex flex-wrap gap-2">
                    {uxagentRuns.map((run, idx) => (
                        <button
                            key={run.id}
                            onClick={() => setExpandedRun(run.id)}
                            className={`px-4 py-2 border text-sm font-medium transition-colors ${expandedRun === run.id
                                ? "border-neutral-900 bg-neutral-900 text-white"
                                : "border-neutral-200 hover:border-neutral-400"
                                }`}
                        >
                            Agent {idx + 1}
                            {run.terminated && " (Terminated)"}
                        </button>
                    ))}
                </div>
            </div>

            {/* Current Run Details */}
            {expandedRun && (() => {
                const run = uxagentRuns.find(r => r.id === expandedRun);
                if (!run) return null;

                return (
                    <div className="space-y-6">
                        {/* Run Header */}
                        <div className="border border-neutral-900 bg-neutral-900 text-white p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h2 className="text-xl font-light mb-1">{run.intent}</h2>
                                    <p className="text-neutral-400 text-sm">{run.startUrl}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className={`px-3 py-1 text-xs font-medium border ${getStatusColor(run.status)}`}>
                                        {run.status}
                                    </span>
                                    {run.score !== null && (
                                        <div className="text-right">
                                            <span className="text-3xl font-light">{run.score}</span>
                                            <span className="text-neutral-400 text-sm">/10</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-6 text-sm">
                                <div>
                                    <p className="text-neutral-400 text-xs uppercase tracking-wide mb-1">Steps Taken</p>
                                    <p className="font-light">{run.stepsToken || 0} steps</p>
                                </div>
                                <div>
                                    <p className="text-neutral-400 text-xs uppercase tracking-wide mb-1">Screenshots</p>
                                    <p className="font-light">{run.screenshots?.length || 0} captured</p>
                                </div>
                                <div>
                                    <p className="text-neutral-400 text-xs uppercase tracking-wide mb-1">Duration</p>
                                    <p className="font-light">
                                        {run.startedAt && run.completedAt
                                            ? `${Math.round((new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)}s`
                                            : "N/A"
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="border-b border-neutral-200">
                            <div className="flex gap-1">
                                {[
                                    { key: "overview", label: "Overview", icon: Eye },
                                    { key: "actions", label: "Actions", icon: MousePointer },
                                    { key: "memory", label: "Memory", icon: Brain },
                                    { key: "screenshots", label: "Screenshots", icon: ImageIcon },
                                ].map(({ key, label, icon: Icon }) => (
                                    <button
                                        key={key}
                                        onClick={() => setActiveTab(key as any)}
                                        className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors ${activeTab === key
                                            ? "border-b-2 border-neutral-900 text-neutral-900"
                                            : "text-neutral-500 hover:text-neutral-900"
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
                                <OverviewTab run={run} />
                            )}
                            {activeTab === "actions" && (
                                <ActionsTab actions={run.actionTrace || []} />
                            )}
                            {activeTab === "memory" && (
                                <MemoryTab memories={run.memoryTrace || []} />
                            )}
                            {activeTab === "screenshots" && (
                                <ScreenshotsTab screenshots={run.screenshots || []} />
                            )}
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}

// Overview Tab
function OverviewTab({ run }: { run: UXAgentRun }) {
    const observations = run.observationTrace || [];

    return (
        <div className="space-y-6">
            {/* Error if any */}
            {run.errorMessage && (
                <div className="border-l-4 border-red-500 bg-red-50 p-4">
                    <div className="flex items-center gap-2 text-red-700 font-medium mb-1">
                        <AlertCircle size={16} />
                        Error
                    </div>
                    <p className="text-red-600 text-sm font-light">{run.errorMessage}</p>
                </div>
            )}

            {/* Journey Summary */}
            <div className="border border-neutral-200 p-6">
                <h3 className="text-lg font-medium mb-4">Agent Journey</h3>
                <div className="space-y-4">
                    {observations.slice(0, 5).map((obs: any, idx: number) => (
                        <div key={idx} className="flex gap-4">
                            <div className="flex flex-col items-center">
                                <div className="w-8 h-8 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center text-sm font-medium">
                                    {idx + 1}
                                </div>
                                {idx < observations.length - 1 && (
                                    <div className="w-0.5 h-full bg-neutral-200 my-1" />
                                )}
                            </div>
                            <div className="flex-1 pb-4">
                                <p className="text-sm font-medium text-neutral-900 mb-1">
                                    {obs.url || "Page Visit"}
                                </p>
                                <p className="text-xs text-neutral-500">
                                    HTML Length: {obs.html_length?.toLocaleString() || 0} chars
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Log Summary */}
            {run.logContent && (
                <div className="border border-neutral-200 p-6">
                    <h3 className="text-lg font-medium mb-4">Session Log</h3>
                    <div className="bg-neutral-50 p-4 max-h-80 overflow-y-auto">
                        <pre className="text-xs font-mono text-neutral-700 whitespace-pre-wrap">
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
    return (
        <div className="border border-neutral-200">
            <div className="p-4 bg-neutral-50 border-b border-neutral-200">
                <h3 className="font-medium">Action Timeline</h3>
                <p className="text-sm text-neutral-500 font-light">{actions.length} actions recorded</p>
            </div>
            <div className="divide-y divide-neutral-100 max-h-[500px] overflow-y-auto">
                {actions.map((action, idx) => (
                    <div key={idx} className="p-4 hover:bg-neutral-50 transition-colors">
                        <div className="flex items-start gap-4">
                            <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center text-sm font-medium shrink-0">
                                {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${action.action === "click" ? "bg-blue-100 text-blue-700" :
                                        action.action === "type" ? "bg-purple-100 text-purple-700" :
                                            action.action === "goto_url" ? "bg-green-100 text-green-700" :
                                                action.action === "terminate" ? "bg-red-100 text-red-700" :
                                                    "bg-neutral-100 text-neutral-700"
                                        }`}>
                                        {action.action}
                                    </span>
                                    {action.target && (
                                        <span className="text-xs text-neutral-500 truncate">
                                            Target: {action.target}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-neutral-700 font-light">
                                    {action.description || JSON.stringify(action)}
                                </p>
                                {action.url && (
                                    <p className="text-xs text-neutral-400 mt-1 truncate">
                                        URL: {action.url}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                {actions.length === 0 && (
                    <div className="p-8 text-center text-neutral-500 font-light">
                        No actions recorded
                    </div>
                )}
            </div>
        </div>
    );
}

// Memory Tab
function MemoryTab({ memories }: { memories: any[] }) {
    const [expanded, setExpanded] = useState<number | null>(null);

    const getMemoryTypeColor = (kind: string) => {
        switch (kind) {
            case "Observation": return "bg-blue-100 text-blue-700";
            case "Plan": return "bg-purple-100 text-purple-700";
            case "Reflection": return "bg-amber-100 text-amber-700";
            case "Action": return "bg-green-100 text-green-700";
            default: return "bg-neutral-100 text-neutral-700";
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
                    <span key={kind} className={`px-3 py-1 text-xs font-medium ${getMemoryTypeColor(kind)}`}>
                        {kind}: {count}
                    </span>
                ))}
            </div>

            {/* Memory List */}
            <div className="border border-neutral-200 max-h-[500px] overflow-y-auto">
                {memories.slice(-50).reverse().map((memory, idx) => (
                    <div
                        key={idx}
                        className="border-b border-neutral-100 last:border-0"
                    >
                        <button
                            onClick={() => setExpanded(expanded === idx ? null : idx)}
                            className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors text-left"
                        >
                            <div className="flex items-center gap-3">
                                <span className={`px-2 py-0.5 text-xs font-medium ${getMemoryTypeColor(memory.kind)}`}>
                                    {memory.kind}
                                </span>
                                <span className="text-sm text-neutral-700 truncate max-w-md">
                                    {memory.content?.substring(0, 80)}...
                                </span>
                            </div>
                            {expanded === idx ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                        {expanded === idx && (
                            <div className="px-4 pb-4 bg-neutral-50">
                                <pre className="text-xs font-mono text-neutral-600 whitespace-pre-wrap">
                                    {memory.content}
                                </pre>
                            </div>
                        )}
                    </div>
                ))}
                {memories.length === 0 && (
                    <div className="p-8 text-center text-neutral-500 font-light">
                        No memory traces recorded
                    </div>
                )}
            </div>
        </div>
    );
}

// Screenshots Tab
function ScreenshotsTab({ screenshots }: { screenshots: any[] }) {
    const [selectedIdx, setSelectedIdx] = useState(0);

    if (screenshots.length === 0) {
        return (
            <div className="border border-neutral-200 p-8 text-center">
                <ImageIcon size={48} className="mx-auto text-neutral-300 mb-3" />
                <p className="text-neutral-500 font-light">No screenshots captured</p>
            </div>
        );
    }

    const currentScreenshot = screenshots[selectedIdx];

    return (
        <div className="grid grid-cols-4 gap-4">
            {/* Thumbnail sidebar */}
            <div className="col-span-1 border border-neutral-200 p-2 max-h-[500px] overflow-y-auto">
                <div className="space-y-2">
                    {screenshots.map((ss, idx) => (
                        <button
                            key={ss.id}
                            onClick={() => setSelectedIdx(idx)}
                            className={`w-full p-2 border transition-colors ${selectedIdx === idx
                                ? "border-neutral-900 bg-neutral-100"
                                : "border-neutral-200 hover:border-neutral-400"
                                }`}
                        >
                            <div className="text-xs font-medium mb-1">Step {ss.stepNumber}</div>
                            {(ss.signedUrl || ss.s3Url) && (
                                <img
                                    src={ss.signedUrl || ss.s3Url}
                                    alt={`Step ${ss.stepNumber}`}
                                    className="w-full h-16 object-cover object-top"
                                />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main view */}
            <div className="col-span-3 border border-neutral-200">
                <div className="p-4 bg-neutral-50 border-b border-neutral-200 flex justify-between items-center">
                    <div>
                        <h3 className="font-medium">Step {currentScreenshot.stepNumber}</h3>
                        <p className="text-xs text-neutral-500">{currentScreenshot.filename || "Screenshot"}</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setSelectedIdx(Math.max(0, selectedIdx - 1))}
                            disabled={selectedIdx === 0}
                            className="px-3 py-1 border border-neutral-200 text-sm disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setSelectedIdx(Math.min(screenshots.length - 1, selectedIdx + 1))}
                            disabled={selectedIdx === screenshots.length - 1}
                            className="px-3 py-1 border border-neutral-200 text-sm disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
                {(currentScreenshot.signedUrl || currentScreenshot.s3Url) ? (
                    <div className="p-4 bg-neutral-100">
                        <img
                            src={currentScreenshot.signedUrl || currentScreenshot.s3Url}
                            alt={`Step ${currentScreenshot.stepNumber}`}
                            className="w-full h-auto border border-neutral-200 shadow-lg"
                        />
                    </div>
                ) : (
                    <div className="p-8 text-center text-neutral-500">
                        Screenshot not available
                    </div>
                )}
            </div>
        </div>
    );
}
