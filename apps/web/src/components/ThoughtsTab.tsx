"use client";

import { useState, useEffect } from "react";
import {
    type UXAgentRun,
    type UXAgentThought,
    getUXAgentThoughts,
} from "@/lib/batch-api";
import {
    Brain,
    Eye,
    MousePointer,
    Compass,
    Lightbulb,
    RefreshCw,
    Loader2,
    ChevronDown,
    ChevronUp,
    Filter
} from "lucide-react";

interface ThoughtsTabProps {
    run: UXAgentRun;
}

const kindIcons: Record<string, React.ReactNode> = {
    observation: <Eye size={14} />,
    action: <MousePointer size={14} />,
    plan: <Compass size={14} />,
    thought: <Lightbulb size={14} />,
    reflection: <RefreshCw size={14} />,
};

const kindColors: Record<string, string> = {
    observation: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    action: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    plan: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    thought: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    reflection: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

export function ThoughtsTab({ run }: ThoughtsTabProps) {
    const [thoughts, setThoughts] = useState<UXAgentThought[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [filterKind, setFilterKind] = useState<string | null>(null);
    const [usingFallback, setUsingFallback] = useState(false);

    useEffect(() => {
        loadThoughts();
    }, [run.id]);

    const loadThoughts = async () => {
        try {
            setLoading(true);
            const result = await getUXAgentThoughts(run.id);

            if (result.thoughts && result.thoughts.length > 0) {
                setThoughts(result.thoughts);
                setUsingFallback(false);
            } else if (run.memoryTrace && Array.isArray(run.memoryTrace) && run.memoryTrace.length > 0) {
                // Fall back to memoryTrace from the run
                const fallbackThoughts: UXAgentThought[] = (run.memoryTrace as any[]).map((m: any, idx: number) => ({
                    id: `fallback-${idx}`,
                    uxagentRunId: run.id,
                    kind: (m.kind || 'thought').toLowerCase() as any,
                    content: m.content || JSON.stringify(m),
                    importance: m.importance ? Math.round(m.importance * 100) : null,
                    stepNumber: idx + 1,
                    rawAction: m.raw_action || null,
                    agentTimestamp: m.timestamp || null,
                    createdAt: new Date().toISOString(),
                }));
                setThoughts(fallbackThoughts);
                setUsingFallback(true);
            } else {
                setThoughts([]);
            }
            setError(null);
        } catch (err) {
            console.error("Failed to load thoughts:", err);
            // Still try fallback on error
            if (run.memoryTrace && Array.isArray(run.memoryTrace) && run.memoryTrace.length > 0) {
                const fallbackThoughts: UXAgentThought[] = (run.memoryTrace as any[]).map((m: any, idx: number) => ({
                    id: `fallback-${idx}`,
                    uxagentRunId: run.id,
                    kind: (m.kind || 'thought').toLowerCase() as any,
                    content: m.content || JSON.stringify(m),
                    importance: m.importance ? Math.round(m.importance * 100) : null,
                    stepNumber: idx + 1,
                    rawAction: m.raw_action || null,
                    agentTimestamp: m.timestamp || null,
                    createdAt: new Date().toISOString(),
                }));
                setThoughts(fallbackThoughts);
                setUsingFallback(true);
                setError(null);
            } else {
                setError("Failed to load thoughts");
            }
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="border border-white/10 bg-[#1E1E1E] p-12 text-center rounded-xl">
                <Loader2 size={32} className="mx-auto text-neutral-400 mb-3 animate-spin" />
                <p className="text-neutral-400 font-light">Loading thoughts...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="border border-white/10 bg-[#1E1E1E] p-8 text-center rounded-xl">
                <p className="text-red-400">{error}</p>
                <button
                    onClick={loadThoughts}
                    className="mt-4 px-4 py-2 text-sm border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors rounded-lg"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (thoughts.length === 0) {
        return (
            <div className="border border-white/10 bg-[#1E1E1E] p-8 text-center rounded-xl">
                <Brain size={48} className="mx-auto text-neutral-400 mb-3" />
                <h3 className="text-white font-medium mb-1">No Thoughts Available</h3>
                <p className="text-neutral-400 font-light text-sm max-w-md mx-auto">
                    Thought data is captured when the agent explores your website.
                    This run may not have recorded any thoughts or memory traces.
                </p>
            </div>
        );
    }

    // Group counts by kind
    const kindCounts = thoughts.reduce((acc, t) => {
        acc[t.kind] = (acc[t.kind] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // Filter thoughts
    const filteredThoughts = filterKind
        ? thoughts.filter(t => t.kind === filterKind)
        : thoughts;

    return (
        <div className="space-y-4">
            {/* Fallback indicator */}
            {usingFallback && (
                <div className="bg-amber-500/10 border border-amber-500/20 p-3 text-sm text-amber-400 rounded-lg">
                    <span className="font-medium">Note:</span> Showing legacy memory trace data. New runs will have structured thoughts.
                </div>
            )}

            {/* Summary Stats */}
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => setFilterKind(null)}
                    className={`px-4 py-2 text-sm border transition-colors rounded-lg ${filterKind === null
                        ? "bg-[#252525] text-white border-white/10"
                        : "bg-[#1E1E1E] border-white/10 text-neutral-400 hover:text-white hover:bg-[#252525]"
                        }`}
                >
                    All ({thoughts.length})
                </button>
                {Object.entries(kindCounts).map(([kind, count]) => (
                    <button
                        key={kind}
                        onClick={() => setFilterKind(filterKind === kind ? null : kind)}
                        className={`px-4 py-2 text-sm border transition-colors flex items-center gap-2 rounded-lg ${filterKind === kind
                            ? "bg-[#252525] text-white border-white/10"
                            : `${kindColors[kind] || "bg-neutral-500/10"} hover:opacity-80`
                            }`}
                    >
                        {kindIcons[kind]}
                        <span className="capitalize">{kind}</span>
                        <span className="opacity-70">({count})</span>
                    </button>
                ))}
            </div>

            {/* Thoughts Timeline */}
            <div className="border border-white/10 bg-[#1E1E1E] rounded-xl overflow-hidden">
                <div className="p-4 bg-[#252525] border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Brain size={18} className="text-neutral-400" />
                        <h3 className="font-medium text-white">Agent Thought Process</h3>
                    </div>
                    <span className="text-sm text-neutral-400 font-light">
                        {filteredThoughts.length} of {thoughts.length} thoughts
                    </span>
                </div>

                <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
                    {filteredThoughts.map((thought, idx) => {
                        const isExpanded = expandedId === thought.id;
                        const isLongContent = thought.content.length > 200;

                        return (
                            <div
                                key={thought.id}
                                className="hover:bg-white/5 transition-colors"
                            >
                                <div
                                    className="p-4 cursor-pointer"
                                    onClick={() => setExpandedId(isExpanded ? null : thought.id)}
                                >
                                    <div className="flex items-start gap-4">
                                        {/* Step Number */}
                                        <div className="w-10 h-10 rounded-full bg-[#252525] text-white border border-white/10 flex items-center justify-center text-sm font-medium shrink-0">
                                            {thought.stepNumber || idx + 1}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium border rounded ${kindColors[thought.kind] || "bg-neutral-500/10"}`}>
                                                    {kindIcons[thought.kind]}
                                                    <span className="capitalize">{thought.kind}</span>
                                                </span>
                                                {thought.importance !== null && (
                                                    <span className="text-xs text-neutral-500 font-light">
                                                        Importance: {thought.importance}%
                                                    </span>
                                                )}
                                            </div>

                                            <p className={`text-sm text-neutral-300 font-light ${isExpanded ? "" : "line-clamp-2"
                                                }`}>
                                                {thought.content}
                                            </p>

                                            {isLongContent && (
                                                <button
                                                    className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-300 mt-2 font-light"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setExpandedId(isExpanded ? null : thought.id);
                                                    }}
                                                >
                                                    {isExpanded ? (
                                                        <>
                                                            <ChevronUp size={14} />
                                                            Show less
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ChevronDown size={14} />
                                                            Show more
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Expanded: Show raw action if available */}
                                    {isExpanded && thought.rawAction && (
                                        <div className="mt-4 ml-14 p-3 bg-[#252525] border border-white/10 rounded-lg">
                                            <p className="text-xs text-neutral-400 uppercase tracking-wide mb-2 font-light">Raw Action Data</p>
                                            <pre className="text-xs font-mono text-neutral-300 overflow-x-auto">
                                                {JSON.stringify(thought.rawAction, null, 2)}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
