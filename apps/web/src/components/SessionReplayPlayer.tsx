"use client";

import { useEffect, useRef, useState } from "react";
import { getSessionRecording } from "@/lib/api";

interface SessionReplayPlayerProps {
  testId: string;
  browserbaseSessionId: string;
}

export function SessionReplayPlayer({ testId, browserbaseSessionId }: SessionReplayPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadRecording() {
      try {
        setLoading(true);
        setError(null);

        // Fetch the recording from our API
        const { recording } = await getSessionRecording(testId);

        if (!mounted) return;

        if (!recording || recording.length === 0) {
          setError("No recording data available");
          return;
        }

        // Dynamically import rrweb-player to avoid SSR issues
        const rrwebPlayer = await import("rrweb-player");
        
        // Import CSS only if not already loaded
        if (typeof document !== 'undefined' && !document.getElementById('rrweb-player-styles')) {
          const link = document.createElement('link');
          link.id = 'rrweb-player-styles';
          link.rel = 'stylesheet';
          link.href = 'https://cdn.jsdelivr.net/npm/rrweb-player@1.0.0-alpha.4/dist/style.css';
          document.head.appendChild(link);
          // Wait for styles to load
          await new Promise(resolve => {
            link.onload = resolve;
            link.onerror = resolve; // Continue even if styles fail to load
          });
        }

        if (!mounted || !containerRef.current) return;

        // Clear any existing player
        containerRef.current.innerHTML = "";

        // Initialize the player
        playerRef.current = new rrwebPlayer.default({
          target: containerRef.current,
          props: {
            events: recording,
            width: containerRef.current.clientWidth,
            height: Math.min(containerRef.current.clientWidth * 0.5625, 576), // 16:9 aspect ratio, max 576px
            skipInactive: true,
            showController: true,
            autoPlay: false,
            speedOption: [1, 2, 4, 8],
          },
        });

        setLoading(false);
      } catch (err) {
        if (mounted) {
          console.error("Failed to load session recording:", err);
          setError(err instanceof Error ? err.message : "Failed to load recording");
          setLoading(false);
        }
      }
    }

    loadRecording();

    return () => {
      mounted = false;
      if (playerRef.current) {
        playerRef.current = null;
      }
    };
  }, [testId]);

  // Handle resize
  useEffect(() => {
    if (!playerRef.current || !containerRef.current) return;

    const handleResize = () => {
      if (containerRef.current && playerRef.current) {
        // rrweb-player doesn't support dynamic resizing well, 
        // so we might need to reload on significant size changes
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (error) {
    return (
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg shadow p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold mb-2">🎬 Session Replay</h2>
            <p className="text-purple-100 mb-4">
              Unable to load embedded replay. You can still view it on Browserbase.
            </p>
          </div>
        </div>
        <a
          href={`https://browserbase.com/sessions/${browserbaseSessionId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 bg-white text-purple-600 rounded-lg hover:bg-purple-50 transition-colors font-medium"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          View on Browserbase
        </a>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Session Replay
            </h2>
            <p className="text-purple-100 text-sm">
              Watch exactly how the AI persona navigated your website
            </p>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
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
        ref={containerRef}
      >
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mb-4"></div>
            <p className="text-gray-400">Loading session replay...</p>
          </div>
        )}
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
