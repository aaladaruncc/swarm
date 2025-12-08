"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { getTest, type TestRun, type Report, type Screenshot } from "@/lib/api";
import { SessionReplayPlayer } from "@/components/SessionReplayPlayer";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function TestDetails() {
  const router = useRouter();
  const params = useParams();
  const { data: session, isPending } = useSession();
  const [testRun, setTestRun] = useState<TestRun | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const testId = params.id as string;

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session?.user && testId) {
      loadTest();
      // Poll for updates if test is running
      const interval = setInterval(() => {
        if (testRun?.status === "running" || testRun?.status === "pending") {
          loadTest();
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [session, testId, testRun?.status]);

  const loadTest = async () => {
    try {
      const data = await getTest(testId);
      setTestRun(data.testRun);
      setReport(data.report);
      setScreenshots(data.screenshots);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load test");
    } finally {
      setLoading(false);
    }
  };

  if (isPending || !session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      running: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
    };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[status] || styles.pending}`}>
        {status === "running" && "🔄 "}
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>
        ) : testRun ? (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold mb-2">Test Results</h1>
                  <a
                    href={testRun.targetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {testRun.targetUrl} ↗
                  </a>
                </div>
                {getStatusBadge(testRun.status)}
              </div>

              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Persona</span>
                  <p className="font-medium">{testRun.personaName || `Persona ${testRun.personaIndex}`}</p>
                </div>
                <div>
                  <span className="text-gray-500">Created</span>
                  <p className="font-medium">{new Date(testRun.createdAt).toLocaleString()}</p>
                </div>
                {testRun.completedAt && (
                  <div>
                    <span className="text-gray-500">Completed</span>
                    <p className="font-medium">{new Date(testRun.completedAt).toLocaleString()}</p>
                  </div>
                )}
                {report?.totalDuration && (
                  <div>
                    <span className="text-gray-500">Duration</span>
                    <p className="font-medium">{report.totalDuration}</p>
                  </div>
                )}
              </div>

            </div>

            {/* Running/Pending State with Live View */}
            {(testRun.status === "running" || testRun.status === "pending") && (
              <>
                {/* Status Banner */}
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg p-4 text-white shadow-lg">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="animate-spin rounded-full h-10 w-10 border-3 border-white/30 border-t-white"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-2 w-2 bg-white rounded-full animate-pulse"></div>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold">
                          {testRun.status === "pending" ? "🚀 Test Starting..." : "🤖 AI Agent Running"}
                        </h3>
                        <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-medium animate-pulse">
                          LIVE
                        </span>
                      </div>
                      <p className="text-blue-100 text-sm">
                        {testRun.status === "pending" 
                          ? "Initializing browser session..." 
                          : "Watch the AI persona navigate your website in real-time below"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Live Session View - Show if session ID available */}
                {testRun.browserbaseSessionId && (
                  <ErrorBoundary
                    fallback={
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-6 text-center">
                        <p className="text-yellow-800 dark:text-yellow-300">
                          Live view temporarily unavailable. The test is still running in the background.
                        </p>
                      </div>
                    }
                  >
                    <SessionReplayPlayer 
                      testId={testId} 
                      browserbaseSessionId={testRun.browserbaseSessionId}
                      isLive={true}
                    />
                  </ErrorBoundary>
                )}
              </>
            )}

            {/* Failed State */}
            {testRun.status === "failed" && (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                    <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-red-800 dark:text-red-300 mb-2">
                      Test Failed
                    </h3>
                    <p className="text-red-600 dark:text-red-400">{testRun.errorMessage || "An unknown error occurred"}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Completed Session Replay */}
            {testRun.browserbaseSessionId && testRun.status === "completed" && (
              <ErrorBoundary
                fallback={
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
                            Unable to load embedded replay player.
                          </p>
                          <p className="text-purple-200 text-sm">
                            The replay player encountered an error. You can still watch the recording on Browserbase.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-6 bg-gray-50 dark:bg-gray-900">
                      <p className="text-gray-700 dark:text-gray-300 mb-4">
                        View the full session recording directly on Browserbase:
                      </p>
                      <a
                        href={`https://browserbase.com/sessions/${testRun.browserbaseSessionId}`}
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
                }
              >
                <SessionReplayPlayer 
                  testId={testId} 
                  browserbaseSessionId={testRun.browserbaseSessionId} 
                />
              </ErrorBoundary>
            )}

            {/* Report */}
            {report && (
              <>
                {/* Score */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h2 className="text-xl font-bold mb-4">Overall Score</h2>
                  <div className="flex items-center gap-4">
                    <div className="text-5xl font-bold text-blue-600">
                      {report.score}/10
                    </div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all"
                          style={{ width: `${(report.score || 0) * 10}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  {report.summary && (
                    <p className="mt-4 text-gray-600 dark:text-gray-400">{report.summary}</p>
                  )}
                </div>

                {/* Findings Grid */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Positive Aspects */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h3 className="text-lg font-bold mb-4 text-green-600">✅ What Worked Well</h3>
                    {report.positiveAspects && report.positiveAspects.length > 0 ? (
                      <ul className="space-y-2">
                        {report.positiveAspects.map((item, i) => (
                          <li key={i} className="text-sm">• {item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500 text-sm">No specific positives noted</p>
                    )}
                  </div>

                  {/* Accessibility Notes */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h3 className="text-lg font-bold mb-4 text-yellow-600">😕 Areas of Confusion</h3>
                    {report.accessibilityNotes && report.accessibilityNotes.length > 0 ? (
                      <ul className="space-y-2">
                        {report.accessibilityNotes.map((item, i) => (
                          <li key={i} className="text-sm">• {item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500 text-sm">No confusion points noted</p>
                    )}
                  </div>
                </div>

                {/* Usability Issues */}
                {report.usabilityIssues && report.usabilityIssues.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h3 className="text-lg font-bold mb-4 text-red-600">🐛 Usability Issues</h3>
                    <div className="space-y-4">
                      {report.usabilityIssues.map((issue, i) => (
                        <div key={i} className="border-l-4 border-red-400 pl-4">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`text-xs px-2 py-0.5 rounded ${
                                issue.severity === "critical"
                                  ? "bg-red-100 text-red-800"
                                  : issue.severity === "high"
                                  ? "bg-orange-100 text-orange-800"
                                  : issue.severity === "medium"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {issue.severity}
                            </span>
                          </div>
                          <p className="text-sm">{issue.description}</p>
                          {issue.recommendation && (
                            <p className="text-sm text-gray-500 mt-1">
                              💡 {issue.recommendation}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {report.recommendations && report.recommendations.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h3 className="text-lg font-bold mb-4">💡 Recommendations</h3>
                    <ol className="list-decimal list-inside space-y-2">
                      {report.recommendations.map((rec, i) => (
                        <li key={i} className="text-sm">{rec}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </>
            )}

            {/* Screenshots */}
            {screenshots.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-bold mb-4">📸 Screenshots</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {screenshots.map((screenshot) => (
                    <div key={screenshot.id} className="border rounded-lg overflow-hidden">
                      <div className="p-2 bg-gray-50 dark:bg-gray-700 text-sm">
                        Step {screenshot.stepNumber}: {screenshot.description}
                      </div>
                      {screenshot.base64Data && (
                        <img
                          src={`data:image/png;base64,${screenshot.base64Data}`}
                          alt={screenshot.description || "Screenshot"}
                          className="w-full"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">Test not found</p>
          </div>
        )}
      </main>
    </div>
  );
}
