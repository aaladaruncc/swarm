"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Loader2, CheckCircle2, AlertCircle, Info, Share2 } from "lucide-react";

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

    const [result, setResult] = useState<SharedScreenshotTest | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [activePersonaIndex, setActivePersonaIndex] = useState<number>(0);

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
        const summaries = new Map<number, { summary?: string; overallScore?: number }>();
        const fullReport = result?.overallReport?.fullReport as any;
        if (fullReport?.personaResults) {
            fullReport.personaResults.forEach((entry: any) => {
                summaries.set(entry.personaIndex, {
                    summary: entry.summary,
                    overallScore: entry.overallScore,
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
        if (!activePersona) return new Map();
        const map = new Map();
        activePersona.analyses.forEach((analysis) => {
            map.set(analysis.screenshotOrder, analysis);
        });
        return map;
    }, [activePersona]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-neutral-950">
                <Loader2 className="animate-spin w-8 h-8 text-neutral-400" />
            </div>
        );
    }

    if (error || !result) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-neutral-950">
                <div className="text-center max-w-md text-white">
                    <AlertCircle size={48} className="mx-auto mb-4 text-red-400" />
                    <h1 className="text-2xl font-light mb-4">Report Not Available</h1>
                    <p className="mb-6 text-neutral-400">
                        {error || "This report doesn't exist or is no longer shared."}
                    </p>
                </div>
            </div>
        );
    }

    const { testRun, screenshots, overallReport } = result;
    const isCompleted = testRun.status === "completed";
    const isFailed = testRun.status === "failed";

    return (
        <div className="min-h-screen bg-neutral-950 text-white">
            {/* Shared Badge */}
            <div className="bg-blue-500/10 border-b border-blue-500/20">
                <div className="max-w-7xl mx-auto px-8 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-blue-300">
                        <Share2 size={16} />
                        <span>Shared Report</span>
                    </div>
                    <span className="text-xs text-neutral-500">
                        Created {new Date(testRun.createdAt).toLocaleDateString()}
                    </span>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-light tracking-tight mb-2">
                        {testRun.testName || "Screenshot Test Results"}
                    </h1>
                    {testRun.userDescription && (
                        <p className="font-light text-neutral-400">
                            {testRun.userDescription}
                        </p>
                    )}
                </div>

                {/* Failed State */}
                {isFailed && (
                    <div className="mb-6 p-4 border rounded-lg border-red-500/20 bg-red-500/10 text-red-400">
                        <div className="flex items-start gap-3">
                            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-sm">Analysis Failed</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Overall Score */}
                {isCompleted && overallReport && (
                    <div className="mb-6 p-6 border rounded-xl border-white/10 bg-[#1E1E1E]">
                        <div className="flex items-center gap-4">
                            <div className="text-5xl font-light">
                                {overallReport.score || 0}/100
                            </div>
                            <div className="flex-1">
                                <h2 className="text-lg font-medium mb-1">
                                    Overall Score
                                </h2>
                                <p className="text-sm font-light text-neutral-400">
                                    {overallReport.summary || "Analysis complete"}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Persona Tabs */}
                {hasMultiplePersonas && (
                    <div className="mb-6 p-4 border rounded-xl border-white/10 bg-[#1E1E1E]">
                        <div className="flex flex-wrap items-center gap-2">
                            {personaResults.map((persona) => {
                                const summary = personaSummaries.get(persona.personaIndex);
                                const isActive = persona.personaIndex === activePersonaIndex;
                                return (
                                    <button
                                        key={persona.personaIndex}
                                        onClick={() => setActivePersonaIndex(persona.personaIndex)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${isActive
                                                ? "bg-white text-neutral-900"
                                                : "bg-[#252525] text-neutral-400 hover:text-white"
                                            }`}
                                    >
                                        {persona.personaName}
                                        {summary?.overallScore !== undefined && summary?.overallScore !== null
                                            ? ` · ${summary.overallScore}/100`
                                            : ""}
                                    </button>
                                );
                            })}
                        </div>
                        {activePersona && personaSummaries.get(activePersona.personaIndex)?.summary && (
                            <p className="mt-3 text-sm font-light text-neutral-400">
                                {personaSummaries.get(activePersona.personaIndex)?.summary}
                            </p>
                        )}
                    </div>
                )}

                {/* Screenshots Analysis */}
                <div className="space-y-4">
                    <h2 className="text-xl font-medium">Screenshot Analysis</h2>
                    {screenshots.map((screenshot, index) => {
                        const analysis = hasMultiplePersonas && activePersona
                            ? activeAnalysesByOrder.get(screenshot.orderIndex)
                            : screenshot;
                        return (
                            <div
                                key={screenshot.id}
                                className="border rounded-xl p-6 border-white/10 bg-[#1E1E1E]"
                            >
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Screenshot */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="text-xs font-medium px-2 py-1 rounded bg-[#252525] text-neutral-400">
                                                Step {index + 1}
                                            </span>
                                            {screenshot.description && (
                                                <span className="text-xs font-light text-neutral-500">
                                                    {screenshot.description}
                                                </span>
                                            )}
                                        </div>
                                        <div className="rounded-lg overflow-hidden bg-[#252525]">
                                            <img
                                                src={screenshot.signedUrl || screenshot.s3Url}
                                                alt={`Screenshot ${index + 1}`}
                                                className="w-full h-auto"
                                            />
                                        </div>
                                    </div>

                                    {/* Analysis */}
                                    <div className="lg:col-span-2 space-y-4">
                                        {analysis?.thoughts && (
                                            <div>
                                                <h4 className="text-sm font-medium mb-2">Thoughts</h4>
                                                <p className="text-sm font-light text-neutral-400">
                                                    {analysis.thoughts}
                                                </p>
                                            </div>
                                        )}

                                        {analysis?.observations && analysis.observations.length > 0 && (
                                            <div>
                                                <h4 className="text-sm font-medium mb-2">Observations</h4>
                                                <ul className="space-y-1">
                                                    {analysis.observations.map((obs: string, i: number) => (
                                                        <li key={i} className="text-xs font-light flex items-start gap-2 text-neutral-400">
                                                            <span>•</span>
                                                            <span>{obs}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {analysis?.positiveAspects && analysis.positiveAspects.length > 0 && (
                                            <div>
                                                <h4 className="text-sm font-medium mb-2 flex items-center gap-2 text-green-400">
                                                    <CheckCircle2 size={16} />
                                                    Positive Aspects
                                                </h4>
                                                <ul className="space-y-1">
                                                    {analysis.positiveAspects.map((aspect: string, i: number) => (
                                                        <li key={i} className="text-xs font-light flex items-start gap-2 text-green-400">
                                                            <span>•</span>
                                                            <span>{aspect}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {analysis?.issues && analysis.issues.length > 0 && (
                                            <div>
                                                <h4 className="text-sm font-medium mb-2 flex items-center gap-2 text-red-400">
                                                    <AlertCircle size={16} />
                                                    Issues Found
                                                </h4>
                                                <div className="space-y-2">
                                                    {analysis.issues.map((issue: any, i: number) => (
                                                        <div
                                                            key={i}
                                                            className="p-3 border rounded-lg border-red-500/20 bg-red-500/10"
                                                        >
                                                            <div className="flex items-start gap-2 mb-1">
                                                                <span className={`text-[10px] font-medium uppercase px-1.5 py-0.5 rounded ${issue.severity === "critical"
                                                                        ? "bg-red-500 text-white"
                                                                        : issue.severity === "high"
                                                                            ? "bg-orange-400 text-black"
                                                                            : issue.severity === "medium"
                                                                                ? "bg-yellow-400 text-black"
                                                                                : "bg-neutral-500 text-black"
                                                                    }`}>
                                                                    {issue.severity}
                                                                </span>
                                                                <p className="text-xs font-medium flex-1 text-red-300">
                                                                    {issue.description}
                                                                </p>
                                                            </div>
                                                            <p className="text-xs font-light text-red-400">
                                                                → {issue.recommendation}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {analysis?.comparisonWithPrevious && index > 0 && (
                                            <div>
                                                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                                    <Info size={16} />
                                                    Comparison with Previous
                                                </h4>
                                                <p className="text-xs font-light text-neutral-400">
                                                    {analysis.comparisonWithPrevious}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="mt-12 pt-8 border-t border-white/10 text-center">
                    <p className="text-sm text-neutral-500">
                        Report generated by UX Testing Agent
                    </p>
                </div>
            </div>
        </div>
    );
}
