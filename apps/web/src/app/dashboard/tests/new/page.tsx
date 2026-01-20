"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { generatePersonas, createBatchTest, getSwarms, type GeneratedPersona, type Swarm } from "@/lib/batch-api";
import { GeneratingPersonasLoader } from "@/components/ui/generating-personas-loader";
import { Loader2, Info, Check, Minus, Plus, Users, X, ArrowRight, Bot, Settings, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/contexts/theme-context";

export default function NewTest() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const { theme } = useTheme();
  const isLight = theme === "light";

  // Step 1: URL and Description
  const [url, setUrl] = useState("");
  const [userDescription, setUserDescription] = useState("");
  const [agentCount, setAgentCount] = useState(3);

  // Step 2: Generated Personas
  const [personas, setPersonas] = useState<GeneratedPersona[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [recommendedIndices, setRecommendedIndices] = useState<number[]>([]);

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
  const [useUXAgent, setUseUXAgent] = useState(true); // UXAgent is default
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

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
      <div className={`h-full flex items-center justify-center ${
        isLight ? "bg-neutral-50" : "bg-neutral-950"
      } ${isLight ? "text-neutral-900" : "text-white"}`}>
        <Loader2 className={`animate-spin w-8 h-8 ${
          isLight ? "text-neutral-500" : "text-neutral-400"
        }`} />
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
      router.push(`/dashboard/tests/${result.batchTestRun.id}`);
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
      const originalRecommendedIndices = result.recommendedIndices || [];
      
      // Sort personas so recommended ones come first
      const personasWithOriginalIndex = result.personas.map((p, idx) => ({
        persona: p,
        originalIndex: idx,
        isRecommended: originalRecommendedIndices.includes(idx),
      }));
      
      // Sort: recommended first, then by relevance score (descending)
      personasWithOriginalIndex.sort((a, b) => {
        if (a.isRecommended && !b.isRecommended) return -1;
        if (!a.isRecommended && b.isRecommended) return 1;
        return (b.persona.relevanceScore || 0) - (a.persona.relevanceScore || 0);
      });
      
      // Extract sorted personas and create new recommended indices
      const sortedPersonas = personasWithOriginalIndex.map(item => item.persona);
      const newRecommendedIndices = personasWithOriginalIndex
        .map((item, newIdx) => item.isRecommended ? newIdx : -1)
        .filter(idx => idx !== -1);
      
      setPersonas(sortedPersonas);
      setRecommendedIndices(newRecommendedIndices);

      // Preselect recommended personas, then let the user review before starting.
      let indicesToUse = newRecommendedIndices.slice(0, agentCount);
      if (indicesToUse.length < agentCount && sortedPersonas.length > 0) {
        const availableIndices = sortedPersonas.map((_, i) => i);
        const remaining = availableIndices.filter((i) => !indicesToUse.includes(i));
        indicesToUse = [...indicesToUse, ...remaining.slice(0, agentCount - indicesToUse.length)];
      }

      setSelectedIndices(indicesToUse);
      setStep("select");
    } catch (err) {
      console.error("Error generating/starting:", err);
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
      router.push(`/dashboard/tests/${result.batchTestRun.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start batch test");
      setStep("select");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-8 max-w-7xl mx-auto w-full overflow-hidden">
      {/* Step 1: Describe */}
      {step === "describe" && (
        <>
          {/* Breadcrumb Header */}
          <div className="mb-8 flex-shrink-0">
            <nav className="flex items-center gap-2 text-sm mb-6">
              <Link
                href="/dashboard"
                className={`transition-colors font-light ${
                  isLight
                    ? "text-neutral-600 hover:text-neutral-900"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Playground
              </Link>
              <span className={isLight ? "text-neutral-400" : "text-neutral-600"}>/</span>
              <span className={isLight ? "text-neutral-900 font-medium" : "text-white font-medium"}>New Simulation</span>
            </nav>
          </div>

          <form onSubmit={handleGeneratePersonas} className="flex-1 flex flex-col min-h-0">
            {/* Top Row: Target Environment & Concurrency side by side */}
            <div className="grid grid-cols-3 gap-6 mb-6 items-stretch min-h-0" style={{ height: '55vh' }}>
              {/* Left Module - Wider (2 columns) - Target Environment & Audience */}
              <div className="col-span-2 flex flex-col">
                <div className={`border rounded-xl p-6 flex flex-col h-full ${
                  isLight
                    ? "bg-white border-neutral-200"
                    : "bg-[#1E1E1E] border-white/10"
                }`}>
                  <div className="space-y-6 flex-1 flex flex-col">
                    {/* Target URL */}
                    <section className="flex-shrink-0">
                      <div className="flex items-center gap-2 mb-3">
                        <label className={`text-sm font-medium ${
                          isLight ? "text-neutral-900" : "text-white"
                        }`}>Target Environment</label>
                      </div>
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://example.com"
                        className={`w-full border px-4 py-3 focus:ring-1 outline-none transition-all placeholder:font-light text-sm rounded-lg ${
                          isLight
                            ? "bg-neutral-50 border-neutral-300 text-neutral-900 focus:border-neutral-500 focus:ring-neutral-500/20 placeholder:text-neutral-400"
                            : "bg-[#252525] border-white/10 text-white focus:border-white/30 focus:ring-white/10 placeholder:text-neutral-600"
                        }`}
                        required
                      />
                      <p className={`text-xs font-light mt-2 ${
                        isLight ? "text-neutral-500" : "text-neutral-500"
                      }`}>
                        The agents will begin their sessions at this URL.
                      </p>
                    </section>

                    {/* Audience Description */}
                    <section className="flex-1 flex flex-col min-h-0">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <label className={`text-sm font-medium ${
                            isLight ? "text-neutral-900" : "text-white"
                          }`}>Target Audience</label>
                        </div>
                        {/* Use Saved Swarms Box */}
                        {url && (
                          <button
                            type="button"
                            onClick={() => {
                              setSwarmModalStep("select");
                              setShowSwarmSelector(true);
                            }}
                            className={`px-3 py-1.5 border transition-all text-xs font-medium flex items-center gap-2 rounded-lg ${
                              isLight
                                ? "border-neutral-300 hover:border-neutral-500 bg-white hover:bg-neutral-100 text-neutral-900"
                                : "border-white/10 hover:border-white/30 bg-[#252525] hover:bg-white/5 text-white"
                            }`}
                          >
                            <Users size={14} />
                            <span>Use Swarms</span>
                          </button>
                        )}
                      </div>
                      <textarea
                        value={userDescription}
                        onChange={(e) => setUserDescription(e.target.value)}
                        placeholder="Example: Busy professionals aged 25-45 who need quick meal planning..."
                        className={`w-full border px-4 py-3 focus:ring-1 outline-none transition-all placeholder:font-light flex-1 resize-none text-sm rounded-lg ${
                          isLight
                            ? "bg-neutral-50 border-neutral-300 text-neutral-900 focus:border-neutral-500 focus:ring-neutral-500/20 placeholder:text-neutral-400"
                            : "bg-[#252525] border-white/10 text-white focus:border-white/30 focus:ring-white/10 placeholder:text-neutral-600"
                        }`}
                        required
                        minLength={10}
                        maxLength={2000}
                      />
                      <p className={`text-xs font-light mt-2 ${
                        isLight ? "text-neutral-500" : "text-neutral-500"
                      }`}>
                        Be specific: demographics, goals, tech comfort, pain points.
                      </p>
                    </section>
                  </div>
                </div>
              </div>

              {/* Right Module - Narrower (1 column) - Concurrency */}
              <div className="col-span-1 flex flex-col">
                <div className={`border rounded-xl p-6 flex flex-col h-full justify-center ${
                  isLight
                    ? "bg-white border-neutral-200"
                    : "bg-[#1E1E1E] border-white/10"
                }`}>
                  <div className="flex flex-col items-center justify-center space-y-6">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-2">
                      <h2 className={`text-base font-medium ${
                        isLight ? "text-neutral-900" : "text-white"
                      }`}>Concurrency</h2>
                    </div>

                    {/* Large Number Display */}
                    <div className="flex flex-col items-center">
                      <div className={`text-6xl font-light mb-2 ${
                        isLight ? "text-neutral-900" : "text-white"
                      }`}>{agentCount}</div>
                      <div className={`text-xs font-light uppercase tracking-wider mb-6 ${
                        isLight ? "text-neutral-500" : "text-neutral-500"
                      }`}>
                        {agentCount === 1 ? 'Agent' : 'Agents'}
                      </div>
                    </div>

                    {/* Visual Indicator - Larger */}
                    <div className="w-full space-y-2">
                      <div className={`flex gap-2 h-2 max-w-full rounded-full overflow-hidden ${
                        isLight ? "bg-neutral-200" : "bg-[#252525]"
                      }`}>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div
                            key={i}
                            className={`flex-1 transition-colors rounded-full ${
                              i <= agentCount
                                ? isLight ? 'bg-neutral-900' : 'bg-white'
                                : 'bg-transparent'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Control Buttons */}
                    <div className="flex items-center gap-4 w-full justify-center">
                      <button
                        type="button"
                        onClick={() => setAgentCount(Math.max(1, agentCount - 1))}
                        className={`w-12 h-12 border transition-colors flex items-center justify-center rounded-lg ${
                          isLight
                            ? "border-neutral-300 hover:border-neutral-500 hover:bg-neutral-100 text-neutral-900"
                            : "border-white/10 hover:border-white/30 hover:bg-white/5 text-white"
                        }`}
                      >
                        <Minus size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setAgentCount(Math.min(5, agentCount + 1))}
                        className={`w-12 h-12 border transition-colors flex items-center justify-center rounded-lg ${
                          isLight
                            ? "border-neutral-300 hover:border-neutral-500 hover:bg-neutral-100 text-neutral-900"
                            : "border-white/10 hover:border-white/30 hover:bg-white/5 text-white"
                        }`}
                      >
                        <Plus size={18} />
                      </button>
                    </div>

                    {/* Description */}
                    <div className="text-center pt-2">
                      <p className={`text-xs font-light leading-relaxed ${
                        isLight ? "text-neutral-500" : "text-neutral-500"
                      }`}>
                        {agentCount === 1 && "Single agent — Slowest but zero rate limit risk"}
                        {agentCount === 2 && "2 agents — Safe with minimal rate limit risk"}
                        {agentCount === 3 && "3 agents — Balanced speed and safety (recommended)"}
                        {agentCount === 4 && "4 agents — Faster but slight rate limit risk"}
                        {agentCount === 5 && "5 agents — Fastest but higher rate limit risk"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Row: Advanced Settings - Full width */}
            <div className="flex-shrink-0">
              <div className={`border rounded-xl p-6 ${
                isLight
                  ? "bg-white border-neutral-200"
                  : "bg-[#1E1E1E] border-white/10"
              }`}>
                <button
                  type="button"
                  onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                  className={`flex items-center gap-2 transition-colors w-full ${
                    isLight
                      ? "text-neutral-600 hover:text-neutral-900"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  <Settings size={16} />
                  <span className="text-sm font-medium">Advanced Settings</span>
                  {showAdvancedSettings ? <ChevronUp size={16} className="ml-auto" /> : <ChevronDown size={16} className="ml-auto" />}
                </button>

                {showAdvancedSettings && (
                  <div className={`space-y-4 pt-4 mt-4 border-t ${
                    isLight ? "border-neutral-200" : "border-white/10"
                  }`}>
                    {/* Legacy Mode Toggle */}
                    <div className="flex items-center justify-between">
                      <div>
                        <label className={`text-sm font-medium ${
                          isLight ? "text-neutral-900" : "text-white"
                        }`}>Use Legacy Engine</label>
                        <p className={`text-xs font-light mt-1 ${
                          isLight ? "text-neutral-500" : "text-neutral-500"
                        }`}>
                          Original simpler agent (disable UXAgent)
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setUseUXAgent(!useUXAgent)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          !useUXAgent
                            ? isLight ? 'bg-neutral-900' : 'bg-white'
                            : isLight ? 'bg-neutral-200 border border-neutral-300' : 'bg-[#252525] border border-white/10'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
                            !useUXAgent
                              ? isLight ? 'translate-x-6 bg-white' : 'translate-x-6 bg-neutral-900'
                              : isLight ? 'translate-x-1 bg-white' : 'translate-x-1 bg-white'
                          }`}
                        />
                      </button>
                    </div>

                    {!useUXAgent && (
                      <div className={`p-3 border text-xs font-light rounded-lg ${
                        isLight
                          ? "bg-amber-50 border-amber-200 text-amber-700"
                          : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                      }`}>
                        <span className="font-medium">Legacy mode:</span> Using simpler agent without advanced observation features. UXAgent is recommended for better insights.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Actions - Fixed at bottom */}
            <div className="mt-6 flex-shrink-0 space-y-4">
              {error && (
                <div className={`p-4 border text-sm font-light rounded-lg ${
                  isLight
                    ? "bg-red-50 text-red-700 border-red-200"
                    : "bg-red-500/10 text-red-400 border-red-500/20"
                }`}>
                  <span className="font-medium">Error:</span> {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-4">
                <Link
                  href="/dashboard"
                  className={`px-5 py-2.5 text-sm font-medium transition-colors ${
                    isLight
                      ? "text-neutral-600 hover:text-neutral-900"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loading || !url || !userDescription}
                  className={`px-6 py-2.5 transition-all text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg ${
                    isLight
                      ? "bg-neutral-900 text-white hover:bg-neutral-800"
                      : "bg-white text-neutral-900 hover:bg-neutral-200"
                  }`}
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
          {/* Breadcrumb Header */}
          <div className="mb-8 flex-shrink-0">
            <nav className="flex items-center gap-2 text-sm mb-6">
              <Link
                href="/dashboard"
                className={`transition-colors font-light ${
                  isLight
                    ? "text-neutral-600 hover:text-neutral-900"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Playground
              </Link>
              <span className={isLight ? "text-neutral-400" : "text-neutral-600"}>/</span>
              <button
                onClick={() => setStep("describe")}
                className={`transition-colors font-light ${
                  isLight
                    ? "text-neutral-600 hover:text-neutral-900"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                New Simulation
              </button>
              <span className={isLight ? "text-neutral-400" : "text-neutral-600"}>/</span>
              <span className={isLight ? "text-neutral-900 font-medium" : "text-white font-medium"}>Select Personas</span>
            </nav>
            <h1 className={`text-3xl font-light tracking-tight mb-2 ${
              isLight ? "text-neutral-900" : "text-white"
            }`}>Select Personas</h1>
            <p className={`font-light ${
              isLight ? "text-neutral-500" : "text-neutral-400"
            }`}>We've pre-selected {agentCount} personas. Adjust your selection if needed.</p>
          </div>

          <div className="space-y-6">
            {/* Selection Status */}
            <div className={`flex items-center gap-3 p-3 border rounded-lg ${
              isLight
                ? "border-neutral-200 bg-white"
                : "border-white/10 bg-[#1E1E1E]"
            }`}>
              <div className="flex-1">
                <div className="flex items-center gap-4">
                  <span className={`text-xs font-medium ${
                    selectedIndices.length === agentCount
                      ? isLight ? 'text-blue-600' : 'text-blue-400'
                      : isLight ? 'text-neutral-600' : 'text-neutral-400'
                  }`}>
                    {selectedIndices.length}/{agentCount} personas selected
                  </span>
                  <div className="flex gap-1 flex-1 max-w-xs">
                    {[...Array(agentCount)].map((_, i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 transition-colors rounded-full ${
                          i < selectedIndices.length
                            ? isLight ? 'bg-neutral-900' : 'bg-white'
                            : isLight ? 'bg-neutral-200' : 'bg-[#252525]'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <p className={`text-xs font-light mt-1 ${
                  isLight ? "text-neutral-500" : "text-neutral-500"
                }`}>
                  {selectedIndices.length < agentCount
                    ? `Select ${agentCount - selectedIndices.length} more persona${agentCount - selectedIndices.length !== 1 ? 's' : ''}`
                    : 'Ready to deploy agents'}
                </p>
              </div>
            </div>

            {/* Personas Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {personas.map((persona, index) => {
                const isSelected = selectedIndices.includes(index);
                const isRecommended = recommendedIndices.includes(index);
                const canSelect = isSelected || selectedIndices.length < agentCount;

                return (
                  <div
                    key={index}
                    onClick={() => canSelect && togglePersonaSelection(index)}
                    className={`group cursor-pointer p-4 border transition-all duration-200 relative rounded-xl ${
                      isSelected
                        ? isLight
                          ? "border-neutral-900 ring-1 ring-neutral-900 bg-white"
                          : "border-white ring-1 ring-white bg-[#252525]"
                        : canSelect
                          ? isLight
                            ? "border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50 bg-white"
                            : "border-white/5 hover:border-white/20 hover:bg-white/5 bg-[#252525]"
                          : isLight
                            ? "border-neutral-200 bg-neutral-50 opacity-50 cursor-not-allowed"
                            : "border-white/5 bg-[#1E1E1E] opacity-50 cursor-not-allowed"
                    }`}
                  >
                    {isRecommended && (
                      <div className={`absolute top-2 right-2 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide rounded-md ${
                        isLight
                          ? "bg-neutral-900 text-white"
                          : "bg-white text-neutral-900"
                      }`}>
                        Recommended
                      </div>
                    )}

                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className={`font-medium text-base mb-1 ${
                          isLight ? "text-neutral-900" : "text-white"
                        }`}>{persona.name}</h3>
                        <div className={`text-xs font-light flex items-center gap-2 ${
                          isLight ? "text-neutral-600" : "text-neutral-400"
                        }`}>
                          <span>{persona.age} yrs</span>
                          <span className={`w-1 h-1 rounded-full ${
                            isLight ? "bg-neutral-400" : "bg-neutral-600"
                          }`}></span>
                          <span>{persona.country}</span>
                        </div>
                      </div>

                      <div className="flex gap-0.5">
                        {[...Array(3)].map((_, i) => (
                          <div
                            key={i}
                            className={`w-1.5 h-1.5 rounded-full ${
                              i < (persona.techSavviness === 'beginner' ? 1 : persona.techSavviness === 'intermediate' ? 2 : 3)
                                ? isLight ? "bg-neutral-900" : "bg-white"
                                : isLight ? "bg-neutral-300" : "bg-[#404040]"
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <p className={`text-xs font-mono uppercase tracking-wider mb-2 ${
                      isLight ? "text-neutral-500" : "text-neutral-500"
                    }`}>
                      {persona.occupation}
                    </p>

                    <p className={`text-xs font-light leading-relaxed mb-3 line-clamp-2 ${
                      isLight ? "text-neutral-600" : "text-neutral-400"
                    }`}>
                      {persona.primaryGoal}
                    </p>

                    <div className={`text-xs ${
                      isLight ? "text-neutral-500" : "text-neutral-500"
                    }`}>
                      Relevance: {persona.relevanceScore}/10
                    </div>

                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className={`absolute top-0 left-0 w-0 h-0 border-t-[24px] border-r-[24px] border-r-transparent rounded-tl-xl ${
                        isLight
                          ? "border-t-neutral-900"
                          : "border-t-white"
                      }`}>
                        <Check size={12} className={`absolute -top-[22px] left-[2px] ${
                          isLight ? "text-white" : "text-neutral-900"
                        }`} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {error && (
              <div className={`p-3 border text-xs font-light rounded-lg ${
                isLight
                  ? "bg-red-50 text-red-700 border-red-200"
                  : "bg-red-500/10 text-red-400 border-red-500/20"
              }`}>
                <span className="font-medium">Error:</span> {error}
              </div>
            )}

            <div className={`flex items-start gap-3 p-3 border text-xs font-light rounded-lg ${
              isLight
                ? "bg-blue-50 border-blue-200 text-blue-700"
                : "bg-blue-500/10 border-blue-500/20 text-blue-400"
            }`}>
              <Info size={14} className="mt-0.5 shrink-0" />
              <p>
                Each agent will run concurrently with a ~6 minute cap and resilience. Queue system prevents rate limits.
              </p>
            </div>

            {/* Actions */}
            <div className={`flex items-center justify-between gap-4 pt-4 border-t ${
              isLight ? "border-neutral-200" : "border-white/10"
            }`}>
              <button
                onClick={() => setStep("describe")}
                className={`px-5 py-2 text-sm font-medium transition-colors ${
                  isLight
                    ? "text-neutral-600 hover:text-neutral-900"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                ← Back
              </button>

              <button
                onClick={handleStartBatchTest}
                disabled={loading || selectedIndices.length !== agentCount}
                className={`px-6 py-2 transition-all text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg ${
                  isLight
                    ? "bg-neutral-900 text-white hover:bg-neutral-800"
                    : "bg-white text-neutral-900 hover:bg-neutral-200"
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deploying...</span>
                  </>
                ) : selectedIndices.length !== agentCount ? (
                  <span>Select {agentCount - selectedIndices.length} more</span>
                ) : (
                  <span>Start Simulation</span>
                )}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Step 3: Starting */}
      {step === "starting" && (
        <>
          {/* Breadcrumb Header */}
          <div className="mb-8 flex-shrink-0">
            <nav className="flex items-center gap-2 text-sm mb-6">
              <Link
                href="/dashboard"
                className={`transition-colors font-light ${
                  isLight
                    ? "text-neutral-600 hover:text-neutral-900"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Playground
              </Link>
              <span className={isLight ? "text-neutral-400" : "text-neutral-600"}>/</span>
              <Link
                href="/dashboard/tests/new"
                className={`transition-colors font-light ${
                  isLight
                    ? "text-neutral-600 hover:text-neutral-900"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                New Simulation
              </Link>
              <span className={isLight ? "text-neutral-400" : "text-neutral-600"}>/</span>
              <span className={isLight ? "text-neutral-900 font-medium" : "text-white font-medium"}>Deploying Agents</span>
            </nav>
            <h1 className={`text-3xl font-light tracking-tight mb-2 ${
              isLight ? "text-neutral-900" : "text-white"
            }`}>Deploying Agents</h1>
            <p className={`font-light ${
              isLight ? "text-neutral-500" : "text-neutral-400"
            }`}>Launching {agentCount} concurrent agent{agentCount !== 1 ? 's' : ''} to test your environment.</p>
          </div>
          <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
            <Loader2 className={`w-16 h-16 animate-spin mb-6 ${
              isLight ? "text-neutral-500" : "text-neutral-500"
            }`} />
            {selectedSwarm && (
              <p className={`text-sm font-light mt-2 ${
                isLight ? "text-neutral-600" : "text-neutral-500"
              }`}>
                Using swarm: <span className={`font-medium ${
                  isLight ? "text-neutral-900" : "text-white"
                }`}>{selectedSwarm.name}</span>
              </p>
            )}
            <p className={`text-xs font-light mt-2 ${
              isLight ? "text-neutral-500" : "text-neutral-600"
            }`}>
              Queue system active • Rate limits prevented
            </p>
          </div>
        </>
      )}

      {/* Swarm Selector Modal */}
      <AnimatePresence>
        {showSwarmSelector && (
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
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
              className={`w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-2xl rounded-xl flex flex-col relative border ${
                isLight
                  ? "bg-white border-neutral-200"
                  : "bg-[#1E1E1E] border-white/10"
              }`}
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
                      <div className={`p-6 border-b flex items-start justify-between shrink-0 ${
                        isLight
                          ? "border-neutral-200 bg-white"
                          : "border-white/10 bg-[#1E1E1E]"
                      }`}>
                        <div className="flex-1">
                          <h2 className={`text-2xl font-light mb-1 ${
                            isLight ? "text-neutral-900" : "text-white"
                          }`}>Select a Swarm</h2>
                          <p className={`font-light text-sm ${
                            isLight ? "text-neutral-600" : "text-neutral-400"
                          }`}>
                            Choose a saved swarm to use for this test.
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setShowSwarmSelector(false);
                            setSwarmModalStep("select");
                            setSelectedSwarm(null);
                          }}
                          className={`ml-4 p-2 transition-colors rounded-lg ${
                            isLight
                              ? "hover:bg-neutral-100"
                              : "hover:bg-white/10"
                          }`}
                        >
                          <X size={20} className={isLight ? "text-neutral-600" : "text-neutral-400"} />
                        </button>
                      </div>

                      {/* Swarms List */}
                      <div className="flex-1 overflow-y-auto p-6">
                        {isLoadingSwarms ? (
                          <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-neutral-500" />
                          </div>
                        ) : swarms.length === 0 ? (
                          <div className="text-center py-12">
                            <Users size={48} className={`mx-auto mb-4 ${
                              isLight ? "text-neutral-400" : "text-neutral-600"
                            }`} />
                            <p className={`font-light ${
                              isLight ? "text-neutral-600" : "text-neutral-500"
                            }`}>No swarms available</p>
                            <Link
                              href="/dashboard/swarms/new"
                              className={`text-sm underline mt-2 inline-block ${
                                isLight
                                  ? "text-neutral-900 hover:text-neutral-700"
                                  : "text-white hover:text-neutral-300"
                              }`}
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
                                className={`p-6 border transition-all text-left group rounded-xl ${
                                  isLight
                                    ? "border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50 bg-white"
                                    : "border-white/10 hover:border-white/30 hover:bg-white/5 bg-[#252525]"
                                }`}
                              >
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1">
                                    <h3 className={`font-medium text-lg mb-1 transition-colors ${
                                      isLight
                                        ? "text-neutral-900 group-hover:text-neutral-900"
                                        : "text-white group-hover:text-white"
                                    }`}>
                                      {swarm.name}
                                    </h3>
                                    {swarm.description && (
                                      <p className={`text-xs font-light line-clamp-2 ${
                                        isLight ? "text-neutral-600" : "text-neutral-400"
                                      }`}>
                                        {swarm.description}
                                      </p>
                                    )}
                                  </div>
                                  <div className="ml-4 flex items-center gap-1.5">
                                    <Users size={16} className={isLight ? "text-neutral-500" : "text-neutral-500"} />
                                    <span className={`text-xs font-mono ${
                                      isLight ? "text-neutral-500" : "text-neutral-500"
                                    }`}>
                                      {swarm.personas.length}
                                    </span>
                                  </div>
                                </div>

                                <div className={`flex items-center gap-4 text-xs font-mono uppercase tracking-wider ${
                                  isLight ? "text-neutral-500" : "text-neutral-500"
                                }`}>
                                  <span>{swarm.personas.length} Persona{swarm.personas.length !== 1 ? 's' : ''}</span>
                                  <span>•</span>
                                  <span>{new Date(swarm.createdAt).toLocaleDateString()}</span>
                                </div>

                                <div className={`mt-4 pt-4 border-t ${
                                  isLight ? "border-neutral-200" : "border-white/10"
                                }`}>
                                  <div className={`flex items-center gap-2 text-xs transition-colors ${
                                    isLight
                                      ? "text-neutral-600 group-hover:text-neutral-900"
                                      : "text-neutral-400 group-hover:text-white"
                                  }`}>
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
                      <div className={`p-6 border-b flex items-start justify-between shrink-0 ${
                        isLight
                          ? "border-neutral-200 bg-white"
                          : "border-white/10 bg-[#1E1E1E]"
                      }`}>
                        <div className="flex-1">
                          <h2 className={`text-2xl font-light mb-1 ${
                            isLight ? "text-neutral-900" : "text-white"
                          }`}>Start Simulation?</h2>
                          <p className={`font-light text-sm ${
                            isLight ? "text-neutral-600" : "text-neutral-400"
                          }`}>
                            Ready to deploy {selectedSwarm.agentCount} agent{selectedSwarm.agentCount !== 1 ? 's' : ''} using <span className={`font-medium ${
                              isLight ? "text-neutral-900" : "text-white"
                            }`}>{selectedSwarm.name}</span>
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setSwarmModalStep("select");
                            setSelectedSwarm(null);
                          }}
                          className={`ml-4 p-2 transition-colors rounded-lg ${
                            isLight
                              ? "hover:bg-neutral-100"
                              : "hover:bg-white/10"
                          }`}
                        >
                          <X size={20} className={isLight ? "text-neutral-600" : "text-neutral-400"} />
                        </button>
                      </div>

                      {/* Confirmation Content */}
                      <div className="flex-1 overflow-y-auto p-6">
                        <div className="max-w-md mx-auto text-center py-12">
                          <div className="mb-6">
                            <div className={`w-16 h-16 mx-auto mb-4 border-2 flex items-center justify-center rounded-full ${
                              isLight
                                ? "border-neutral-900"
                                : "border-white"
                            }`}>
                              <Users size={32} className={isLight ? "text-neutral-900" : "text-white"} />
                            </div>
                            <h3 className={`text-xl font-light mb-2 ${
                              isLight ? "text-neutral-900" : "text-white"
                            }`}>{selectedSwarm.name}</h3>
                            {selectedSwarm.description && (
                              <p className={`text-sm font-light mb-4 ${
                                isLight ? "text-neutral-600" : "text-neutral-400"
                              }`}>
                                {selectedSwarm.description}
                              </p>
                            )}
                          </div>

                          <div className={`space-y-3 text-left p-4 border mb-6 rounded-xl ${
                            isLight
                              ? "bg-neutral-50 border-neutral-200"
                              : "bg-[#252525] border-white/10"
                          }`}>
                            <div className="flex items-center justify-between text-sm">
                              <span className={`font-light ${
                                isLight ? "text-neutral-600" : "text-neutral-400"
                              }`}>Personas</span>
                              <span className={`font-medium ${
                                isLight ? "text-neutral-900" : "text-white"
                              }`}>{selectedSwarm.personas.length}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className={`font-light ${
                                isLight ? "text-neutral-600" : "text-neutral-400"
                              }`}>Target URL</span>
                              <span className={`font-medium text-xs truncate max-w-[200px] ${
                                isLight ? "text-neutral-900" : "text-white"
                              }`} title={url}>
                                {url}
                              </span>
                            </div>
                            <div className={`flex items-center justify-between text-sm pt-2 border-t ${
                              isLight ? "border-neutral-200" : "border-white/10"
                            }`}>
                              <div className="flex items-center gap-2">
                                <Bot size={14} className={useUXAgent ? (isLight ? "text-emerald-600" : "text-emerald-400") : (isLight ? "text-neutral-500" : "text-neutral-500")} />
                                <span className={`font-light ${
                                  isLight ? "text-neutral-600" : "text-neutral-400"
                                }`}>{useUXAgent ? "UXAgent Engine" : "Legacy Engine"}</span>
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                useUXAgent
                                  ? isLight
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-emerald-500/10 text-emerald-400"
                                  : isLight
                                    ? "bg-neutral-200 text-neutral-600"
                                    : "bg-neutral-800 text-neutral-400"
                              }`}>
                                {useUXAgent ? "Active" : "Legacy"}
                              </span>
                            </div>
                          </div>

                          {!useUXAgent && (
                            <div className={`p-3 border text-xs font-light mb-6 text-left rounded-lg ${
                              isLight
                                ? "bg-amber-50 border-amber-200 text-amber-700"
                                : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                            }`}>
                              <span className="font-medium">Legacy mode:</span> Using simpler agent. Enable UXAgent in advanced settings for better insights.
                            </div>
                          )}

                          <p className={`text-xs font-light mb-6 text-left ${
                            isLight ? "text-neutral-500" : "text-neutral-500"
                          }`}>
                            The simulation will start immediately. Queue system will manage rate limits automatically.
                          </p>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className={`p-6 border-t shrink-0 ${
                        isLight
                          ? "border-neutral-200 bg-white"
                          : "border-white/10 bg-[#1E1E1E]"
                      }`}>
                        <div className="flex items-center justify-between gap-4">
                          <button
                            onClick={() => {
                              setSwarmModalStep("select");
                              setSelectedSwarm(null);
                            }}
                            className={`px-6 py-2 text-sm font-medium transition-colors ${
                              isLight
                                ? "text-neutral-600 hover:text-neutral-900"
                                : "text-neutral-400 hover:text-white"
                            }`}
                          >
                            ← Back
                          </button>
                          <button
                            onClick={handleConfirmSwarm}
                            disabled={loading}
                            className={`px-8 py-2 transition-all text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg ${
                              isLight
                                ? "bg-neutral-900 text-white hover:bg-neutral-800"
                                : "bg-white text-neutral-900 hover:bg-neutral-200"
                            }`}
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