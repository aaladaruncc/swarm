"use client";

import { useState, useEffect } from "react";
import { Loader2, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { useTheme } from "@/contexts/theme-context";

interface AnalysisProgressViewProps {
    screenshots: Array<{
        id: string;
        signedUrl?: string;
        s3Url?: string;
        orderIndex: number;
        description?: string | null;
    }>;
    isAnalyzing?: boolean;
    analyzingStep?: number;
    totalSteps?: number;
}

export function AnalysisProgressView({
    screenshots,
    isAnalyzing = false,
    analyzingStep = 0,
    totalSteps = 0,
}: AnalysisProgressViewProps) {
    const { theme } = useTheme();
    const isLight = theme === "light";

    // Current displayed screenshot (follows analyzing step by default)
    const [displayedIndex, setDisplayedIndex] = useState(0);
    const [autoFollow, setAutoFollow] = useState(true);

    const sortedScreenshots = [...screenshots].sort((a, b) => a.orderIndex - b.orderIndex);

    // Auto-follow the analyzing step
    useEffect(() => {
        if (autoFollow && isAnalyzing && analyzingStep > 0) {
            const targetIndex = Math.min(analyzingStep - 1, sortedScreenshots.length - 1);
            setDisplayedIndex(targetIndex);
        }
    }, [analyzingStep, isAnalyzing, autoFollow, sortedScreenshots.length]);

    const currentScreenshot = sortedScreenshots[displayedIndex];
    const isCurrentlyAnalyzing = isAnalyzing && displayedIndex === analyzingStep - 1;
    const isCompleted = displayedIndex < analyzingStep - 1;

    const goToPrevious = () => {
        setAutoFollow(false);
        setDisplayedIndex(prev => Math.max(0, prev - 1));
    };

    const goToNext = () => {
        setAutoFollow(false);
        setDisplayedIndex(prev => Math.min(sortedScreenshots.length - 1, prev + 1));
    };

    const goToStep = (index: number) => {
        setAutoFollow(false);
        setDisplayedIndex(index);
    };

    const resumeAutoFollow = () => {
        setAutoFollow(true);
    };

    if (sortedScreenshots.length === 0) {
        return (
            <div className={`flex items-center justify-center h-full ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
                <p>No screenshots to display</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Progress Header */}
            <div className={`text-center py-4 ${isLight ? '' : ''}`}>
                <h2 className={`text-2xl font-light tracking-tight mb-2 ${isLight ? 'text-neutral-900' : 'text-white'}`}>
                    Swarm is analyzing your screenshots
                </h2>
                <p className={`text-sm font-light ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
                    {analyzingStep > 0 && totalSteps > 0 ? (
                        <>Analyzing Step <span className="font-medium">{analyzingStep}</span> of <span className="font-medium">{totalSteps}</span></>
                    ) : (
                        'Preparing analysis...'
                    )}
                </p>
            </div>

            {/* Slideshow Area */}
            <div className="flex-1 flex items-center justify-center p-4 relative">
                {/* Previous Button */}
                <button
                    onClick={goToPrevious}
                    disabled={displayedIndex === 0}
                    className={`absolute left-4 z-10 p-2 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed ${isLight
                        ? 'bg-white border border-neutral-200 hover:border-neutral-400 text-neutral-700'
                        : 'bg-[#1E1E1E] border border-white/10 hover:border-white/30 text-neutral-300'
                        }`}
                >
                    <ChevronLeft size={20} />
                </button>

                {/* Screenshot Display */}
                <div className="relative max-w-2xl w-full">
                    <div
                        className={`relative rounded-xl overflow-hidden border transition-colors ${isLight
                            ? 'bg-white border-neutral-200'
                            : 'bg-[#1E1E1E] border-white/10'
                            }`}
                    >
                        {/* Step Badge */}
                        <div className={`absolute top-4 left-4 z-10 px-3 py-1.5 rounded-lg text-sm font-medium ${isLight ? 'bg-neutral-100 text-neutral-600' : 'bg-[#252525] text-neutral-400'
                            }`}>
                            Step {displayedIndex + 1}
                        </div>

                        {/* Completed Badge */}
                        {isCompleted && (
                            <div className={`absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center ${isLight ? 'bg-neutral-900' : 'bg-white'
                                }`}>
                                <Check size={18} className={isLight ? 'text-white' : 'text-neutral-900'} />
                            </div>
                        )}

                        {/* Screenshot Image */}
                        <img
                            src={currentScreenshot?.signedUrl || currentScreenshot?.s3Url}
                            alt={`Screenshot ${displayedIndex + 1}`}
                            className="w-full h-auto max-h-[60vh] object-contain"
                            draggable={false}
                        />

                        {/* Analyzing Overlay */}
                        {isCurrentlyAnalyzing && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                                <div className="text-center">
                                    <Loader2 className="w-12 h-12 animate-spin mx-auto mb-3 text-white" />
                                    <p className="text-white font-medium">Analyzing...</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Screenshot Description */}
                    {currentScreenshot?.description && (
                        <p className={`mt-4 text-center text-sm font-light ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
                            {currentScreenshot.description}
                        </p>
                    )}
                </div>

                {/* Next Button */}
                <button
                    onClick={goToNext}
                    disabled={displayedIndex === sortedScreenshots.length - 1}
                    className={`absolute right-4 z-10 p-2 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed ${isLight
                        ? 'bg-white border border-neutral-200 hover:border-neutral-400 text-neutral-700'
                        : 'bg-[#1E1E1E] border border-white/10 hover:border-white/30 text-neutral-300'
                        }`}
                >
                    <ChevronRight size={20} />
                </button>
            </div>

            {/* Timeline */}
            <div className={`py-6 ${isLight ? 'bg-neutral-50' : 'bg-[#0d0d0d]'}`}>
                <div className="flex items-center justify-center gap-4 px-8">
                    {sortedScreenshots.map((screenshot, index) => {
                        const isAnalyzingThis = isAnalyzing && index === analyzingStep - 1;
                        const isDone = index < analyzingStep - 1;
                        const isCurrent = index === displayedIndex;

                        return (
                            <button
                                key={screenshot.id}
                                onClick={() => goToStep(index)}
                                className="flex flex-col items-center group"
                            >

                                {/* Dot */}
                                <div className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all ${isAnalyzingThis
                                    ? isLight
                                        ? 'bg-neutral-900 ring-4 ring-neutral-300'
                                        : 'bg-white ring-4 ring-white/30'
                                    : isDone
                                        ? isLight ? 'bg-neutral-900' : 'bg-white'
                                        : isCurrent
                                            ? isLight
                                                ? 'bg-neutral-900 ring-2 ring-neutral-400'
                                                : 'bg-white ring-2 ring-white/40'
                                            : isLight
                                                ? 'bg-neutral-200 hover:bg-neutral-300'
                                                : 'bg-white/20 hover:bg-white/30'
                                    }`}>
                                    {isAnalyzingThis ? (
                                        <Loader2 size={16} className={`animate-spin ${isLight ? 'text-white' : 'text-neutral-900'}`} />
                                    ) : isDone ? (
                                        <Check size={16} className={isLight ? 'text-white' : 'text-neutral-900'} />
                                    ) : (
                                        <span className={`text-xs font-medium ${isCurrent
                                            ? isLight ? 'text-white' : 'text-neutral-900'
                                            : isLight ? 'text-neutral-600' : 'text-neutral-400'
                                            }`}>
                                            {index + 1}
                                        </span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Auto-follow indicator */}
                {!autoFollow && isAnalyzing && (
                    <div className="flex justify-center mt-4 relative z-20">
                        <button
                            onClick={resumeAutoFollow}
                            className={`text-xs font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer ${isLight
                                ? 'bg-neutral-900 text-white hover:bg-neutral-800'
                                : 'bg-white text-neutral-900 hover:bg-neutral-200'
                                }`}
                        >
                            Resume auto-follow
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
