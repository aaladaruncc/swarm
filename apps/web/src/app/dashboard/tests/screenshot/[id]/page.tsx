"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { getScreenshotTest, rerunScreenshotTest, enableScreenshotTestSharing, disableScreenshotTestSharing, getScreenshotTestShareStatus, type ScreenshotTestResult, type ShareStatus } from "@/lib/screenshot-api";
import { Loader2, ArrowLeft, CheckCircle2, AlertCircle, Info, RefreshCw, Share2, Link as LinkIcon, Check, X } from "lucide-react";
import { useTheme } from "@/contexts/theme-context";

export default function ScreenshotTestResults() {
    type PersonaAnalysis = NonNullable<ScreenshotTestResult["personaResults"]>[number]["analyses"][number];
    const params = useParams();
    const router = useRouter();
    const { data: session, isPending } = useSession();
    const { theme } = useTheme();
    const isLight = theme === "light";

    const [result, setResult] = useState<ScreenshotTestResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [rerunning, setRerunning] = useState(false);
    const [rerunError, setRerunError] = useState("");
    const [activePersonaIndex, setActivePersonaIndex] = useState<number>(0);

    // Share state
    const [shareStatus, setShareStatus] = useState<ShareStatus | null>(null);
    const [shareLoading, setShareLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const testId = params.id as string;

    useEffect(() => {
        if (!session?.user || !testId) return;

        const fetchResults = async () => {
            try {
                const data = await getScreenshotTest(testId);
                setResult(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load results");
            } finally {
                setLoading(false);
            }
        };

        fetchResults();

        // Poll for updates if still analyzing
        const interval = setInterval(async () => {
            if (result?.testRun.status === "analyzing") {
                try {
                    const data = await getScreenshotTest(testId);
                    setResult(data);
                    if (data.testRun.status !== "analyzing") {
                        clearInterval(interval);
                    }
                } catch (err) {
                    console.error("Polling error:", err);
                }
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [session, testId, result?.testRun.status]);

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
        if (!activePersona) return new Map<number, PersonaAnalysis>();
        const map = new Map<number, PersonaAnalysis>();
        activePersona.analyses.forEach((analysis) => {
            map.set(analysis.screenshotOrder, analysis);
        });
        return map;
    }, [activePersona]);

    // Fetch share status on load - MUST be before any early returns
    useEffect(() => {
        if (!testId || !session?.user) return;
        getScreenshotTestShareStatus(testId)
            .then(setShareStatus)
            .catch(() => setShareStatus(null));
    }, [testId, session?.user]);

    if (isPending || loading) {
        return (
            <div className={`h-full flex items-center justify-center ${isLight ? "bg-neutral-50" : "bg-neutral-950"
                }`}>
                <Loader2 className={`animate-spin w-8 h-8 ${isLight ? "text-neutral-500" : "text-neutral-400"
                    }`} />
            </div>
        );
    }

    if (!session?.user) {
        router.push("/");
        return null;
    }

    if (error || !result) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8">
                <div className={`text-center max-w-md ${isLight ? "text-neutral-900" : "text-white"
                    }`}>
                    <h1 className="text-2xl font-light mb-4">Test Not Found</h1>
                    <p className={`mb-6 ${isLight ? "text-neutral-600" : "text-neutral-400"}`}>
                        {error || "The test you're looking for doesn't exist."}
                    </p>
                    <Link
                        href="/dashboard"
                        className={`px-6 py-2.5 transition-all text-sm font-medium inline-flex items-center gap-2 rounded-lg ${isLight
                            ? "bg-neutral-900 text-white hover:bg-neutral-800"
                            : "bg-white text-neutral-900 hover:bg-neutral-200"
                            }`}
                    >
                        ← Back to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    const { testRun, screenshots, overallReport } = result;
    const isAnalyzing = testRun.status === "analyzing";
    const isCompleted = testRun.status === "completed";
    const isFailed = testRun.status === "failed";

    const handleRerun = async () => {
        if (!testId || rerunning) return;
        setRerunning(true);
        setRerunError("");
        try {
            const data = await rerunScreenshotTest(testId);
            router.push(`/dashboard/tests/screenshot/${data.screenshotTestRun.id}`);
        } catch (err) {
            setRerunError(err instanceof Error ? err.message : "Failed to rerun test");
        } finally {
            setRerunning(false);
        }
    };

    const handleToggleShare = async () => {
        if (!testId || shareLoading) return;
        setShareLoading(true);
        try {
            if (shareStatus?.enabled) {
                const result = await disableScreenshotTestSharing(testId);
                setShareStatus(result);
            } else {
                const result = await enableScreenshotTestSharing(testId);
                setShareStatus(result);
            }
        } catch (err) {
            console.error("Failed to toggle sharing:", err);
        } finally {
            setShareLoading(false);
        }
    };

    const handleCopyShareLink = async () => {
        if (!shareStatus?.shareUrl) return;
        try {
            await navigator.clipboard.writeText(shareStatus.shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    return (
        <div className="h-full flex flex-col p-8 max-w-7xl mx-auto w-full overflow-auto">
            {/* Header */}
            <div className="mb-8 flex-shrink-0">
                <nav className="flex items-center gap-2 text-sm mb-6">
                    <Link
                        href="/dashboard"
                        className={`transition-colors font-light ${isLight
                            ? "text-neutral-600 hover:text-neutral-900"
                            : "text-neutral-400 hover:text-white"
                            }`}
                    >
                        Playground
                    </Link>
                    <span className={isLight ? "text-neutral-400" : "text-neutral-600"}>/</span>
                    <span className={isLight ? "text-neutral-900 font-medium" : "text-white font-medium"}>
                        {testRun.testName || "Screenshot Test"}
                    </span>
                </nav>
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className={`text-3xl font-light tracking-tight mb-2 ${isLight ? "text-neutral-900" : "text-white"
                            }`}>
                            {testRun.testName || "Screenshot Test Results"}
                        </h1>
                        {testRun.userDescription && (
                            <p className={`font-light ${isLight ? "text-neutral-500" : "text-neutral-400"
                                }`}>
                                {testRun.userDescription}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Share Button */}
                        {isCompleted && (
                            <div className="flex items-center gap-2">
                                {shareStatus?.enabled && shareStatus?.shareUrl ? (
                                    <>
                                        <button
                                            onClick={handleCopyShareLink}
                                            className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${isLight
                                                ? "border border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                                                : "border border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20"
                                                }`}
                                        >
                                            {copied ? <Check size={12} /> : <LinkIcon size={12} />}
                                            <span>{copied ? "Copied!" : "Copy Link"}</span>
                                        </button>
                                        <button
                                            onClick={handleToggleShare}
                                            disabled={shareLoading}
                                            className={`inline-flex items-center gap-1 px-2 py-1.5 text-xs rounded-lg transition-colors ${isLight
                                                ? "text-neutral-500 hover:text-neutral-700"
                                                : "text-neutral-500 hover:text-neutral-300"
                                                }`}
                                            title="Disable sharing"
                                        >
                                            <X size={12} />
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={handleToggleShare}
                                        disabled={shareLoading}
                                        className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${isLight
                                            ? "border border-neutral-200 text-neutral-700 hover:border-neutral-400"
                                            : "border border-white/10 text-neutral-300 hover:border-white/30"
                                            }`}
                                    >
                                        {shareLoading ? <Loader2 size={12} className="animate-spin" /> : <Share2 size={12} />}
                                        <span>{shareLoading ? "Sharing..." : "Share"}</span>
                                    </button>
                                )}
                            </div>
                        )}
                        <button
                            onClick={handleRerun}
                            disabled={rerunning || isAnalyzing}
                            className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isLight
                                ? "border border-neutral-200 text-neutral-700 hover:border-neutral-400 hover:text-neutral-900"
                                : "border border-white/10 text-neutral-300 hover:border-white/30 hover:text-white"
                                }`}
                        >
                            {rerunning ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                            <span>{rerunning ? "Rerunning..." : "Rerun"}</span>
                        </button>
                        <div className={`px-3 py-1.5 rounded-lg text-xs font-medium ${isAnalyzing
                            ? isLight ? "bg-blue-100 text-blue-700" : "bg-blue-500/20 text-blue-300"
                            : isCompleted
                                ? isLight ? "bg-green-100 text-green-700" : "bg-green-500/20 text-green-300"
                                : isLight ? "bg-red-100 text-red-700" : "bg-red-500/20 text-red-300"
                            }`}>
                            {isAnalyzing ? "Analyzing..." : isCompleted ? "Completed" : "Failed"}
                        </div>
                    </div>
                </div>
            </div>

            {/* Analyzing State */}
            {isAnalyzing && (
                <div className={`mb-6 p-6 border rounded-xl text-center ${isLight
                    ? "border-blue-200 bg-blue-50"
                    : "border-blue-500/20 bg-blue-500/10"
                    }`}>
                    <Loader2 className={`w-8 h-8 animate-spin mx-auto mb-3 ${isLight ? "text-blue-600" : "text-blue-400"
                        }`} />
                    <p className={`text-sm font-medium ${isLight ? "text-blue-900" : "text-blue-300"
                        }`}>
                        AI is analyzing your screenshots...
                    </p>
                    <p className={`text-xs font-light mt-1 ${isLight ? "text-blue-700" : "text-blue-400"
                        }`}>
                        This usually takes 30-60 seconds
                    </p>
                </div>
            )}

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
                            <p className="text-xs font-light mt-1">
                                {testRun.errorMessage || "An error occurred during analysis"}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {rerunError && (
                <div className={`mb-6 p-4 border rounded-lg text-sm font-light ${isLight
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-red-500/20 bg-red-500/10 text-red-400"
                    }`}>
                    {rerunError}
                </div>
            )}

            {/* Overall Score */}
            {isCompleted && overallReport && (
                <div className={`mb-6 p-6 border rounded-xl ${isLight
                    ? "border-neutral-200 bg-white"
                    : "border-white/10 bg-[#1E1E1E]"
                    }`}>
                    <div className="flex items-center gap-4">
                        <div className={`text-5xl font-light ${isLight ? "text-neutral-900" : "text-white"
                            }`}>
                            {overallReport.score || 0}/100            </div>
                        <div className="flex-1">
                            <h2 className={`text-lg font-medium mb-1 ${isLight ? "text-neutral-900" : "text-white"
                                }`}>
                                Overall Score
                            </h2>
                            <p className={`text-sm font-light ${isLight ? "text-neutral-600" : "text-neutral-400"
                                }`}>
                                {overallReport.summary || "Analysis complete"}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {hasMultiplePersonas && (
                <div className={`mb-6 p-4 border rounded-xl ${isLight
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
                                    {summary?.overallScore !== undefined && summary?.overallScore !== null
                                        ? ` · ${summary.overallScore}/100`
                                        : ""}
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

            {/* Screenshots Analysis */}
            <div className="space-y-4">
                <h2 className={`text-xl font-medium ${isLight ? "text-neutral-900" : "text-white"
                    }`}>
                    Screenshot Analysis
                </h2>
                {screenshots.map((screenshot, index) => {
                    const analysis = hasMultiplePersonas && activePersona
                        ? activeAnalysesByOrder.get(screenshot.orderIndex)
                        : screenshot;
                    return (
                        <div
                            key={screenshot.id}
                            className={`border rounded-xl p-6 ${isLight
                                ? "border-neutral-200 bg-white"
                                : "border-white/10 bg-[#1E1E1E]"
                                }`}
                        >
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Screenshot */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className={`text-xs font-medium px-2 py-1 rounded ${isLight ? "bg-neutral-100 text-neutral-600" : "bg-[#252525] text-neutral-400"
                                            }`}>
                                            Step {index + 1}
                                        </span>
                                        {screenshot.description && (
                                            <span className={`text-xs font-light ${isLight ? "text-neutral-500" : "text-neutral-500"
                                                }`}>
                                                {screenshot.description}
                                            </span>
                                        )}
                                    </div>
                                    <div className={`rounded-lg overflow-hidden ${isLight ? "bg-neutral-100" : "bg-[#252525]"
                                        }`}>
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
                                            <h4 className={`text-sm font-medium mb-2 ${isLight ? "text-neutral-900" : "text-white"
                                                }`}>
                                                Thoughts
                                            </h4>
                                            <p className={`text-sm font-light ${isLight ? "text-neutral-600" : "text-neutral-400"
                                                }`}>
                                                {analysis.thoughts}
                                            </p>
                                        </div>
                                    )}

                                    {analysis?.observations && analysis.observations.length > 0 && (
                                        <div>
                                            <h4 className={`text-sm font-medium mb-2 ${isLight ? "text-neutral-900" : "text-white"
                                                }`}>
                                                Observations
                                            </h4>
                                            <ul className="space-y-1">
                                                {analysis.observations.map((obs, i) => (
                                                    <li key={i} className={`text-xs font-light flex items-start gap-2 ${isLight ? "text-neutral-600" : "text-neutral-400"
                                                        }`}>
                                                        <span>•</span>
                                                        <span>{obs}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {analysis?.positiveAspects && analysis.positiveAspects.length > 0 && (
                                        <div>
                                            <h4 className={`text-sm font-medium mb-2 flex items-center gap-2 ${isLight ? "text-green-700" : "text-green-400"
                                                }`}>
                                                <CheckCircle2 size={16} />
                                                Positive Aspects
                                            </h4>
                                            <ul className="space-y-1">
                                                {analysis.positiveAspects.map((aspect, i) => (
                                                    <li key={i} className={`text-xs font-light flex items-start gap-2 ${isLight ? "text-green-600" : "text-green-400"
                                                        }`}>
                                                        <span>•</span>
                                                        <span>{aspect}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {analysis?.issues && analysis.issues.length > 0 && (
                                        <div>
                                            <h4 className={`text-sm font-medium mb-2 flex items-center gap-2 ${isLight ? "text-red-700" : "text-red-400"
                                                }`}>
                                                <AlertCircle size={16} />
                                                Issues Found
                                            </h4>
                                            <div className="space-y-2">
                                                {analysis.issues.map((issue, i) => (
                                                    <div
                                                        key={i}
                                                        className={`p-3 border rounded-lg ${isLight
                                                            ? "border-red-200 bg-red-50"
                                                            : "border-red-500/20 bg-red-500/10"
                                                            }`}
                                                    >
                                                        <div className="flex items-start gap-2 mb-1">
                                                            <span className={`text-[10px] font-medium uppercase px-1.5 py-0.5 rounded ${issue.severity === "critical"
                                                                ? isLight ? "bg-red-600 text-white" : "bg-red-500 text-white"
                                                                : issue.severity === "high"
                                                                    ? isLight ? "bg-orange-500 text-white" : "bg-orange-400 text-black"
                                                                    : issue.severity === "medium"
                                                                        ? isLight ? "bg-yellow-500 text-black" : "bg-yellow-400 text-black"
                                                                        : isLight ? "bg-neutral-400 text-white" : "bg-neutral-500 text-black"
                                                                }`}>
                                                                {issue.severity}
                                                            </span>
                                                            <p className={`text-xs font-medium flex-1 ${isLight ? "text-red-900" : "text-red-300"
                                                                }`}>
                                                                {issue.description}
                                                            </p>
                                                        </div>
                                                        <p className={`text-xs font-light ${isLight ? "text-red-700" : "text-red-400"
                                                            }`}>
                                                            → {issue.recommendation}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {analysis?.comparisonWithPrevious && index > 0 && (
                                        <div>
                                            <h4 className={`text-sm font-medium mb-2 flex items-center gap-2 ${isLight ? "text-neutral-900" : "text-white"
                                                }`}>
                                                <Info size={16} />
                                                Comparison with Previous
                                            </h4>
                                            <p className={`text-xs font-light ${isLight ? "text-neutral-600" : "text-neutral-400"
                                                }`}>
                                                {analysis.comparisonWithPrevious}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Back Button */}
            <div className="mt-8 flex-shrink-0">
                <Link
                    href="/dashboard"
                    className={`inline-flex items-center gap-2 px-6 py-2.5 transition-all text-sm font-medium rounded-lg ${isLight
                        ? "bg-neutral-900 text-white hover:bg-neutral-800"
                        : "bg-white text-neutral-900 hover:bg-neutral-200"
                        }`}
                >
                    <ArrowLeft size={16} />
                    Back to Dashboard
                </Link>
            </div>
        </div>
    );
}
