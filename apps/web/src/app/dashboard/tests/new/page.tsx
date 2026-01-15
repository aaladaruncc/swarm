"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { generatePersonas, createBatchTest, getSwarms, type GeneratedPersona, type Swarm } from "@/lib/batch-api";
import { GeneratingPersonasLoader } from "@/components/ui/generating-personas-loader";
import { Globe, User, Loader2, Zap, Info, Check, Minus, Plus, Users, X, ArrowRight, Bot } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  const orderedPersonas = personas
    .map((persona, index) => ({ persona, index }))
    .sort((a, b) => {
      const aRecommended = recommendedIndices.includes(a.index);
      const bRecommended = recommendedIndices.includes(b.index);
      if (aRecommended !== bRecommended) {
        return aRecommended ? -1 : 1;
      }
      return (b.persona.relevanceScore || 0) - (a.persona.relevanceScore || 0);
    });

  // Swarm Selection
  const [swarms, setSwarms] = useState<Swarm[]>([]);
  const [isLoadingSwarms, setIsLoadingSwarms] = useState(false);
  const [showSwarmSelector, setShowSwarmSelector] = useState(false);
  const [selectedSwarm, setSelectedSwarm] = useState<Swarm | null>(null);
  const [swarmModalStep, setSwarmModalStep] = useState<"select" | "confirm">("select");

  // UI State
  const [step, setStep] = useState<"describe" | "generating" | "select" | "starting">("describe");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // UXAgent toggle
  const [useUXAgent, setUseUXAgent] = useState(false);

  const loadSwarms = useCallback(async () => {
    setIsLoadingSwarms(true);
    try {
      const data = await getSwarms();
      setSwarms(data.swarms);
    } catch (err) {
      console.error("Failed to load swarms:", err);
    } finally {
      setIsLoadingSwarms(false);
    }
  }, []);

  // Load swarms when URL is entered
  useEffect(() => {
    if (url && session?.user) {
      loadSwarms();
    }
  }, [url, session, loadSwarms]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showSwarmSelector) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showSwarmSelector]);

  // Early returns after all hooks
  if (isPending) {
    return (
      <div className="h-full flex items-center justify-center bg-white text-neutral-900">
        <Loader2 className="animate-spin w-8 h-8 text-neutral-400" />
      </div>
    );
  }

  if (!session?.user) {
    router.push("/");
    return null;
  }

  const handleSelectSwarm = (swarm: Swarm) => {
    setSelectedSwarm(swarm);
    setSwarmModalStep("confirm");
  };

  const handleConfirmSwarm = () => {
    if (!selectedSwarm) return;
    setShowSwarmSelector(false);
    // Use personas from the swarm (limit to agentCount to be safe)
    const personasToUse = selectedSwarm.personas.slice(0, selectedSwarm.agentCount);
    setPersonas(personasToUse);
    setSelectedIndices(personasToUse.map((_, i) => i));
    setAgentCount(selectedSwarm.agentCount);
    // Immediately start the test
    handleStartBatchTestFromSwarm(selectedSwarm);
  };

  const handleStartBatchTestFromSwarm = async (swarm: Swarm) => {
    setError("");
    setLoading(true);
    setStep("starting");

    try {
      // Use swarm personas directly - limit to agentCount
      const personasToUse = swarm.personas.slice(0, swarm.agentCount);
      const selectedIndices = personasToUse.map((_, i) => i);
      const result = await createBatchTest(
        url,
        swarm.description || `Test using ${swarm.name}`,
        personasToUse,
        selectedIndices,
        swarm.agentCount,
        useUXAgent,
        20
      );
      router.push(`/tests/${result.batchTestRun.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start batch test");
      setStep("describe");
    } finally {
      setLoading(false);
    }
  };

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
      const result = await createBatchTest(url, userDescription, personas, selectedIndices, agentCount, useUXAgent, 20);
      router.push(`/tests/${result.batchTestRun.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start batch test");
      setStep("select");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full h-full overflow-hidden">
      {/* Breadcrumb */}
      <div className="mb-6">
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/dashboard"
            className="text-neutral-500 hover:text-neutral-900 transition-colors font-light"
          >
            Playground
          </Link>
          <span className="text-neutral-400">/</span>
          <span className="text-neutral-900 font-medium">New Simulation</span>
        </nav>
      </div>

      {/* Step 1: Describe */}
      {step === "describe" && (
        <>
          <div className="mb-6">
            <h1 className="text-3xl font-light tracking-tight mb-2">Initialize Batch Simulation</h1>
            <p className="text-neutral-500 font-light text-sm">
              Define your target environment and audience. AI will generate richer, behavior-driven personas to test your experience.
            </p>
          </div>

          <form onSubmit={handleGeneratePersonas} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Target URL */}
              <section className="space-y-4">
                <div className="flex items-center gap-3 text-neutral-900 border-b border-neutral-100 pb-2">
                  <Globe size={18} className="stroke-1" />
                  <h2 className="text-base font-medium">Target Environment</h2>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Website URL</label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full bg-white border border-neutral-200 text-neutral-900 px-3 py-2.5 focus:border-neutral-900 focus:ring-0 outline-none transition-all placeholder:text-neutral-300 font-light text-sm rounded-none"
                    required
                  />
                  <p className="text-xs text-neutral-400 font-light">
                    The agents will begin their sessions at this URL.
                  </p>
                </div>
              </section>

              {/* Audience Description */}
              <section className="space-y-4">
                <div className="flex items-center gap-3 text-neutral-900 border-b border-neutral-100 pb-2">
                  <User size={18} className="stroke-1" />
                  <h2 className="text-base font-medium">Target Audience</h2>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Audience Description</label>
                  <textarea
                    value={userDescription}
                    onChange={(e) => setUserDescription(e.target.value)}
                    placeholder="Example: Busy professionals aged 25-45 who need quick meal planning..."
                    className="w-full bg-white border border-neutral-200 text-neutral-900 px-3 py-2.5 focus:border-neutral-900 focus:ring-0 outline-none transition-all placeholder:text-neutral-300 font-light min-h-[100px] resize-none text-sm rounded-none"
                    required
                    minLength={10}
                    maxLength={2000}
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-neutral-400 font-light">
                      Be specific: demographics, goals, tech comfort, pain points.
                    </p>

                    {/* Use Saved Swarms Box */}
                    {url && (
                      <button
                        type="button"
                        onClick={() => {
                          setSwarmModalStep("select");
                          setShowSwarmSelector(true);
                        }}
                        className="px-3 py-1.5 border border-neutral-200 hover:border-neutral-900 bg-white hover:bg-neutral-50 transition-all text-xs font-medium text-neutral-900 flex items-center gap-2 group rounded-none"
                      >
                        <Users size={14} className="text-neutral-500 group-hover:text-neutral-900 transition-colors" />
                        <span>Use Swarms</span>
                      </button>
                    )}
                  </div>
                </div>
              </section>
            </div>

            {/* Agent Count */}
            <section className="space-y-4 border-t border-neutral-100 pt-6">
              <div className="flex items-center gap-3 text-neutral-900 border-b border-neutral-100 pb-2">
                <Zap size={18} className="stroke-1" />
                <h2 className="text-base font-medium">Concurrency</h2>
              </div>

              <div className="flex items-center justify-between max-w-md">
                <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Concurrent Agents</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setAgentCount(Math.max(1, agentCount - 1))}
                    className="w-8 h-8 border border-neutral-200 hover:border-neutral-900 transition-colors flex items-center justify-center"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="text-xl font-light w-8 text-center">{agentCount}</span>
                  <button
                    type="button"
                    onClick={() => setAgentCount(Math.min(5, agentCount + 1))}
                    className="w-8 h-8 border border-neutral-200 hover:border-neutral-900 transition-colors flex items-center justify-center"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              <div className="flex gap-1 h-1 max-w-md">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={`flex-1 transition-colors ${i <= agentCount ? 'bg-neutral-900' : 'bg-neutral-200'
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
            </section>

            {/* UXAgent Toggle */}
            <section className="space-y-4 border-t border-neutral-100 pt-6">
              <div className="flex items-center gap-3 text-neutral-900 border-b border-neutral-100 pb-2">
                <Bot size={18} className="stroke-1" />
                <h2 className="text-base font-medium">Agent Engine</h2>
              </div>

              <div className="flex items-center justify-between max-w-md">
                <div>
                  <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Use UXAgent Service</label>
                  <p className="text-xs text-neutral-400 font-light mt-1">
                    Advanced AI agent with persona-driven exploration
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setUseUXAgent(!useUXAgent)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${useUXAgent ? 'bg-neutral-900' : 'bg-neutral-200'
                    }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${useUXAgent ? 'translate-x-6' : 'translate-x-1'
                      }`}
                  />
                </button>
              </div>

              {useUXAgent && (
                <div className="p-3 bg-blue-50 border border-blue-100 text-xs font-light text-blue-700 rounded-none">
                  <span className="font-medium">UXAgent enabled:</span> Each agent will explore your site with AI-driven decision making, capturing detailed action traces and observations.
                </div>
              )}
            </section>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 border border-red-100 text-xs font-light rounded-none">
                <span className="font-medium">Error:</span> {error}
              </div>
            )}

            <div className="flex items-start gap-3 p-3 bg-neutral-50 border border-neutral-100 text-xs font-light text-neutral-600">
              <Info size={14} className="mt-0.5 shrink-0" />
              <p>
                AI will generate 10 diverse personas and automatically select the {agentCount} most relevant ones. Agents run with resilience checks and evidence capture.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-4 pt-4 border-t border-neutral-100">
              <Link
                href="/dashboard"
                className="px-5 py-2 text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading || !url || !userDescription}
                className="bg-neutral-900 text-white px-6 py-2 hover:bg-neutral-800 transition-all text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-none"
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
          <div className="mb-6">
            <h2 className="text-3xl font-light tracking-tight mb-2">Select Personas</h2>
            <p className="text-neutral-500 font-light text-sm">
              We've pre-selected {agentCount} personas. Adjust your selection if needed.
            </p>
          </div>

          <div className="space-y-6">
            {/* Selection Status */}
            <div className="flex items-center gap-3 p-3 border border-neutral-200 bg-white rounded-none">
              <div className="flex-1">
                <div className="flex items-center gap-4">
                  <span className={`text-xs font-medium ${selectedIndices.length === agentCount ? 'text-green-600' : 'text-neutral-600'}`}>
                    {selectedIndices.length}/{agentCount} personas selected
                  </span>
                  <div className="flex gap-1 flex-1 max-w-xs">
                    {[...Array(agentCount)].map((_, i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 transition-colors rounded-full ${i < selectedIndices.length ? 'bg-neutral-900' : 'bg-neutral-200'
                          }`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-neutral-400 font-light mt-1">
                  {selectedIndices.length < agentCount
                    ? `Select ${agentCount - selectedIndices.length} more persona${agentCount - selectedIndices.length !== 1 ? 's' : ''}`
                    : 'Ready to deploy agents'}
                </p>
              </div>
            </div>

            {/* Personas Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {orderedPersonas.map(({ persona, index }) => {
                const isSelected = selectedIndices.includes(index);
                const isRecommended = recommendedIndices.includes(index);
                const canSelect = isSelected || selectedIndices.length < agentCount;

                return (
                  <div
                    key={index}
                    onClick={() => canSelect && togglePersonaSelection(index)}
                    className={`group cursor-pointer p-4 border transition-all duration-200 relative bg-white rounded-none ${isSelected
                      ? "border-neutral-900 ring-1 ring-neutral-900 bg-neutral-50"
                      : canSelect
                        ? "border-neutral-200 hover:border-neutral-400 hover:shadow-sm"
                        : "border-neutral-100 bg-neutral-50 opacity-50 cursor-not-allowed"
                      }`}
                  >
                    {isRecommended && (
                      <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-neutral-900 text-white text-[9px] font-medium uppercase tracking-wide rounded-none">
                        Recommended
                      </div>
                    )}

                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-medium text-base mb-1">{persona.name}</h3>
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
                            className={`w-1.5 h-1.5 rounded-full ${i < (persona.techSavviness === 'beginner' ? 1 : persona.techSavviness === 'intermediate' ? 2 : 3)
                              ? "bg-neutral-900"
                              : "bg-neutral-200"
                              }`}
                          />
                        ))}
                      </div>
                    </div>

                    <p className="text-xs text-neutral-400 font-mono uppercase tracking-wider mb-2">
                      {persona.occupation}
                    </p>

                    <p className="text-xs text-neutral-600 font-light leading-relaxed mb-3 line-clamp-2">
                      {persona.primaryGoal}
                    </p>

                    <div className="text-xs text-neutral-400">
                      Relevance: {persona.relevanceScore}/10
                    </div>

                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className="absolute top-0 left-0 w-0 h-0 border-t-[24px] border-r-[24px] border-t-neutral-900 border-r-transparent">
                        <Check size={12} className="absolute -top-[20px] left-[1px] text-white" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 border border-red-100 text-xs font-light rounded-none">
                <span className="font-medium">Error:</span> {error}
              </div>
            )}

            <div className="flex items-start gap-3 p-3 bg-neutral-50 border border-neutral-100 text-xs font-light text-neutral-600">
              <Info size={14} className="mt-0.5 shrink-0" />
              <p>
                Each agent will run concurrently with a ~6 minute cap and resilience. Queue system prevents rate limits.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-4 pt-4 border-t border-neutral-100">
              <button
                onClick={() => setStep("describe")}
                className="px-5 py-2 text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={handleStartBatchTest}
                disabled={loading || selectedIndices.length !== agentCount}
                className="bg-neutral-900 text-white px-6 py-2 hover:bg-neutral-800 transition-all text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-none"
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
          <p className="text-neutral-500 font-light text-sm">
            Launching {agentCount} concurrent agent{agentCount !== 1 ? 's' : ''} to test your environment
          </p>
          {selectedSwarm && (
            <p className="text-sm text-neutral-600 font-light mt-2">
              Using swarm: <span className="font-medium">{selectedSwarm.name}</span>
            </p>
          )}
          <p className="text-xs text-neutral-400 font-light mt-2">
            Queue system active • Rate limits prevented
          </p>
        </div>
      )}

      {/* Swarm Selector Modal */}
      <AnimatePresence>
        {showSwarmSelector && (
          <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => {
              if (swarmModalStep === "select") {
                setShowSwarmSelector(false);
                setSwarmModalStep("select");
                setSelectedSwarm(null);
              } else {
                setSwarmModalStep("select");
                setSelectedSwarm(null);
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-white w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-2xl rounded-none flex flex-col relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Swipe Container */}
              <div className="relative overflow-hidden flex-1 flex">
                {/* Step 1: Select Swarm */}
                <AnimatePresence mode="wait">
                  {swarmModalStep === "select" && (
                    <motion.div
                      key="select"
                      initial={{ x: 0, opacity: 1 }}
                      exit={{ x: -100, opacity: 0 }}
                      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                      className="w-full flex flex-col shrink-0"
                    >
                      {/* Header */}
                      <div className="p-6 border-b border-neutral-100 flex items-start justify-between bg-white shrink-0">
                        <div className="flex-1">
                          <h2 className="text-2xl font-light text-neutral-900 mb-1">Select a Swarm</h2>
                          <p className="text-neutral-500 font-light text-sm">
                            Choose a saved swarm to use for this test.
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setShowSwarmSelector(false);
                            setSwarmModalStep("select");
                            setSelectedSwarm(null);
                          }}
                          className="ml-4 p-2 hover:bg-neutral-100 transition-colors"
                        >
                          <X size={20} className="text-neutral-500" />
                        </button>
                      </div>

                      {/* Swarms List */}
                      <div className="flex-1 overflow-y-auto p-6">
                        {isLoadingSwarms ? (
                          <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-neutral-300" />
                          </div>
                        ) : swarms.length === 0 ? (
                          <div className="text-center py-12">
                            <Users size={48} className="mx-auto text-neutral-300 mb-4" />
                            <p className="text-neutral-500 font-light">No swarms available</p>
                            <Link
                              href="/dashboard/swarms/new"
                              className="text-sm text-neutral-900 underline hover:text-neutral-600 mt-2 inline-block"
                            >
                              Create your first swarm
                            </Link>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {swarms.map((swarm) => (
                              <button
                                key={swarm.id}
                                onClick={() => handleSelectSwarm(swarm)}
                                className="p-6 border border-neutral-200 hover:border-neutral-900 transition-all text-left group rounded-none"
                              >
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1">
                                    <h3 className="font-medium text-lg mb-1 group-hover:text-neutral-900 transition-colors">
                                      {swarm.name}
                                    </h3>
                                    {swarm.description && (
                                      <p className="text-xs text-neutral-500 font-light line-clamp-2">
                                        {swarm.description}
                                      </p>
                                    )}
                                  </div>
                                  <div className="ml-4 flex items-center gap-1.5">
                                    <Users size={16} className="text-neutral-400" />
                                    <span className="text-xs text-neutral-500 font-mono">
                                      {swarm.personas.length}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-4 text-xs text-neutral-400 font-mono uppercase tracking-wider">
                                  <span>{swarm.personas.length} Persona{swarm.personas.length !== 1 ? 's' : ''}</span>
                                  <span>•</span>
                                  <span>{new Date(swarm.createdAt).toLocaleDateString()}</span>
                                </div>

                                <div className="mt-4 pt-4 border-t border-neutral-100">
                                  <div className="flex items-center gap-2 text-xs text-neutral-600">
                                    <ArrowRight size={12} />
                                    <span>Select to continue</span>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* Step 2: Confirm Start */}
                  {swarmModalStep === "confirm" && selectedSwarm && (
                    <motion.div
                      key="confirm"
                      initial={{ x: 100, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: 100, opacity: 0 }}
                      transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
                      className="w-full flex flex-col shrink-0"
                    >
                      {/* Header */}
                      <div className="p-6 border-b border-neutral-100 flex items-start justify-between bg-white shrink-0">
                        <div className="flex-1">
                          <h2 className="text-2xl font-light text-neutral-900 mb-1">Start Simulation?</h2>
                          <p className="text-neutral-500 font-light text-sm">
                            Ready to deploy {selectedSwarm.agentCount} agent{selectedSwarm.agentCount !== 1 ? 's' : ''} using <span className="font-medium">{selectedSwarm.name}</span>
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setSwarmModalStep("select");
                            setSelectedSwarm(null);
                          }}
                          className="ml-4 p-2 hover:bg-neutral-100 transition-colors"
                        >
                          <X size={20} className="text-neutral-500" />
                        </button>
                      </div>

                      {/* Confirmation Content */}
                      <div className="flex-1 overflow-y-auto p-6">
                        <div className="max-w-md mx-auto text-center py-12">
                          <div className="mb-6">
                            <div className="w-16 h-16 mx-auto mb-4 border-2 border-neutral-900 flex items-center justify-center">
                              <Users size={32} className="text-neutral-900" />
                            </div>
                            <h3 className="text-xl font-light text-neutral-900 mb-2">{selectedSwarm.name}</h3>
                            {selectedSwarm.description && (
                              <p className="text-sm text-neutral-500 font-light mb-4">
                                {selectedSwarm.description}
                              </p>
                            )}
                          </div>

                          <div className="space-y-3 text-left bg-neutral-50 p-4 border border-neutral-100 mb-6">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-neutral-600 font-light">Personas</span>
                              <span className="text-neutral-900 font-medium">{selectedSwarm.personas.length}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-neutral-600 font-light">Target URL</span>
                              <span className="text-neutral-900 font-medium text-xs truncate max-w-[200px]" title={url}>
                                {url}
                              </span>
                            </div>
                          </div>

                          <p className="text-xs text-neutral-500 font-light mb-6">
                            The simulation will start immediately. Queue system will manage rate limits automatically.
                          </p>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="p-6 border-t border-neutral-100 bg-white shrink-0">
                        <div className="flex items-center justify-between gap-4">
                          <button
                            onClick={() => {
                              setSwarmModalStep("select");
                              setSelectedSwarm(null);
                            }}
                            className="px-6 py-2 text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
                          >
                            ← Back
                          </button>
                          <button
                            onClick={handleConfirmSwarm}
                            disabled={loading}
                            className="bg-neutral-900 text-white px-8 py-2 hover:bg-neutral-800 transition-all text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-none"
                          >
                            {loading ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Starting...</span>
                              </>
                            ) : (
                              <span>Start Simulation</span>
                            )}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
