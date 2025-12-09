"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, signOut } from "@/lib/auth-client";
import { getBatchTests, type BatchTestRun } from "@/lib/batch-api";

export default function Dashboard() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [batchTests, setBatchTests] = useState<BatchTestRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/");
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

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
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
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        {status === "running_tests" && "🔄 "}
        {status === "aggregating" && "🤖 "}
        {status.replace("_", " ")}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">🧪 AI-Powered UX Testing Platform</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {session.user.email}
            </span>
            <button
              onClick={handleSignOut}
              className="text-sm text-red-600 hover:text-red-700 dark:hover:text-red-500"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold">Your Batch Tests</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Each test runs 5 AI personas concurrently
            </p>
          </div>
          <Link
            href="/tests/new"
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl font-medium"
          >
            ✨ New Batch Test
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : batchTests.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-xl font-bold mb-2">No Tests Yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
              Create your first AI-powered batch test to get comprehensive UX insights 
              from 5 different user personas simultaneously!
            </p>
            <Link
              href="/tests/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl font-medium"
            >
              ✨ Create Your First Test
            </Link>
          </div>
        ) : (
          <div className="grid gap-6">
            {batchTests.map((test) => (
              <div
                key={test.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <a
                        href={test.targetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lg font-semibold text-blue-600 hover:underline"
                      >
                        {test.targetUrl} ↗
                      </a>
                      {getStatusBadge(test.status)}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {test.userDescription}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t dark:border-gray-700">
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <span>👥 5 personas</span>
                    <span>•</span>
                    <span>{new Date(test.createdAt).toLocaleDateString()}</span>
                    {test.completedAt && (
                      <>
                        <span>•</span>
                        <span className="text-green-600 dark:text-green-400">
                          ✓ Completed
                        </span>
                      </>
                    )}
                  </div>
                  <Link
                    href={`/tests/${test.id}`}
                    className="px-4 py-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg font-medium transition-colors"
                  >
                    View Results →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
