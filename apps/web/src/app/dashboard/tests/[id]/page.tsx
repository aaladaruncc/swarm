"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { getBatchTest, terminateBatchTest, type TestRunWithReport, type AggregatedReport, type BatchTestRun, type UXAgentRun } from "@/lib/batch-api";
import ReactMarkdown from "react-markdown";
import { Loader2, ExternalLink, Download, X, CheckCircle2, AlertCircle, Play, ChevronDown, ChevronUp, Users, BarChart3, Eye, MousePointer, Image as ImageIcon, Brain, Lightbulb, FileText, Clock, MessageCircle } from "lucide-react";
import { ChatTab } from "@/components/ChatTab";
import { InsightsTab } from "@/components/InsightsTab";
import { SessionTranscriptViewer } from "@/components/SessionTranscriptViewer";
import { pdf } from '@react-pdf/renderer';
import { AggregatedReportPDF } from '@/components/pdf/AggregatedReportPDF';
import { PersonaReportPDF } from '@/components/pdf/PersonaReportPDF';
import { UXAgentReportView } from "@/components/UXAgentReportView";
import { useTheme } from "@/contexts/theme-context";

export default function TestDetails() {
  const router = useRouter();
  const params = useParams();
  const { data: session, isPending } = useSession();
  const { theme } = useTheme();
  const isLight = theme === "light";
  const [batchTestRun, setBatchTestRun] = useState<BatchTestRun | null>(null);
  const [testRuns, setTestRuns] = useState<TestRunWithReport[]>([]);
  const [aggregatedReport, setAggregatedReport] = useState<AggregatedReport | null>(null);
  const [uxagentRuns, setUxagentRuns] = useState<UXAgentRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedView, setSelectedView] = useState<"aggregated" | "uxagent" | number>("aggregated");
  const [exportingPDF, setExportingPDF] = useState(false);
  const [isTerminating, setIsTerminating] = useState(false);
  const [showTerminateConfirm, setShowTerminateConfirm] = useState(false);
  const [viewingSession, setViewingSession] = useState<string | null>(null);
  const [isMetadataExpanded, setIsMetadataExpanded] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState<"results" | "swarm-agents" | "test-details">("results");
  const [selectedPersonaDetail, setSelectedPersonaDetail] = useState<{ persona: any; index: number } | null>(null);
  const [selectedSwarmAgentIndex, setSelectedSwarmAgentIndex] = useState<number | null>(null);
  const [swarmAgentActiveTab, setSwarmAgentActiveTab] = useState<"overview" | "actions" | "screenshots" | "memory" | "insights" | "logs" | "chat">("overview");
  const [swarmScreenshotIndex, setSwarmScreenshotIndex] = useState(0);
  const [swarmMemoryExpanded, setSwarmMemoryExpanded] = useState<number | null>(null);

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
      setUxagentRuns(data.uxagentRuns || []);
      // Default to uxagent view if UXAgent was used
      if (data.batchTestRun?.useUXAgent && data.uxagentRuns?.length > 0) {
        setSelectedView("uxagent");
      }
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
    }
  }, [session, testId]);

  // Poll for status updates when test is running or aggregating
  useEffect(() => {
    if (!batchTestRun) return;

    const status = batchTestRun.status;
    const isActive = ["running_tests", "aggregating", "running_uxagent"].includes(status);

    if (!isActive) return;

    const pollInterval = setInterval(() => {
      loadTest();
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [batchTestRun?.status, testId]);

  if (isPending || !session?.user) {
    return (
      <div className={`h-full flex items-center justify-center ${isLight ? "bg-neutral-50" : "bg-neutral-950"
        } ${isLight ? "text-neutral-900" : "text-white"}`}>
        <Loader2 className={`animate-spin w-8 h-8 ${isLight ? "text-neutral-500" : "text-neutral-400"
          }`} />
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
      pending: "bg-neutral-500/10 text-neutral-400 border-neutral-500/20",
      running_tests: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      aggregating: "bg-purple-500/10 text-purple-400 border-purple-500/20",
      completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      failed: "bg-red-500/10 text-red-400 border-red-500/20",
      terminated: "bg-orange-500/10 text-orange-400 border-orange-500/20",
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
        <span className={`px-2.5 py-0.5 text-xs font-medium border rounded-full ${styles[status] || styles.pending}`}>
          {labels[status] || status}
        </span>
        {canTerminate && (
          <button
            onClick={handleTerminateClick}
            disabled={isTerminating}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-red-500/20 text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
      critical: "border-l-red-500 bg-red-500/10",
      high: "border-l-orange-500 bg-orange-500/10",
      medium: "border-l-yellow-500 bg-yellow-500/10",
      low: "border-l-neutral-500 bg-neutral-500/10",
    };
    return colors[severity] || colors.low;
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      high: "bg-red-500/10 text-red-400 border-red-500/20",
      medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
      low: "bg-neutral-500/10 text-neutral-400 border-neutral-500/20",
    };
    return colors[priority] || colors.low;
  };

  const formatTimestamp = (dateString: string | null): string => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  // Helper to extract persona name from UXAgentRun
  const getSwarmAgentName = (run: UXAgentRun, index: number): string => {
    const personaData = run.personaData as any;
    if (personaData?.name) return personaData.name;
    const basicInfo = run.basicInfo as any;
    if (basicInfo?.persona) {
      const match = basicInfo.persona.match(/(?:name[:\s]+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
      if (match) return match[1];
    }
    return `Agent ${index + 1}`;
  };

  // Helper to get status color for swarm agents
  const getSwarmAgentStatusColor = (status: string) => {
    switch (status) {
      case "completed": return isLight ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      case "failed": return isLight ? "text-red-700 bg-red-50 border-red-200" : "text-red-400 bg-red-500/10 border-red-500/20";
      case "running": return isLight ? "text-blue-700 bg-blue-50 border-blue-200" : "text-blue-400 bg-blue-500/10 border-blue-500/20";
      default: return isLight ? "text-neutral-600 bg-neutral-50 border-neutral-200" : "text-neutral-400 bg-neutral-500/10 border-neutral-500/20";
    }
  };

  return (
    <div className={`p-8 max-w-7xl mx-auto w-full min-h-screen ${isLight ? "bg-neutral-50" : "bg-neutral-950"
      }`}>
      {/* Breadcrumb Header */}
      <div className="mb-8 flex-shrink-0">
        <nav className="flex items-center gap-2 text-sm mb-6">
          <Link
            href="/dashboard"
            className={`transition-colors font-light ${isLight ? "text-neutral-500 hover:text-neutral-900" : "text-neutral-400 hover:text-white"
              }`}
          >
            Playground
          </Link>
          <span className={isLight ? "text-neutral-400" : "text-neutral-600"}>/</span>
          <span className={`font-medium ${isLight ? "text-neutral-900" : "text-white"
            }`}>Results</span>
        </nav>
        <div className="flex items-center justify-between">
          <h1 className={`text-3xl font-light tracking-tight mb-2 ${isLight ? "text-neutral-900" : "text-white"
            }`}>Test Results</h1>
          {batchTestRun?.status === "completed" && aggregatedReport && (
            <button
              onClick={selectedView === "aggregated" ? handleExportAggregatedPDF : () => typeof selectedView === "number" && handleExportPersonaPDF(selectedView)}
              disabled={exportingPDF}
              className={`flex items-center gap-2 px-4 py-2 transition-all text-sm font-medium shadow-sm rounded-lg disabled:opacity-50 ${isLight
                ? "bg-neutral-900 text-white border border-neutral-900 hover:bg-neutral-800"
                : "bg-[#252525] text-white border border-white/10 hover:bg-[#333]"
                }`}
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
      </div>

      {error && (
        <div className={`px-4 py-3 text-sm border mb-8 font-light rounded-lg ${isLight
          ? "bg-red-50 text-red-600 border-red-200"
          : "bg-red-500/10 text-red-400 border-red-500/20"
          }`}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className={`animate-spin w-8 h-8 ${isLight ? "text-neutral-500" : "text-neutral-400"
            }`} />
        </div>
      ) : batchTestRun ? (
        <div className="space-y-8">
          {/* Test Metadata Card - Compact & Expandable */}
          <div className={`border rounded-lg overflow-hidden transition-all ${isLight
            ? "bg-white border-neutral-200"
            : "border-white/10 bg-[#1E1E1E]"
            }`}>
            {/* Compact Header - Always Visible */}
            <div
              className={`p-4 cursor-pointer transition-colors ${isLight ? "hover:bg-neutral-50" : "hover:bg-white/5"
                }`}
              onClick={() => setIsMetadataExpanded(!isMetadataExpanded)}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  {/* Status Badge Row */}
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusBadge(batchTestRun.status)}
                  </div>

                  {/* URL Row */}
                  <a
                    href={batchTestRun.targetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className={`text-sm font-light flex items-center gap-2 group mb-2 ${isLight
                      ? "text-neutral-600 hover:text-neutral-900"
                      : "text-neutral-300 hover:text-white"
                      }`}
                  >
                    <span className="truncate max-w-md">{batchTestRun.targetUrl}</span>
                    <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </a>

                  {/* Progress Row - Conditional */}
                  {["running_tests", "aggregating", "running_uxagent"].includes(batchTestRun.status) && (
                    <div className={`text-xs font-light mb-1 ${isLight ? "text-neutral-500" : "text-neutral-400"
                      }`}>
                      {batchTestRun.status === "aggregating"
                        ? "Aggregating results..."
                        : batchTestRun.status === "running_uxagent"
                          ? "UXAgent running..."
                          : `${testRuns.filter(t => t.testRun.status === "completed").length}/${testRuns.length} agents completed`}
                    </div>
                  )}

                  {/* Timestamp Row */}
                  <div className={`text-xs font-light ${isLight ? "text-neutral-400" : "text-neutral-500"
                    }`}>
                    Created {formatTimestamp(batchTestRun.createdAt)}
                  </div>
                </div>

                {/* Expand/Collapse Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMetadataExpanded(!isMetadataExpanded);
                  }}
                  className={`p-1.5 transition-colors rounded shrink-0 ${isLight
                    ? "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                    : "text-neutral-400 hover:bg-white/10 hover:text-white"
                    }`}
                  aria-label={isMetadataExpanded ? "Collapse details" : "Expand details"}
                >
                  {isMetadataExpanded ? (
                    <ChevronUp size={16} />
                  ) : (
                    <ChevronDown size={16} />
                  )}
                </button>
              </div>
            </div>

            {/* Expanded Content - Conditionally Rendered */}
            {isMetadataExpanded && (
              <div className={`border-t p-4 space-y-4 transition-all duration-200 ${isLight ? "border-neutral-200" : "border-white/10"
                }`}>
                {/* Target Audience */}
                <div>
                  <p className={`text-xs font-medium uppercase tracking-wide mb-1.5 ${isLight ? "text-neutral-500" : "text-neutral-400"
                    }`}>Target Audience</p>
                  <p className={`text-sm font-light ${isLight ? "text-neutral-700" : "text-neutral-300"
                    }`}>{batchTestRun.userDescription}</p>
                </div>

                {/* Persona Status Grid */}
                {testRuns.length > 0 && (
                  <div>
                    <p className={`text-xs font-medium uppercase tracking-wide mb-2 ${isLight ? "text-neutral-500" : "text-neutral-400"
                      }`}>Agent Status</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                      {testRuns.map((tr, i) => {
                        const status = tr.testRun.status;
                        const isCompleted = status === "completed";
                        const isRunning = status === "running";
                        const isFailed = status === "failed";
                        const isTerminated = status === "terminated";

                        return (
                          <div
                            key={i}
                            className={`flex items-center gap-2 px-2.5 py-1.5 border text-xs rounded-lg ${isCompleted
                              ? isLight
                                ? "border-emerald-200 bg-emerald-50"
                                : "border-emerald-500/20 bg-emerald-500/10"
                              : isRunning
                                ? isLight
                                  ? "border-blue-200 bg-blue-50"
                                  : "border-blue-500/20 bg-blue-500/10"
                                : isFailed
                                  ? isLight
                                    ? "border-red-200 bg-red-50"
                                    : "border-red-500/20 bg-red-500/10"
                                  : isTerminated
                                    ? isLight
                                      ? "border-orange-200 bg-orange-50"
                                      : "border-orange-500/20 bg-orange-500/10"
                                    : isLight
                                      ? "border-neutral-200 bg-neutral-50"
                                      : "border-white/10 bg-white/5"
                              }`}
                          >
                            {isCompleted ? (
                              <CheckCircle2 size={12} className={`shrink-0 ${isLight ? "text-emerald-600" : "text-emerald-400"
                                }`} />
                            ) : isRunning ? (
                              <Loader2 size={12} className={`animate-spin shrink-0 ${isLight ? "text-blue-600" : "text-blue-400"
                                }`} />
                            ) : isFailed ? (
                              <AlertCircle size={12} className={`shrink-0 ${isLight ? "text-red-600" : "text-red-400"
                                }`} />
                            ) : isTerminated ? (
                              <X size={12} className={`shrink-0 ${isLight ? "text-orange-600" : "text-orange-400"
                                }`} />
                            ) : (
                              <div className={`w-2.5 h-2.5 border shrink-0 ${isLight ? "border-neutral-400" : "border-neutral-500"
                                }`} />
                            )}
                            <span className={`font-medium truncate ${isCompleted
                              ? isLight ? "text-emerald-700" : "text-emerald-400"
                              : isRunning
                                ? isLight ? "text-blue-700" : "text-blue-400"
                                : isFailed
                                  ? isLight ? "text-red-700" : "text-red-400"
                                  : isTerminated
                                    ? isLight ? "text-orange-700" : "text-orange-400"
                                    : isLight ? "text-neutral-600" : "text-neutral-400"
                              }`}>
                              {tr.testRun.personaName}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Additional Details */}
                <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t ${isLight ? "border-neutral-200" : "border-white/5"
                  }`}>
                  <div>
                    <p className={`text-xs font-medium uppercase tracking-wide mb-1 ${isLight ? "text-neutral-500" : "text-neutral-400"
                      }`}>Test Configuration</p>
                    <div className={`space-y-1 text-xs font-light ${isLight ? "text-neutral-700" : "text-neutral-300"
                      }`}>
                      <p>Agents: {testRuns.length}</p>
                      <p>Mode: {batchTestRun.useUXAgent ? "UXAgent" : "Standard"}</p>
                    </div>
                  </div>
                  <div>
                    <p className={`text-xs font-medium uppercase tracking-wide mb-1 ${isLight ? "text-neutral-500" : "text-neutral-400"
                      }`}>Timestamps</p>
                    <div className={`space-y-1 text-xs font-light ${isLight ? "text-neutral-700" : "text-neutral-300"
                      }`}>
                      <p>Created: {new Date(batchTestRun.createdAt).toLocaleString()}</p>
                      {batchTestRun.completedAt && (
                        <p>Completed: {new Date(batchTestRun.completedAt).toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Error Message - If Any */}
                {batchTestRun.errorMessage && (
                  <div className={`border-l-4 p-3 rounded ${isLight
                    ? "border-red-500 bg-red-50"
                    : "border-red-500 bg-red-500/10"
                    }`}>
                    <p className={`text-xs font-medium uppercase tracking-wide mb-1 ${isLight ? "text-red-700" : "text-red-400"
                      }`}>Error</p>
                    <p className={`text-sm font-light ${isLight ? "text-red-600" : "text-red-300"
                      }`}>{batchTestRun.errorMessage}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Running State */}
          {["running_tests", "aggregating", "running_uxagent"].includes(batchTestRun.status) && (
            <div className={`border p-8 flex items-center gap-6 rounded-xl ${isLight
              ? "bg-white border-neutral-200"
              : "border-white/10 bg-[#1E1E1E]"
              }`}>
              <Loader2 className={`w-10 h-10 animate-spin shrink-0 ${isLight ? "text-neutral-500" : "text-neutral-400"
                }`} />
              <div className="flex-1">
                <h3 className={`text-lg font-medium mb-1 ${isLight ? "text-neutral-900" : "text-white"
                  }`}>
                  {batchTestRun.status === "aggregating"
                    ? "Aggregating Results"
                    : batchTestRun.status === "running_uxagent"
                      ? "UXAgent Running"
                      : "Tests Running"}
                </h3>
                <p className={`font-light text-sm ${isLight ? "text-neutral-600" : "text-neutral-400"
                  }`}>
                  {batchTestRun.status === "aggregating"
                    ? "AI is analyzing all test results to create a comprehensive report"
                    : batchTestRun.status === "running_uxagent"
                      ? "UXAgent is exploring your website with AI-driven decision making"
                      : `${testRuns.filter(t => t.testRun.status === "completed").length}/${testRuns.length} agents completed`}
                </p>
              </div>
            </div>
          )}

          {/* Failed State */}
          {batchTestRun.status === "failed" && (
            <div className={`border p-6 rounded-xl ${isLight
              ? "border-red-200 bg-red-50"
              : "border-red-500/20 bg-red-500/10"
              }`}>
              <h3 className={`text-lg font-medium mb-2 ${isLight ? "text-red-700" : "text-red-400"
                }`}>Batch Test Failed</h3>
              <p className={`text-sm font-light ${isLight ? "text-red-600" : "text-red-300"
                }`}>
                {batchTestRun.errorMessage || "An unknown error occurred"}
              </p>
            </div>
          )}

          {/* Terminated State */}
          {batchTestRun.status === "terminated" && (
            <div className={`border p-6 rounded-xl ${isLight
              ? "border-orange-200 bg-orange-50"
              : "border-orange-500/20 bg-orange-500/10"
              }`}>
              <h3 className={`text-lg font-medium mb-2 ${isLight ? "text-orange-700" : "text-orange-400"
                }`}>Batch Test Terminated</h3>
              <p className={`text-sm font-light ${isLight ? "text-orange-600" : "text-orange-300"
                }`}>
                This test was terminated by the user. All running agents have been stopped.
              </p>
            </div>
          )}

          {/* Completed - Show Reports */}
          {(batchTestRun.status === "completed" || (batchTestRun.useUXAgent && uxagentRuns.length > 0)) && (
            <>
              {/* Main Tabs Navigation */}
              <div className={`border-b ${isLight ? "border-neutral-200" : "border-white/10"
                }`}>
                <div className="flex gap-1 overflow-x-auto">
                  {[
                    { key: "results", label: "Results" },
                    { key: "swarm-agents", label: "Swarm Agents" },
                    { key: "test-details", label: "Test Details" },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setActiveMainTab(key as any)}
                      className={`px-5 py-3 text-sm font-medium transition-colors whitespace-nowrap ${activeMainTab === key
                        ? isLight
                          ? "border-b-2 border-neutral-900 text-neutral-900"
                          : "border-b-2 border-white text-white"
                        : isLight
                          ? "text-neutral-500 hover:text-neutral-700"
                          : "text-neutral-500 hover:text-neutral-300"
                        }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Results Tab */}
              {activeMainTab === "results" && (
                <>
                  {/* UXAgent Report View */}
                  {batchTestRun.useUXAgent && uxagentRuns.length > 0 && (
                    <UXAgentReportView
                      uxagentRuns={uxagentRuns}
                      targetUrl={batchTestRun.targetUrl}
                      testRuns={testRuns}
                    />
                  )}

                  {/* Standard Test View Selector */}
                  {!batchTestRun.useUXAgent && testRuns.length > 0 && (
                    <div className={`flex items-center gap-2 border-b pb-4 mb-6 ${isLight ? "border-neutral-200" : "border-white/10"
                      }`}>
                      <button
                        onClick={() => setSelectedView("aggregated")}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all rounded-lg ${selectedView === "aggregated"
                          ? isLight
                            ? "bg-neutral-900 text-white border border-neutral-900"
                            : "bg-[#252525] text-white border border-white/10"
                          : isLight
                            ? "bg-white border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50"
                            : "bg-[#1E1E1E] border border-white/10 text-neutral-400 hover:text-white hover:bg-[#252525]"
                          }`}
                      >
                        <BarChart3 size={16} />
                        Aggregate View
                      </button>
                      <button
                        onClick={() => setSelectedView(0)}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all rounded-lg ${typeof selectedView === "number"
                          ? isLight
                            ? "bg-neutral-900 text-white border border-neutral-900"
                            : "bg-[#252525] text-white border border-white/10"
                          : isLight
                            ? "bg-white border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50"
                            : "bg-[#1E1E1E] border border-white/10 text-neutral-400 hover:text-white hover:bg-[#252525]"
                          }`}
                      >
                        <Users size={16} />
                        Individual Agents
                      </button>
                    </div>
                  )}

                  {/* Persona Selector for Standard Tests */}
                  {!batchTestRun.useUXAgent && typeof selectedView === "number" && testRuns.length > 1 && (
                    <div className={`border p-4 rounded-xl mb-6 ${isLight
                      ? "bg-white border-neutral-200"
                      : "bg-[#1E1E1E] border-white/10"
                      }`}>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className={`text-sm font-medium uppercase tracking-wide ${isLight ? "text-neutral-500" : "text-neutral-400"
                          }`}>
                          Select Agent ({testRuns.length})
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {testRuns.map((tr, idx) => {
                          const isSelected = selectedView === idx;
                          return (
                            <button
                              key={tr.testRun.id}
                              onClick={() => setSelectedView(idx)}
                              className={`group relative p-4 text-left transition-all duration-200 rounded-lg ${isSelected
                                ? isLight
                                  ? "bg-neutral-900 text-white border-2 border-neutral-900 shadow-lg"
                                  : "bg-[#252525] text-white border-2 border-white/20 shadow-lg"
                                : isLight
                                  ? "bg-white border border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50"
                                  : "bg-[#1E1E1E] border border-white/10 hover:border-white/20 hover:bg-[#252525]"
                                }`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isSelected
                                    ? isLight ? "bg-white/20" : "bg-white/10"
                                    : isLight ? "bg-neutral-100" : "bg-white/5"
                                    }`}>
                                    <Users size={16} className={
                                      isSelected
                                        ? isLight ? "text-white" : "text-white"
                                        : isLight ? "text-neutral-500" : "text-neutral-400"
                                    } />
                                  </div>
                                  <div>
                                    <h4 className={`font-medium text-sm ${isSelected
                                      ? isLight ? "text-white" : "text-white"
                                      : isLight ? "text-neutral-700" : "text-neutral-300"
                                      }`}>
                                      {tr.testRun.personaName}
                                    </h4>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      {tr.testRun.status === "completed" ? (
                                        <CheckCircle2 size={12} className={isLight ? "text-emerald-600" : "text-emerald-400"} />
                                      ) : tr.testRun.status === "running" ? (
                                        <Loader2 size={12} className={`animate-spin ${isLight ? "text-blue-600" : "text-blue-400"}`} />
                                      ) : tr.testRun.status === "failed" ? (
                                        <AlertCircle size={12} className={isLight ? "text-red-600" : "text-red-400"} />
                                      ) : null}
                                      <span className={`text-xs capitalize ${isSelected
                                        ? isLight ? "text-white/80" : "text-neutral-300"
                                        : isLight ? "text-neutral-500" : "text-neutral-500"
                                        }`}>
                                        {tr.testRun.status}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                {tr.report && tr.report.score !== null && (
                                  <div className={`text-right ${isSelected
                                    ? isLight ? "text-white" : "text-white"
                                    : isLight ? "text-neutral-700" : "text-neutral-300"
                                    }`}>
                                    <span className="text-lg font-light">{tr.report.score}</span>
                                    <span className={`text-xs ${isSelected
                                      ? isLight ? "text-white/80" : "text-neutral-400"
                                      : isLight ? "text-neutral-500" : "text-neutral-500"
                                      }`}>/10</span>
                                  </div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Aggregated Report View */}
                  {selectedView === "aggregated" && aggregatedReport && !batchTestRun.useUXAgent && (
                    <div className="space-y-8">
                      {/* Overall Score */}
                      <div className={`border p-8 rounded-xl ${isLight
                        ? "bg-white border-neutral-200"
                        : "border-white/10 bg-[#1E1E1E]"
                        }`}>
                        <h2 className={`text-xl font-medium mb-6 ${isLight ? "text-neutral-900" : "text-white"
                          }`}>Overall UX Score</h2>
                        <div className="flex items-center gap-8">
                          <div className={`text-6xl font-light ${isLight ? "text-neutral-900" : "text-white"
                            }`}>
                            {aggregatedReport.overallScore}<span className={`text-3xl ${isLight ? "text-neutral-500" : "text-neutral-400"
                              }`}>/10</span>
                          </div>
                          <div className="flex-1">
                            <div className={`h-2 overflow-hidden rounded-full ${isLight ? "bg-neutral-200" : "bg-white/10"
                              }`}>
                              <div
                                className={`h-full transition-all ${isLight ? "bg-neutral-900" : "bg-white"
                                  }`}
                                style={{ width: `${(aggregatedReport.overallScore || 0) * 10}%` }}
                              />
                            </div>
                          </div>
                        </div>
                        {aggregatedReport.executiveSummary && (
                          <p className={`mt-6 font-light leading-relaxed whitespace-pre-wrap ${isLight ? "text-neutral-700" : "text-neutral-300"
                            }`}>
                            {aggregatedReport.executiveSummary}
                          </p>
                        )}
                      </div>

                      {/* Common Issues */}
                      {aggregatedReport.commonIssues && aggregatedReport.commonIssues.length > 0 && (
                        <div className={`border p-8 rounded-xl ${isLight
                          ? "bg-white border-neutral-200"
                          : "border-white/10 bg-[#1E1E1E]"
                          }`}>
                          <h2 className={`text-xl font-medium mb-6 ${isLight ? "text-neutral-900" : "text-white"
                            }`}>Common Issues</h2>
                          <div className="space-y-4">
                            {aggregatedReport.commonIssues.map((issue, i) => (
                              <div key={i} className={`border-l-4 p-4 rounded-lg ${getSeverityColor(issue.severity)}`}>
                                <div className="flex items-start justify-between mb-2">
                                  <h3 className={`font-medium ${isLight ? "text-neutral-900" : "text-white"
                                    }`}>{issue.issue}</h3>
                                  <span className={`text-xs px-2 py-1 border uppercase font-medium rounded-lg ${isLight
                                    ? "bg-neutral-100 border-neutral-300 text-neutral-700"
                                    : "bg-[#252525] border-white/10 text-neutral-300"
                                    }`}>
                                    {issue.severity}
                                  </span>
                                </div>
                                <p className={`text-sm font-light mb-3 ${isLight ? "text-neutral-700" : "text-neutral-300"
                                  }`}>
                                  {issue.recommendation}
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {issue.affectedPersonas.map((persona, j) => (
                                    <span key={j} className={`text-xs px-2 py-0.5 border font-light rounded-lg ${isLight
                                      ? "bg-neutral-100 border-neutral-300 text-neutral-700"
                                      : "bg-[#252525] border-white/10 text-neutral-300"
                                      }`}>
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
                        <div className={`border p-8 rounded-xl ${isLight
                          ? "bg-white border-neutral-200"
                          : "border-white/10 bg-[#1E1E1E]"
                          }`}>
                          <h2 className={`text-xl font-medium mb-6 ${isLight ? "text-emerald-700" : "text-emerald-400"
                            }`}>What Works Well</h2>
                          <ul className="space-y-2">
                            {aggregatedReport.strengthsAcrossPersonas.map((strength, i) => (
                              <li key={i} className={`flex gap-3 text-sm font-light ${isLight ? "text-neutral-700" : "text-neutral-300"
                                }`}>
                                <span className={`shrink-0 ${isLight ? "text-emerald-600" : "text-emerald-400"
                                  }`}>✓</span>
                                <span>{strength}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Recommendations */}
                      {aggregatedReport.recommendations && aggregatedReport.recommendations.length > 0 && (
                        <div className={`border p-8 rounded-xl ${isLight
                          ? "bg-white border-neutral-200"
                          : "border-white/10 bg-[#1E1E1E]"
                          }`}>
                          <h2 className={`text-xl font-medium mb-6 ${isLight ? "text-neutral-900" : "text-white"
                            }`}>Prioritized Recommendations</h2>
                          <div className="space-y-4">
                            {aggregatedReport.recommendations.map((rec, i) => (
                              <div key={i} className={`border-l-4 pl-6 py-2 ${isLight ? "border-l-neutral-300" : "border-l-white/20"
                                }`}>
                                <div className="flex items-start gap-3 mb-2">
                                  <span className={`text-xs px-2 py-1 font-medium uppercase border rounded-lg ${getPriorityColor(rec.priority)}`}>
                                    {rec.priority}
                                  </span>
                                  <h3 className={`font-medium flex-1 ${isLight ? "text-neutral-900" : "text-white"
                                    }`}>{rec.recommendation}</h3>
                                </div>
                                <p className={`text-sm font-light ${isLight ? "text-neutral-700" : "text-neutral-300"
                                  }`}>
                                  {rec.impact}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Persona-Specific Insights */}
                      {aggregatedReport.personaSpecificInsights && aggregatedReport.personaSpecificInsights.length > 0 && (
                        <div className={`border p-8 rounded-xl ${isLight
                          ? "bg-white border-neutral-200"
                          : "border-white/10 bg-[#1E1E1E]"
                          }`}>
                          <h2 className={`text-xl font-medium mb-6 ${isLight ? "text-neutral-900" : "text-white"
                            }`}>Persona-Specific Insights</h2>
                          <div className="grid md:grid-cols-2 gap-4">
                            {aggregatedReport.personaSpecificInsights.map((insight, i) => (
                              <div key={i} className={`p-5 border rounded-lg ${isLight
                                ? "bg-neutral-50 border-neutral-200"
                                : "bg-[#252525] border-white/5"
                                }`}>
                                <h3 className={`font-medium mb-3 ${isLight ? "text-neutral-900" : "text-white"
                                  }`}>{insight.personaName}</h3>
                                <ul className="space-y-2 text-sm font-light">
                                  {insight.keyFindings.map((finding, j) => (
                                    <li key={j} className={`flex gap-2 ${isLight ? "text-neutral-700" : "text-neutral-300"
                                      }`}>
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
                        <div className={`border p-8 rounded-xl ${isLight
                          ? "bg-white border-neutral-200"
                          : "border-white/10 bg-[#1E1E1E]"
                          }`}>
                          <h2 className={`text-xl font-medium mb-6 ${isLight ? "text-neutral-900" : "text-white"
                            }`}>Detailed Analysis</h2>
                          <div className={`max-w-none font-light leading-relaxed ${isLight ? "text-neutral-700" : "text-neutral-300"
                            }`}>
                            <ReactMarkdown
                              components={{
                                h3: ({ children }) => <h3 className={`text-lg font-medium mt-6 mb-3 ${isLight ? "text-neutral-900" : "text-white"
                                  }`}>{children}</h3>,
                                p: ({ children }) => <p className={`mb-4 ${isLight ? "text-neutral-700" : "text-neutral-300"
                                  }`}>{children}</p>,
                                ul: ({ children }) => <ul className={`list-disc list-inside mb-4 space-y-1 ${isLight ? "text-neutral-700" : "text-neutral-300"
                                  }`}>{children}</ul>,
                                ol: ({ children }) => <ol className={`list-decimal list-inside mb-4 space-y-1 ${isLight ? "text-neutral-700" : "text-neutral-300"
                                  }`}>{children}</ol>,
                                li: ({ children }) => <li className={`ml-4 ${isLight ? "text-neutral-700" : "text-neutral-300"
                                  }`}>{children}</li>,
                                strong: ({ children }) => <strong className={`font-medium ${isLight ? "text-neutral-900" : "text-white"
                                  }`}>{children}</strong>,
                                em: ({ children }) => <em className={`italic ${isLight ? "text-neutral-700" : "text-neutral-300"
                                  }`}>{children}</em>,
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
                  {typeof selectedView === "number" && testRuns[selectedView]?.report && !batchTestRun.useUXAgent && (
                    <div className="space-y-8">
                      {/* Persona Profile */}
                      <div className={`border p-8 rounded-xl ${isLight
                        ? "bg-neutral-900 border-neutral-900"
                        : "border-white/10 bg-[#252525]"
                        }`}>
                        <div className="flex items-start justify-between mb-4">
                          <h2 className={`text-2xl font-light ${isLight ? "text-white" : "text-white"
                            }`}>{testRuns[selectedView].testRun.personaName}'s Experience</h2>
                          <button
                            onClick={() => setViewingSession(testRuns[selectedView].testRun.id)}
                            className={`flex items-center gap-2 px-4 py-2 border transition-colors text-sm font-medium rounded-lg ${isLight
                              ? "bg-white border-white text-neutral-900 hover:bg-neutral-100"
                              : "bg-[#1E1E1E] border-white/10 text-white hover:bg-[#252525]"
                              }`}
                          >
                            <Play size={16} />
                            View Session
                          </button>
                        </div>
                        {testRuns[selectedView].testRun.personaData && (
                          <div className="grid md:grid-cols-3 gap-6 text-sm">
                            <div>
                              <p className={`text-xs uppercase tracking-wide mb-1 font-light ${isLight ? "text-neutral-300" : "text-neutral-400"
                                }`}>Profile</p>
                              <p className={`font-light ${isLight ? "text-white" : "text-white"
                                }`}>
                                {testRuns[selectedView].testRun.personaData.age} years old
                              </p>
                              <p className={`font-light ${isLight ? "text-neutral-200" : "text-neutral-300"
                                }`}>{testRuns[selectedView].testRun.personaData.occupation}</p>
                            </div>
                            <div>
                              <p className={`text-xs uppercase tracking-wide mb-1 font-light ${isLight ? "text-neutral-300" : "text-neutral-400"
                                }`}>Location</p>
                              <p className={`font-light ${isLight ? "text-neutral-200" : "text-neutral-300"
                                }`}>{testRuns[selectedView].testRun.personaData.country}</p>
                            </div>
                            <div>
                              <p className={`text-xs uppercase tracking-wide mb-1 font-light ${isLight ? "text-neutral-300" : "text-neutral-400"
                                }`}>Tech Level</p>
                              <p className={`font-light capitalize ${isLight ? "text-neutral-200" : "text-neutral-300"
                                }`}>{testRuns[selectedView].testRun.personaData.techSavviness}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Score */}
                      <div className={`border p-8 rounded-xl ${isLight
                        ? "bg-white border-neutral-200"
                        : "border-white/10 bg-[#1E1E1E]"
                        }`}>
                        <h3 className={`text-lg font-light mb-4 ${isLight ? "text-neutral-900" : "text-white"
                          }`}>Individual Score</h3>
                        <div className="flex items-center gap-6">
                          <div className={`text-5xl font-light ${isLight ? "text-neutral-900" : "text-white"
                            }`}>
                            {testRuns[selectedView].report?.score}<span className={`text-2xl ${isLight ? "text-neutral-500" : "text-neutral-400"
                              }`}>/10</span>
                          </div>
                          <div className="flex-1">
                            <div className={`h-2 overflow-hidden rounded-full ${isLight ? "bg-neutral-200" : "bg-white/10"
                              }`}>
                              <div
                                className={`h-full transition-all ${isLight ? "bg-neutral-900" : "bg-white"
                                  }`}
                                style={{ width: `${(testRuns[selectedView].report?.score || 0) * 10}%` }}
                              />
                            </div>
                          </div>
                        </div>
                        {testRuns[selectedView].report?.summary && (
                          <p className={`mt-4 font-light ${isLight ? "text-neutral-700" : "text-neutral-300"
                            }`}>{testRuns[selectedView].report.summary}</p>
                        )}
                      </div>

                      {/* Positive Aspects */}
                      {testRuns[selectedView].report?.positiveAspects && testRuns[selectedView].report.positiveAspects!.length > 0 && (
                        <div className={`border p-8 rounded-xl ${isLight
                          ? "bg-white border-neutral-200"
                          : "border-white/10 bg-[#1E1E1E]"
                          }`}>
                          <h3 className={`text-lg font-light mb-4 ${isLight ? "text-neutral-900" : "text-white"
                            }`}>What Worked</h3>
                          <ul className="space-y-2">
                            {testRuns[selectedView].report!.positiveAspects!.map((item, i) => (
                              <li key={i} className={`flex gap-3 text-sm font-light ${isLight ? "text-neutral-700" : "text-neutral-300"
                                }`}>
                                <span className={`shrink-0 ${isLight ? "text-emerald-600" : "text-emerald-400"
                                  }`}>✓</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Confusion Points */}
                      {testRuns[selectedView].report?.accessibilityNotes && testRuns[selectedView].report.accessibilityNotes!.length > 0 && (
                        <div className={`border p-8 rounded-xl ${isLight
                          ? "bg-white border-neutral-200"
                          : "border-white/10 bg-[#1E1E1E]"
                          }`}>
                          <h3 className={`text-lg font-light mb-4 ${isLight ? "text-neutral-900" : "text-white"
                            }`}>Confusion Points</h3>
                          <ul className="space-y-2">
                            {testRuns[selectedView].report!.accessibilityNotes!.map((item, i) => (
                              <li key={i} className={`flex gap-3 text-sm font-light ${isLight ? "text-neutral-700" : "text-neutral-300"
                                }`}>
                                <span className={`shrink-0 ${isLight ? "text-yellow-600" : "text-yellow-400"
                                  }`}>•</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Usability Issues */}
                      {testRuns[selectedView].report?.usabilityIssues && testRuns[selectedView].report.usabilityIssues!.length > 0 && (
                        <div className={`border p-8 rounded-xl ${isLight
                          ? "bg-white border-neutral-200"
                          : "border-white/10 bg-[#1E1E1E]"
                          }`}>
                          <h3 className={`text-lg font-light mb-4 ${isLight ? "text-neutral-900" : "text-white"
                            }`}>Usability Issues</h3>
                          <div className="space-y-3">
                            {testRuns[selectedView].report!.usabilityIssues!.map((issue: any, i: number) => (
                              <div key={i} className={`border-l-4 p-4 rounded-lg ${getSeverityColor(issue.severity)}`}>
                                <div className="flex items-center justify-between mb-2">
                                  <span className={`text-xs px-2 py-1 border uppercase font-medium rounded-lg ${isLight
                                    ? "bg-neutral-100 border-neutral-300 text-neutral-700"
                                    : "bg-[#252525] border-white/10 text-neutral-300"
                                    }`}>
                                    {issue.severity}
                                  </span>
                                </div>
                                <p className={`text-sm mb-2 font-light ${isLight ? "text-neutral-700" : "text-neutral-300"
                                  }`}>{issue.description}</p>
                                {issue.recommendation && (
                                  <p className={`text-sm font-light ${isLight ? "text-neutral-600" : "text-neutral-400"
                                    }`}>{issue.recommendation}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Recommendations */}
                      {testRuns[selectedView].report?.recommendations && testRuns[selectedView].report.recommendations!.length > 0 && (
                        <div className={`border p-8 rounded-xl ${isLight
                          ? "bg-white border-neutral-200"
                          : "border-white/10 bg-[#1E1E1E]"
                          }`}>
                          <h3 className={`text-lg font-light mb-4 ${isLight ? "text-neutral-900" : "text-white"
                            }`}>Recommendations</h3>
                          <ol className={`list-decimal list-inside space-y-2 text-sm font-light ${isLight ? "text-neutral-700" : "text-neutral-300"
                            }`}>
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

              {/* Swarm Agents Tab */}
              {activeMainTab === "swarm-agents" && (
                <div className="space-y-6">
                  {!batchTestRun?.useUXAgent || uxagentRuns.length === 0 ? (
                    <div className={`border p-12 text-center rounded-xl ${isLight
                      ? "bg-white border-neutral-200"
                      : "border-white/10 bg-[#1E1E1E]"
                      }`}>
                      <Users size={48} className={`mx-auto mb-4 ${isLight ? "text-neutral-500" : "text-neutral-400"
                        }`} />
                      <h3 className={`text-lg font-medium mb-2 ${isLight ? "text-neutral-900" : "text-white"
                        }`}>Swarm Agents</h3>
                      <p className={`font-light ${isLight ? "text-neutral-600" : "text-neutral-400"
                        }`}>
                        {!batchTestRun?.useUXAgent
                          ? "This test did not use UXAgent. Swarm Agents are only available for UXAgent tests."
                          : "No agent data available."}
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Agent Selector - Simplified */}
                      <div className="flex gap-3">
                        {uxagentRuns.slice(0, 3).map((run, idx) => {
                          const isSelected = selectedSwarmAgentIndex === idx;
                          const agentName = getSwarmAgentName(run, idx);

                          return (
                            <button
                              key={run.id}
                              onClick={() => {
                                setSelectedSwarmAgentIndex(idx);
                                setSwarmAgentActiveTab("overview");
                                setSwarmScreenshotIndex(0);
                                setSwarmMemoryExpanded(null);
                              }}
                              className={`flex-1 px-4 py-3 text-left transition-all rounded-lg border ${isSelected
                                ? isLight
                                  ? "bg-neutral-900 text-white border-neutral-900"
                                  : "bg-[#252525] text-white border-white/20"
                                : isLight
                                  ? "bg-white border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50 text-neutral-700"
                                  : "bg-[#1E1E1E] border-white/10 hover:border-white/20 hover:bg-[#252525] text-neutral-300"
                                }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {run.status === "completed" ? (
                                    <CheckCircle2 size={14} className={isLight ? "text-emerald-600" : "text-emerald-400"} />
                                  ) : run.status === "running" ? (
                                    <Loader2 size={14} className={`animate-spin ${isLight ? "text-blue-600" : "text-blue-400"}`} />
                                  ) : run.status === "failed" ? (
                                    <AlertCircle size={14} className={isLight ? "text-red-600" : "text-red-400"} />
                                  ) : null}
                                  <span className={`font-medium text-sm ${isSelected
                                    ? isLight ? "text-white" : "text-white"
                                    : isLight ? "text-neutral-700" : "text-neutral-300"
                                    }`}>
                                    {agentName}
                                  </span>
                                </div>
                                {run.score !== null && (
                                  <span className={`text-sm font-light ${isSelected
                                    ? isLight ? "text-white" : "text-white"
                                    : isLight ? "text-neutral-600" : "text-neutral-400"
                                    }`}>
                                    {run.score}/10
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Agent Session Details */}
                      {selectedSwarmAgentIndex !== null && uxagentRuns[selectedSwarmAgentIndex] && (() => {
                        const selectedRun = uxagentRuns[selectedSwarmAgentIndex];
                        const basicInfo = selectedRun.basicInfo as any || {};
                        const timingMetrics = basicInfo.timing_metrics || {};
                        const observations = selectedRun.observationTrace || [];
                        const persona = basicInfo.persona || "";

                        return (
                          <div className="space-y-6">
                            {/* Quick Stats Header - Simplified */}
                            <div className={`border p-4 rounded-xl ${isLight
                              ? "bg-white border-neutral-200"
                              : "border-white/10 bg-[#1E1E1E]"
                              }`}>
                              <div className="flex items-center justify-between">
                                <div>
                                  <h2 className={`text-lg font-medium ${isLight ? "text-neutral-900" : "text-white"
                                    }`}>{getSwarmAgentName(selectedRun, selectedSwarmAgentIndex)}</h2>
                                  <p className={`text-xs font-light mt-0.5 ${isLight ? "text-neutral-500" : "text-neutral-400"
                                    }`}>{selectedRun.intent}</p>
                                </div>
                                <div className="flex items-center gap-4 text-sm">
                                  <span className={`font-light ${isLight ? "text-neutral-600" : "text-neutral-400"
                                    }`}>{selectedRun.stepsTaken || 0} steps</span>
                                  <span className={`font-light ${isLight ? "text-neutral-600" : "text-neutral-400"
                                    }`}>{selectedRun.screenshots?.length || 0} screenshots</span>
                                  {selectedRun.score !== null && (
                                    <span className={`font-medium ${isLight ? "text-neutral-900" : "text-white"
                                      }`}>{selectedRun.score}/10</span>
                                  )}
                                  <span className={`px-2 py-1 text-xs font-medium border rounded ${getSwarmAgentStatusColor(selectedRun.status)}`}>
                                    {selectedRun.status}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Tabs */}
                            <div className={`border-b ${isLight ? "border-neutral-200" : "border-white/10"
                              }`}>
                              <div className="flex gap-1 overflow-x-auto">
                                {[
                                  { key: "overview", label: "Overview", icon: Eye },
                                  { key: "actions", label: "Actions", icon: MousePointer },
                                  { key: "screenshots", label: "Screenshots", icon: ImageIcon },
                                  { key: "memory", label: "Memory", icon: Brain },
                                  { key: "insights", label: "Insights", icon: Lightbulb },
                                  { key: "chat", label: "Chat", icon: MessageCircle },
                                  { key: "logs", label: "Logs", icon: FileText },
                                ].map(({ key, label, icon: Icon }) => (
                                  <button
                                    key={key}
                                    onClick={() => setSwarmAgentActiveTab(key as any)}
                                    className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors whitespace-nowrap ${swarmAgentActiveTab === key
                                      ? isLight
                                        ? "border-b-2 border-neutral-900 text-neutral-900"
                                        : "border-b-2 border-white text-white"
                                      : isLight
                                        ? "text-neutral-500 hover:text-neutral-700"
                                        : "text-neutral-500 hover:text-neutral-300"
                                      }`}
                                  >
                                    <Icon size={16} />
                                    {label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Tab Content */}
                            <div className="min-h-[400px]">
                              {swarmAgentActiveTab === "overview" && (
                                <div className="space-y-4">
                                  {/* Error if any */}
                                  {selectedRun.errorMessage && (
                                    <div className={`border-l-4 p-3 rounded-lg ${isLight
                                      ? "border-red-500 bg-red-50"
                                      : "border-red-500 bg-red-500/10"
                                      }`}>
                                      <div className={`flex items-center gap-2 font-medium mb-1 text-sm ${isLight ? "text-red-700" : "text-red-400"
                                        }`}>
                                        <AlertCircle size={14} />
                                        Error
                                      </div>
                                      <p className={`text-sm font-light ${isLight ? "text-red-600" : "text-red-300"
                                        }`}>{selectedRun.errorMessage}</p>
                                    </div>
                                  )}

                                  {/* Timing Metrics - Compact */}
                                  {Object.keys(timingMetrics).length > 0 && (
                                    <div className={`border p-4 rounded-xl ${isLight
                                      ? "bg-white border-neutral-200"
                                      : "border-white/10 bg-[#1E1E1E]"
                                      }`}>
                                      <h3 className={`text-sm font-medium mb-3 ${isLight ? "text-neutral-900" : "text-white"
                                        }`}>Timing Metrics</h3>
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <div>
                                          <p className={`text-xs font-light mb-1 ${isLight ? "text-neutral-500" : "text-neutral-400"
                                            }`}>Duration</p>
                                          <p className={`text-sm font-light ${isLight ? "text-neutral-900" : "text-white"
                                            }`}>{(timingMetrics.total_duration_ms / 1000).toFixed(1)}s</p>
                                        </div>
                                        <div>
                                          <p className={`text-xs font-light mb-1 ${isLight ? "text-neutral-500" : "text-neutral-400"
                                            }`}>First Action</p>
                                          <p className={`text-sm font-light ${isLight ? "text-neutral-900" : "text-white"
                                            }`}>{(timingMetrics.time_to_first_action_ms / 1000).toFixed(1)}s</p>
                                        </div>
                                        <div>
                                          <p className={`text-xs font-light mb-1 ${isLight ? "text-neutral-500" : "text-neutral-400"
                                            }`}>Avg Interval</p>
                                          <p className={`text-sm font-light ${isLight ? "text-neutral-900" : "text-white"
                                            }`}>{(timingMetrics.average_action_interval_ms / 1000).toFixed(1)}s</p>
                                        </div>
                                        <div>
                                          <p className={`text-xs font-light mb-1 ${isLight ? "text-neutral-500" : "text-neutral-400"
                                            }`}>Backtracks</p>
                                          <p className={`text-sm font-light ${isLight ? "text-neutral-900" : "text-white"
                                            }`}>{timingMetrics.backtrack_count || 0}</p>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Journey Summary - Compact */}
                                  {observations.length > 0 && (
                                    <div className={`border p-4 rounded-xl ${isLight
                                      ? "bg-white border-neutral-200"
                                      : "border-white/10 bg-[#1E1E1E]"
                                      }`}>
                                      <h3 className={`text-sm font-medium mb-3 ${isLight ? "text-neutral-900" : "text-white"
                                        }`}>Pages Visited</h3>
                                      <div className="space-y-2">
                                        {observations.slice(0, 5).map((obs: any, idx: number) => (
                                          <div key={idx} className="flex items-center gap-2 text-sm">
                                            <span className={`font-mono text-xs w-6 ${isLight ? "text-neutral-400" : "text-neutral-500"
                                              }`}>{idx + 1}.</span>
                                            <span className={`font-light truncate ${isLight ? "text-neutral-700" : "text-neutral-300"
                                              }`}>{obs.url || "Page Visit"}</span>
                                          </div>
                                        ))}
                                        {observations.length > 5 && (
                                          <p className={`text-xs font-light mt-2 ${isLight ? "text-neutral-500" : "text-neutral-500"
                                            }`}>+{observations.length - 5} more pages</p>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {swarmAgentActiveTab === "actions" && (
                                <div className={`border rounded-xl overflow-hidden ${isLight
                                  ? "bg-white border-neutral-200"
                                  : "border-white/10 bg-[#1E1E1E]"
                                  }`}>
                                  <div className={`p-4 border-b ${isLight
                                    ? "bg-neutral-50 border-neutral-200"
                                    : "bg-[#252525] border-white/10"
                                    }`}>
                                    <h3 className={`font-medium ${isLight ? "text-neutral-900" : "text-white"
                                      }`}>Action Timeline</h3>
                                    <p className={`text-sm font-light ${isLight ? "text-neutral-600" : "text-neutral-400"
                                      }`}>{selectedRun.actionTrace?.length || 0} actions recorded</p>
                                  </div>
                                  <div className={`divide-y max-h-[500px] overflow-y-auto ${isLight ? "divide-neutral-100" : "divide-white/5"
                                    }`}>
                                    {(selectedRun.actionTrace || []).map((action: any, idx: number) => {
                                      const getActionColor = (actionType: string) => {
                                        if (actionType === "click") return isLight ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-blue-500/10 text-blue-400 border-blue-500/20";
                                        if (actionType === "type") return isLight ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-purple-500/10 text-purple-400 border-purple-500/20";
                                        if (actionType === "goto_url") return isLight ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                                        if (actionType === "terminate") return isLight ? "bg-red-50 text-red-700 border-red-200" : "bg-red-500/10 text-red-400 border-red-500/20";
                                        return isLight ? "bg-neutral-50 text-neutral-700 border-neutral-200" : "bg-neutral-500/10 text-neutral-400 border-neutral-500/20";
                                      };

                                      return (
                                        <div key={idx} className={`p-4 transition-colors ${isLight ? "hover:bg-neutral-50" : "hover:bg-white/5"
                                          }`}>
                                          <div className="flex items-start gap-4">
                                            <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-sm font-medium shrink-0 ${isLight
                                              ? "bg-neutral-900 border-neutral-900 text-white"
                                              : "bg-[#252525] border-white/10 text-white"
                                              }`}>
                                              {idx + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-2 mb-1">
                                                <span className={`px-2 py-0.5 text-xs font-medium border rounded ${getActionColor(action.action)}`}>
                                                  {action.action}
                                                </span>
                                                {action.target && (
                                                  <span className={`text-xs truncate font-light ${isLight ? "text-neutral-600" : "text-neutral-400"
                                                    }`}>
                                                    Target: {action.target}
                                                  </span>
                                                )}
                                              </div>
                                              <p className={`text-sm font-light ${isLight ? "text-neutral-700" : "text-neutral-300"
                                                }`}>
                                                {action.description || JSON.stringify(action)}
                                              </p>
                                              {action.url && (
                                                <p className={`text-xs mt-1 truncate font-light ${isLight ? "text-neutral-500" : "text-neutral-500"
                                                  }`}>
                                                  URL: {action.url}
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                    {(selectedRun.actionTrace || []).length === 0 && (
                                      <div className={`p-8 text-center font-light ${isLight ? "text-neutral-600" : "text-neutral-400"
                                        }`}>
                                        No actions recorded
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {swarmAgentActiveTab === "screenshots" && (() => {
                                const screenshots = selectedRun.screenshots || [];

                                if (screenshots.length === 0) {
                                  return (
                                    <div className={`border p-8 text-center rounded-xl ${isLight
                                      ? "bg-white border-neutral-200"
                                      : "border-white/10 bg-[#1E1E1E]"
                                      }`}>
                                      <ImageIcon size={48} className={`mx-auto mb-3 ${isLight ? "text-neutral-500" : "text-neutral-400"
                                        }`} />
                                      <p className={`font-light ${isLight ? "text-neutral-600" : "text-neutral-400"
                                        }`}>No screenshots captured</p>
                                    </div>
                                  );
                                }

                                // Reset screenshot index if it's out of bounds
                                const validIndex = Math.min(swarmScreenshotIndex, screenshots.length - 1);
                                const currentScreenshot = screenshots[validIndex];

                                return (
                                  <div className="grid grid-cols-4 gap-4">
                                    {/* Thumbnail sidebar */}
                                    <div className={`col-span-1 border p-2 max-h-[500px] overflow-y-auto rounded-xl ${isLight
                                      ? "bg-white border-neutral-200"
                                      : "border-white/10 bg-[#1E1E1E]"
                                      }`}>
                                      <div className="space-y-2">
                                        {screenshots.map((ss: any, idx: number) => (
                                          <button
                                            key={ss.id || idx}
                                            onClick={() => setSwarmScreenshotIndex(idx)}
                                            className={`w-full p-2 border transition-colors rounded-lg ${validIndex === idx
                                              ? isLight
                                                ? "border-neutral-900 bg-neutral-900"
                                                : "border-white/20 bg-[#252525]"
                                              : isLight
                                                ? "border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50"
                                                : "border-white/10 hover:border-white/20 hover:bg-white/5"
                                              }`}
                                          >
                                            <div className={`text-xs font-medium mb-1 ${validIndex === idx
                                              ? isLight ? "text-white" : "text-neutral-300"
                                              : isLight ? "text-neutral-700" : "text-neutral-300"
                                              }`}>Step {ss.stepNumber}</div>
                                            {(ss.signedUrl || ss.s3Url) && (
                                              <img
                                                src={ss.signedUrl || ss.s3Url}
                                                alt={`Step ${ss.stepNumber}`}
                                                className="w-full h-16 object-cover object-top rounded"
                                              />
                                            )}
                                          </button>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Main view */}
                                    <div className={`col-span-3 border rounded-xl overflow-hidden ${isLight
                                      ? "bg-white border-neutral-200"
                                      : "border-white/10 bg-[#1E1E1E]"
                                      }`}>
                                      <div className={`p-4 border-b flex justify-between items-center ${isLight
                                        ? "bg-neutral-50 border-neutral-200"
                                        : "bg-[#252525] border-white/10"
                                        }`}>
                                        <div>
                                          <h3 className={`font-medium ${isLight ? "text-neutral-900" : "text-white"
                                            }`}>Step {currentScreenshot.stepNumber}</h3>
                                          <p className={`text-xs font-light ${isLight ? "text-neutral-500" : "text-neutral-400"
                                            }`}>{currentScreenshot.filename || "Screenshot"}</p>
                                        </div>
                                        <div className="flex gap-2">
                                          <button
                                            onClick={() => setSwarmScreenshotIndex(Math.max(0, validIndex - 1))}
                                            disabled={validIndex === 0}
                                            className={`px-3 py-1 border text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-lg ${isLight
                                              ? "bg-white border-neutral-200 text-neutral-900 hover:bg-neutral-50"
                                              : "bg-[#1E1E1E] border-white/10 text-white hover:bg-[#252525]"
                                              }`}
                                          >
                                            Previous
                                          </button>
                                          <button
                                            onClick={() => setSwarmScreenshotIndex(Math.min(screenshots.length - 1, validIndex + 1))}
                                            disabled={validIndex === screenshots.length - 1}
                                            className={`px-3 py-1 border text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-lg ${isLight
                                              ? "bg-white border-neutral-200 text-neutral-900 hover:bg-neutral-50"
                                              : "bg-[#1E1E1E] border-white/10 text-white hover:bg-[#252525]"
                                              }`}
                                          >
                                            Next
                                          </button>
                                        </div>
                                      </div>
                                      {(currentScreenshot.signedUrl || currentScreenshot.s3Url) ? (
                                        <div className={`p-4 ${isLight ? "bg-neutral-50" : "bg-[#252525]"
                                          }`}>
                                          <img
                                            src={currentScreenshot.signedUrl || currentScreenshot.s3Url || ""}
                                            alt={`Step ${currentScreenshot.stepNumber}`}
                                            className={`w-full h-auto border shadow-lg rounded-lg ${isLight ? "border-neutral-200" : "border-white/10"
                                              }`}
                                          />
                                        </div>
                                      ) : (
                                        <div className={`p-8 text-center font-light ${isLight ? "text-neutral-600" : "text-neutral-400"
                                          }`}>
                                          Screenshot not available
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })()}

                              {swarmAgentActiveTab === "memory" && (() => {
                                const memories = selectedRun.memoryTrace || [];

                                const getMemoryTypeColor = (kind: string) => {
                                  switch (kind) {
                                    case "Observation": return isLight ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-blue-500/10 text-blue-400 border-blue-500/20";
                                    case "Plan": return isLight ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-purple-500/10 text-purple-400 border-purple-500/20";
                                    case "Reflection": return isLight ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-amber-500/10 text-amber-400 border-amber-500/20";
                                    case "Action": return isLight ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                                    default: return isLight ? "bg-neutral-50 text-neutral-700 border-neutral-200" : "bg-neutral-500/10 text-neutral-400 border-neutral-500/20";
                                  }
                                };

                                const kindCounts: Record<string, number> = {};
                                memories.forEach((m: any) => {
                                  kindCounts[m.kind] = (kindCounts[m.kind] || 0) + 1;
                                });

                                return (
                                  <div className="space-y-4">
                                    {/* Summary */}
                                    <div className="flex flex-wrap gap-2">
                                      {Object.entries(kindCounts).map(([kind, count]) => (
                                        <span key={kind} className={`px-3 py-1 text-xs font-medium rounded-lg ${getMemoryTypeColor(kind)}`}>
                                          {kind}: {count}
                                        </span>
                                      ))}
                                    </div>

                                    {/* Memory List */}
                                    <div className={`border rounded-xl max-h-[500px] overflow-y-auto ${isLight
                                      ? "bg-white border-neutral-200"
                                      : "border-white/10 bg-[#1E1E1E]"
                                      }`}>
                                      {memories.slice(-50).reverse().map((memory: any, idx: number) => (
                                        <div
                                          key={idx}
                                          className={`border-b last:border-0 ${isLight ? "border-neutral-100" : "border-white/5"
                                            }`}
                                        >
                                          <button
                                            onClick={() => setSwarmMemoryExpanded(swarmMemoryExpanded === idx ? null : idx)}
                                            className={`w-full p-4 flex items-center justify-between transition-colors text-left ${isLight ? "hover:bg-neutral-50" : "hover:bg-white/5"
                                              }`}
                                          >
                                            <div className="flex items-center gap-3">
                                              <span className={`px-2 py-0.5 text-xs font-medium border rounded ${getMemoryTypeColor(memory.kind)}`}>
                                                {memory.kind}
                                              </span>
                                              <span className={`text-sm truncate max-w-md font-light ${isLight ? "text-neutral-700" : "text-neutral-300"
                                                }`}>
                                                {memory.content?.substring(0, 80)}...
                                              </span>
                                            </div>
                                            {swarmMemoryExpanded === idx ? (
                                              <ChevronUp size={16} className={isLight ? "text-neutral-500" : "text-neutral-400"} />
                                            ) : (
                                              <ChevronDown size={16} className={isLight ? "text-neutral-500" : "text-neutral-400"} />
                                            )}
                                          </button>
                                          {swarmMemoryExpanded === idx && (
                                            <div className={`px-4 pb-4 ${isLight ? "bg-neutral-50" : "bg-[#252525]"
                                              }`}>
                                              <pre className={`text-xs font-mono whitespace-pre-wrap ${isLight ? "text-neutral-700" : "text-neutral-300"
                                                }`}>
                                                {memory.content}
                                              </pre>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                      {memories.length === 0 && (
                                        <div className={`p-8 text-center font-light ${isLight ? "text-neutral-600" : "text-neutral-400"
                                          }`}>
                                          No memory traces recorded
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })()}

                              {swarmAgentActiveTab === "insights" && (
                                <InsightsTab run={selectedRun} />
                              )}

                              {swarmAgentActiveTab === "chat" && (
                                <ChatTab run={selectedRun} />
                              )}

                              {swarmAgentActiveTab === "logs" && (
                                <div className={`border p-6 rounded-xl ${isLight
                                  ? "bg-white border-neutral-200"
                                  : "border-white/10 bg-[#1E1E1E]"
                                  }`}>
                                  <h3 className={`text-lg font-medium mb-4 ${isLight ? "text-neutral-900" : "text-white"
                                    }`}>Session Log</h3>
                                  {selectedRun.logContent ? (
                                    <div className={`p-4 max-h-[500px] overflow-y-auto rounded-lg border ${isLight
                                      ? "bg-neutral-50 border-neutral-200"
                                      : "bg-[#252525] border-white/5"
                                      }`}>
                                      <pre className={`text-xs font-mono whitespace-pre-wrap ${isLight ? "text-neutral-700" : "text-neutral-300"
                                        }`}>
                                        {selectedRun.logContent}
                                      </pre>
                                    </div>
                                  ) : (
                                    <p className={`font-light ${isLight ? "text-neutral-600" : "text-neutral-400"
                                      }`}>No log content available.</p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </>
                  )}
                </div>
              )}

              {/* Test Details Tab */}
              {activeMainTab === "test-details" && (
                <div className="space-y-6">
                  {/* Test Configuration */}
                  <div className={`border p-6 rounded-xl ${isLight
                    ? "bg-white border-neutral-200"
                    : "border-white/10 bg-[#1E1E1E]"
                    }`}>
                    <h2 className={`text-xl font-medium mb-6 ${isLight ? "text-neutral-900" : "text-white"
                      }`}>Test Configuration</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <p className={`text-xs font-medium uppercase tracking-wide mb-2 ${isLight ? "text-neutral-500" : "text-neutral-400"
                          }`}>Target URL</p>
                        <a
                          href={batchTestRun.targetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-sm font-light flex items-center gap-2 group ${isLight
                            ? "text-neutral-600 hover:text-neutral-900"
                            : "text-neutral-300 hover:text-white"
                            }`}
                        >
                          <span className="truncate">{batchTestRun.targetUrl}</span>
                          <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </a>
                      </div>
                      <div>
                        <p className={`text-xs font-medium uppercase tracking-wide mb-2 ${isLight ? "text-neutral-500" : "text-neutral-400"
                          }`}>Test Mode</p>
                        <p className={`text-sm font-light ${isLight ? "text-neutral-900" : "text-white"
                          }`}>{batchTestRun.useUXAgent ? "UXAgent" : "Standard"}</p>
                      </div>
                      <div>
                        <p className={`text-xs font-medium uppercase tracking-wide mb-2 ${isLight ? "text-neutral-500" : "text-neutral-400"
                          }`}>Number of Agents</p>
                        <p className={`text-sm font-light ${isLight ? "text-neutral-900" : "text-white"
                          }`}>{testRuns.length} agents</p>
                      </div>
                      <div>
                        <p className={`text-xs font-medium uppercase tracking-wide mb-2 ${isLight ? "text-neutral-500" : "text-neutral-400"
                          }`}>Status</p>
                        {getStatusBadge(batchTestRun.status)}
                      </div>
                    </div>
                  </div>

                  {/* Target Audience */}
                  <div className={`border p-6 rounded-xl ${isLight
                    ? "bg-white border-neutral-200"
                    : "border-white/10 bg-[#1E1E1E]"
                    }`}>
                    <h2 className={`text-xl font-medium mb-4 ${isLight ? "text-neutral-900" : "text-white"
                      }`}>Target Audience</h2>
                    <p className={`text-sm font-light leading-relaxed whitespace-pre-wrap ${isLight ? "text-neutral-700" : "text-neutral-300"
                      }`}>
                      {batchTestRun.userDescription}
                    </p>
                  </div>

                  {/* Personas */}
                  {batchTestRun.generatedPersonas && batchTestRun.generatedPersonas.length > 0 && (
                    <div className={`border p-6 rounded-xl ${isLight
                      ? "bg-white border-neutral-200"
                      : "border-white/10 bg-[#1E1E1E]"
                      }`}>
                      <h2 className={`text-xl font-medium mb-6 ${isLight ? "text-neutral-900" : "text-white"
                        }`}>Test Personas</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {batchTestRun.generatedPersonas.map((persona: any, idx: number) => {
                          const isSelected = batchTestRun.selectedPersonaIndices?.includes(idx);
                          const testRun = testRuns.find(tr => tr.testRun.personaIndex === idx);

                          return (
                            <button
                              key={idx}
                              onClick={() => setSelectedPersonaDetail({ persona, index: idx })}
                              className={`w-full text-left border rounded-lg p-4 transition-all ${isSelected
                                ? isLight
                                  ? "border-neutral-900 bg-neutral-900"
                                  : "border-white/20 bg-[#252525]"
                                : isLight
                                  ? "border-neutral-200 bg-white opacity-60 hover:opacity-100"
                                  : "border-white/10 bg-[#1E1E1E] opacity-60"
                                }`}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <h3 className={`font-medium mb-1 ${isSelected
                                    ? isLight ? "text-white" : "text-white"
                                    : isLight ? "text-neutral-900" : "text-white"
                                    }`}>
                                    {persona.name || `Persona ${idx + 1}`}
                                    {!isSelected && <span className={`text-xs ml-2 ${isLight ? "text-neutral-500" : "text-neutral-500"
                                      }`}>(Not Selected)</span>}
                                  </h3>
                                  {persona.age && persona.occupation && (
                                    <p className={`text-sm font-light ${isSelected
                                      ? isLight ? "text-white/80" : "text-neutral-400"
                                      : isLight ? "text-neutral-600" : "text-neutral-400"
                                      }`}>
                                      {persona.age} years old • {persona.occupation}
                                    </p>
                                  )}
                                </div>
                                {testRun && (
                                  <div className="flex items-center gap-1.5">
                                    {testRun.testRun.status === "completed" ? (
                                      <CheckCircle2 size={14} className={isLight ? "text-emerald-600" : "text-emerald-400"} />
                                    ) : testRun.testRun.status === "running" ? (
                                      <Loader2 size={14} className={`animate-spin ${isLight ? "text-blue-600" : "text-blue-400"}`} />
                                    ) : testRun.testRun.status === "failed" ? (
                                      <AlertCircle size={14} className={isLight ? "text-red-600" : "text-red-400"} />
                                    ) : null}
                                  </div>
                                )}
                              </div>

                              {persona.primaryGoal && (
                                <div className="mb-2">
                                  <p className={`text-xs uppercase tracking-wide mb-1 ${isSelected
                                    ? isLight ? "text-white/80" : "text-neutral-400"
                                    : isLight ? "text-neutral-500" : "text-neutral-400"
                                    }`}>Primary Goal</p>
                                  <p className={`text-sm font-light ${isSelected
                                    ? isLight ? "text-white" : "text-neutral-300"
                                    : isLight ? "text-neutral-700" : "text-neutral-300"
                                    }`}>{persona.primaryGoal}</p>
                                </div>
                              )}

                              {persona.painPoints && persona.painPoints.length > 0 && (
                                <div>
                                  <p className={`text-xs uppercase tracking-wide mb-1 ${isSelected
                                    ? isLight ? "text-white/80" : "text-neutral-400"
                                    : isLight ? "text-neutral-500" : "text-neutral-400"
                                    }`}>Pain Points</p>
                                  <ul className="space-y-1">
                                    {persona.painPoints.slice(0, 2).map((point: string, i: number) => (
                                      <li key={i} className={`text-sm font-light flex gap-2 ${isSelected
                                        ? isLight ? "text-white" : "text-neutral-300"
                                        : isLight ? "text-neutral-700" : "text-neutral-300"
                                        }`}>
                                        <span className={
                                          isSelected
                                            ? isLight ? "text-white/80" : "text-neutral-500"
                                            : isLight ? "text-neutral-500" : "text-neutral-500"
                                        }>•</span>
                                        <span>{point}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {persona.background && (
                                <div className={`mt-3 pt-3 border-t ${isSelected
                                  ? isLight ? "border-white/20" : "border-white/5"
                                  : isLight ? "border-neutral-200" : "border-white/5"
                                  }`}>
                                  <p className={`text-xs uppercase tracking-wide mb-1 ${isSelected
                                    ? isLight ? "text-white/80" : "text-neutral-400"
                                    : isLight ? "text-neutral-500" : "text-neutral-400"
                                    }`}>Background</p>
                                  <p className={`text-sm font-light line-clamp-2 ${isSelected
                                    ? isLight ? "text-white" : "text-neutral-300"
                                    : isLight ? "text-neutral-700" : "text-neutral-300"
                                    }`}>{persona.background}</p>
                                </div>
                              )}

                              {testRun && testRun.testRun.startedAt && testRun.testRun.completedAt && (
                                <div className={`mt-3 pt-3 border-t ${isSelected
                                  ? isLight ? "border-white/20" : "border-white/5"
                                  : isLight ? "border-neutral-200" : "border-white/5"
                                  }`}>
                                  <p className={`text-xs uppercase tracking-wide mb-1 ${isSelected
                                    ? isLight ? "text-white/80" : "text-neutral-400"
                                    : isLight ? "text-neutral-500" : "text-neutral-400"
                                    }`}>Duration</p>
                                  <p className={`text-sm font-light ${isSelected
                                    ? isLight ? "text-white" : "text-neutral-300"
                                    : isLight ? "text-neutral-700" : "text-neutral-300"
                                    }`}>
                                    {Math.round((new Date(testRun.testRun.completedAt).getTime() - new Date(testRun.testRun.startedAt).getTime()) / 1000)}s
                                  </p>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Timestamps */}
                  <div className={`border p-6 rounded-xl ${isLight
                    ? "bg-white border-neutral-200"
                    : "border-white/10 bg-[#1E1E1E]"
                    }`}>
                    <h2 className={`text-xl font-medium mb-6 ${isLight ? "text-neutral-900" : "text-white"
                      }`}>Timestamps</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <p className={`text-xs font-medium uppercase tracking-wide mb-2 ${isLight ? "text-neutral-500" : "text-neutral-400"
                          }`}>Created</p>
                        <p className={`text-sm font-light ${isLight ? "text-neutral-900" : "text-white"
                          }`}>
                          {new Date(batchTestRun.createdAt).toLocaleString()}
                        </p>
                        <p className={`text-xs font-light mt-1 ${isLight ? "text-neutral-500" : "text-neutral-500"
                          }`}>
                          {formatTimestamp(batchTestRun.createdAt)}
                        </p>
                      </div>
                      {batchTestRun.completedAt && (
                        <div>
                          <p className={`text-xs font-medium uppercase tracking-wide mb-2 ${isLight ? "text-neutral-500" : "text-neutral-400"
                            }`}>Completed</p>
                          <p className={`text-sm font-light ${isLight ? "text-neutral-900" : "text-white"
                            }`}>
                            {new Date(batchTestRun.completedAt).toLocaleString()}
                          </p>
                          <p className={`text-xs font-light mt-1 ${isLight ? "text-neutral-500" : "text-neutral-500"
                            }`}>
                            {formatTimestamp(batchTestRun.completedAt)}
                          </p>
                        </div>
                      )}
                      {batchTestRun.completedAt && batchTestRun.createdAt && (
                        <div className="md:col-span-2">
                          <p className={`text-xs font-medium uppercase tracking-wide mb-2 ${isLight ? "text-neutral-500" : "text-neutral-400"
                            }`}>Total Duration</p>
                          <p className={`text-sm font-light ${isLight ? "text-neutral-900" : "text-white"
                            }`}>
                            {Math.round((new Date(batchTestRun.completedAt).getTime() - new Date(batchTestRun.createdAt).getTime()) / 1000 / 60)} minutes
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Agent Status Summary */}
                  {testRuns.length > 0 && (
                    <div className={`border p-6 rounded-xl ${isLight
                      ? "bg-white border-neutral-200"
                      : "border-white/10 bg-[#1E1E1E]"
                      }`}>
                      <h2 className={`text-xl font-medium mb-6 ${isLight ? "text-neutral-900" : "text-white"
                        }`}>Agent Status Summary</h2>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className={`p-4 border rounded-lg ${isLight
                          ? "bg-neutral-50 border-neutral-200"
                          : "bg-[#252525] border-white/5"
                          }`}>
                          <p className={`text-xs uppercase tracking-wide font-light mb-1 ${isLight ? "text-neutral-500" : "text-neutral-400"
                            }`}>Total</p>
                          <p className={`text-2xl font-light ${isLight ? "text-neutral-900" : "text-white"
                            }`}>{testRuns.length}</p>
                        </div>
                        <div className={`p-4 border rounded-lg ${isLight
                          ? "bg-neutral-50 border-neutral-200"
                          : "bg-[#252525] border-white/5"
                          }`}>
                          <p className={`text-xs uppercase tracking-wide font-light mb-1 ${isLight ? "text-neutral-500" : "text-neutral-400"
                            }`}>Completed</p>
                          <p className={`text-2xl font-light ${isLight ? "text-emerald-700" : "text-emerald-400"
                            }`}>
                            {testRuns.filter(t => t.testRun.status === "completed").length}
                          </p>
                        </div>
                        <div className={`p-4 border rounded-lg ${isLight
                          ? "bg-neutral-50 border-neutral-200"
                          : "bg-[#252525] border-white/5"
                          }`}>
                          <p className={`text-xs uppercase tracking-wide font-light mb-1 ${isLight ? "text-neutral-500" : "text-neutral-400"
                            }`}>Running</p>
                          <p className={`text-2xl font-light ${isLight ? "text-blue-700" : "text-blue-400"
                            }`}>
                            {testRuns.filter(t => t.testRun.status === "running").length}
                          </p>
                        </div>
                        <div className={`p-4 border rounded-lg ${isLight
                          ? "bg-neutral-50 border-neutral-200"
                          : "bg-[#252525] border-white/5"
                          }`}>
                          <p className={`text-xs uppercase tracking-wide font-light mb-1 ${isLight ? "text-neutral-500" : "text-neutral-400"
                            }`}>Failed</p>
                          <p className={`text-2xl font-light ${isLight ? "text-red-700" : "text-red-400"
                            }`}>
                            {testRuns.filter(t => t.testRun.status === "failed").length}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Error Message */}
                  {batchTestRun.errorMessage && (
                    <div className={`border-l-4 p-4 rounded-lg ${isLight
                      ? "border-red-500 bg-red-50"
                      : "border-red-500 bg-red-500/10"
                      }`}>
                      <div className={`flex items-center gap-2 font-medium mb-1 ${isLight ? "text-red-700" : "text-red-400"
                        }`}>
                        <AlertCircle size={16} />
                        Error
                      </div>
                      <p className={`text-sm font-light ${isLight ? "text-red-600" : "text-red-300"
                        }`}>{batchTestRun.errorMessage}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="text-center py-24">
          <p className={`font-light ${isLight ? "text-neutral-600" : "text-neutral-400"
            }`}>Test not found</p>
        </div>
      )}

      {/* Terminate Confirmation Modal */}
      {showTerminateConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className={`border p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200 rounded-xl ${isLight
            ? "bg-white border-neutral-200"
            : "bg-[#1E1E1E] border-white/10"
            }`}>
            <h3 className={`text-lg font-medium mb-2 ${isLight ? "text-neutral-900" : "text-white"
              }`}>Terminate Test</h3>
            <p className={`font-light text-sm mb-6 ${isLight ? "text-neutral-600" : "text-neutral-400"
              }`}>
              Are you sure you want to terminate this test? This will cancel all running agents and cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowTerminateConfirm(false)}
                className={`px-4 py-2 text-sm transition-colors rounded-lg ${isLight
                  ? "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
                  : "text-neutral-400 hover:text-white hover:bg-white/5"
                  }`}
              >
                Cancel
              </button>
              <button
                onClick={handleTerminateConfirm}
                disabled={isTerminating}
                className={`px-4 py-2 text-sm border transition-colors shadow-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${isLight
                  ? "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100"
                  : "bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20"
                  }`}
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

      {/* Session Transcript Viewer */}
      {viewingSession && (
        <SessionTranscriptViewer
          testRunId={viewingSession}
          personaName={testRuns.find((tr) => tr.testRun.id === viewingSession)?.testRun.personaName || "Agent"}
          onClose={() => setViewingSession(null)}
        />
      )}

      {/* Persona Detail Modal */}
      {selectedPersonaDetail && (
        <div className={`fixed inset-0 backdrop-blur-sm z-[60] flex items-center justify-center p-4 ${isLight ? "bg-black/40" : "bg-black/80"
          }`}>
          <div className={`border p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200 rounded-xl ${isLight
            ? "bg-white border-neutral-200"
            : "bg-[#1E1E1E] border-white/10"
            }`}>
            <div className="flex items-start justify-between mb-6">
              <h2 className={`text-2xl font-light ${isLight ? "text-neutral-900" : "text-white"
                }`}>
                {selectedPersonaDetail.persona.name || `Persona ${selectedPersonaDetail.index + 1}`}
              </h2>
              <button
                onClick={() => setSelectedPersonaDetail(null)}
                className={`p-2 transition-colors rounded-lg ${isLight
                  ? "hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900"
                  : "hover:bg-white/5 text-neutral-400 hover:text-white"
                  }`}
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Demographics */}
              <div className={`border p-6 rounded-lg ${isLight
                ? "border-neutral-200 bg-neutral-50"
                : "border-white/10 bg-[#252525]"
                }`}>
                <h3 className={`text-lg font-medium mb-4 ${isLight ? "text-neutral-900" : "text-white"
                  }`}>Demographics</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {selectedPersonaDetail.persona.age && (
                    <div>
                      <p className={`text-xs uppercase tracking-wide mb-1 font-light ${isLight ? "text-neutral-500" : "text-neutral-400"
                        }`}>Age</p>
                      <p className={`text-sm font-light ${isLight ? "text-neutral-900" : "text-white"
                        }`}>{selectedPersonaDetail.persona.age} years old</p>
                    </div>
                  )}
                  {selectedPersonaDetail.persona.gender && (
                    <div>
                      <p className={`text-xs uppercase tracking-wide mb-1 font-light ${isLight ? "text-neutral-500" : "text-neutral-400"
                        }`}>Gender</p>
                      <p className={`text-sm font-light capitalize ${isLight ? "text-neutral-900" : "text-white"
                        }`}>{selectedPersonaDetail.persona.gender}</p>
                    </div>
                  )}
                  {selectedPersonaDetail.persona.maritalStatus && (
                    <div>
                      <p className={`text-xs uppercase tracking-wide mb-1 font-light ${isLight ? "text-neutral-500" : "text-neutral-400"
                        }`}>Marital Status</p>
                      <p className={`text-sm font-light capitalize ${isLight ? "text-neutral-900" : "text-white"
                        }`}>{selectedPersonaDetail.persona.maritalStatus}</p>
                    </div>
                  )}
                  {selectedPersonaDetail.persona.country && (
                    <div>
                      <p className={`text-xs uppercase tracking-wide mb-1 font-light ${isLight ? "text-neutral-500" : "text-neutral-400"
                        }`}>Country</p>
                      <p className={`text-sm font-light ${isLight ? "text-neutral-900" : "text-white"
                        }`}>{selectedPersonaDetail.persona.country}</p>
                    </div>
                  )}
                  {selectedPersonaDetail.persona.occupation && (
                    <div>
                      <p className={`text-xs uppercase tracking-wide mb-1 font-light ${isLight ? "text-neutral-500" : "text-neutral-400"
                        }`}>Occupation</p>
                      <p className={`text-sm font-light ${isLight ? "text-neutral-900" : "text-white"
                        }`}>{selectedPersonaDetail.persona.occupation}</p>
                    </div>
                  )}
                  {selectedPersonaDetail.persona.education && (
                    <div>
                      <p className={`text-xs uppercase tracking-wide mb-1 font-light ${isLight ? "text-neutral-500" : "text-neutral-400"
                        }`}>Education</p>
                      <p className={`text-sm font-light ${isLight ? "text-neutral-900" : "text-white"
                        }`}>{selectedPersonaDetail.persona.education}</p>
                    </div>
                  )}
                  {selectedPersonaDetail.persona.incomeLevel && (
                    <div>
                      <p className={`text-xs uppercase tracking-wide mb-1 font-light ${isLight ? "text-neutral-500" : "text-neutral-400"
                        }`}>Income Level</p>
                      <p className={`text-sm font-light capitalize ${isLight ? "text-neutral-900" : "text-white"
                        }`}>{selectedPersonaDetail.persona.incomeLevel}</p>
                    </div>
                  )}
                  {selectedPersonaDetail.persona.income && (
                    <div>
                      <p className={`text-xs uppercase tracking-wide mb-1 font-light ${isLight ? "text-neutral-500" : "text-neutral-400"
                        }`}>Income</p>
                      <p className={`text-sm font-light ${isLight ? "text-neutral-900" : "text-white"
                        }`}>{selectedPersonaDetail.persona.income}</p>
                    </div>
                  )}
                  {selectedPersonaDetail.persona.techSavviness && (
                    <div>
                      <p className={`text-xs uppercase tracking-wide mb-1 font-light ${isLight ? "text-neutral-500" : "text-neutral-400"
                        }`}>Tech Savviness</p>
                      <p className={`text-sm font-light capitalize ${isLight ? "text-neutral-900" : "text-white"
                        }`}>{selectedPersonaDetail.persona.techSavviness}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Goals & Pain Points */}
              <div className={`border p-6 rounded-lg ${isLight
                ? "border-neutral-200 bg-neutral-50"
                : "border-white/10 bg-[#252525]"
                }`}>
                <h3 className={`text-lg font-medium mb-4 ${isLight ? "text-neutral-900" : "text-white"
                  }`}>Goals & Pain Points</h3>
                {selectedPersonaDetail.persona.primaryGoal && (
                  <div className="mb-4">
                    <p className={`text-xs uppercase tracking-wide mb-2 font-light ${isLight ? "text-neutral-500" : "text-neutral-400"
                      }`}>Primary Goal</p>
                    <p className={`text-sm font-light ${isLight ? "text-neutral-900" : "text-white"
                      }`}>{selectedPersonaDetail.persona.primaryGoal}</p>
                  </div>
                )}
                {selectedPersonaDetail.persona.painPoints && selectedPersonaDetail.persona.painPoints.length > 0 && (
                  <div>
                    <p className={`text-xs uppercase tracking-wide mb-2 font-light ${isLight ? "text-neutral-500" : "text-neutral-400"
                      }`}>Pain Points</p>
                    <ul className="space-y-2">
                      {selectedPersonaDetail.persona.painPoints.map((point: string, i: number) => (
                        <li key={i} className={`text-sm font-light flex gap-2 ${isLight ? "text-neutral-900" : "text-white"
                          }`}>
                          <span className={`shrink-0 ${isLight ? "text-neutral-500" : "text-neutral-500"
                            }`}>•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Background & Context */}
              {(selectedPersonaDetail.persona.background || selectedPersonaDetail.persona.context) && (
                <div className={`border p-6 rounded-lg ${isLight
                  ? "border-neutral-200 bg-neutral-50"
                  : "border-white/10 bg-[#252525]"
                  }`}>
                  <h3 className={`text-lg font-medium mb-4 ${isLight ? "text-neutral-900" : "text-white"
                    }`}>Background & Context</h3>
                  {selectedPersonaDetail.persona.background && (
                    <div className="mb-4">
                      <p className={`text-xs uppercase tracking-wide mb-2 font-light ${isLight ? "text-neutral-500" : "text-neutral-400"
                        }`}>Background</p>
                      <p className={`text-sm font-light leading-relaxed whitespace-pre-wrap ${isLight ? "text-neutral-900" : "text-white"
                        }`}>{selectedPersonaDetail.persona.background}</p>
                    </div>
                  )}
                  {selectedPersonaDetail.persona.context && (
                    <div>
                      <p className={`text-xs uppercase tracking-wide mb-2 font-light ${isLight ? "text-neutral-500" : "text-neutral-400"
                        }`}>Context</p>
                      <p className={`text-sm font-light leading-relaxed whitespace-pre-wrap ${isLight ? "text-neutral-900" : "text-white"
                        }`}>{selectedPersonaDetail.persona.context}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Additional Details */}
              {(selectedPersonaDetail.persona.financialSituation ||
                selectedPersonaDetail.persona.browsingHabits ||
                selectedPersonaDetail.persona.professionalLife ||
                selectedPersonaDetail.persona.personalStyle) && (
                  <div className={`border p-6 rounded-lg ${isLight
                    ? "border-neutral-200 bg-neutral-50"
                    : "border-white/10 bg-[#252525]"
                    }`}>
                    <h3 className={`text-lg font-medium mb-4 ${isLight ? "text-neutral-900" : "text-white"
                      }`}>Additional Details</h3>
                    {selectedPersonaDetail.persona.financialSituation && (
                      <div className="mb-4">
                        <p className={`text-xs uppercase tracking-wide mb-2 font-light ${isLight ? "text-neutral-500" : "text-neutral-400"
                          }`}>Financial Situation</p>
                        <p className={`text-sm font-light leading-relaxed ${isLight ? "text-neutral-900" : "text-white"
                          }`}>{selectedPersonaDetail.persona.financialSituation}</p>
                      </div>
                    )}
                    {selectedPersonaDetail.persona.browsingHabits && (
                      <div className="mb-4">
                        <p className={`text-xs uppercase tracking-wide mb-2 font-light ${isLight ? "text-neutral-500" : "text-neutral-400"
                          }`}>Browsing Habits</p>
                        <p className={`text-sm font-light leading-relaxed ${isLight ? "text-neutral-900" : "text-white"
                          }`}>{selectedPersonaDetail.persona.browsingHabits}</p>
                      </div>
                    )}
                    {selectedPersonaDetail.persona.professionalLife && (
                      <div className="mb-4">
                        <p className={`text-xs uppercase tracking-wide mb-2 font-light ${isLight ? "text-neutral-500" : "text-neutral-400"
                          }`}>Professional Life</p>
                        <p className={`text-sm font-light leading-relaxed ${isLight ? "text-neutral-900" : "text-white"
                          }`}>{selectedPersonaDetail.persona.professionalLife}</p>
                      </div>
                    )}
                    {selectedPersonaDetail.persona.personalStyle && (
                      <div>
                        <p className={`text-xs uppercase tracking-wide mb-2 font-light ${isLight ? "text-neutral-500" : "text-neutral-400"
                          }`}>Personal Style</p>
                        <p className={`text-sm font-light leading-relaxed ${isLight ? "text-neutral-900" : "text-white"
                          }`}>{selectedPersonaDetail.persona.personalStyle}</p>
                      </div>
                    )}
                  </div>
                )}

              {/* Relevance Score */}
              {selectedPersonaDetail.persona.relevanceScore !== undefined && (
                <div className={`border p-6 rounded-lg ${isLight
                  ? "border-neutral-200 bg-neutral-50"
                  : "border-white/10 bg-[#252525]"
                  }`}>
                  <h3 className={`text-lg font-medium mb-4 ${isLight ? "text-neutral-900" : "text-white"
                    }`}>Selection Metrics</h3>
                  <div>
                    <p className={`text-xs uppercase tracking-wide mb-2 font-light ${isLight ? "text-neutral-500" : "text-neutral-400"
                      }`}>Relevance Score</p>
                    <div className="flex items-center gap-4">
                      <p className={`text-2xl font-light ${isLight ? "text-neutral-900" : "text-white"
                        }`}>{selectedPersonaDetail.persona.relevanceScore.toFixed(2)}</p>
                      <div className="flex-1">
                        <div className={`h-2 overflow-hidden rounded-full ${isLight ? "bg-neutral-200" : "bg-white/10"
                          }`}>
                          <div
                            className={`h-full transition-all ${isLight ? "bg-neutral-900" : "bg-white"
                              }`}
                            style={{ width: `${Math.min(selectedPersonaDetail.persona.relevanceScore * 10, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Test Run Status */}
              {(() => {
                const testRun = testRuns.find(tr => tr.testRun.personaIndex === selectedPersonaDetail.index);
                if (!testRun) return null;

                return (
                  <div className={`border p-6 rounded-lg ${isLight
                    ? "border-neutral-200 bg-neutral-50"
                    : "border-white/10 bg-[#252525]"
                    }`}>
                    <h3 className={`text-lg font-medium mb-4 ${isLight ? "text-neutral-900" : "text-white"
                      }`}>Test Run Status</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className={`text-xs uppercase tracking-wide mb-1 font-light ${isLight ? "text-neutral-500" : "text-neutral-400"
                          }`}>Status</p>
                        <div className="flex items-center gap-2">
                          {testRun.testRun.status === "completed" ? (
                            <CheckCircle2 size={16} className={isLight ? "text-emerald-600" : "text-emerald-400"} />
                          ) : testRun.testRun.status === "running" ? (
                            <Loader2 size={16} className={`animate-spin ${isLight ? "text-blue-600" : "text-blue-400"}`} />
                          ) : testRun.testRun.status === "failed" ? (
                            <AlertCircle size={16} className={isLight ? "text-red-600" : "text-red-400"} />
                          ) : null}
                          <p className={`text-sm font-light capitalize ${isLight ? "text-neutral-900" : "text-white"
                            }`}>{testRun.testRun.status}</p>
                        </div>
                      </div>
                      {testRun.testRun.startedAt && testRun.testRun.completedAt && (
                        <div>
                          <p className={`text-xs uppercase tracking-wide mb-1 font-light ${isLight ? "text-neutral-500" : "text-neutral-400"
                            }`}>Duration</p>
                          <p className={`text-sm font-light ${isLight ? "text-neutral-900" : "text-white"
                            }`}>
                            {Math.round((new Date(testRun.testRun.completedAt).getTime() - new Date(testRun.testRun.startedAt).getTime()) / 1000)}s
                          </p>
                        </div>
                      )}
                      {testRun.report && testRun.report.score !== null && (
                        <div>
                          <p className={`text-xs uppercase tracking-wide mb-1 font-light ${isLight ? "text-neutral-500" : "text-neutral-400"
                            }`}>Score</p>
                          <p className={`text-sm font-light ${isLight ? "text-neutral-900" : "text-white"
                            }`}>{testRun.report.score}/10</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
