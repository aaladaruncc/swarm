"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, signOut } from "@/lib/auth-client";
import { getTests, type TestRun } from "@/lib/api";

export default function Dashboard() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [tests, setTests] = useState<TestRun[]>([]);
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
      const data = await getTests();
      setTests(data.tests);
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
      running: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
      completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
      failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">🧪 UX Testing Platform</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {session.user.email}
            </span>
            <button
              onClick={handleSignOut}
              className="text-sm text-red-600 hover:text-red-700"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">Your Tests</h2>
          <Link
            href="/tests/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + New Test
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : tests.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              No tests yet. Create your first test to get started!
            </p>
            <Link
              href="/tests/new"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Test
            </Link>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    URL
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Persona
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {tests.map((test) => (
                  <tr key={test.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4">
                      <a
                        href={test.targetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline truncate block max-w-xs"
                      >
                        {test.targetUrl}
                      </a>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {test.personaName || `Persona ${test.personaIndex}`}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(test.status)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {new Date(test.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/tests/${test.id}`}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        View Details →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
