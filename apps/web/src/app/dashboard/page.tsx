"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { getBatchTests, getBatchTest, type BatchTestRun } from "@/lib/batch-api";
import { Plus, Loader2, Trash2, CheckSquare, FileText, Download, Check, ChevronUp, ChevronDown } from "lucide-react";
import { pdf } from '@react-pdf/renderer';
import { AggregatedReportPDF } from '@/components/pdf/AggregatedReportPDF';
import { useTheme } from "@/contexts/theme-context";

export default function Dashboard() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const { theme } = useTheme();
  const [batchTests, setBatchTests] = useState<BatchTestRun[]>([]);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isArchiving, setIsArchiving] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [error, setError] = useState("");
  const [sortField, setSortField] = useState<"date" | "agents" | "status" | "targetUrl" | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  
  const isLight = theme === "light";

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session?.user) {
      loadTests();
    }
  }, [session]);

  const loadTests = async () => {
    try {
      const data = await getBatchTests();
      setBatchTests(data.batchTests);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tests");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedTests.length === batchTests.length) {
      setSelectedTests([]);
    } else {
      setSelectedTests(batchTests.map(t => t.id));
    }
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedTests([]);
  };

  const toggleSelect = (id: string) => {
    if (selectedTests.includes(id)) {
      setSelectedTests(prev => prev.filter(tid => tid !== id));
    } else {
      setSelectedTests(prev => [...prev, id]);
    }
  };

  const handleExportPDF = async () => {
    if (selectedTests.length === 0) return;
    
    setExportingPDF(true);
    try {
      // Process each selected test sequentially
      for (const id of selectedTests) {
        try {
          // Fetch full test details to get the aggregated report
          const data = await getBatchTest(id);
          const { batchTestRun, aggregatedReport, testRuns } = data;
          
          if (!batchTestRun || !aggregatedReport) continue;
          
          // Generate PDF
          const blob = await pdf(
            <AggregatedReportPDF 
              batchTestRun={batchTestRun}
              aggregatedReport={aggregatedReport}
              agentCount={testRuns.length}
            />
          ).toBlob();
          
          // Download
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `aggregated-report-${batchTestRun.targetUrl.replace(/[^a-z0-9]/gi, '_').substring(0, 20)}-${new Date().toISOString().split('T')[0]}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          
          // Small delay to ensure browser handles sequential downloads
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (err) {
          console.error(`Failed to export PDF for test ${id}:`, err);
          // Continue with next test
        }
      }
      
      setSelectedTests([]);
      setIsSelectionMode(false);
    } catch (err) {
      console.error('Export process failed:', err);
      setError('Failed to export PDFs');
    } finally {
      setExportingPDF(false);
    }
  };

  const handleArchive = async () => {
    if (selectedTests.length === 0) return;
    
    if (!confirm(`Are you sure you want to archive ${selectedTests.length} test(s)?`)) return;

    setIsArchiving(true);
    try {
      // TODO: Implement batch test deletion API
      // await deleteBatchTests(selectedTests);
      // Remove locally
      setBatchTests(prev => prev.filter(t => !selectedTests.includes(t.id)));
      setSelectedTests([]);
      setIsSelectionMode(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive tests");
    } finally {
      setIsArchiving(false);
    }
  };

  const CustomCheckbox = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <div 
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className={`
        w-5 h-5 border flex items-center justify-center cursor-pointer transition-all duration-200 rounded-md
        ${checked 
          ? isLight
            ? 'bg-neutral-900 border-neutral-900 text-white'
            : 'bg-white border-white text-neutral-900'
          : isLight
            ? 'bg-transparent border-neutral-300 hover:border-neutral-500'
          : 'bg-transparent border-neutral-600 hover:border-neutral-400'
        }
      `}
    >
      {checked && <Check size={12} strokeWidth={3} />}
    </div>
  );

  if (isPending || !session?.user) {
    return (
      <div className={`h-full flex items-center justify-center ${
        isLight ? "bg-neutral-50" : "bg-neutral-950"
      } ${isLight ? "text-neutral-900" : "text-white"}`}>
        <Loader2 className={`animate-spin w-8 h-8 ${
          isLight ? "text-neutral-500" : "text-neutral-400"
        }`} />
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { light: string; dark: string }> = {
      pending: {
        light: "bg-neutral-100 text-neutral-600 border-neutral-300",
        dark: "bg-neutral-500/10 text-neutral-400 border-neutral-500/20",
      },
      running_tests: {
        light: "bg-blue-50 text-blue-700 border-blue-200",
        dark: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      },
      aggregating: {
        light: "bg-purple-50 text-purple-700 border-purple-200",
        dark: "bg-purple-500/10 text-purple-400 border-purple-500/20",
      },
      completed: {
        light: "bg-emerald-50 text-emerald-700 border-emerald-200",
        dark: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      },
      failed: {
        light: "bg-red-50 text-red-700 border-red-200",
        dark: "bg-red-500/10 text-red-400 border-red-500/20",
      },
      terminated: {
        light: "bg-orange-50 text-orange-700 border-orange-200",
        dark: "bg-orange-500/10 text-orange-400 border-orange-500/20",
      },
    };
    
    const labels: Record<string, string> = {
      pending: "Queued",
      running_tests: "Running",
      aggregating: "Aggregating",
      completed: "Success",
      failed: "Failed",
      terminated: "Terminated",
    };

    const statusStyle = styles[status] || styles.pending;
    const style = isLight ? statusStyle.light : statusStyle.dark;

    return (
      <span className={`px-2.5 py-0.5 text-xs font-medium border rounded-full ${style}`}>
        {labels[status] || status}
      </span>
    );
  };

  const handleSort = (field: "date" | "agents" | "status" | "targetUrl") => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new field and default to ascending
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedTests = [...batchTests].sort((a, b) => {
    if (!sortField) return 0;

    let comparison = 0;

    switch (sortField) {
      case "date":
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case "agents":
        comparison = (a.selectedPersonaIndices?.length || 0) - (b.selectedPersonaIndices?.length || 0);
        break;
      case "status":
        comparison = a.status.localeCompare(b.status);
        break;
      case "targetUrl":
        comparison = a.targetUrl.localeCompare(b.targetUrl);
        break;
    }

    return sortDirection === "asc" ? comparison : -comparison;
  });

  const SortableHeader = ({ 
    field, 
    children,
    className = ""
  }: { 
    field: "date" | "agents" | "status" | "targetUrl"; 
    children: React.ReactNode;
    className?: string;
  }) => {
    const isActive = sortField === field;
    return (
      <th 
        className={`px-6 py-4 font-medium uppercase tracking-wider text-xs cursor-pointer transition-colors select-none ${
          isLight
            ? "bg-neutral-100 text-neutral-600 hover:text-neutral-900"
            : "bg-[#252525] text-neutral-400 hover:text-white"
        } ${className}`}
        onClick={() => handleSort(field)}
      >
        <div className="flex items-center gap-2">
          <span>{children}</span>
          <div className="flex flex-col">
            <ChevronUp 
              size={12} 
              className={`transition-opacity ${
                isActive && sortDirection === "asc" 
                  ? isLight
                    ? "opacity-100 text-neutral-900"
                    : "opacity-100 text-white"
                  : "opacity-30"
              }`}
            />
            <ChevronDown 
              size={12} 
              className={`-mt-1 transition-opacity ${
                isActive && sortDirection === "desc" 
                  ? isLight
                    ? "opacity-100 text-neutral-900"
                    : "opacity-100 text-white"
                  : "opacity-30"
              }`}
            />
          </div>
        </div>
      </th>
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className={`text-3xl font-light tracking-tight mb-2 ${
            isLight ? "text-neutral-900" : "text-white"
          }`}>Playground</h1>
          <p className={`font-light ${
            isLight ? "text-neutral-500" : "text-neutral-400"
          }`}>Create and manage your simulations.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/tests/new"
            className={`group flex items-center justify-center gap-2 border px-5 py-2.5 transition-all text-sm font-medium shadow-lg hover:shadow-xl hover:-translate-y-0.5 duration-300 rounded-lg ${
              isLight
                ? "bg-neutral-900 text-white border-neutral-900 hover:bg-neutral-800"
                : "bg-[#252525] text-white border-white/10 hover:bg-[#333]"
            }`}
          >
            <Plus size={16} />
            <span>New Simulation</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className={`px-4 py-3 text-sm border mb-8 font-light rounded-lg ${
          isLight
            ? "bg-red-50 text-red-700 border-red-200"
            : "bg-red-500/10 text-red-400 border-red-500/20"
        }`}>
          {error}
        </div>
      )}

      <div className={`border flex flex-col relative overflow-hidden shadow-sm rounded-xl ${
        isLight
          ? "border-neutral-200 bg-white"
          : "border-white/10 bg-[#1E1E1E]"
      }`}>
        {/* Table Header / Toolbar */}
        <div className={`flex items-center justify-between px-6 py-4 border-b backdrop-blur-sm z-20 ${
          isLight
            ? "border-neutral-200 bg-white"
            : "border-white/5 bg-[#1E1E1E]"
        }`}>
          <div className={`text-sm font-medium ${
            isLight ? "text-neutral-600" : "text-neutral-400"
          }`}>
             {loading ? "Loading..." : `${batchTests.length} Simulations`}
          </div>
          
          <div className="flex items-center gap-3">
            {isSelectionMode ? (
              <>
                <button
                  onClick={toggleSelectionMode}
                  className={`text-xs transition-colors font-medium px-2 uppercase tracking-wide ${
                    isLight
                      ? "text-neutral-600 hover:text-neutral-900"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Cancel
                </button>
                {selectedTests.length > 0 && (
                  <>
                    <button
                      onClick={handleExportPDF}
                      disabled={exportingPDF}
                      className={`flex items-center justify-center gap-2 transition-all text-xs font-medium uppercase tracking-wide disabled:opacity-50 ${
                        isLight
                          ? "text-neutral-600 hover:text-neutral-900"
                          : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      {exportingPDF ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                      <span>Export PDF ({selectedTests.length})</span>
                    </button>
                    <button
                      onClick={handleArchive}
                      disabled={isArchiving}
                      className={`flex items-center justify-center gap-2 transition-all text-xs font-medium uppercase tracking-wide ${
                        isLight
                          ? "text-red-600 hover:text-red-700"
                          : "text-red-400 hover:text-red-300"
                      }`}
                    >
                      {isArchiving ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                      <span>Archive ({selectedTests.length})</span>
                    </button>
                  </>
                )}
              </>
            ) : (
              <button
                onClick={toggleSelectionMode}
                disabled={batchTests.length === 0}
                className={`flex items-center gap-1.5 text-xs transition-colors font-medium uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed ${
                  isLight
                    ? "text-neutral-600 hover:text-neutral-900"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <CheckSquare size={14} />
                <span>Select</span>
              </button>
            )}
          </div>
        </div>

        <div className="relative h-[600px]">
          <div className="h-full w-full overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className={`sticky top-0 z-10 shadow-sm ${
                isLight ? "bg-white" : "bg-[#1E1E1E]"
              }`}>
                <tr className={`border-b ${
                  isLight
                    ? "bg-neutral-100 border-neutral-200"
                    : "bg-[#252525] border-white/5"
                }`}>
                  {isSelectionMode && (
                    <th className={`px-6 py-4 w-12 ${
                      isLight ? "bg-neutral-100" : "bg-[#252525]"
                    }`}>
                      <CustomCheckbox 
                        checked={batchTests.length > 0 && selectedTests.length === batchTests.length}
                        onChange={toggleSelectAll}
                      />
                    </th>
                  )}
                  <SortableHeader field="targetUrl" className="w-1/3">Target URL</SortableHeader>
                  <SortableHeader field="agents">Agents</SortableHeader>
                  <SortableHeader field="status">Status</SortableHeader>
                  <SortableHeader field="date">Date</SortableHeader>
                  <th className={`px-6 py-4 font-medium uppercase tracking-wider text-xs text-right ${
                    isLight
                      ? "bg-neutral-100 text-neutral-600"
                      : "bg-[#252525] text-neutral-400"
                  }`}>Action</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${
                isLight
                  ? "divide-neutral-200 bg-white"
                  : "divide-white/5 bg-[#1E1E1E]"
              }`}>
                {loading ? (
                  <tr>
                    <td colSpan={isSelectionMode ? 6 : 5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <Loader2 className={`animate-spin w-6 h-6 ${
                          isLight ? "text-neutral-500" : "text-neutral-400"
                        }`} />
                        <span className={`text-sm font-light ${
                          isLight ? "text-neutral-600" : "text-neutral-500"
                        }`}>Loading simulations...</span>
                      </div>
                    </td>
                  </tr>
                ) : batchTests.length === 0 ? (
                  <tr>
                    <td colSpan={isSelectionMode ? 6 : 5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <h3 className={`text-base font-medium ${
                          isLight ? "text-neutral-900" : "text-white"
                        }`}>No batch tests yet</h3>
                        <p className={`font-light text-sm max-w-sm ${
                          isLight ? "text-neutral-500" : "text-neutral-400"
                        }`}>
                          Launch your first multi-agent batch simulation to start testing.
                        </p>
                        <Link
                          href="/dashboard/tests/new"
                          className={`inline-flex items-center justify-center gap-2 border px-5 py-2.5 transition-all text-sm font-medium mt-2 rounded-lg ${
                            isLight
                              ? "bg-neutral-900 text-white border-neutral-900 hover:bg-neutral-800"
                              : "border-white/10 bg-[#252525] text-white hover:bg-[#333]"
                          }`}
                        >
                          Start Simulation
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  sortedTests.map((test) => (
                    <tr key={test.id} className={`group transition-colors ${
                      selectedTests.includes(test.id)
                        ? isLight
                          ? "bg-neutral-50"
                          : "bg-white/5"
                        : isLight
                          ? "hover:bg-neutral-50"
                          : "hover:bg-white/5"
                    }`}>
                      {isSelectionMode && (
                        <td className="px-6 py-5">
                          <CustomCheckbox 
                            checked={selectedTests.includes(test.id)}
                            onChange={() => toggleSelect(test.id)}
                          />
                        </td>
                      )}
                      <td className={`px-6 py-5 font-light ${
                        isLight ? "text-neutral-900" : "text-white"
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-1.5 h-1.5 rounded-full transition-colors ${
                            isLight
                              ? "bg-neutral-400 group-hover:bg-neutral-600"
                              : "bg-neutral-400 group-hover:bg-white"
                          }`}></div>
                          <a href={test.targetUrl} target="_blank" rel="noopener noreferrer" className={`hover:underline underline-offset-4 truncate max-w-[300px] block ${
                            isLight
                              ? "decoration-neutral-400"
                              : "decoration-neutral-500"
                          }`}>
                            {test.targetUrl.replace(/^https?:\/\//, '')}
                          </a>
                        </div>
                      </td>
                      <td className={`px-6 py-5 font-light ${
                        isLight ? "text-neutral-600" : "text-neutral-300"
                      }`}>
                        {test.selectedPersonaIndices?.length || 0} personas
                      </td>
                      <td className="px-6 py-5">
                        {getStatusBadge(test.status)}
                      </td>
                      <td className={`px-6 py-5 font-light tabular-nums text-xs ${
                        isLight ? "text-neutral-500" : "text-neutral-400"
                      }`}>
                        {new Date(test.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <Link
                          href={`/dashboard/tests/${test.id}`}
                          className={`inline-flex items-center justify-center border px-4 py-1.5 text-xs font-medium transition-colors shadow-sm rounded-lg ${
                            isLight
                              ? "bg-neutral-900 text-white border-neutral-900 hover:bg-neutral-800"
                              : "bg-[#252525] text-white border-white/10 hover:bg-[#333]"
                          }`}
                        >
                          View Results
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}