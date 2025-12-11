"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { getBatchTests, getBatchTest, type BatchTestRun } from "@/lib/batch-api";
import { Plus, Loader2, Trash2, CheckSquare, FileText, Download, Check } from "lucide-react";
import { pdf } from '@react-pdf/renderer';
import { AggregatedReportPDF } from '@/components/pdf/AggregatedReportPDF';

export default function Dashboard() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [batchTests, setBatchTests] = useState<BatchTestRun[]>([]);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isArchiving, setIsArchiving] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [error, setError] = useState("");

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
        w-5 h-5 border flex items-center justify-center cursor-pointer transition-all duration-200
        ${checked 
          ? 'bg-neutral-900 border-neutral-900 text-white' 
          : 'bg-white border-neutral-300 hover:border-neutral-500'
        }
      `}
    >
      {checked && <Check size={12} strokeWidth={3} />}
    </div>
  );

  if (isPending || !session?.user) {
    return (
      <div className="h-full flex items-center justify-center bg-white text-neutral-900">
        <Loader2 className="animate-spin w-8 h-8 text-neutral-400" />
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

    return (
      <span className={`px-2.5 py-0.5 text-xs font-medium border ${styles[status] || styles.pending}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-light tracking-tight text-neutral-900 mb-2">Playground</h1>
          <p className="text-neutral-500 font-light">Create and manage your simulations.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/tests/new"
            className="group flex items-center justify-center gap-2 bg-neutral-900 text-white px-5 py-2.5 hover:bg-neutral-800 transition-all text-sm font-medium shadow-lg hover:shadow-xl hover:-translate-y-0.5 duration-300"
          >
            <Plus size={16} />
            <span>New Simulation</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 text-sm border border-red-100 mb-8 font-light">
          {error}
        </div>
      )}

      <div className="border border-neutral-200 flex flex-col relative overflow-hidden bg-white shadow-sm">
        {/* Table Header / Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-white/50 backdrop-blur-sm z-20">
          <div className="text-sm font-medium text-neutral-500">
             {loading ? "Loading..." : `${batchTests.length} Simulations`}
          </div>
          
          <div className="flex items-center gap-3">
            {isSelectionMode ? (
              <>
                <button
                  onClick={toggleSelectionMode}
                  className="text-xs text-neutral-500 hover:text-neutral-900 transition-colors font-medium px-2 uppercase tracking-wide"
                >
                  Cancel
                </button>
                {selectedTests.length > 0 && (
                  <>
                    <button
                      onClick={handleExportPDF}
                      disabled={exportingPDF}
                      className="flex items-center justify-center gap-2 text-neutral-600 hover:text-neutral-900 transition-all text-xs font-medium uppercase tracking-wide disabled:opacity-50"
                    >
                      {exportingPDF ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                      <span>Export PDF ({selectedTests.length})</span>
                    </button>
                    <button
                      onClick={handleArchive}
                      disabled={isArchiving}
                      className="flex items-center justify-center gap-2 text-red-600 hover:text-red-700 transition-all text-xs font-medium uppercase tracking-wide"
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
                className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-900 transition-colors font-medium uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
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
              <thead className="sticky top-0 bg-white z-10 shadow-sm">
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  {isSelectionMode && (
                    <th className="px-6 py-4 w-12 bg-neutral-50">
                      <CustomCheckbox 
                        checked={batchTests.length > 0 && selectedTests.length === batchTests.length}
                        onChange={toggleSelectAll}
                      />
                    </th>
                  )}
                  <th className="px-6 py-4 font-medium text-neutral-500 uppercase tracking-wider text-xs w-1/3 bg-neutral-50">Target URL</th>
                  <th className="px-6 py-4 font-medium text-neutral-500 uppercase tracking-wider text-xs bg-neutral-50">Agents</th>
                  <th className="px-6 py-4 font-medium text-neutral-500 uppercase tracking-wider text-xs bg-neutral-50">Status</th>
                  <th className="px-6 py-4 font-medium text-neutral-500 uppercase tracking-wider text-xs bg-neutral-50">Date</th>
                  <th className="px-6 py-4 font-medium text-neutral-500 uppercase tracking-wider text-xs text-right bg-neutral-50">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={isSelectionMode ? 6 : 5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <Loader2 className="animate-spin w-6 h-6 text-neutral-400" />
                        <span className="text-sm text-neutral-500 font-light">Loading simulations...</span>
                      </div>
                    </td>
                  </tr>
                ) : batchTests.length === 0 ? (
                  <tr>
                    <td colSpan={isSelectionMode ? 6 : 5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <h3 className="text-base font-medium text-neutral-900">No batch tests yet</h3>
                        <p className="text-neutral-500 font-light text-sm max-w-sm">
                          Launch your first multi-agent batch simulation to start testing.
                        </p>
                        <Link
                          href="/tests/new"
                          className="inline-flex items-center justify-center gap-2 border border-neutral-200 bg-white text-neutral-900 px-5 py-2.5 hover:border-neutral-900 transition-all text-sm font-medium mt-2"
                        >
                          Start Simulation
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  batchTests.map((test) => (
                    <tr key={test.id} className={`group transition-colors ${selectedTests.includes(test.id) ? "bg-neutral-50" : "hover:bg-neutral-50/30"}`}>
                      {isSelectionMode && (
                        <td className="px-6 py-5">
                          <CustomCheckbox 
                            checked={selectedTests.includes(test.id)}
                            onChange={() => toggleSelect(test.id)}
                          />
                        </td>
                      )}
                      <td className="px-6 py-5 font-light text-neutral-900">
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-neutral-400 group-hover:bg-neutral-900 transition-colors"></div>
                          <a href={test.targetUrl} target="_blank" rel="noopener noreferrer" className="hover:underline decoration-neutral-300 underline-offset-4 truncate max-w-[300px] block">
                            {test.targetUrl.replace(/^https?:\/\//, '')}
                          </a>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-neutral-600 font-light">
                        {test.selectedPersonaIndices?.length || 0} personas
                      </td>
                      <td className="px-6 py-5">
                        {getStatusBadge(test.status)}
                      </td>
                      <td className="px-6 py-5 text-neutral-500 font-light tabular-nums text-xs">
                        {new Date(test.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <Link
                          href={`/tests/${test.id}`}
                          className="inline-flex items-center justify-center bg-neutral-900 text-white px-4 py-1.5 text-xs font-medium hover:bg-neutral-800 transition-colors shadow-sm"
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
