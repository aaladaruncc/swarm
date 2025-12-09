"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
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
        if (batchTestRun?.status && ["running_tests", "aggregating"].includes(batchTestRun.status)) {
          loadTest();
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [session, testId, batchTestRun?.status]);

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

  if (isPending || !session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
      running_tests: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
      aggregating: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
      completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
      failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[status] || styles.pending}`}>
        {status === "running_tests" && "🔄 "}
        {status === "aggregating" && "🤖 "}
        {status.replace("_", " ")}
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
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
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg">{error}</div>
        ) : batchTestRun ? (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold mb-2">Batch UX Test Results</h1>
                  <a
                    href={batchTestRun.targetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {batchTestRun.targetUrl} ↗
                  </a>
                </div>
                {getStatusBadge(batchTestRun.status)}
              </div>

              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-4">
                <p className="text-sm font-medium mb-1">Target Audience:</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{batchTestRun.userDescription}</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                {testRuns.map((tr, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${
                      tr.testRun.status === "completed" ? "bg-green-500" :
                      tr.testRun.status === "running" ? "bg-blue-500 animate-pulse" :
                      tr.testRun.status === "failed" ? "bg-red-500" : "bg-gray-300"
                    }`} />
                    <span className="text-xs">{tr.testRun.personaName}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Running State */}
            {["running_tests", "aggregating"].includes(batchTestRun.status) && (
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg p-6 text-white shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="animate-spin rounded-full h-10 w-10 border-3 border-white/30 border-t-white"></div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold mb-1">
                      {batchTestRun.status === "aggregating" ? "🤖 Aggregating Results..." : "🚀 Tests Running..."}
                    </h3>
                    <p className="text-blue-100 text-sm">
                      {batchTestRun.status === "aggregating"
                        ? "AI is analyzing all test results to create a comprehensive report"
                        : `${testRuns.filter(t => t.testRun.status === "completed").length}/${testRuns.length} personas completed`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Completed - Show Reports */}
            {batchTestRun.status === "completed" && aggregatedReport && (
              <>
                {/* View Selector */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                  <div className="flex items-center gap-2 overflow-x-auto">
                    <button
                      onClick={() => setSelectedView("aggregated")}
                      className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                        selectedView === "aggregated"
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg"
                          : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }`}
                    >
                      📊 Aggregated Report
                    </button>
                    {testRuns.map((tr, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedView(index)}
                        className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                          selectedView === index
                            ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg"
                            : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                        }`}
                      >
                        {tr.testRun.personaName}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Aggregated Report View */}
                {selectedView === "aggregated" && (
                  <div className="space-y-6">
                    {/* Overall Score */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                      <h2 className="text-xl font-bold mb-4">Overall UX Score</h2>
                      <div className="flex items-center gap-6">
                        <div className="text-6xl font-bold text-blue-600">
                          {aggregatedReport.overallScore}/10
                        </div>
                        <div className="flex-1">
                          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all"
                              style={{ width: `${(aggregatedReport.overallScore || 0) * 10}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Executive Summary */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                      <h2 className="text-xl font-bold mb-4">Executive Summary</h2>
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {aggregatedReport.executiveSummary}
                      </p>
                    </div>

                    {/* Common Issues */}
                    {aggregatedReport.commonIssues && aggregatedReport.commonIssues.length > 0 && (
                      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <h2 className="text-xl font-bold mb-4">🚧 Common Issues</h2>
                        <div className="space-y-4">
                          {aggregatedReport.commonIssues.map((issue, i) => (
                            <div key={i} className={`border-l-4 p-4 rounded ${getSeverityColor(issue.severity)}`}>
                              <div className="flex items-start justify-between mb-2">
                                <h3 className="font-semibold">{issue.issue}</h3>
                                <span className="text-xs px-2 py-1 bg-white dark:bg-gray-800 rounded uppercase font-bold">
                                  {issue.severity}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                💡 {issue.recommendation}
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {issue.affectedPersonas.map((persona, j) => (
                                  <span key={j} className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">
                                    {persona}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Strengths */}
                    {aggregatedReport.strengthsAcrossPersonas && aggregatedReport.strengthsAcrossPersonas.length > 0 && (
                      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <h2 className="text-xl font-bold mb-4 text-green-600">✅ What Works Well</h2>
                        <ul className="space-y-2">
                          {aggregatedReport.strengthsAcrossPersonas.map((strength, i) => (
                            <li key={i} className="flex gap-2">
                              <span className="text-green-600">✓</span>
                              <span>{strength}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Recommendations */}
                    {aggregatedReport.recommendations && aggregatedReport.recommendations.length > 0 && (
                      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <h2 className="text-xl font-bold mb-4">💡 Prioritized Recommendations</h2>
                        <div className="space-y-4">
                          {aggregatedReport.recommendations.map((rec, i) => (
                            <div key={i} className="border-l-4 border-blue-500 pl-4">
                              <div className="flex items-start gap-2 mb-1">
                                <span className={`text-xs px-2 py-1 rounded font-bold uppercase ${getPriorityColor(rec.priority)}`}>
                                  {rec.priority}
                                </span>
                                <h3 className="font-semibold flex-1">{rec.recommendation}</h3>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Impact: {rec.impact}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Persona-Specific Insights */}
                    {aggregatedReport.personaSpecificInsights && aggregatedReport.personaSpecificInsights.length > 0 && (
                      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <h2 className="text-xl font-bold mb-4">👥 Persona-Specific Insights</h2>
                        <div className="grid md:grid-cols-2 gap-4">
                          {aggregatedReport.personaSpecificInsights.map((insight, i) => (
                            <div key={i} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                              <h3 className="font-semibold mb-2">{insight.personaName}</h3>
                              <ul className="space-y-1 text-sm">
                                {insight.keyFindings.map((finding, j) => (
                                  <li key={j} className="text-gray-600 dark:text-gray-400">• {finding}</li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Full Analysis */}
                    {aggregatedReport.fullAnalysis && (
                      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <h2 className="text-xl font-bold mb-4">📝 Detailed Analysis</h2>
                        <div className="prose dark:prose-invert max-w-none">
                          <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                            {aggregatedReport.fullAnalysis}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Individual Persona Report View */}
                {typeof selectedView === "number" && testRuns[selectedView]?.report && (
                  <div className="space-y-6">
                    {/* Persona Info */}
                    <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg shadow p-6 text-white">
                      <h2 className="text-2xl font-bold mb-2">{testRuns[selectedView].testRun.personaName}'s Experience</h2>
                      {testRuns[selectedView].testRun.personaData && (
                        <div className="grid md:grid-cols-2 gap-4 mt-4">
                          <div>
                            <p className="text-purple-100 text-sm">Profile</p>
                            <p className="font-medium">
                              {testRuns[selectedView].testRun.personaData.age}yo {testRuns[selectedView].testRun.personaData.occupation}
                            </p>
                            <p className="text-sm">{testRuns[selectedView].testRun.personaData.country}</p>
                          </div>
                          <div>
                            <p className="text-purple-100 text-sm">Tech Level</p>
                            <p className="font-medium capitalize">{testRuns[selectedView].testRun.personaData.techSavviness}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Score */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                      <h3 className="text-lg font-bold mb-3">Score</h3>
                      <div className="flex items-center gap-4">
                        <div className="text-4xl font-bold text-purple-600">
                          {testRuns[selectedView].report?.score}/10
                        </div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-purple-600 to-pink-600 rounded-full"
                              style={{ width: `${(testRuns[selectedView].report?.score || 0) * 10}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      {testRuns[selectedView].report?.summary && (
                        <p className="mt-4 text-gray-600 dark:text-gray-400">{testRuns[selectedView].report.summary}</p>
                      )}
                    </div>

                    {/* Positive Aspects */}
                    {testRuns[selectedView].report?.positiveAspects && testRuns[selectedView].report.positiveAspects!.length > 0 && (
                      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <h3 className="text-lg font-bold mb-3 text-green-600">✅ What Worked</h3>
                        <ul className="space-y-2">
                          {testRuns[selectedView].report!.positiveAspects!.map((item, i) => (
                            <li key={i} className="flex gap-2">
                              <span className="text-green-600">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Confusion Points */}
                    {testRuns[selectedView].report?.accessibilityNotes && testRuns[selectedView].report.accessibilityNotes!.length > 0 && (
                      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <h3 className="text-lg font-bold mb-3 text-yellow-600">😕 Confusion Points</h3>
                        <ul className="space-y-2">
                          {testRuns[selectedView].report!.accessibilityNotes!.map((item, i) => (
                            <li key={i} className="flex gap-2">
                              <span className="text-yellow-600">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Usability Issues */}
                    {testRuns[selectedView].report?.usabilityIssues && testRuns[selectedView].report.usabilityIssues!.length > 0 && (
                      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <h3 className="text-lg font-bold mb-3 text-red-600">🐛 Usability Issues</h3>
                        <div className="space-y-3">
                          {testRuns[selectedView].report!.usabilityIssues!.map((issue: any, i: number) => (
                            <div key={i} className={`border-l-4 p-3 rounded ${getSeverityColor(issue.severity)}`}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs px-2 py-1 bg-white dark:bg-gray-800 rounded uppercase font-bold">
                                  {issue.severity}
                                </span>
                              </div>
                              <p className="text-sm mb-1">{issue.description}</p>
                              {issue.recommendation && (
                                <p className="text-sm text-gray-600 dark:text-gray-400">💡 {issue.recommendation}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommendations */}
                    {testRuns[selectedView].report?.recommendations && testRuns[selectedView].report.recommendations!.length > 0 && (
                      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <h3 className="text-lg font-bold mb-3">💡 Recommendations</h3>
                        <ol className="list-decimal list-inside space-y-2">
                          {testRuns[selectedView].report!.recommendations!.map((rec, i) => (
                            <li key={i}>{rec}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Failed State */}
            {batchTestRun.status === "failed" && (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6">
                <h3 className="text-lg font-medium text-red-800 dark:text-red-300 mb-2">
                  Batch Test Failed
                </h3>
                <p className="text-red-600 dark:text-red-400">
                  {batchTestRun.errorMessage || "An unknown error occurred"}
                </p>
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
