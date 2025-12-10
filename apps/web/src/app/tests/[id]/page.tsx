"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { getTest, type TestRun, type Report, type Screenshot } from "@/lib/api";
import { SessionReplayPlayer } from "@/components/SessionReplayPlayer";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ArrowLeft, ExternalLink, Clock, User, Calendar, CheckCircle2, AlertTriangle, XCircle, Lightbulb } from "lucide-react";
import { getBatchTest, type TestRunWithReport, type AggregatedReport, type BatchTestRun } from "@/lib/batch-api";

export default function TestDetails() {
  const router = useRouter();
  const params = useParams();
  const { data: session, isPending } = useSession();
  const [batchTestRun, setBatchTestRun] = useState<BatchTestRun | null>(null);
  const [testRuns, setTestRuns] = useState<TestRunWithReport[]>([]);
  const [aggregatedReport, setAggregatedReport] = useState<AggregatedReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedView, setSelectedView] = useState<"aggregated" | number>("aggregated");

  const testId = params.id as string;

  const loadTest = async () => {
    try {
      const data = await getBatchTest(testId);
      setBatchTestRun(data.batchTestRun);
      setTestRuns(data.testRuns);
      setAggregatedReport(data.aggregatedReport);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load test");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session?.user && testId) {
      if (testId.startsWith("mock-")) {
        // Handle mock test locally
        loadMockTest();
      } else {
        loadTest();
        const interval = setInterval(() => {
          if (testRun?.status === "running" || testRun?.status === "pending") {
            loadTest();
          }
        }, 5000);
        return () => clearInterval(interval);
      }
    }
  }, [session, testId, testRun?.status]);

  const loadMockTest = () => {
    // Simulate a completed test run for the mock persona
    setTestRun({
      id: testId,
      userId: session?.user?.id || "mock-user",
      targetUrl: "https://example.com",
      status: "completed",
      personaIndex: 999,
      personaName: "TEST",
      createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 mins ago
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    setReport({
      id: "mock-report",
      testRunId: testId,
      score: 8,
      summary: "This is a mock simulation result for testing the UI. The layout and components are identical to a real report.",
      positiveAspects: ["Fast loading times", "Clear call to action", "Responsive design"],
      usabilityIssues: [
        { severity: "medium", description: "Navigation menu is slightly hidden on mobile", recommendation: "Increase contrast" }
      ],
      accessibilityNotes: ["Good alt text usage"],
      recommendations: ["Consider adding a dark mode toggle"],
      totalDuration: "0m 45s",
      fullReport: {},
      createdAt: new Date().toISOString(),
    });

    setScreenshots([
      { id: "s1", testRunId: testId, stepNumber: 1, description: "Initial Load", base64Data: "", createdAt: new Date().toISOString() },
      { id: "s2", testRunId: testId, stepNumber: 2, description: "Navigation Interaction", base64Data: "", createdAt: new Date().toISOString() }
    ]);
    
    setLoading(false);
  };

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
      <div className="min-h-screen flex items-center justify-center bg-white text-neutral-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-neutral-100 text-neutral-600 border-neutral-200",
      running: "bg-blue-50 text-blue-700 border-blue-100",
      completed: "bg-emerald-50 text-emerald-700 border-emerald-100",
      failed: "bg-red-50 text-red-700 border-red-100",
    };
    
    const labels: Record<string, string> = {
      pending: "Queued",
      running: "Running",
      completed: "Success",
      failed: "Failed",
    };

    return (
      <span className={`px-3 py-1 text-xs font-medium border ${styles[status] || styles.pending} rounded-none uppercase tracking-wider`}>
        {labels[status] || status}
      </span>
    );
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      critical: "border-red-500 bg-red-50 dark:bg-red-900/20",
      high: "border-orange-500 bg-orange-50 dark:bg-orange-900/20",
      medium: "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20",
      low: "border-gray-500 bg-gray-50 dark:bg-gray-900/20",
    };
    return colors[severity] || colors.low;
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
      medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
      low: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
    };
    return colors[priority] || colors.low;
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans selection:bg-neutral-900 selection:text-white pb-24">
      <header className="border-b border-neutral-100 bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-4">
          <Link href="/dashboard" className="text-neutral-500 hover:text-neutral-900 transition-colors flex items-center gap-2 text-sm font-medium">
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {loading ? (
          <div className="flex justify-center py-24">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 p-4 border border-red-100 text-sm font-light">{error}</div>
        ) : testRun ? (
          <div className="space-y-12">
            {/* Header */}
            <div>
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h1 className="text-4xl font-light tracking-tight mb-2">Test Results</h1>
                  <a
                    href={batchTestRun.targetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-500 hover:text-neutral-900 transition-colors flex items-center gap-2 text-lg font-light"
                  >
                    {batchTestRun.targetUrl} ↗
                  </a>
                </div>
                {getStatusBadge(batchTestRun.status)}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-6 border-y border-neutral-100">
                <div className="space-y-1">
                  <span className="text-xs font-medium text-neutral-400 uppercase tracking-wide flex items-center gap-2">
                    <User size={14} /> Persona
                  </span>
                  <p className="font-medium">{testRun.personaName || `Persona ${testRun.personaIndex}`}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-medium text-neutral-400 uppercase tracking-wide flex items-center gap-2">
                    <Calendar size={14} /> Created
                  </span>
                  <p className="font-light">{new Date(testRun.createdAt).toLocaleString()}</p>
                </div>
                {testRun.completedAt && (
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-neutral-400 uppercase tracking-wide flex items-center gap-2">
                      <CheckCircle2 size={14} /> Completed
                    </span>
                    <p className="font-light">{new Date(testRun.completedAt).toLocaleString()}</p>
                  </div>
                )}
                {report?.totalDuration && (
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-neutral-400 uppercase tracking-wide flex items-center gap-2">
                      <Clock size={14} /> Duration
                    </span>
                    <p className="font-light">{report.totalDuration}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Running State */}
            {(testRun.status === "running" || testRun.status === "pending") && (
              <div className="border border-blue-100 bg-blue-50/50 p-6">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                  </div>
                  <div>
                    <h3 className="text-blue-900 font-medium mb-1">
                      {testRun.status === "pending" ? "Initializing simulation..." : "Agent is running"}
                    </h3>
                    <p className="text-blue-700 text-sm font-light">
                      This may take a few minutes. You can leave this page and come back later.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Failed State */}
            {testRun.status === "failed" && (
              <div className="border border-red-100 bg-red-50/50 p-6">
                <div className="flex items-start gap-4">
                  <XCircle className="text-red-600 mt-0.5" size={20} />
                  <div>
                    <h3 className="text-red-900 font-medium mb-1">Simulation Failed</h3>
                    <p className="text-red-700 text-sm font-light">{testRun.errorMessage || "An unknown error occurred during the simulation."}</p>
                  </div>
                </div>

            {/* Live View / Replay */}
            {testRun.browserbaseSessionId && (
              <div className="space-y-4">
                <h3 className="text-xl font-light">Session Replay</h3>
                <div className="relative border border-neutral-200 bg-neutral-50 aspect-video flex items-center justify-center overflow-hidden">
                   <div className="absolute inset-0 z-10 backdrop-blur-md bg-white/30 flex items-center justify-center">
                      <div className="bg-neutral-900 text-white px-4 py-2 rounded-none text-sm font-medium uppercase tracking-wider shadow-lg">
                        Coming Soon
                      </div>
                   </div>
                   <ErrorBoundary fallback={<div className="p-8 text-neutral-500">Replay unavailable</div>}>
                      <SessionReplayPlayer 
                        testId={testId} 
                        browserbaseSessionId={testRun.browserbaseSessionId}
                        isLive={testRun.status === "running"}
                      />
                   </ErrorBoundary>
                </div>
              </div>
            )}

            {/* Report */}
            {report && (
              <div className="grid md:grid-cols-3 gap-12">
                {/* Score Column */}
                <div className="md:col-span-1 space-y-6">
                  <div className="border border-neutral-200 p-8 text-center">
                    <div className="text-sm font-medium text-neutral-400 uppercase tracking-wide mb-2">Usability Score</div>
                    <div className="text-6xl font-light text-neutral-900 mb-4">{report.score}/10</div>
                    <div className="h-1.5 w-full bg-neutral-100 overflow-hidden">
                      <div className="h-full bg-neutral-900 transition-all duration-1000" style={{ width: `${(report.score || 0) * 10}%` }}></div>
                    </div>
                  </div>
                  
                  {report.summary && (
                    <div className="text-sm text-neutral-600 font-light leading-relaxed">
                      {report.summary}
                    </div>
                  )}
                </div>

                {/* Details Column */}
                <div className="md:col-span-2 space-y-12">
                  {/* Positive */}
                  <div>
                    <h3 className="text-lg font-medium mb-4 flex items-center gap-2 text-emerald-700">
                      <CheckCircle2 size={18} /> What Worked Well
                    </h3>
                    {report.positiveAspects && report.positiveAspects.length > 0 ? (
                      <ul className="space-y-3">
                        {report.positiveAspects.map((item, i) => (
                          <li key={i} className="text-neutral-600 font-light text-sm pl-4 border-l border-emerald-200">{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-neutral-400 text-sm italic">No specific positives noted.</p>
                    )}

                  {/* Issues */}
                  {(report.usabilityIssues?.length > 0 || report.accessibilityNotes?.length > 0) && (
                    <div>
                      <h3 className="text-lg font-medium mb-4 flex items-center gap-2 text-orange-700">
                        <AlertTriangle size={18} /> Issues Detected
                      </h3>
                      <div className="space-y-6">
                        {report.usabilityIssues?.map((issue, i) => (
                          <div key={i} className="border border-neutral-100 p-4 bg-neutral-50/30">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 border ${
                                issue.severity === 'critical' ? 'border-red-200 text-red-700 bg-red-50' : 
                                issue.severity === 'high' ? 'border-orange-200 text-orange-700 bg-orange-50' : 
                                'border-yellow-200 text-yellow-700 bg-yellow-50'
                              }`}>
                                {issue.severity}
                              </span>
                            </div>
                            <p className="text-neutral-800 text-sm mb-2">{issue.description}</p>
                            {issue.recommendation && (
                              <div className="text-neutral-500 text-xs font-light pl-3 border-l border-neutral-200">
                                <span className="font-medium text-neutral-600">Fix:</span> {issue.recommendation}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {report.recommendations && report.recommendations.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium mb-4 flex items-center gap-2 text-neutral-900">
                        <Lightbulb size={18} /> Strategic Recommendations
                      </h3>
                      <ol className="space-y-4">
                        {report.recommendations.map((rec, i) => (
                          <li key={i} className="text-neutral-600 font-light text-sm flex gap-3">
                            <span className="font-mono text-neutral-300 text-xs mt-0.5">0{i+1}</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Screenshots */}
            {screenshots.length > 0 && (
              <div className="pt-12 border-t border-neutral-100">
                <h3 className="text-xl font-light mb-6">Screenshots</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {screenshots.map((screenshot) => (
                    <div key={screenshot.id} className="border border-neutral-200 bg-neutral-50 group">
                      <div className="aspect-video relative overflow-hidden bg-neutral-100">
                        {screenshot.base64Data && (
                          <img
                            src={`data:image/png;base64,${screenshot.base64Data}`}
                            alt={screenshot.description || "Screenshot"}
                            className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                          />
                        )}
                      </div>
                      <div className="p-3 border-t border-neutral-200">
                        <div className="text-xs font-mono text-neutral-400 mb-1">Step {screenshot.stepNumber}</div>
                        <p className="text-xs text-neutral-700 font-medium truncate" title={screenshot.description}>
                          {screenshot.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-24">
            <p className="text-neutral-400 font-light">Test not found</p>
          </div>
        )}
      </main>
    </div>
  );
}
