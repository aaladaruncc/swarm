"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { generatePersonas, createBatchTest, type GeneratedPersona } from "@/lib/batch-api";
import { GeneratingPersonasLoader } from "@/components/ui/generating-personas-loader";
import { ArrowLeft, Globe, User, Loader2, Zap, Info, Check, Minus, Plus } from "lucide-react";

export default function NewTest() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  
  // Step 1: URL and Description
  const [url, setUrl] = useState("");
  const [userDescription, setUserDescription] = useState("");
  const [agentCount, setAgentCount] = useState(3);
  
  // Step 2: Generated Personas
  const [personas, setPersonas] = useState<GeneratedPersona[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [recommendedIndices, setRecommendedIndices] = useState<number[]>([]);
  
  // UI State
  const [step, setStep] = useState<"describe" | "generating" | "select" | "starting">("describe");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin w-8 h-8 text-neutral-300" />
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
    setStep("generating");

    try {
      const result = await generatePersonas(url, userDescription, agentCount);
      setPersonas(result.personas);
      setRecommendedIndices(result.recommendedIndices);
      setSelectedIndices(result.recommendedIndices);
      setStep("select");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate personas");
      setStep("describe");
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
    <div className="min-h-screen bg-white text-neutral-900 font-sans selection:bg-neutral-900 selection:text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-neutral-100 h-16">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center">
          <Link href="/dashboard" className="text-sm font-light text-neutral-500 hover:text-neutral-900 transition-colors flex items-center gap-2">
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="pt-32 pb-24 px-6 max-w-4xl mx-auto">
        {/* Step 1: Describe */}
        {step === "describe" && (
          <>
            <div className="mb-12">
              <h1 className="text-4xl font-light tracking-tight mb-4">Initialize Batch Simulation</h1>
              <p className="text-neutral-500 font-light text-lg">
                Define your target environment and audience. AI will generate diverse personas to test your experience.
              </p>
            </div>

            <form onSubmit={handleGeneratePersonas} className="space-y-12">
              {/* Target URL */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 text-neutral-900 border-b border-neutral-100 pb-2">
                  <Globe size={20} className="stroke-1" />
                  <h2 className="text-xl font-medium">Target Environment</h2>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Website URL</label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full bg-white border border-neutral-200 text-neutral-900 px-4 py-4 focus:border-neutral-900 focus:ring-0 outline-none transition-all placeholder:text-neutral-300 font-light text-lg"
                    required
                  />
                  <p className="text-xs text-neutral-400 font-light">
                    The agents will begin their sessions at this URL.
                  </p>
                </div>
              </section>

              {/* Audience Description */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 text-neutral-900 border-b border-neutral-100 pb-2">
                  <User size={20} className="stroke-1" />
                  <h2 className="text-xl font-medium">Target Audience</h2>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Audience Description</label>
                  <textarea
                    value={userDescription}
                    onChange={(e) => setUserDescription(e.target.value)}
                    placeholder="Example: Busy professionals aged 25-45 who need quick meal planning. They have varying cooking skills and limited time. Some are tech-savvy, others prefer simple interfaces..."
                    className="w-full bg-white border border-neutral-200 text-neutral-900 px-4 py-4 focus:border-neutral-900 focus:ring-0 outline-none transition-all placeholder:text-neutral-300 font-light min-h-[140px] resize-none"
                    required
                    minLength={10}
                    maxLength={2000}
                  />
                  <p className="text-xs text-neutral-400 font-light">
                    Be specific: demographics, goals, tech comfort, pain points, accessibility needs.
                  </p>
                </div>
              </section>

              {/* Agent Count */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 text-neutral-900 border-b border-neutral-100 pb-2">
                  <Zap size={20} className="stroke-1" />
                  <h2 className="text-xl font-medium">Concurrency</h2>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Concurrent Agents</label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setAgentCount(Math.max(1, agentCount - 1))}
                        className="w-8 h-8 border border-neutral-200 hover:border-neutral-900 transition-colors flex items-center justify-center"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="text-2xl font-light w-8 text-center">{agentCount}</span>
                      <button
                        type="button"
                        onClick={() => setAgentCount(Math.min(5, agentCount + 1))}
                        className="w-8 h-8 border border-neutral-200 hover:border-neutral-900 transition-colors flex items-center justify-center"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex gap-1 h-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`flex-1 transition-colors ${
                          i <= agentCount ? 'bg-neutral-900' : 'bg-neutral-200'
                        }`}
                      />
                    ))}
                  </div>

                  <p className="text-xs text-neutral-400 font-light">
                    {agentCount === 1 && "Single agent — Slowest but zero rate limit risk"}
                    {agentCount === 2 && "2 agents — Safe with minimal rate limit risk"}
                    {agentCount === 3 && "3 agents — Balanced speed and safety (recommended)"}
                    {agentCount === 4 && "4 agents — Faster but slight rate limit risk"}
                    {agentCount === 5 && "5 agents — Fastest but higher rate limit risk"}
                  </p>
                </div>
              </section>

              {error && (
                <div className="p-4 bg-red-50 text-red-600 border border-red-100 text-sm font-light">
                  <span className="font-medium">Error:</span> {error}
                </div>
              )}

              <div className="flex items-start gap-3 p-4 bg-neutral-50 border border-neutral-100 text-sm font-light text-neutral-600">
                <Info size={16} className="mt-0.5 shrink-0" />
                <p>
                  AI will generate 10 diverse personas and automatically select the {agentCount} most relevant ones.
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-4 pt-4">
                <Link
                  href="/dashboard"
                  className="px-8 py-3 text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loading || !url || !userDescription}
                  className="bg-neutral-900 text-white px-8 py-3 hover:bg-neutral-800 transition-all text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-w-[200px] justify-center"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <span>Generate Personas</span>
                  )}
                </button>
              </div>
            </form>
          </>
        )}

        {/* Step 1.5: Generating */}
        {step === "generating" && (
          <GeneratingPersonasLoader />
        )}

        {/* Step 2: Select Personas */}
        {step === "select" && (
          <>
            <div className="mb-12">
              <h1 className="text-4xl font-light tracking-tight mb-4">Select Personas</h1>
              <p className="text-neutral-500 font-light text-lg">
                We've pre-selected {agentCount} personas. Adjust your selection if needed.
              </p>
            </div>

            <div className="space-y-8">
              {/* Selection Status */}
              <div className="flex items-center gap-3 p-4 border border-neutral-200">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <span className={`text-sm font-medium ${selectedIndices.length === agentCount ? 'text-green-600' : 'text-neutral-600'}`}>
                      {selectedIndices.length}/{agentCount} personas selected
                    </span>
                    <div className="flex gap-1 flex-1 max-w-xs">
                      {[...Array(agentCount)].map((_, i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 transition-colors ${
                            i < selectedIndices.length ? 'bg-neutral-900' : 'bg-neutral-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-neutral-400 font-light">
                    {selectedIndices.length < agentCount 
                      ? `Select ${agentCount - selectedIndices.length} more persona${agentCount - selectedIndices.length !== 1 ? 's' : ''}`
                      : 'Ready to deploy agents'}
                  </p>
                </div>
              </div>

              {/* Personas Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {personas.map((persona, index) => {
                  const isSelected = selectedIndices.includes(index);
                  const isRecommended = recommendedIndices.includes(index);
                  const canSelect = isSelected || selectedIndices.length < agentCount;
                  
                  return (
                    <div
                      key={index}
                      onClick={() => canSelect && togglePersonaSelection(index)}
                      className={`group cursor-pointer p-6 border transition-all duration-200 relative ${
                        isSelected
                          ? "border-neutral-900 bg-neutral-50"
                          : canSelect
                          ? "border-neutral-200 bg-white hover:border-neutral-400"
                          : "border-neutral-100 bg-neutral-50 opacity-50 cursor-not-allowed"
                      }`}
                    >
                      {isRecommended && (
                        <div className="absolute top-3 right-3 px-2 py-0.5 bg-neutral-900 text-white text-[10px] font-medium uppercase tracking-wide">
                          Recommended
                        </div>
                      )}

                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-medium text-lg mb-1">{persona.name}</h3>
                          <div className="text-xs text-neutral-500 font-light flex items-center gap-2">
                            <span>{persona.age} yrs</span>
                            <span className="w-1 h-1 bg-neutral-300 rounded-full"></span>
                            <span>{persona.country}</span>
                          </div>
                        </div>
                        
                        <div className="flex gap-0.5">
                          {[...Array(3)].map((_, i) => (
                            <div 
                              key={i} 
                              className={`w-1 h-1 rounded-full ${
                                i < (persona.techSavviness === 'beginner' ? 1 : persona.techSavviness === 'intermediate' ? 2 : 3)
                                  ? "bg-neutral-900" 
                                  : "bg-neutral-200"
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      <p className="text-xs text-neutral-400 font-mono uppercase tracking-wider mb-3">
                        {persona.occupation}
                      </p>

                      <p className="text-sm text-neutral-600 font-light leading-relaxed mb-3">
                        {persona.primaryGoal}
                      </p>

                      <div className="text-xs text-neutral-400">
                        Relevance: {persona.relevanceScore}/10
                      </div>

                      {/* Selection Indicator */}
                      {isSelected && (
                        <div className="absolute top-0 left-0 w-0 h-0 border-t-[28px] border-r-[28px] border-t-neutral-900 border-r-transparent">
                          <Check size={12} className="absolute -top-6 left-1 text-white" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {error && (
                <div className="p-4 bg-red-50 text-red-600 border border-red-100 text-sm font-light">
                  <span className="font-medium">Error:</span> {error}
                </div>
              )}

              <div className="flex items-start gap-3 p-4 bg-neutral-50 border border-neutral-100 text-sm font-light text-neutral-600">
                <Info size={16} className="mt-0.5 shrink-0" />
                <p>
                  Each agent will run concurrently. Queue system prevents rate limits. Tests take 5-10 minutes.
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between gap-4 pt-4">
                <button
                  onClick={() => setStep("describe")}
                  className="px-8 py-3 text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={handleStartBatchTest}
                  disabled={loading || selectedIndices.length !== agentCount}
                  className="bg-neutral-900 text-white px-8 py-3 hover:bg-neutral-800 transition-all text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-w-[200px] justify-center"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Deploying...</span>
                    </>
                  ) : selectedIndices.length !== agentCount ? (
                    <span>Select {agentCount - selectedIndices.length} more</span>
                  ) : (
                    <>
                      <Zap size={16} />
                      <span>Deploy {agentCount} Agent{agentCount !== 1 ? 's' : ''}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Step 3: Starting */}
        {step === "starting" && (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
            <Loader2 className="w-16 h-16 animate-spin text-neutral-300 mb-6" />
            <h2 className="text-2xl font-light tracking-tight mb-2">Deploying Agents...</h2>
            <p className="text-neutral-500 font-light">
              Launching {agentCount} concurrent agent{agentCount !== 1 ? 's' : ''} to test your environment
            </p>
            <p className="text-xs text-neutral-400 font-light mt-2">
              Queue system active • Rate limits prevented
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
