"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { getBatchTest, type TestRunWithReport, type AggregatedReport, type BatchTestRun } from "@/lib/batch-api";
import { ArrowLeft, Loader2, ExternalLink } from "lucide-react";

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
      router.push("/");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session?.user && testId) {
      loadTest();
      const interval = setInterval(() => {
        if (batchTestRun?.status && ["running_tests", "aggregating"].includes(batchTestRun.status)) {
          loadTest();
        }
      }, 5000);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, testId, batchTestRun?.status]);

  if (isPending || !session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin w-8 h-8 text-neutral-300" />
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-neutral-100 text-neutral-600 border-neutral-200",
      running_tests: "bg-blue-50 text-blue-700 border-blue-200",
      aggregating: "bg-purple-50 text-purple-700 border-purple-200",
      completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
      failed: "bg-red-50 text-red-700 border-red-200",
    };
    
    const labels: Record<string, string> = {
      pending: "Queued",
      running_tests: "Running",
      aggregating: "Aggregating",
      completed: "Success",
      failed: "Failed",
    };

    return (
      <span className={`px-2.5 py-0.5 text-xs font-medium border ${styles[status] || styles.pending}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      critical: "border-l-red-600 bg-red-50",
      high: "border-l-orange-600 bg-orange-50",
      medium: "border-l-yellow-600 bg-yellow-50",
      low: "border-l-neutral-600 bg-neutral-50",
    };
    return colors[severity] || colors.low;
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      high: "bg-red-50 text-red-700 border-red-200",
      medium: "bg-yellow-50 text-yellow-700 border-yellow-200",
      low: "bg-neutral-50 text-neutral-700 border-neutral-200",
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
            <Loader2 className="animate-spin w-8 h-8 text-neutral-300" />
          </div>
        ) : error ? (
          <div className="p-6 bg-red-50 text-red-600 border border-red-200 text-sm font-light">
            <span className="font-medium">Error:</span> {error}
          </div>
        ) : batchTestRun ? (
          <div className="space-y-8">
            {/* Header */}
            <div className="border border-neutral-200 p-8">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <h1 className="text-3xl font-light tracking-tight mb-3">Batch Test Results</h1>
                  <a
                    href={batchTestRun.targetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-600 hover:text-neutral-900 text-sm font-light flex items-center gap-2 group"
                  >
                    <span>{batchTestRun.targetUrl}</span>
                    <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                </div>
                {getStatusBadge(batchTestRun.status)}
              </div>

              <div className="bg-neutral-50 border border-neutral-100 p-4 mb-4">
                <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">Target Audience</p>
                <p className="text-sm text-neutral-700 font-light">{batchTestRun.userDescription}</p>
              </div>

              {/* Persona Status Grid */}
              <div className="flex flex-wrap gap-3">
                {testRuns.map((tr, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5 border border-neutral-200 text-xs">
                    <div className={`h-1.5 w-1.5 rounded-full ${
                      tr.testRun.status === "completed" ? "bg-emerald-500" :
                      tr.testRun.status === "running" ? "bg-blue-500 animate-pulse" :
                      tr.testRun.status === "failed" ? "bg-red-500" : "bg-neutral-300"
                    }`} />
                    <span className="font-medium">{tr.testRun.personaName}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Running State */}
            {["running_tests", "aggregating"].includes(batchTestRun.status) && (
              <div className="border border-neutral-200 p-8 flex items-center gap-6">
                <Loader2 className="w-10 h-10 animate-spin text-neutral-400 shrink-0" />
                <div className="flex-1">
                  <h3 className="text-lg font-medium mb-1">
                    {batchTestRun.status === "aggregating" ? "Aggregating Results" : "Tests Running"}
                  </h3>
                  <p className="text-neutral-500 font-light text-sm">
                    {batchTestRun.status === "aggregating"
                      ? "AI is analyzing all test results to create a comprehensive report"
                      : `${testRuns.filter(t => t.testRun.status === "completed").length}/${testRuns.length} agents completed`}
                  </p>
                </div>
              </div>
            )}

            {/* Failed State */}
            {batchTestRun.status === "failed" && (
              <div className="border border-red-200 bg-red-50 p-6">
                <h3 className="text-lg font-medium text-red-800 mb-2">Batch Test Failed</h3>
                <p className="text-red-600 text-sm font-light">
                  {batchTestRun.errorMessage || "An unknown error occurred"}
                </p>
              </div>
            )}

            {/* Completed - Show Reports */}
            {batchTestRun.status === "completed" && aggregatedReport && (
              <>
                {/* View Tabs */}
                <div className="border-b border-neutral-200 overflow-x-auto">
                  <div className="flex gap-1 min-w-max">
                    <button
                      onClick={() => setSelectedView("aggregated")}
                      className={`px-6 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                        selectedView === "aggregated"
                          ? "border-b-2 border-neutral-900 text-neutral-900"
                          : "text-neutral-500 hover:text-neutral-900"
                      }`}
                    >
                      Aggregated Report
                    </button>
                    {testRuns.map((tr, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedView(index)}
                        className={`px-6 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                          selectedView === index
                            ? "border-b-2 border-neutral-900 text-neutral-900"
                            : "text-neutral-500 hover:text-neutral-900"
                        }`}
                      >
                        {tr.testRun.personaName}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Aggregated Report View */}
                {selectedView === "aggregated" && (
                  <div className="space-y-8">
                    {/* Overall Score */}
                    <div className="border border-neutral-200 p-8">
                      <h2 className="text-xl font-medium mb-6">Overall UX Score</h2>
                      <div className="flex items-center gap-8">
                        <div className="text-6xl font-light text-neutral-900">
                          {aggregatedReport.overallScore}<span className="text-3xl text-neutral-400">/10</span>
                        </div>
                        <div className="flex-1">
                          <div className="h-2 bg-neutral-100 overflow-hidden">
                            <div
                              className="h-full bg-neutral-900 transition-all"
                              style={{ width: `${(aggregatedReport.overallScore || 0) * 10}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      {aggregatedReport.executiveSummary && (
                        <p className="mt-6 text-neutral-600 font-light leading-relaxed whitespace-pre-wrap">
                          {aggregatedReport.executiveSummary}
                        </p>
                      )}
                    </div>

                    {/* Common Issues */}
                    {aggregatedReport.commonIssues && aggregatedReport.commonIssues.length > 0 && (
                      <div className="border border-neutral-200 p-8">
                        <h2 className="text-xl font-medium mb-6">Common Issues</h2>
                        <div className="space-y-4">
                          {aggregatedReport.commonIssues.map((issue, i) => (
                            <div key={i} className={`border-l-4 p-4 ${getSeverityColor(issue.severity)}`}>
                              <div className="flex items-start justify-between mb-2">
                                <h3 className="font-medium">{issue.issue}</h3>
                                <span className="text-xs px-2 py-1 bg-white border border-neutral-200 uppercase font-medium">
                                  {issue.severity}
                                </span>
                              </div>
                              <p className="text-sm text-neutral-600 font-light mb-3">
                                {issue.recommendation}
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {issue.affectedPersonas.map((persona, j) => (
                                  <span key={j} className="text-xs px-2 py-0.5 bg-white border border-neutral-200 font-light">
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
                      <div className="border border-neutral-200 p-8">
                        <h2 className="text-xl font-medium mb-6 text-emerald-700">What Works Well</h2>
                        <ul className="space-y-2">
                          {aggregatedReport.strengthsAcrossPersonas.map((strength, i) => (
                            <li key={i} className="flex gap-3 text-sm font-light">
                              <span className="text-emerald-600 shrink-0">✓</span>
                              <span>{strength}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Recommendations */}
                    {aggregatedReport.recommendations && aggregatedReport.recommendations.length > 0 && (
                      <div className="border border-neutral-200 p-8">
                        <h2 className="text-xl font-medium mb-6">Prioritized Recommendations</h2>
                        <div className="space-y-4">
                          {aggregatedReport.recommendations.map((rec, i) => (
                            <div key={i} className="border-l-4 border-l-neutral-900 pl-6 py-2">
                              <div className="flex items-start gap-3 mb-2">
                                <span className={`text-xs px-2 py-1 font-medium uppercase border ${getPriorityColor(rec.priority)}`}>
                                  {rec.priority}
                                </span>
                                <h3 className="font-medium flex-1">{rec.recommendation}</h3>
                              </div>
                              <p className="text-sm text-neutral-600 font-light">
                                {rec.impact}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Persona-Specific Insights */}
                    {aggregatedReport.personaSpecificInsights && aggregatedReport.personaSpecificInsights.length > 0 && (
                      <div className="border border-neutral-200 p-8">
                        <h2 className="text-xl font-medium mb-6">Persona-Specific Insights</h2>
                        <div className="grid md:grid-cols-2 gap-4">
                          {aggregatedReport.personaSpecificInsights.map((insight, i) => (
                            <div key={i} className="p-5 bg-neutral-50 border border-neutral-100">
                              <h3 className="font-medium mb-3">{insight.personaName}</h3>
                              <ul className="space-y-2 text-sm font-light">
                                {insight.keyFindings.map((finding, j) => (
                                  <li key={j} className="text-neutral-600 flex gap-2">
                                    <span className="shrink-0">•</span>
                                    <span>{finding}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Full Analysis */}
                    {aggregatedReport.fullAnalysis && (
                      <div className="border border-neutral-200 p-8">
                        <h2 className="text-xl font-medium mb-6">Detailed Analysis</h2>
                        <div className="prose prose-neutral max-w-none">
                          <p className="whitespace-pre-wrap text-neutral-700 font-light leading-relaxed">
                            {aggregatedReport.fullAnalysis}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Individual Persona Report View */}
                {typeof selectedView === "number" && testRuns[selectedView]?.report && (
                  <div className="space-y-8">
                    {/* Persona Profile */}
                    <div className="bg-gradient-to-br from-neutral-900 to-neutral-800 text-white p-8">
                      <h2 className="text-2xl font-light mb-4">{testRuns[selectedView].testRun.personaName}'s Experience</h2>
                      {testRuns[selectedView].testRun.personaData && (
                        <div className="grid md:grid-cols-3 gap-6 text-sm">
                          <div>
                            <p className="text-neutral-400 text-xs uppercase tracking-wide mb-1">Profile</p>
                            <p className="font-medium">
                              {testRuns[selectedView].testRun.personaData.age} years old
                            </p>
                            <p className="font-light">{testRuns[selectedView].testRun.personaData.occupation}</p>
                          </div>
                          <div>
                            <p className="text-neutral-400 text-xs uppercase tracking-wide mb-1">Location</p>
                            <p className="font-light">{testRuns[selectedView].testRun.personaData.country}</p>
                          </div>
                          <div>
                            <p className="text-neutral-400 text-xs uppercase tracking-wide mb-1">Tech Level</p>
                            <p className="font-light capitalize">{testRuns[selectedView].testRun.personaData.techSavviness}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Score */}
                    <div className="border border-neutral-200 p-8">
                      <h3 className="text-lg font-medium mb-4">Individual Score</h3>
                      <div className="flex items-center gap-6">
                        <div className="text-5xl font-light text-neutral-900">
                          {testRuns[selectedView].report?.score}<span className="text-2xl text-neutral-400">/10</span>
                        </div>
                        <div className="flex-1">
                          <div className="h-2 bg-neutral-100 overflow-hidden">
                            <div
                              className="h-full bg-neutral-900"
                              style={{ width: `${(testRuns[selectedView].report?.score || 0) * 10}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      {testRuns[selectedView].report?.summary && (
                        <p className="mt-4 text-neutral-600 font-light">{testRuns[selectedView].report.summary}</p>
                      )}
                    </div>

                    {/* Positive Aspects */}
                    {testRuns[selectedView].report?.positiveAspects && testRuns[selectedView].report.positiveAspects!.length > 0 && (
                      <div className="border border-neutral-200 p-8">
                        <h3 className="text-lg font-medium mb-4 text-emerald-700">What Worked</h3>
                        <ul className="space-y-2">
                          {testRuns[selectedView].report!.positiveAspects!.map((item, i) => (
                            <li key={i} className="flex gap-3 text-sm font-light">
                              <span className="text-emerald-600 shrink-0">✓</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Confusion Points */}
                    {testRuns[selectedView].report?.accessibilityNotes && testRuns[selectedView].report.accessibilityNotes!.length > 0 && (
                      <div className="border border-neutral-200 p-8">
                        <h3 className="text-lg font-medium mb-4 text-yellow-700">Confusion Points</h3>
                        <ul className="space-y-2">
                          {testRuns[selectedView].report!.accessibilityNotes!.map((item, i) => (
                            <li key={i} className="flex gap-3 text-sm font-light">
                              <span className="text-yellow-600 shrink-0">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Usability Issues */}
                    {testRuns[selectedView].report?.usabilityIssues && testRuns[selectedView].report.usabilityIssues!.length > 0 && (
                      <div className="border border-neutral-200 p-8">
                        <h3 className="text-lg font-medium mb-4 text-red-700">Usability Issues</h3>
                        <div className="space-y-3">
                          {testRuns[selectedView].report!.usabilityIssues!.map((issue: any, i: number) => (
                            <div key={i} className={`border-l-4 p-4 ${getSeverityColor(issue.severity)}`}>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs px-2 py-1 bg-white border border-neutral-200 uppercase font-medium">
                                  {issue.severity}
                                </span>
                              </div>
                              <p className="text-sm mb-2 font-light">{issue.description}</p>
                              {issue.recommendation && (
                                <p className="text-sm text-neutral-600 font-light">{issue.recommendation}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommendations */}
                    {testRuns[selectedView].report?.recommendations && testRuns[selectedView].report.recommendations!.length > 0 && (
                      <div className="border border-neutral-200 p-8">
                        <h3 className="text-lg font-medium mb-4">Recommendations</h3>
                        <ol className="list-decimal list-inside space-y-2 text-sm font-light">
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
          </div>
        ) : (
          <div className="text-center py-24">
            <p className="text-neutral-500 font-light">Test not found</p>
          </div>
        )}
      </main>
    </div>
  );
}
