"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, ChevronRight, ChevronLeft, Image as ImageIcon, MousePointer, Keyboard, Globe, Info, ZoomIn, ZoomOut, RotateCcw, Hand, ChevronDown, ChevronUp } from "lucide-react";
import { getSessionTranscript, type SessionTranscript } from "@/lib/batch-api";
import { motion, AnimatePresence } from "framer-motion";

interface SessionTranscriptViewerProps {
  testRunId: string;
  personaName: string;
  onClose: () => void;
}

interface Step {
  stepNumber: number;
  observation: string | null;
  action: string | null;
  actionIcon: React.ReactNode;
  screenshot: {
    stepNumber: number;
    base64Data: string | null;
    description: string | null;
  } | null;
  timestamp: number;
  details?: string;
}

export function SessionTranscriptViewer({ testRunId, personaName, onClose }: SessionTranscriptViewerProps) {
  const [transcript, setTranscript] = useState<SessionTranscript | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStep, setSelectedStep] = useState<number | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadTranscript() {
      try {
        setLoading(true);
        const data = await getSessionTranscript(testRunId);
        setTranscript(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load transcript");
      } finally {
        setLoading(false);
      }
    }

    loadTranscript();
  }, [testRunId]);

  // Set default selected step when transcript loads
  useEffect(() => {
    if (transcript) {
      const steps = groupIntoSteps(transcript);
      if (steps.length > 0 && selectedStep === null) {
        setSelectedStep(steps[0].stepNumber);
      }
    }
  }, [transcript, groupIntoSteps, selectedStep]);

  // Group timeline into steps - memoized
  const groupIntoSteps = useCallback((transcript: SessionTranscript): Step[] => {
    const steps: Step[] = [];
    const screenshots = transcript.screenshots.filter(s => s.base64Data);
    const screenshotMap = new Map(screenshots.map(s => [s.stepNumber, s]));
    
    // Group by screenshots - each screenshot becomes a step
    screenshots.forEach((screenshot) => {
      const stepNumber = screenshot.stepNumber;
      
      // Find related actions and logs for this step
      const stepStartTime = screenshot.createdAt ? new Date(screenshot.createdAt).getTime() : 0;
      const relatedItems = transcript.timeline.filter(item => {
        const itemTime = item.timestamp;
        // Include items within 10 seconds before this screenshot
        return itemTime >= stepStartTime - 10000 && itemTime <= stepStartTime + 5000;
      });
      
      // Extract observation from logs/reasoning
      const observationLog = relatedItems.find(item => 
        item.type === "log" && item.data.message && 
        (item.data.message.includes("would") || item.data.message.includes("expect") || item.data.message.length > 100)
      );
      
      // Extract action description
      const actionItem = relatedItems.find(item => item.type === "action");
      let actionDescription = null;
      let actionIcon = <ChevronRight size={14} className="text-neutral-600" />;
      
      if (actionItem) {
        const action = actionItem.data;
        if (action.type === "open_web_browser" || action.type === "goto_url") {
          actionDescription = `Opened ${action.pageUrl || "browser"}`;
          actionIcon = <Globe size={14} className="text-neutral-900" />;
        } else if (action.type === "click") {
          actionDescription = `Tester would ${action.target ? `click on "${action.target}"` : `click at (${action.x}, ${action.y})`}`;
          actionIcon = <Hand size={14} className="text-neutral-900" />;
        } else if (action.type === "scroll") {
          actionDescription = `Tester would scroll ${action.direction || "down"}`;
          actionIcon = <ChevronDown size={14} className="text-neutral-900" />;
        } else if (action.type === "type") {
          actionDescription = `Tester would type "${action.text || ""}"`;
          actionIcon = <Keyboard size={14} className="text-neutral-900" />;
        } else {
          actionDescription = `Tester would ${action.description || action.type}`;
        }
      }
      
      // Use screenshot description as observation if no log found
      const observation = observationLog?.data?.message || 
                         screenshot.description || 
                         (actionDescription ? `Tester would interact with the page. ${actionDescription}` : null);
      
      steps.push({
        stepNumber,
        observation,
        action: actionDescription,
        actionIcon,
        screenshot: {
          stepNumber: screenshot.stepNumber,
          base64Data: screenshot.base64Data,
          description: screenshot.description,
        },
        timestamp: stepStartTime,
        details: relatedItems.filter(item => item.type === "raw").map(item => item.data.message).join("\n") || undefined,
      });
    });
    
    // Sort by step number
    steps.sort((a, b) => a.stepNumber - b.stepNumber);
    
    return steps;
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    const newZoom = Math.min(Math.max(0.5, zoom + delta), 3);
    setZoom(newZoom);
  }, [zoom]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const toggleStepExpansion = (stepNumber: number) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepNumber)) {
        next.delete(stepNumber);
      } else {
        next.add(stepNumber);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-none border border-neutral-900">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-neutral-900 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-neutral-900 font-light">Loading session transcript...</p>
        </div>
      </div>
    );
  }

  if (error || !transcript) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-none border border-neutral-900 max-w-md">
          <h3 className="text-lg font-light mb-4 text-neutral-900">Error</h3>
          <p className="text-neutral-600 mb-4 font-light">{error || "Failed to load transcript"}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-900 text-white hover:bg-neutral-800 transition-colors font-light text-sm"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (!transcript) return null;

  const steps = groupIntoSteps(transcript);
  const currentStep = selectedStep !== null 
    ? steps.find(s => s.stepNumber === selectedStep) || steps[0]
    : steps[0];
  const currentScreenshot = currentStep?.screenshot;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white w-full max-w-[95vw] h-[90vh] overflow-hidden flex flex-col rounded-none border border-neutral-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-neutral-900 text-white p-6 flex items-center justify-between border-b border-neutral-900 flex-shrink-0">
          <div>
            <h2 className="text-2xl font-light mb-1">Session Transcript</h2>
            <p className="text-neutral-300 text-sm font-light">{personaName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content - Split Layout */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left Panel - Step Modules */}
          <div className="w-1/2 border-r border-neutral-900 overflow-y-auto bg-white">
            <div className="p-6 space-y-6">
              {steps.length === 0 ? (
                <div className="text-center py-12 text-neutral-500 font-light">
                  <p>No steps available</p>
                </div>
              ) : (
                steps.map((step) => {
                  const isExpanded = expandedSteps.has(step.stepNumber);
                  const isSelected = selectedStep === step.stepNumber;
                  
                  return (
                    <div
                      key={step.stepNumber}
                      onClick={() => setSelectedStep(step.stepNumber)}
                      className={`border border-neutral-900 rounded-none transition-all cursor-pointer hover:bg-neutral-50 ${
                        isSelected ? "ring-2 ring-neutral-900 bg-neutral-50" : ""
                      }`}
                    >
                      {/* Step Label */}
                      <div className="bg-neutral-100 px-4 py-2 border-b border-neutral-900">
                        <span className="text-sm font-medium text-neutral-900">Step {step.stepNumber}</span>
                      </div>

                      <div className="p-4 space-y-4">
                        {/* Observation Chat Bubble */}
                        {step.observation && (
                          <div className="relative">
                            <div className="bg-green-100 rounded-lg p-4 border border-green-300">
                              <p className="text-sm text-neutral-900 font-light leading-relaxed whitespace-pre-wrap">
                                {step.observation}
                              </p>
                            </div>
                            {/* Chat bubble tail */}
                            <div className="absolute -bottom-2 left-6 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-green-100"></div>
                            <div className="absolute -bottom-3 left-6 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-green-300"></div>
                          </div>
                        )}

                        {/* Show More Details */}
                        {step.details && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleStepExpansion(step.stepNumber);
                            }}
                            className="flex items-center gap-2 text-xs text-neutral-600 hover:text-neutral-900 transition-colors font-light"
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            <span>Show more details</span>
                          </button>
                        )}

                        {/* Expanded Details */}
                        {isExpanded && step.details && (
                          <div className="border-t border-neutral-200 pt-4 mt-4">
                            <pre className="text-xs text-neutral-600 font-mono whitespace-pre-wrap font-light">
                              {step.details}
                            </pre>
                          </div>
                        )}

                        {/* Action Description */}
                        {step.action && (
                          <div className="flex items-start gap-3 pt-2 border-t border-neutral-200">
                            <div className="flex-shrink-0 mt-0.5">
                              {step.actionIcon}
                            </div>
                            <p className="text-sm text-neutral-700 font-light">
                              {step.action}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Panel - Canvas Viewer */}
          <div className="w-1/2 relative overflow-hidden bg-neutral-50">
            {currentScreenshot && currentScreenshot.base64Data ? (
              <>
                {/* Canvas Container */}
                <div
                  ref={canvasRef}
                  className="relative h-full w-full overflow-hidden cursor-grab active:cursor-grabbing"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onWheel={handleWheel}
                >
                  {/* Grid Background */}
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage: `radial-gradient(circle, #d4d4d4 1px, transparent 1px)`,
                      backgroundSize: '20px 20px',
                      backgroundPosition: '0 0',
                    }}
                  />

                  {/* Screenshot */}
                  <div
                    className="absolute"
                    style={{
                      transform: `translate(calc(50% + ${pan.x}px), calc(50% + ${pan.y}px)) scale(${zoom})`,
                      transformOrigin: 'center center',
                      transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                      left: 0,
                      top: 0,
                    }}
                  >
                    <div className="relative rounded-lg overflow-hidden shadow-lg border-2 border-neutral-300 bg-white" style={{ width: '400px' }}>
                      <img
                        src={`data:image/png;base64,${currentScreenshot.base64Data}`}
                        alt={`Screenshot Step ${currentScreenshot.stepNumber}`}
                        className="w-full h-auto block"
                        draggable={false}
                      />
                      {/* Step Number Badge */}
                      <div className="absolute bottom-2 right-2 px-3 py-1 rounded-lg text-xs font-medium bg-black/60 text-white">
                        {currentScreenshot.stepNumber}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Controls */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg bg-white border border-neutral-200">
                  <button
                    onClick={handleZoomOut}
                    className="p-2 rounded transition-colors hover:bg-neutral-100 text-neutral-700"
                    title="Zoom Out"
                  >
                    <ZoomOut size={16} />
                  </button>
                  <span className="text-xs font-medium px-2 text-neutral-600">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    onClick={handleZoomIn}
                    className="p-2 rounded transition-colors hover:bg-neutral-100 text-neutral-700"
                    title="Zoom In"
                  >
                    <ZoomIn size={16} />
                  </button>
                  <div className="w-px h-6 mx-1 bg-neutral-200" />
                  <button
                    onClick={handleReset}
                    className="p-2 rounded transition-colors hover:bg-neutral-100 text-neutral-700"
                    title="Reset View"
                  >
                    <RotateCcw size={16} />
                  </button>
                </div>

                {/* Frame Navigation */}
                {steps.length > 1 && (
                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const currentIndex = steps.findIndex(s => s.stepNumber === (selectedStep || steps[0].stepNumber));
                        if (currentIndex > 0) {
                          setSelectedStep(steps[currentIndex - 1].stepNumber);
                        }
                      }}
                      disabled={!selectedStep || selectedStep === steps[0].stepNumber}
                      className="p-2 bg-white/90 hover:bg-white border border-neutral-200 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={16} className="text-neutral-700" />
                    </button>
                    <span className="text-xs font-light text-neutral-600 px-2">
                      {selectedStep || steps[0]?.stepNumber || 0} / {steps.length}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const currentIndex = steps.findIndex(s => s.stepNumber === (selectedStep || steps[0].stepNumber));
                        if (currentIndex < steps.length - 1) {
                          setSelectedStep(steps[currentIndex + 1].stepNumber);
                        }
                      }}
                      disabled={selectedStep === steps[steps.length - 1]?.stepNumber}
                      className="p-2 bg-white/90 hover:bg-white border border-neutral-200 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight size={16} className="text-neutral-700" />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-neutral-500 font-light">
                <p>No screenshot available</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
