"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { generatePersonas, createSwarm, type GeneratedPersona } from "@/lib/batch-api";
import { GeneratingPersonasLoader } from "@/components/ui/generating-personas-loader";
import { 
  Plus, 
  Loader2, 
  Minus, 
  Check,
  Info
} from "lucide-react";
import { useTheme } from "@/contexts/theme-context";

export default function CreateSwarmPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const isLight = theme === "light";
  
  // Create Flow State
  const [step, setStep] = useState<"details" | "generating" | "select">("details");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [swarmName, setSwarmName] = useState("");
  const [swarmDescription, setSwarmDescription] = useState("");
  const [url, setUrl] = useState(""); // Used for generation context
  const [userDescription, setUserDescription] = useState("");
  const [agentCount, setAgentCount] = useState(3);
  
  // Generated Data
  const [generatedPersonas, setGeneratedPersonas] = useState<GeneratedPersona[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [recommendedIndices, setRecommendedIndices] = useState<number[]>([]);

  const handleGeneratePersonas = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setStep("generating");

    try {
      const result = await generatePersonas(url, userDescription, agentCount);
      
      // Sort personas so recommended ones come first
      const originalRecommendedIndices = result.recommendedIndices || [];
      
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
      
      setGeneratedPersonas(sortedPersonas);
      setRecommendedIndices(newRecommendedIndices);

      // Preselect recommended personas
      let indicesToUse = newRecommendedIndices.slice(0, agentCount);
      if (indicesToUse.length < agentCount && sortedPersonas.length > 0) {
        const availableIndices = sortedPersonas.map((_, i) => i);
        const remaining = availableIndices.filter((i) => !indicesToUse.includes(i));
        indicesToUse = [...indicesToUse, ...remaining.slice(0, agentCount - indicesToUse.length)];
      }

      setSelectedIndices(indicesToUse);
      setStep("select");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate personas");
      setStep("details");
    }
  };

  const togglePersonaSelection = (index: number) => {
    if (selectedIndices.includes(index)) {
      setSelectedIndices(selectedIndices.filter((i) => i !== index));
    } else if (selectedIndices.length < agentCount) {
      setSelectedIndices([...selectedIndices, index]);
    }
  };

  const handleSaveSwarm = async () => {
    setLoading(true);
    setError("");

    try {
      const selectedPersonas = generatedPersonas.filter((_, i) => selectedIndices.includes(i));
      await createSwarm(
        swarmName,
        swarmDescription || userDescription.slice(0, 100) + "...",
        selectedPersonas,
        selectedIndices.length
      );
      
      router.push("/dashboard/swarms");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create swarm");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-8 max-w-7xl mx-auto w-full overflow-hidden">
      {/* Step 1: Details */}
      {step === "details" && (
        <>
          {/* Breadcrumb Header */}
          <div className="mb-8 flex-shrink-0">
            <nav className="flex items-center gap-2 text-sm mb-6">
              <Link
                href="/dashboard/swarms"
                className={`transition-colors font-light ${
                  isLight
                    ? "text-neutral-600 hover:text-neutral-900"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Swarms
              </Link>
              <span className={isLight ? "text-neutral-400" : "text-neutral-600"}>/</span>
              <span className={isLight ? "text-neutral-900 font-medium" : "text-white font-medium"}>Create Swarm</span>
            </nav>
          </div>

          <form onSubmit={handleGeneratePersonas} className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Top Row: Swarm Details & Concurrency side by side */}
            <div className="grid grid-cols-3 gap-6 mb-6 items-stretch flex-shrink-0" style={{ maxHeight: 'calc(100% - 100px)' }}>
              {/* Left Module - Wider (2 columns) - Swarm Details & Audience */}
              <div className="col-span-2 flex flex-col">
                <div className={`border rounded-xl p-6 flex flex-col h-full ${
                  isLight
                    ? "bg-white border-neutral-200"
                    : "bg-[#1E1E1E] border-white/10"
                }`}>
                  <div className="space-y-6 flex-1 flex flex-col">
                    {/* Swarm Name */}
                    <section className="flex-shrink-0">
                      <div className="flex items-center gap-2 mb-3">
                        <label className={`text-sm font-medium ${
                          isLight ? "text-neutral-900" : "text-white"
                        }`}>Swarm Name</label>
                      </div>
                      <input
                        type="text"
                        value={swarmName}
                        onChange={(e) => setSwarmName(e.target.value)}
                        placeholder="e.g., E-commerce Shoppers"
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
                        A descriptive name for this persona group.
                      </p>
                    </section>

                    {/* Description */}
                    <section className="flex-shrink-0">
                      <div className="flex items-center gap-2 mb-3">
                        <label className={`text-sm font-medium ${
                          isLight ? "text-neutral-900" : "text-white"
                        }`}>Description <span className={`font-light ${
                          isLight ? "text-neutral-500" : "text-neutral-500"
                        }`}>(Optional)</span></label>
                      </div>
                      <textarea
                        value={swarmDescription}
                        onChange={(e) => setSwarmDescription(e.target.value)}
                        placeholder="Brief description for internal reference..."
                        className={`w-full border px-4 py-3 focus:ring-1 outline-none transition-all placeholder:font-light text-sm rounded-lg resize-none min-h-[80px] ${
                          isLight
                            ? "bg-neutral-50 border-neutral-300 text-neutral-900 focus:border-neutral-500 focus:ring-neutral-500/20 placeholder:text-neutral-400"
                            : "bg-[#252525] border-white/10 text-white focus:border-white/30 focus:ring-white/10 placeholder:text-neutral-600"
                        }`}
                        rows={3}
                      />
                    </section>

                    {/* Reference URL */}
                    <section className="flex-shrink-0">
                      <div className="flex items-center gap-2 mb-3">
                        <label className={`text-sm font-medium ${
                          isLight ? "text-neutral-900" : "text-white"
                        }`}>Reference URL <span className={`font-light ${
                          isLight ? "text-neutral-500" : "text-neutral-500"
                        }`}>(Optional)</span></label>
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
                      />
                      <p className={`text-xs font-light mt-2 ${
                        isLight ? "text-neutral-500" : "text-neutral-500"
                      }`}>
                        Providing a URL helps the AI understand the context better.
                      </p>
                    </section>

                    {/* Audience Description */}
                    <section className="flex-1 flex flex-col min-h-0">
                      <div className="flex items-center gap-2 mb-3">
                        <label className={`text-sm font-medium ${
                          isLight ? "text-neutral-900" : "text-white"
                        }`}>Target Audience</label>
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

              {/* Right Module - Narrower (1 column) - Swarm Size */}
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
                      }`}>Swarm Size</h2>
                    </div>

                    {/* Large Number Display */}
                    <div className="flex flex-col items-center">
                      <div className={`text-6xl font-light mb-2 ${
                        isLight ? "text-neutral-900" : "text-white"
                      }`}>{agentCount}</div>
                      <div className={`text-xs font-light uppercase tracking-wider mb-6 ${
                        isLight ? "text-neutral-500" : "text-neutral-500"
                      }`}>
                        {agentCount === 1 ? 'Persona' : 'Personas'}
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
                        Max 5 personas per swarm
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className={`p-3 border text-xs font-light rounded-lg mb-4 flex-shrink-0 ${
                isLight
                  ? "bg-red-50 text-red-700 border-red-200"
                  : "bg-red-500/10 text-red-400 border-red-500/20"
              }`}>
                <span className="font-medium">Error:</span> {error}
              </div>
            )}

            {/* Bottom Actions */}
            <div className={`flex items-center justify-between gap-4 pt-4 border-t flex-shrink-0 ${
              isLight ? "border-neutral-200" : "border-white/10"
            }`}>
              <Link
                href="/dashboard/swarms"
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
                disabled={loading || !userDescription || !swarmName}
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
          </form>
        </>
      )}

      {/* Step 2: Generating */}
      {step === "generating" && <GeneratingPersonasLoader />}

      {/* Step 3: Select */}
      {step === "select" && (
        <>
          {/* Breadcrumb Header */}
          <div className="mb-8 flex-shrink-0">
            <nav className="flex items-center gap-2 text-sm mb-6">
              <Link
                href="/dashboard/swarms"
                className={`transition-colors font-light ${
                  isLight
                    ? "text-neutral-600 hover:text-neutral-900"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Swarms
              </Link>
              <span className={isLight ? "text-neutral-400" : "text-neutral-600"}>/</span>
              <button
                onClick={() => setStep("details")}
                className={`transition-colors font-light ${
                  isLight
                    ? "text-neutral-600 hover:text-neutral-900"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Create Swarm
              </button>
              <span className={isLight ? "text-neutral-400" : "text-neutral-600"}>/</span>
              <span className={isLight ? "text-neutral-900 font-medium" : "text-white font-medium"}>Select Personas</span>
            </nav>
            <h1 className={`text-3xl font-light tracking-tight mb-2 ${
              isLight ? "text-neutral-900" : "text-white"
            }`}>Select Personas</h1>
            <p className={`font-light ${
              isLight ? "text-neutral-500" : "text-neutral-400"
            }`}>Select the {agentCount} personas you want to include in the "{swarmName}" swarm.</p>
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
                    : 'Ready to save swarm'}
                </p>
              </div>
            </div>

            {/* Personas Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {generatedPersonas.map((persona, index) => {
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
                Selected personas will be saved as a reusable swarm for future simulations.
              </p>
            </div>

            {/* Actions */}
            <div className={`flex items-center justify-between gap-4 pt-4 border-t ${
              isLight ? "border-neutral-200" : "border-white/10"
            }`}>
              <button
                onClick={() => setStep("details")}
                className={`px-5 py-2 text-sm font-medium transition-colors ${
                  isLight
                    ? "text-neutral-600 hover:text-neutral-900"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                ← Back
              </button>

              <button
                onClick={handleSaveSwarm}
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
                    <span>Saving...</span>
                  </>
                ) : selectedIndices.length !== agentCount ? (
                  <span>Select {agentCount - selectedIndices.length} more</span>
                ) : (
                  <span>Save Swarm</span>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}