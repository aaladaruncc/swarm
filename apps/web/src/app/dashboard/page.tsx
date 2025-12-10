"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { getTests, deleteTests, type TestRun } from "@/lib/api";
import { Plus, ArrowRight, Loader2, Archive, Trash2 } from "lucide-react";
import { CreateTestModal } from "@/components/dashboard/create-test-modal";
import { useSession, signOut } from "@/lib/auth-client";
import { getBatchTests, type BatchTestRun } from "@/lib/batch-api";

export default function Dashboard() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [tests, setTests] = useState<TestRun[]>([]);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [batchTests, setBatchTests] = useState<BatchTestRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [isArchiving, setIsArchiving] = useState(false);
  const [error, setError] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

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

  const handleTestCreated = (newTest: TestRun) => {
    setTests((prev) => [newTest, ...prev]);
  };

  const toggleSelectAll = () => {
    if (selectedTests.length === tests.length) {
      setSelectedTests([]);
    } else {
      setSelectedTests(tests.map(t => t.id));
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

  const handleArchive = async () => {
    if (selectedTests.length === 0) return;
    
    if (!confirm(`Are you sure you want to archive ${selectedTests.length} test(s)?`)) return;

    setIsArchiving(true);
    try {
      await deleteTests(selectedTests);
      // Remove locally
      setTests(prev => prev.filter(t => !selectedTests.includes(t.id)));
      setSelectedTests([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive tests");
    } finally {
      setIsArchiving(false);
    }
  };

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
      running: "bg-blue-50 text-blue-700 border-blue-200",
      completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
      failed: "bg-red-50 text-red-700 border-red-200",
    };
    
    const labels: Record<string, string> = {
      pending: "Queued",
      running: "Running",
      completed: "Success",
      failed: "Failed",
    };

    return (
      <span className={`px-2.5 py-0.5 text-xs font-medium border ${styles[status] || styles.pending} rounded-none`}>
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
          {isSelectionMode ? (
            <>
              <button
                onClick={toggleSelectionMode}
                className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors font-medium px-2"
              >
                Cancel
              </button>
              {selectedTests.length > 0 && (
                <button
                  onClick={handleArchive}
                  disabled={isArchiving}
                  className="flex items-center justify-center gap-2 bg-white border border-neutral-200 text-red-600 px-4 py-2.5 hover:bg-red-50 hover:border-red-200 transition-all text-sm font-medium rounded-none"
                >
                  {isArchiving ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  <span>Archive ({selectedTests.length})</span>
                </button>
              )}
            </>
          ) : (
            <button
              onClick={toggleSelectionMode}
              className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors font-medium px-2"
            >
              Select
            </button>
          )}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="group flex items-center justify-center gap-2 bg-neutral-900 text-white px-5 py-2.5 hover:bg-neutral-800 transition-all text-sm font-medium rounded-none shadow-lg hover:shadow-xl hover:-translate-y-0.5 duration-300"
          >
            <Plus size={16} />
            <span>New Simulation</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 text-sm border border-red-100 mb-8 font-light">
          {error}
        </div>
      )}

      <div className="border border-dashed border-neutral-300 p-1 min-h-[400px]">
        {loading ? (
          <div className="flex justify-center items-center h-full min-h-[400px]">
            <Loader2 className="animate-spin w-8 h-8 text-neutral-300" />
          </div>
        ) : tests.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-8">
            <h3 className="text-lg font-medium text-neutral-900 mb-2">No active swarms</h3>
            <p className="text-neutral-500 font-light text-sm max-w-sm mb-6">
              Launch your first agent swarm simulation to start testing.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 border border-neutral-200 bg-white text-neutral-900 px-5 py-2.5 hover:border-neutral-900 transition-all text-sm font-medium rounded-none"
            >
              Start Simulation
            </button>
          </div>
        ) : (
          <div className="bg-white h-full w-full">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200">
                    {isSelectionMode && (
                      <th className="px-6 py-4 w-12">
                        <input 
                          type="checkbox" 
                          className="rounded-none border-neutral-300 text-neutral-900 focus:ring-neutral-900 shadow-sm w-4 h-4"
                          checked={tests.length > 0 && selectedTests.length === tests.length}
                          onChange={toggleSelectAll}
                        />
                      </th>
                    )}
                    <th className="px-6 py-4 font-medium text-neutral-500 uppercase tracking-wider text-xs w-1/3">Target URL</th>
                    <th className="px-6 py-4 font-medium text-neutral-500 uppercase tracking-wider text-xs">Persona</th>
                    <th className="px-6 py-4 font-medium text-neutral-500 uppercase tracking-wider text-xs">Status</th>
                    <th className="px-6 py-4 font-medium text-neutral-500 uppercase tracking-wider text-xs">Date</th>
                    <th className="px-6 py-4 font-medium text-neutral-500 uppercase tracking-wider text-xs text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 bg-white">
                  {tests.map((test) => (
                    <tr key={test.id} className={`group transition-colors ${selectedTests.includes(test.id) ? "bg-neutral-50" : "hover:bg-neutral-50/30"}`}>
                      {isSelectionMode && (
                        <td className="px-6 py-5">
                          <input 
                            type="checkbox" 
                            className="rounded-none border-neutral-300 text-neutral-900 focus:ring-neutral-900 shadow-sm w-4 h-4"
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
                        {test.personaName || `Persona ${test.personaIndex}`}
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
                          className="inline-flex items-center justify-center bg-neutral-900 text-white px-4 py-1.5 text-xs font-medium hover:bg-neutral-800 transition-colors rounded-none shadow-sm"
                        >
                          View Results
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <CreateTestModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onTestCreated={handleTestCreated}
      />
    </div>
  );
}
