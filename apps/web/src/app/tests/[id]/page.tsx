"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { getBatchTest, terminateBatchTest, type TestRunWithReport, type AggregatedReport, type BatchTestRun } from "@/lib/batch-api";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Loader2, ExternalLink, Download, X, CheckCircle2, AlertCircle } from "lucide-react";
import { pdf } from '@react-pdf/renderer';
import { AggregatedReportPDF } from '@/components/pdf/AggregatedReportPDF';
import { PersonaReportPDF } from '@/components/pdf/PersonaReportPDF';

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
  const [exportingPDF, setExportingPDF] = useState(false);
  const [isTerminating, setIsTerminating] = useState(false);
  const [showTerminateConfirm, setShowTerminateConfirm] = useState(false);

  const testId = params.id as string;

  const handleExportAggregatedPDF = async () => {
    if (!batchTestRun || !aggregatedReport) return;
    
    setExportingPDF(true);
    try {
      const blob = await pdf(
        <AggregatedReportPDF 
          batchTestRun={batchTestRun}
          aggregatedReport={aggregatedReport}
          agentCount={testRuns.length}
        />
      ).toBlob();
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `aggregated-report-${new Date().toISOString().split('T')[0]}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      setError('Failed to export PDF');
    } finally {
      setExportingPDF(false);
    }
  };

  const handleExportPersonaPDF = async (index: number) => {
    if (!testRuns[index] || !batchTestRun) return;
    
    setExportingPDF(true);
    try {
      const blob = await pdf(
        <PersonaReportPDF 
          testRun={testRuns[index]}
          targetUrl={batchTestRun.targetUrl}
        />
      ).toBlob();
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${testRuns[index].testRun.personaName}-report-${new Date().toISOString().split('T')[0]}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      setError('Failed to export PDF');
    } finally {
      setExportingPDF(false);
    }
  };

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
  }, [session, testId]);

  if (isPending || !session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin w-8 h-8 text-neutral-300" />
      </div>
    );
  }

  const handleTerminateClick = () => {
    setShowTerminateConfirm(true);
  };

  const handleTerminateConfirm = async () => {
    setIsTerminating(true);
    try {
      await terminateBatchTest(testId);
      // Reload the test to get updated status
      await loadTest();
      setShowTerminateConfirm(false);
    } catch (err) {
      console.error("Failed to terminate test:", err);
      alert("Failed to terminate test");
    } finally {
      setIsTerminating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-neutral-100 text-neutral-600 border-neutral-200",
      running_tests: "bg-blue-50 text-blue-700 border-blue-200",
      aggregating: "bg-purple-50 text-purple-700 border-purple-200",
      completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
      failed: "bg-red-50 text-red-700 border-red-200",
      terminated: "bg-orange-50 text-orange-700 border-orange-200",
    };
    
    const labels: Record<string, string> = {
      pending: "Queued",
      running_tests: "Running",
      aggregating: "Aggregating",
      completed: "Success",
      failed: "Failed",
      terminated: "Terminated",
    };

    const canTerminate = ["running_tests", "aggregating"].includes(status);

    return (
      <div className="flex items-center gap-3">
        <span className={`px-3 py-1.5 text-xs font-medium border rounded-none ${styles[status] || styles.pending}`}>
          {labels[status] || status}
        </span>
        {canTerminate && (
          <button
            onClick={handleTerminateClick}
            disabled={isTerminating}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 transition-colors rounded-none disabled:opacity-50 disabled:cursor-not-allowed"
            title="Terminate all running agents"
          >
            <X size={12} />
            <span>Terminate</span>
          </button>
        )}
      </div>
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
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="text-neutral-500 hover:text-neutral-900 transition-colors flex items-center gap-2 text-sm font-medium">
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
          
          {batchTestRun?.status === "completed" && aggregatedReport && (
            <button
              onClick={selectedView === "aggregated" ? handleExportAggregatedPDF : () => typeof selectedView === "number" && handleExportPersonaPDF(selectedView)}
              disabled={exportingPDF}
              className="flex items-center gap-2 bg-neutral-900 text-white px-4 py-2 hover:bg-neutral-800 transition-all text-xs font-medium disabled:opacity-50"
            >
              {exportingPDF ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Download size={14} />
                  <span>Export PDF</span>
                </>
              )}
            </button>
          )}
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
                {testRuns.map((tr, i) => {
                  const status = tr.testRun.status;
                  const isCompleted = status === "completed";
                  const isRunning = status === "running";
                  const isFailed = status === "failed";
                  const isTerminated = status === "terminated";
                  
                  return (
                    <div 
                      key={i} 
                      className={`flex items-center gap-2 px-3 py-2 border text-xs rounded-none ${
                        isCompleted 
                          ? "border-emerald-200 bg-emerald-50" 
                          : isRunning 
                          ? "border-blue-200 bg-blue-50" 
                          : isFailed
                          ? "border-red-200 bg-red-50"
                          : isTerminated
                          ? "border-orange-200 bg-orange-50"
                          : "border-neutral-200 bg-neutral-50"
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 size={14} className="text-emerald-600" />
                      ) : isRunning ? (
                        <Loader2 size={14} className="text-blue-600 animate-spin" />
                      ) : isFailed ? (
                        <AlertCircle size={14} className="text-red-600" />
                      ) : isTerminated ? (
                        <X size={14} className="text-orange-600" />
                      ) : (
                        <div className="w-3 h-3 border border-neutral-300" />
                      )}
                      <span className={`font-medium ${
                        isCompleted ? "text-emerald-700" :
                        isRunning ? "text-blue-700" :
                        isFailed ? "text-red-700" :
                        isTerminated ? "text-orange-700" :
                        "text-neutral-600"
                      }`}>
                        {tr.testRun.personaName}
                      </span>
                    </div>
                  );
                })}
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

            {/* Terminated State */}
            {batchTestRun.status === "terminated" && (
              <div className="border border-orange-200 bg-orange-50 p-6">
                <h3 className="text-lg font-medium text-orange-800 mb-2">Batch Test Terminated</h3>
                <p className="text-orange-600 text-sm font-light">
                  This test was terminated by the user. All running agents have been stopped.
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
                        <div className="prose prose-neutral max-w-none text-neutral-700 font-light leading-relaxed">
                          <ReactMarkdown
                            components={{
                              h3: ({ children }) => <h3 className="text-lg font-medium mt-6 mb-3 text-neutral-900">{children}</h3>,
                              p: ({ children }) => <p className="mb-4">{children}</p>,
                              ul: ({ children }) => <ul className="list-disc list-inside mb-4 space-y-1">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal list-inside mb-4 space-y-1">{children}</ol>,
                              li: ({ children }) => <li className="ml-4">{children}</li>,
                              strong: ({ children }) => <strong className="font-medium">{children}</strong>,
                              em: ({ children }) => <em className="italic">{children}</em>,
                            }}
                          >
                            {aggregatedReport.fullAnalysis}
                          </ReactMarkdown>
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

      {/* Terminate Confirmation Modal */}
      {showTerminateConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200 rounded-none">
            <h3 className="text-lg font-medium text-neutral-900 mb-2">Terminate Test</h3>
            <p className="text-neutral-500 font-light text-sm mb-6">
              Are you sure you want to terminate this test? This will cancel all running agents and cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowTerminateConfirm(false)}
                className="px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100 transition-colors rounded-none"
              >
                Cancel
              </button>
              <button
                onClick={handleTerminateConfirm}
                disabled={isTerminating}
                className="px-4 py-2 text-sm bg-orange-600 text-white hover:bg-orange-700 transition-colors shadow-sm rounded-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isTerminating ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Terminating...</span>
                  </>
                ) : (
                  "Terminate"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
