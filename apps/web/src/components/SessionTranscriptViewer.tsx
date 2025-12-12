"use client";

import { useState, useEffect } from "react";
import { X, ChevronRight, ChevronLeft, Image as ImageIcon, MousePointer, Keyboard, Globe, Info } from "lucide-react";
import { getSessionTranscript, type SessionTranscript } from "@/lib/batch-api";
import { motion, AnimatePresence } from "framer-motion";

interface SessionTranscriptViewerProps {
  testRunId: string;
  personaName: string;
  onClose: () => void;
}

export function SessionTranscriptViewer({ testRunId, personaName, onClose }: SessionTranscriptViewerProps) {
  const [transcript, setTranscript] = useState<SessionTranscript | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedScreenshot, setSelectedScreenshot] = useState<number | null>(null);

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

  const formatTimestamp = (timestamp: number) => {
    if (!transcript?.testRun.startedAt) return "00:00";
    const startTime = new Date(transcript.testRun.startedAt).getTime();
    const elapsed = Math.max(0, timestamp - startTime);
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    return `${minutes.toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case "click":
        return <MousePointer size={14} className="text-neutral-900" />;
      case "keypress":
        return <Keyboard size={14} className="text-neutral-900" />;
      case "open_web_browser":
        return <Globe size={14} className="text-neutral-900" />;
      default:
        return <ChevronRight size={14} className="text-neutral-600" />;
    }
  };

  const getActionDescription = (action: any) => {
    if (action.type === "open_web_browser") {
      return `Opened ${action.pageUrl || "browser"}`;
    }
    if (action.type === "click") {
      return `Clicked at (${action.x}, ${action.y})${action.button ? ` with ${action.button} button` : ""}`;
    }
    if (action.type === "keypress") {
      return `Pressed: ${action.keys || "keys"}`;
    }
    return `${action.type} action`;
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

  const screenshots = transcript.screenshots.filter(s => s.base64Data);
  const startTime = transcript.testRun.startedAt ? new Date(transcript.testRun.startedAt).getTime() : 0;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col rounded-none border border-neutral-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-neutral-900 text-white p-6 flex items-center justify-between border-b border-neutral-900">
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

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-3">
              {transcript.timeline.length === 0 ? (
                <div className="text-center py-12 text-neutral-500 font-light">
                  <p>No timeline data available</p>
                </div>
              ) : (
                transcript.timeline.map((item, index) => {
                  const time = formatTimestamp(item.timestamp);
                  
                  if (item.type === "log") {
                    const log = item.data;
                    return (
                      <div key={`log-${index}`} className="border-l-2 border-neutral-900 pl-4 py-2 hover:bg-neutral-50 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            <Info size={14} className="text-neutral-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-mono text-neutral-500 font-light">{time}</span>
                              <span className="text-xs px-1.5 py-0.5 bg-neutral-900 text-white font-light uppercase">{log.level || "INFO"}</span>
                            </div>
                            <p className="text-sm text-neutral-700 font-light leading-relaxed whitespace-pre-wrap">
                              {log.message}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  if (item.type === "screenshot") {
                    const screenshot = item.data;
                    const screenshotIndex = screenshots.findIndex(s => s.stepNumber === screenshot.stepNumber);
                    return (
                      <div key={`screenshot-${index}`} className="border border-neutral-900 rounded-none p-4 hover:bg-neutral-50 transition-colors">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-10 h-10 bg-neutral-900 flex items-center justify-center">
                            <ImageIcon size={18} className="text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-mono text-neutral-500 font-light">{time}</span>
                              <span className="text-xs px-1.5 py-0.5 bg-neutral-900 text-white font-light">Screenshot</span>
                              <span className="text-xs text-neutral-500 font-light">Step {screenshot.stepNumber}</span>
                            </div>
                            {screenshot.description && (
                              <p className="text-sm text-neutral-600 mb-3 font-light">{screenshot.description}</p>
                            )}
                            {screenshot.base64Data && (
                              <button
                                onClick={() => setSelectedScreenshot(screenshotIndex >= 0 ? screenshotIndex : 0)}
                                className="block w-full"
                              >
                                <img
                                  src={`data:image/png;base64,${screenshot.base64Data}`}
                                  alt={`Screenshot ${screenshot.stepNumber}`}
                                  className="w-full rounded-none border border-neutral-900 hover:opacity-90 transition-opacity cursor-pointer max-h-64 object-contain bg-neutral-50"
                                />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  if (item.type === "action") {
                    const action = item.data;
                    return (
                      <div key={`action-${index}`} className="border-l-2 border-neutral-300 pl-4 py-2 hover:bg-neutral-50 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {getActionIcon(action.type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-mono text-neutral-500 font-light">{time}</span>
                              <span className="text-xs px-1.5 py-0.5 bg-neutral-900 text-white font-light capitalize">{action.type}</span>
                            </div>
                            <p className="text-sm font-light text-neutral-900 mb-1">
                              {getActionDescription(action)}
                            </p>
                            {action.pageUrl && (
                              <p className="text-xs text-neutral-500 truncate font-light">{action.pageUrl}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  if (item.type === "raw") {
                    const raw = item.data;
                    return (
                      <div key={`raw-${index}`} className="border-l-2 border-neutral-400 pl-4 py-2 hover:bg-neutral-50 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            <Info size={14} className="text-neutral-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-mono text-neutral-500 font-light">{time}</span>
                              <span className="text-xs px-1.5 py-0.5 bg-neutral-600 text-white font-light uppercase">{raw.stream || "RAW"}</span>
                            </div>
                            <p className="text-sm text-neutral-600 font-light leading-relaxed whitespace-pre-wrap font-mono">
                              {raw.message}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  return null;
                })
              )}
            </div>
          </div>

          {/* Screenshot Sidebar */}
          {screenshots.length > 0 && (
            <div className="w-80 border-l border-neutral-900 bg-white overflow-y-auto p-4">
              <h3 className="text-sm font-light text-neutral-900 mb-4">Screenshots</h3>
              <div className="space-y-3">
                {screenshots.map((screenshot, index) => (
                  <button
                    key={screenshot.id}
                    onClick={() => {
                      setSelectedScreenshot(index);
                    }}
                    className="w-full text-left"
                  >
                    <div className="border border-neutral-900 rounded-none overflow-hidden hover:border-neutral-600 transition-colors bg-white">
                      {screenshot.base64Data && (
                        <img
                          src={`data:image/png;base64,${screenshot.base64Data}`}
                          alt={`Screenshot ${screenshot.stepNumber}`}
                          className="w-full h-32 object-cover"
                        />
                      )}
                      <div className="p-2">
                        <p className="text-xs font-light text-neutral-900">
                          Step {screenshot.stepNumber}
                        </p>
                        {screenshot.description && (
                          <p className="text-xs text-neutral-500 mt-1 line-clamp-2 font-light">
                            {screenshot.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Screenshot Modal */}
      <AnimatePresence>
        {selectedScreenshot !== null && screenshots[selectedScreenshot] && (
          <div
            className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4"
            onClick={() => setSelectedScreenshot(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="max-w-5xl max-h-[90vh] relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedScreenshot(null)}
                className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded text-white transition-colors"
              >
                <X size={24} />
              </button>
              {selectedScreenshot > 0 && (
                <button
                  onClick={() => setSelectedScreenshot(selectedScreenshot - 1)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 rounded text-white transition-colors"
                >
                  <ChevronLeft size={24} />
                </button>
              )}
              {selectedScreenshot < screenshots.length - 1 && (
                <button
                  onClick={() => setSelectedScreenshot(selectedScreenshot + 1)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 rounded text-white transition-colors"
                >
                  <ChevronRight size={24} />
                </button>
              )}
              <img
                src={`data:image/png;base64,${screenshots[selectedScreenshot].base64Data}`}
                alt={`Screenshot ${screenshots[selectedScreenshot].stepNumber}`}
                className="max-w-full max-h-[90vh] object-contain rounded"
              />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded text-sm">
                Step {screenshots[selectedScreenshot].stepNumber} of {screenshots.length}
                {screenshots[selectedScreenshot].description && (
                  <span className="ml-2 text-neutral-300">
                    - {screenshots[selectedScreenshot].description}
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
