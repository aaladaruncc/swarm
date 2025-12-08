"use client";

import { useEffect, useState } from "react";
import { getSessionRecording } from "@/lib/api";

interface SessionReplayPlayerProps {
  testId: string;
  browserbaseSessionId: string;
  isLive?: boolean;
}

export function SessionReplayPlayer({ testId, browserbaseSessionId, isLive = false }: SessionReplayPlayerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveViewUrl, setLiveViewUrl] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadLiveViewUrl() {
      try {
        setLoading(true);
        setError(null);

        const { liveViewUrl } = await getSessionRecording(testId);

        if (!mounted) return;

        if (!liveViewUrl) {
          setError("No live view URL available");
          return;
        }

        setLiveViewUrl(liveViewUrl);
        setLoading(false);
      } catch (err) {
        if (mounted) {
          console.error("Failed to load session live view:", err);
          setError(err instanceof Error ? err.message : "Failed to load session viewer");
          setLoading(false);
        }
      }
    }

    loadLiveViewUrl();

    return () => {
      mounted = false;
    };
  }, [testId]);

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/10 rounded-lg">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-2">🎬 Session Replay</h2>
              <p className="text-purple-100 mb-1">
                Unable to load session replay viewer.
              </p>
              <p className="text-purple-200 text-sm">
                {error}
              </p>
            </div>
          </div>
        </div>
        <div className="p-6 bg-gray-50 dark:bg-gray-900">
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            You can still watch the full session recording directly on Browserbase:
          </p>
          <a
            href={`https://browserbase.com/sessions/${browserbaseSessionId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all font-medium shadow-lg hover:shadow-xl"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            View Full Session on Browserbase
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <div className={`p-4 text-white ${isLive ? 'bg-gradient-to-r from-red-500 to-pink-600' : 'bg-gradient-to-r from-purple-600 to-indigo-600'}`}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {isLive ? 'Live Session View' : 'Session Replay'}
              </h2>
              {isLive && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-white/20 rounded-full text-xs font-bold animate-pulse">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                  </span>
                  LIVE
                </span>
              )}
            </div>
            <p className={`text-sm ${isLive ? 'text-red-100' : 'text-purple-100'}`}>
              {isLive 
                ? 'Watch the AI agent navigate in real-time' 
                : 'Watch exactly how the AI persona navigated your website'}
            </p>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isExpanded ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              )}
            </svg>
          </button>
        </div>
      </div>

      <div 
        className={`relative bg-gray-900 ${isExpanded ? 'h-[80vh]' : 'h-[400px] md:h-[500px]'} transition-all duration-300`}
      >
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mb-4"></div>
            <p className="text-gray-400">Loading session replay...</p>
          </div>
        ) : liveViewUrl ? (
          <iframe
            src={liveViewUrl}
            className="w-full h-full border-0"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            title="Session Replay"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        ) : null}
      </div>

      <div className="p-3 bg-gray-100 dark:bg-gray-700 flex items-center justify-between text-sm">
        <span className="text-gray-500 dark:text-gray-400">
          Session ID: <code className="bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded">{browserbaseSessionId}</code>
        </span>
        <a
          href={`https://browserbase.com/sessions/${browserbaseSessionId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-purple-600 hover:text-purple-700 dark:text-purple-400 flex items-center gap-1"
        >
          <span>Open in Browserbase</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  );
}
