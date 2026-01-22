"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useSession } from "@/lib/auth-client";
import { getScreenshotTest, rerunScreenshotTest, enableScreenshotTestSharing, disableScreenshotTestSharing, getScreenshotTestShareStatus, type ScreenshotTestResult, type ShareStatus } from "@/lib/screenshot-api";
import { Loader2, ArrowLeft, CheckCircle2, AlertCircle, Info, RefreshCw, Share2, Link as LinkIcon, Check, X, LayoutGrid, List, Lightbulb, MessageCircle, ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight, Clipboard, Settings, FileText } from "lucide-react";
import { useTheme } from "@/contexts/theme-context";
import { ScreenshotCanvas } from "@/components/screenshot-tests/ScreenshotCanvas";
import { AggregatedScreenshotInsights } from "@/components/screenshot-tests/AggregatedScreenshotInsights";
import { ShineBorder } from "@/components/ui/shine-border";
import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cleanMarkdown } from "@/lib/utils";

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
    const [activeTab, setActiveTab] = useState<"insights" | "agent-sessions">("insights");
    const [selectedStepIndex, setSelectedStepIndex] = useState<number>(0);
    const [canvasPan, setCanvasPan] = useState({ x: 0, y: 0 });
    const [canvasZoom, setCanvasZoom] = useState(1);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [selectedScreenshotModal, setSelectedScreenshotModal] = useState<number | null>(null);
    const [selectedThoughtsIndex, setSelectedThoughtsIndex] = useState<number | null>(null);
    const canvasRef = useRef<HTMLDivElement>(null);

    // Share state
    const [shareStatus, setShareStatus] = useState<ShareStatus | null>(null);
    const [shareLoading, setShareLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareTab, setShareTab] = useState<"private" | "public">("private");
    const [showSharePopup, setShowSharePopup] = useState(false);
    const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
    const shareButtonRef = useRef<HTMLButtonElement>(null);

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
    }, [session, testId]);

    // Poll for updates if still analyzing - separate effect to avoid dependency issues
    useEffect(() => {
        if (!testId) return;

        // Only poll if status is analyzing
        if (!result || result.testRun.status !== "analyzing") return;

        const interval = setInterval(async () => {
            try {
                const data = await getScreenshotTest(testId);
                const oldAnalysisCount = result?.personaResults?.reduce((sum, p) => sum + (p.analyses?.length || 0), 0) || 0;
                const newAnalysisCount = data?.personaResults?.reduce((sum, p) => sum + (p.analyses?.length || 0), 0) || 0;
                
                if (newAnalysisCount !== oldAnalysisCount) {
                    console.log(`[Polling] Analysis count changed: ${oldAnalysisCount} -> ${newAnalysisCount}`);
                }
                
                setResult(data);
                // Stop polling if no longer analyzing
                if (data.testRun.status !== "analyzing") {
                    clearInterval(interval);
                }
            } catch (err) {
                console.error("Polling error:", err);
            }
        }, 1500); // Poll every 1.5 seconds for faster updates

        return () => clearInterval(interval);
    }, [testId, result?.testRun.status]);

    const personaResults = result?.personaResults ?? [];
    const screenshots = result?.screenshots ?? [];
    
    // Create a stable key that changes when analyses are added - this ensures useMemo recalculates
    const analysesKey = useMemo(() => {
        return personaResults.map(p => `${p.personaIndex}:${p.analyses?.length || 0}`).join('|');
    }, [personaResults]);
    
    // Calculate analyzing step - memoized to track changes
    const analyzingStep = useMemo(() => {
        if (!result || result.testRun.status !== "analyzing" || personaResults.length === 0) return 1;
        // Get the maximum number of analyses across all personas
        const maxAnalyses = personaResults.reduce((max, persona) => {
            const count = persona.analyses?.length || 0;
            return Math.max(max, count);
        }, 0);
        // Current step is the next one to be analyzed (1-indexed)
        const currentStep = Math.max(1, Math.min(maxAnalyses + 1, screenshots.length));
        console.log('[Analyzing Step]', { 
            maxAnalyses, 
            currentStep, 
            totalScreenshots: screenshots.length, 
            personaCount: personaResults.length,
            analysesKey,
            analysesPerPersona: personaResults.map(p => ({ index: p.personaIndex, count: p.analyses?.length || 0 }))
        });
        return currentStep;
    }, [result?.testRun.status, analysesKey, screenshots.length]);

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

    // Refresh share status when modal opens
    useEffect(() => {
        if (showShareModal && testId && session?.user) {
            getScreenshotTestShareStatus(testId)
                .then(setShareStatus)
                .catch(() => setShareStatus(null));
        }
    }, [showShareModal, testId, session?.user]);

    // Update popup position when it opens
    useEffect(() => {
        if (showSharePopup && shareButtonRef.current) {
            const rect = shareButtonRef.current.getBoundingClientRect();
            setPopupPosition({
                top: rect.bottom + window.scrollY + 8,
                left: rect.left + window.scrollX,
            });
        }
    }, [showSharePopup]);

    // Close share popup when clicking outside
    useEffect(() => {
        if (!showSharePopup) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (shareButtonRef.current && !shareButtonRef.current.contains(event.target as Node)) {
                const popup = document.querySelector('[data-share-popup]');
                if (popup && !popup.contains(event.target as Node)) {
                    setShowSharePopup(false);
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showSharePopup]);

    // Center selected screenshot when step changes or window resizes
    // Must be defined before early returns to follow Rules of Hooks
    const screenshotsLength = result?.screenshots?.length ?? 0;
    const centerSelectedScreenshot = useCallback(() => {
        if (canvasRef.current && screenshotsLength > 0) {
            const screenshotWidth = 400;
            const gap = 40;
            const padding = 40;
            const containerWidth = canvasRef.current.offsetWidth;
            const viewportCenterX = containerWidth / 2;
            const selectedScreenshotX = padding + selectedStepIndex * (screenshotWidth + gap) + screenshotWidth / 2;
            const panX = viewportCenterX - selectedScreenshotX;
            setCanvasPan(prev => ({ x: panX, y: prev.y }));
        }
    }, [selectedStepIndex, screenshotsLength]);

    useEffect(() => {
        centerSelectedScreenshot();
    }, [centerSelectedScreenshot]);

    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            centerSelectedScreenshot();
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [centerSelectedScreenshot]);

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

    const { testRun, overallReport } = result;
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

    const handleShareClick = async () => {
        if (!testId || shareLoading) return;
        
        // If already shared, just copy the link immediately
        if (shareStatus?.enabled && shareStatus?.shareUrl) {
            try {
                await navigator.clipboard.writeText(shareStatus.shareUrl);
                setShowSharePopup(true);
            } catch (err) {
                console.error("Failed to copy:", err);
            }
            return;
        }
        
        // Otherwise, enable sharing and copy immediately
        setShareLoading(true);
        try {
            const result = await enableScreenshotTestSharing(testId);
            setShareStatus(result);
            // Automatically copy link when enabling sharing
            if (result.shareUrl) {
                await navigator.clipboard.writeText(result.shareUrl);
                setShowSharePopup(true);
            }
        } catch (err) {
            console.error("Failed to enable sharing:", err);
        } finally {
            setShareLoading(false);
        }
    };

    const handleCopyShareLink = async () => {
        if (!shareStatus?.shareUrl) return;
        try {
            await navigator.clipboard.writeText(shareStatus.shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    const handleToggleShare = async () => {
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

    const handleGeneratePublicLink = async () => {
        if (!shareStatus?.enabled && !shareLoading) {
            await handleToggleShare();
        }
    };

    return (
        <div className="h-full flex flex-col p-8 max-w-7xl mx-auto w-full overflow-hidden">
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
                        {/* Completed Status - Left Side */}
                        <div className={`px-3 py-1.5 rounded-lg text-xs font-medium ${isAnalyzing
                            ? isLight ? "bg-blue-100 text-blue-700" : "bg-blue-500/20 text-blue-300"
                            : isCompleted
                                ? isLight ? "bg-green-100 text-green-700" : "bg-green-500/20 text-green-300"
                                : isLight ? "bg-red-100 text-red-700" : "bg-red-500/20 text-red-300"
                            }`}>
                            {isAnalyzing ? "Analyzing..." : isCompleted ? "Completed" : "Failed"}
                        </div>
                        {/* Rerun Button */}
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
                        {/* Share Button */}
                        {isCompleted && (
                            <div className="relative">
                                <button
                                    ref={shareButtonRef}
                                    onClick={handleShareClick}
                                    disabled={shareLoading}
                                    className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isLight
                                        ? "border border-neutral-200 text-neutral-700 hover:border-neutral-400"
                                        : "border border-white/10 text-neutral-300 hover:border-white/30"
                                        }`}
                                >
                                    {shareLoading ? (
                                        <>
                                            <Loader2 size={12} className="animate-spin" />
                                            <span>Sharing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Share2 size={12} />
                                            <span>Share</span>
                                        </>
                                    )}
                                </button>
                                {/* Share Link Popup - Rendered via Portal */}
                                {showSharePopup && shareStatus?.shareUrl && typeof window !== 'undefined' && createPortal(
                                    <div
                                        data-share-popup
                                        className={`fixed z-[9999] min-w-[300px] rounded-lg border shadow-lg ${isLight
                                            ? "bg-white border-neutral-200"
                                            : "bg-[#1a1a1a] border-white/10"
                                            }`}
                                        style={{
                                            top: `${popupPosition.top}px`,
                                            left: `${popupPosition.left}px`,
                                        }}
                                    >
                                        <div className="p-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className={`text-xs font-medium ${isLight ? "text-neutral-700" : "text-neutral-300"}`}>
                                                    Share Link
                                                </span>
                                                <button
                                                    onClick={() => setShowSharePopup(false)}
                                                    className={`p-0.5 rounded transition-colors ${isLight
                                                        ? "text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100"
                                                        : "text-neutral-500 hover:text-neutral-300 hover:bg-white/10"
                                                        }`}
                                                    title="Close"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={shareStatus.shareUrl}
                                                    readOnly
                                                    className={`flex-1 px-2 py-1.5 text-xs rounded border ${isLight
                                                        ? "bg-neutral-50 border-neutral-200 text-neutral-700"
                                                        : "bg-[#252525] border-white/10 text-neutral-300"
                                                        }`}
                                                />
                                                <button
                                                    onClick={handleCopyShareLink}
                                                    className={`p-1.5 rounded transition-colors ${isLight
                                                        ? "text-neutral-600 hover:bg-neutral-100"
                                                        : "text-neutral-400 hover:bg-white/10"
                                                        }`}
                                                    title="Copy link"
                                                >
                                                    {copied ? <Check size={14} /> : <Clipboard size={14} />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>,
                                    document.body
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Analyzing State - Canvas View */}
            {isAnalyzing && (
                <div className="flex-1 min-h-0">
                    <ScreenshotCanvas
                        key={`canvas-${analyzingStep}-${personaResults.reduce((sum, p) => sum + (p.analyses?.length || 0), 0)}`}
                        screenshots={result?.screenshots ?? []}
                        isAnalyzing={isAnalyzing}
                        analyzingStep={analyzingStep}
                        totalSteps={result?.screenshots?.length ?? 0}
                    />
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



            {/* Screenshots Analysis - Only show when completed */}
            {isCompleted && (
                <div className="flex-1 flex flex-col min-h-0">
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

                    {/* Tab Content - Not scrollable */}
                    <div className="flex-1 min-h-0 flex flex-col">
                        {/* Insights Tab */}
                        {activeTab === "insights" && result && (
                            <div className="flex-1 overflow-y-auto min-h-0">
                                <AggregatedScreenshotInsights result={result} />
                            </div>
                        )}

                        {/* Agent Sessions Tab */}
                        {activeTab === "agent-sessions" && (
                            <div className="flex-1 min-h-0 flex flex-col">
                                {/* Dotted Container for Steps + Canvas - Horizontally scrollable */}
                                <div className={`border-2 border-dashed rounded-xl p-6 flex-1 min-h-0 flex flex-col ${isLight ? "border-neutral-300 bg-neutral-50/50" : "border-white/20 bg-[#1E1E1E]/50"}`}>
                                    {/* Split Layout: Steps on Left, Canvas on Right */}
                                    <div className="flex gap-6 flex-1 min-h-0">
                                    {/* Left Panel - Step Modules - Scrollable within container */}
                                    <div className="w-[65%] pr-4 overflow-y-auto flex-shrink-0">
                                        <div className="space-y-4">
                                        {screenshots.map((screenshot, index) => {
                                            const analysis = hasMultiplePersonas && activePersona
                                                ? activeAnalysesByOrder.get(screenshot.orderIndex)
                                                : null;
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
                                                                        {analysis.observations.map((obs, i) => (
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
                                                                        {analysis.positiveAspects.map((aspect, i) => (
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
                                                                {analysis.issues.slice(0, 2).map((issue, i) => (
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

                                    {/* Right Panel - Canvas Viewer with All Screenshots */}
                                    <div className="w-[35%] relative overflow-hidden rounded-xl flex-shrink-0" style={{ background: isLight ? "#f5f5f5" : "#1E1E1E" }}>
                                        {screenshots.length > 0 && (() => {
                                            const screenshotWidth = 400;
                                            const gap = 40;
                                            const padding = 40;
                                            
                                            const handleMouseDown = (e: React.MouseEvent) => {
                                                if (e.button === 0) {
                                                    setIsDragging(true);
                                                    setDragStart({ x: e.clientX - canvasPan.x, y: e.clientY - canvasPan.y });
                                                }
                                            };

                                            const handleMouseMove = (e: React.MouseEvent) => {
                                                if (isDragging) {
                                                    setCanvasPan({
                                                        x: e.clientX - dragStart.x,
                                                        y: e.clientY - dragStart.y,
                                                    });
                                                }
                                            };

                                            const handleMouseUp = () => {
                                                setIsDragging(false);
                                            };

                                            // Ref callback to set up wheel listener with passive: false
                                            const setCanvasRef = (element: HTMLDivElement | null) => {
                                                // Remove old listener if ref was already set
                                                if (canvasRef.current && canvasRef.current !== element) {
                                                    const oldElement = canvasRef.current;
                                                    const oldHandler = (oldElement as any).__wheelHandler;
                                                    if (oldHandler) {
                                                        oldElement.removeEventListener('wheel', oldHandler);
                                                    }
                                                }
                                                
                                                if (element) {
                                                    const handleWheel = (e: WheelEvent) => {
                                                        e.preventDefault();
                                                        const delta = e.deltaY * -0.001;
                                                        const newZoom = Math.min(Math.max(0.5, canvasZoom + delta), 3);
                                                        setCanvasZoom(newZoom);
                                                    };
                                                    
                                                    // Store handler on element for cleanup
                                                    (element as any).__wheelHandler = handleWheel;
                                                    element.addEventListener('wheel', handleWheel, { passive: false });
                                                    // Update ref using Object.assign or direct property access
                                                    (canvasRef as any).current = element;
                                                }
                                            };

                                            return (
                                                <>
                                                    {/* Canvas Container */}
                                                    <div
                                                        ref={setCanvasRef}
                                                        className="relative h-full w-full overflow-hidden cursor-grab active:cursor-grabbing"
                                                        onMouseDown={handleMouseDown}
                                                        onMouseMove={handleMouseMove}
                                                        onMouseUp={handleMouseUp}
                                                        onMouseLeave={handleMouseUp}
                                                    >
                                                        {/* Grid Background */}
                                                        <div
                                                            className="absolute inset-0"
                                                            style={{
                                                                backgroundImage: isLight
                                                                    ? `radial-gradient(circle, #d4d4d4 1px, transparent 1px)`
                                                                    : `radial-gradient(circle, #404040 1px, transparent 1px)`,
                                                                backgroundSize: '20px 20px',
                                                                backgroundPosition: '0 0',
                                                            }}
                                                        />

                                                        {/* Screenshot Sequence */}
                                                        <div
                                                            className="absolute"
                                                            style={{
                                                                transform: `translate(${canvasPan.x}px, ${canvasPan.y}px) scale(${canvasZoom})`,
                                                                transformOrigin: '0 0',
                                                                display: 'flex',
                                                                gap: `${gap}px`,
                                                                padding: `${padding}px`,
                                                                transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                                                            }}
                                                        >
                                                            {screenshots.map((screenshot, index) => {
                                                                const isSelected = selectedStepIndex === index;
                                                                return (
                                                                    <div
                                                                        key={screenshot.id}
                                                                        className="relative flex-shrink-0"
                                                                        style={{ width: `${screenshotWidth}px` }}
                                                                    >
                                                                        <div className={`relative rounded-lg overflow-hidden shadow-lg border-2 transition-all cursor-pointer hover:opacity-90 ${
                                                                            isSelected
                                                                                ? isLight
                                                                                    ? 'border-neutral-900 bg-white ring-4 ring-neutral-900/20'
                                                                                    : 'border-white bg-[#1E1E1E] ring-4 ring-white/20'
                                                                                : isLight
                                                                                    ? 'border-neutral-300 bg-white'
                                                                                    : 'border-white/20 bg-[#1E1E1E]'
                                                                        }`}>
                                                                            <div className="w-full h-[400px] flex items-center justify-center bg-neutral-100 dark:bg-[#252525]">
                                                                                <img
                                                                                    src={screenshot.signedUrl || screenshot.s3Url}
                                                                                    alt={`Screenshot ${index + 1}`}
                                                                                    className="w-full h-full object-contain block"
                                                                                    draggable={false}
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setSelectedScreenshotModal(index);
                                                                                    }}
                                                                                />
                                                                            </div>
                                                                            {/* Step Number Badge */}
                                                                            <div className={`absolute bottom-2 right-2 px-3 py-1 rounded-lg text-xs font-medium ${
                                                                                isSelected
                                                                                    ? isLight ? "bg-neutral-900 text-white" : "bg-white text-neutral-900"
                                                                                    : isLight ? "bg-black/60 text-white" : "bg-white/20 text-white"
                                                                            }`}>
                                                                                {index + 1}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>


                                                    {/* Controls */}
                                                    <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg ${isLight ? "bg-white border border-neutral-200" : "bg-[#1E1E1E] border border-white/10"}`}>
                                                        <button
                                                            onClick={() => setCanvasZoom(prev => Math.max(prev - 0.2, 0.5))}
                                                            className={`p-2 rounded transition-colors ${isLight ? "hover:bg-neutral-100 text-neutral-700" : "hover:bg-white/10 text-neutral-300"}`}
                                                            title="Zoom Out"
                                                        >
                                                            <ZoomOut size={16} />
                                                        </button>
                                                        <span className={`text-xs font-medium px-2 ${isLight ? "text-neutral-600" : "text-neutral-400"}`}>
                                                            {Math.round(canvasZoom * 100)}%
                                                        </span>
                                                        <button
                                                            onClick={() => setCanvasZoom(prev => Math.min(prev + 0.2, 3))}
                                                            className={`p-2 rounded transition-colors ${isLight ? "hover:bg-neutral-100 text-neutral-700" : "hover:bg-white/10 text-neutral-300"}`}
                                                            title="Zoom In"
                                                        >
                                                            <ZoomIn size={16} />
                                                        </button>
                                                        <div className={`w-px h-6 mx-1 ${isLight ? "bg-neutral-200" : "bg-white/10"}`} />
                                                        <button
                                                            onClick={() => {
                                                                setCanvasZoom(1);
                                                                centerSelectedScreenshot();
                                                            }}
                                                            className={`p-2 rounded transition-colors ${isLight ? "hover:bg-neutral-100 text-neutral-700" : "hover:bg-white/10 text-neutral-300"}`}
                                                            title="Reset View"
                                                        >
                                                            <RotateCcw size={16} />
                                                        </button>
                                                    </div>

                                                    {/* Frame Navigation */}
                                                    {screenshots.length > 1 && (
                                                        <div className={`absolute top-4 right-4 flex items-center gap-2 ${isLight ? "bg-white/90" : "bg-[#1E1E1E]/90"} border ${isLight ? "border-neutral-200" : "border-white/10"} rounded-lg px-3 py-2`}>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (selectedStepIndex > 0) {
                                                                        setSelectedStepIndex(selectedStepIndex - 1);
                                                                    }
                                                                }}
                                                                disabled={selectedStepIndex === 0}
                                                                className={`p-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isLight ? "hover:bg-neutral-100 text-neutral-700" : "hover:bg-white/10 text-neutral-300"}`}
                                                            >
                                                                <ChevronLeft size={16} />
                                                            </button>
                                                            <span className={`text-xs font-light px-2 ${isLight ? "text-neutral-600" : "text-neutral-400"}`}>
                                                                {selectedStepIndex + 1} / {screenshots.length}
                                                            </span>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (selectedStepIndex < screenshots.length - 1) {
                                                                        setSelectedStepIndex(selectedStepIndex + 1);
                                                                    }
                                                                }}
                                                                disabled={selectedStepIndex === screenshots.length - 1}
                                                                className={`p-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isLight ? "hover:bg-neutral-100 text-neutral-700" : "hover:bg-white/10 text-neutral-300"}`}
                                                            >
                                                                <ChevronRight size={16} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Share Modal */}
            {showShareModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setShowShareModal(false)}
                    />
                    {/* Modal */}
                    <div className={`relative w-full max-w-md rounded-xl shadow-xl ${isLight ? "bg-white" : "bg-[#1E1E1E]"} border ${isLight ? "border-neutral-200" : "border-white/10"}`}>
                        {/* Header */}
                        <div className={`flex items-center justify-between p-4 border-b ${isLight ? "border-neutral-200" : "border-white/10"}`}>
                            <h2 className={`text-lg font-medium ${isLight ? "text-neutral-900" : "text-white"}`}>
                                Share Test
                            </h2>
                            <button
                                onClick={() => setShowShareModal(false)}
                                className={`p-1 rounded-lg transition-colors ${isLight
                                    ? "text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100"
                                    : "text-neutral-400 hover:text-white hover:bg-white/10"
                                    }`}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className={`flex border-b ${isLight ? "border-neutral-200" : "border-white/10"}`}>
                            <button
                                onClick={() => setShareTab("private")}
                                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${shareTab === "private"
                                    ? isLight
                                        ? "border-b-2 border-neutral-900 text-neutral-900"
                                        : "border-b-2 border-white text-white"
                                    : isLight
                                        ? "text-neutral-500 hover:text-neutral-700"
                                        : "text-neutral-400 hover:text-neutral-300"
                                    }`}
                            >
                                Private
                            </button>
                            <button
                                onClick={async () => {
                                    setShareTab("public");
                                    if (!shareStatus?.enabled) {
                                        await handleGeneratePublicLink();
                                    }
                                }}
                                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${shareTab === "public"
                                    ? isLight
                                        ? "border-b-2 border-neutral-900 text-neutral-900"
                                        : "border-b-2 border-white text-white"
                                    : isLight
                                        ? "text-neutral-500 hover:text-neutral-700"
                                        : "text-neutral-400 hover:text-neutral-300"
                                    }`}
                            >
                                Public
                            </button>
                        </div>

                        {/* Tab Content */}
                        <div className="p-6">
                            {shareTab === "private" ? (
                                <div>
                                    <p className={`text-sm font-light ${isLight ? "text-neutral-600" : "text-neutral-400"}`}>
                                        This test is private. Only you can view it.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {shareLoading ? (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 className={`animate-spin w-6 h-6 ${isLight ? "text-neutral-500" : "text-neutral-400"}`} />
                                        </div>
                                    ) : shareStatus?.enabled && shareStatus?.shareUrl ? (
                                        <div className="space-y-2">
                                            <label className={`block text-sm font-medium ${isLight ? "text-neutral-700" : "text-neutral-300"}`}>
                                                Share Link
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    readOnly
                                                    value={shareStatus.shareUrl}
                                                    className={`flex-1 px-3 py-2 text-sm rounded-lg border ${isLight
                                                        ? "bg-neutral-50 border-neutral-200 text-neutral-900"
                                                        : "bg-[#252525] border-white/10 text-neutral-100"
                                                        }`}
                                                />
                                                <button
                                                    onClick={handleCopyShareLink}
                                                    className={`p-2 rounded-lg transition-colors ${isLight
                                                        ? "border border-neutral-200 text-neutral-700 hover:bg-neutral-100"
                                                        : "border border-white/10 text-neutral-300 hover:bg-white/10"
                                                        }`}
                                                    title="Copy to clipboard"
                                                >
                                                    {copied ? <Check size={18} /> : <Clipboard size={18} />}
                                                </button>
                                            </div>
                                            {copied && (
                                                <p className={`text-xs ${isLight ? "text-green-600" : "text-green-400"}`}>
                                                    Copied to clipboard!
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8">
                                            <p className={`text-sm font-light ${isLight ? "text-neutral-600" : "text-neutral-400"}`}>
                                                Generate a public link to share this test.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Back Button - Bottom Right */}
            <div className="mt-8 flex-shrink-0 flex justify-end">
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

            {/* Thoughts Modal */}
            <AnimatePresence>
                {selectedThoughtsIndex !== null && screenshots[selectedThoughtsIndex] && (() => {
                    const analysis = hasMultiplePersonas && activePersona
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
    );
}
