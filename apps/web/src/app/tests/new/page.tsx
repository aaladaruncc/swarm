"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { generatePersonas, createBatchTest, type GeneratedPersona } from "@/lib/batch-api";

export default function NewTest() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  
  // Step 1: URL and Description
  const [url, setUrl] = useState("");
  const [userDescription, setUserDescription] = useState("");
  const [agentCount, setAgentCount] = useState(3); // Default to 3 agents
  
  // Step 2: Generated Personas
  const [personas, setPersonas] = useState<GeneratedPersona[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [recommendedIndices, setRecommendedIndices] = useState<number[]>([]);
  
  // UI State
  const [step, setStep] = useState<"describe" | "select" | "starting">("describe");
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

  const handleGeneratePersonas = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await generatePersonas(url, userDescription, agentCount);
      setPersonas(result.personas);
      setRecommendedIndices(result.recommendedIndices);
      setSelectedIndices(result.recommendedIndices);
      setStep("select");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate personas");
    } finally {
      setLoading(false);
    }
  };

  const togglePersonaSelection = (index: number) => {
    if (selectedIndices.includes(index)) {
      setSelectedIndices(selectedIndices.filter((i) => i !== index));
    } else if (selectedIndices.length < agentCount) {
      setSelectedIndices([...selectedIndices, index]);
    }
  };

  const handleStartBatchTest = async () => {
    setError("");
    setLoading(true);
    setStep("starting");

    try {
      const result = await createBatchTest(url, userDescription, personas, selectedIndices, agentCount);
      router.push(`/tests/${result.batchTestRun.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start batch test");
      setStep("select");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            ← Back
          </Link>
          <h1 className="text-xl font-bold">New AI-Powered UX Test</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {step === "describe" && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8">
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-2">Define Your Target Users</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Tell us about your website and target audience. Our AI will generate 10 diverse user personas,
                then run concurrent tests to give you comprehensive UX insights.
              </p>
            </div>

            <form onSubmit={handleGeneratePersonas} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Website URL
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://your-website.com"
                  className="w-full px-4 py-3 rounded-lg border dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Describe Your Target Audience
                </label>
                <textarea
                  value={userDescription}
                  onChange={(e) => setUserDescription(e.target.value)}
                  placeholder="Example: My website is for busy parents looking to plan healthy meals. They typically have limited time, varying cooking skills, and want quick, family-friendly recipes. Some are tech-savvy while others struggle with complex interfaces..."
                  className="w-full px-4 py-3 rounded-lg border dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 min-h-[150px]"
                  required
                  minLength={10}
                  maxLength={2000}
                />
                <p className="mt-2 text-sm text-gray-500">
                  Be specific about: demographics, goals, pain points, tech comfort level, and any accessibility needs.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Number of Concurrent Agents: <strong className="text-blue-600">{agentCount}</strong>
                </label>
                <div className="space-y-3">
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={agentCount}
                    onChange={(e) => setAgentCount(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>1 (Safest)</span>
                    <span>2</span>
                    <span>3 (Balanced)</span>
                    <span>4</span>
                    <span>5 (Fastest)</span>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    {agentCount === 1 && "⚡ Single agent - slowest but zero rate limit risk"}
                    {agentCount === 2 && "⚡ 2 agents - safe with minimal rate limit risk"}
                    {agentCount === 3 && "⚡ 3 agents - balanced speed and safety (recommended)"}
                    {agentCount === 4 && "⚡ 4 agents - faster but slight rate limit risk"}
                    {agentCount === 5 && "⚡ 5 agents - fastest but higher rate limit risk"}
                  </p>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex gap-4">
                <Link
                  href="/dashboard"
                  className="px-6 py-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loading || !url || !userDescription}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Generating Personas...
                    </>
                  ) : (
                    <>
                      ✨ Generate Personas with AI
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {step === "select" && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-2">Review AI-Generated Personas</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                We've generated 10 diverse personas based on your description. 
                <strong className="text-blue-600 dark:text-blue-400"> We've pre-selected the {agentCount} most relevant ones</strong>, 
                but you can adjust the selection if needed.
              </p>
              <div className="flex items-center gap-3 text-sm flex-wrap">
                <span className={`px-3 py-1 rounded-full ${selectedIndices.length === agentCount ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'}`}>
                  {selectedIndices.length}/{agentCount} personas selected
                </span>
                <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                  {agentCount} concurrent agents
                </span>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {personas.map((persona, index) => {
                const isSelected = selectedIndices.includes(index);
                const isRecommended = recommendedIndices.includes(index);
                
                return (
                  <div
                    key={index}
                    onClick={() => togglePersonaSelection(index)}
                    className={`relative p-5 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected
                        ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20 shadow-md"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    {isRecommended && (
                      <div className="absolute top-2 right-2 px-2 py-1 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs font-bold rounded-full shadow">
                        ⭐ RECOMMENDED
                      </div>
                    )}
                    
                    <div className="flex items-start gap-3 mb-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="mt-1 h-5 w-5 rounded border-gray-300"
                        disabled={!isSelected && selectedIndices.length >= 5}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-lg">{persona.name}</h3>
                          <span className="text-sm text-gray-500">
                            {persona.age}, {persona.country}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {persona.occupation}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-3">
                      <p className="text-sm">
                        <strong className="text-gray-700 dark:text-gray-300">Goal:</strong>{" "}
                        <span className="text-gray-600 dark:text-gray-400">{persona.primaryGoal}</span>
                      </p>
                      
                      <div>
                        <strong className="text-sm text-gray-700 dark:text-gray-300">Pain Points:</strong>
                        <ul className="mt-1 space-y-1">
                          {persona.painPoints.slice(0, 2).map((point, i) => (
                            <li key={i} className="text-xs text-gray-600 dark:text-gray-400 flex gap-1">
                              <span>•</span>
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          persona.techSavviness === "beginner"
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                            : persona.techSavviness === "advanced"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                        }`}
                      >
                        {persona.techSavviness}
                      </span>
                      <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                        {persona.incomeLevel} income
                      </span>
                      <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                        Relevance: {persona.relevanceScore}/10
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg">
                {error}
              </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex gap-4">
                <button
                  onClick={() => setStep("describe")}
                  className="px-6 py-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={handleStartBatchTest}
                  disabled={loading || selectedIndices.length !== agentCount}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  {selectedIndices.length !== agentCount ? (
                    `Select ${agentCount - selectedIndices.length} more persona${agentCount - selectedIndices.length !== 1 ? 's' : ''}`
                  ) : (
                    <>
                      🚀 Start {agentCount} Concurrent Test{agentCount !== 1 ? 's' : ''}
                    </>
                  )}
                </button>
              </div>
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                This will run {agentCount} AI agent{agentCount !== 1 ? 's' : ''} {agentCount > 1 ? 'simultaneously ' : ''}testing your website from different perspectives. 
                Tests take 5-10 minutes total. {agentCount > 3 && '⚠️ Higher concurrency may risk rate limits.'}
              </p>
            </div>
          </div>
        )}

        {step === "starting" && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold mb-2">Starting Your Batch Test...</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Launching {agentCount} {agentCount > 1 ? 'concurrent ' : ''}AI agent{agentCount !== 1 ? 's' : ''} to test your website
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              Queue system active - preventing rate limits
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
