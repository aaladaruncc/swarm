"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { createTest } from "@/lib/api";

const PERSONAS = [
  {
    index: 0,
    name: "Maria",
    age: 34,
    occupation: "Elementary School Teacher",
    techSavviness: "beginner",
    country: "Brazil",
    description: "First-time app user, needs simple interfaces",
  },
  {
    index: 1,
    name: "James",
    age: 62,
    occupation: "Retired Factory Worker",
    techSavviness: "beginner",
    country: "United States",
    description: "Senior user, prefers large text and simple navigation",
  },
  {
    index: 2,
    name: "Priya",
    age: 28,
    occupation: "Software Engineer",
    techSavviness: "advanced",
    country: "India",
    description: "Tech-savvy, expects efficient workflows",
  },
];

export default function NewTest() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [url, setUrl] = useState("");
  const [selectedPersona, setSelectedPersona] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session?.user) {
    router.push("/");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await createTest(url, selectedPersona);
      router.push(`/tests/${result.testRun.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create test");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">
            ← Back
          </Link>
          <h1 className="text-xl font-bold">New Test</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-6">Create a New UX Test</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Website URL
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://your-website.com"
                className="w-full px-4 py-3 rounded-lg border dark:bg-gray-700 dark:border-gray-600"
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                Enter the URL of the website you want to test
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-3">
                Select a Persona
              </label>
              <div className="grid gap-4">
                {PERSONAS.map((persona) => (
                  <label
                    key={persona.index}
                    className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                      selectedPersona === persona.index
                        ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="persona"
                      value={persona.index}
                      checked={selectedPersona === persona.index}
                      onChange={() => setSelectedPersona(persona.index)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{persona.name}</span>
                        <span className="text-sm text-gray-500">
                          {persona.age}yo, {persona.country}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {persona.occupation}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {persona.description}
                      </p>
                      <span
                        className={`inline-block mt-2 px-2 py-0.5 rounded text-xs ${
                          persona.techSavviness === "beginner"
                            ? "bg-yellow-100 text-yellow-800"
                            : persona.techSavviness === "advanced"
                            ? "bg-green-100 text-green-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {persona.techSavviness} tech user
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 p-4 rounded-lg">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              <Link
                href="/dashboard"
                className="px-6 py-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading || !url}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Starting Test..." : "Start Test"}
              </button>
            </div>
          </form>
        </div>

        <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-300">
            <strong>Note:</strong> Tests typically take 2-5 minutes to complete.
            You can view the progress in real-time on the test details page.
          </p>
        </div>
      </main>
    </div>
  );
}
