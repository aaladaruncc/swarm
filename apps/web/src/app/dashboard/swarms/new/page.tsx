"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { generatePersonas, createSwarm, type GeneratedPersona } from "@/lib/batch-api";
import { GeneratingPersonasLoader } from "@/components/ui/generating-personas-loader";
import { 
  Plus, 
  Loader2, 
  Users, 
  Globe, 
  Zap, 
  Minus, 
  Check
} from "lucide-react";

export default function CreateSwarmPage() {
  const router = useRouter();
  
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
      // Using the existing API to generate personas
      // If URL is empty, we pass a generic string or handle it in backend. 
      // The schema now accepts optional/empty string.
      const result = await generatePersonas(url, userDescription, agentCount);
      setGeneratedPersonas(result.personas);
      setRecommendedIndices(result.recommendedIndices);
      setSelectedIndices(result.recommendedIndices);
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
    <div className="p-8 max-w-7xl mx-auto w-full h-full overflow-hidden">
      {/* Breadcrumb */}
      <div className="mb-6">
        <nav className="flex items-center gap-2 text-sm">
          <Link 
            href="/dashboard/swarms"
            className="text-neutral-500 hover:text-neutral-900 transition-colors font-light"
          >
            Swarms
          </Link>
          <span className="text-neutral-400">/</span>
          <span className="text-neutral-900 font-medium">Create Swarm</span>
        </nav>
      </div>

        {/* Step 1: Details */}
        {step === "details" && (
          <>
            <div className="mb-6">
              <h1 className="text-3xl font-light tracking-tight mb-2">Create New Swarm</h1>
              <p className="text-neutral-500 font-light text-sm">
                Define the characteristics of your persona swarm. AI will generate relevant profiles based on your description.
              </p>
            </div>

            <form onSubmit={handleGeneratePersonas} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Swarm Details */}
                <section className="space-y-4">
                  <div className="flex items-center gap-3 text-neutral-900 border-b border-neutral-100 pb-2">
                    <Users size={18} className="stroke-1" />
                    <h2 className="text-base font-medium">Swarm Details</h2>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide block mb-1.5">Swarm Name</label>
                      <input
                        type="text"
                        value={swarmName}
                        onChange={(e) => setSwarmName(e.target.value)}
                        placeholder="e.g., E-commerce Shoppers"
                        className="w-full bg-white border border-neutral-200 text-neutral-900 px-3 py-2.5 focus:border-neutral-900 focus:ring-0 outline-none transition-all placeholder:text-neutral-300 font-light text-sm rounded-none"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide block mb-1.5">Description <span className="text-neutral-400 font-light ml-1">(Optional)</span></label>
                      <input
                        type="text"
                        value={swarmDescription}
                        onChange={(e) => setSwarmDescription(e.target.value)}
                        placeholder="Brief description for internal reference..."
                        className="w-full bg-white border border-neutral-200 text-neutral-900 px-3 py-2.5 focus:border-neutral-900 focus:ring-0 outline-none transition-all placeholder:text-neutral-300 font-light text-sm rounded-none"
                      />
                    </div>
                  </div>
                </section>

                {/* Generation Context */}
                <section className="space-y-4">
                  <div className="flex items-center gap-3 text-neutral-900 border-b border-neutral-100 pb-2">
                    <Globe size={18} className="stroke-1" />
                    <h2 className="text-base font-medium">Generation Context</h2>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide block mb-1.5">Reference URL <span className="text-neutral-400 font-light ml-1">(Optional)</span></label>
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://example.com"
                        className="w-full bg-white border border-neutral-200 text-neutral-900 px-3 py-2.5 focus:border-neutral-900 focus:ring-0 outline-none transition-all placeholder:text-neutral-300 font-light text-sm rounded-none"
                      />
                      <p className="mt-1 text-xs text-neutral-400 font-light">
                        Providing a URL helps the AI understand the context better.
                      </p>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide block mb-1.5">Audience Description</label>
                      <textarea
                        value={userDescription}
                        onChange={(e) => setUserDescription(e.target.value)}
                        placeholder="Describe the target audience for this swarm..."
                        className="w-full bg-white border border-neutral-200 text-neutral-900 px-3 py-2.5 focus:border-neutral-900 focus:ring-0 outline-none transition-all placeholder:text-neutral-300 font-light min-h-[100px] resize-none rounded-none text-sm"
                        required
                        minLength={10}
                      />
                    </div>
                  </div>
                </section>
              </div>

              {/* Swarm Size */}
              <section className="space-y-4 border-t border-neutral-100 pt-6">
                <div className="flex items-center gap-3 text-neutral-900 border-b border-neutral-100 pb-2">
                  <Zap size={18} className="stroke-1" />
                  <h2 className="text-base font-medium">Swarm Size</h2>
                </div>
                
                <div className="flex items-center justify-between max-w-md">
                  <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Number of Personas</label>
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
                      className={`flex-1 transition-colors ${
                        i <= agentCount ? 'bg-neutral-900' : 'bg-neutral-200'
                      }`}
                    />
                  ))}
                </div>

                <p className="text-xs text-neutral-400 font-light">
                  Max 5 personas per swarm
                </p>
              </section>

              {error && (
                <div className="p-3 bg-red-50 text-red-600 border border-red-100 text-xs font-light rounded-none">
                  <span className="font-medium">Error:</span> {error}
                </div>
              )}

              <div className="flex items-center justify-end gap-4 pt-4 border-t border-neutral-100">
                <Link
                  href="/dashboard/swarms"
                  className="px-5 py-2 text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loading || !userDescription || !swarmName}
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

        {/* Step 2: Generating */}
        {step === "generating" && <GeneratingPersonasLoader />}

        {/* Step 3: Select */}
        {step === "select" && (
          <>
            <div className="mb-6">
              <h2 className="text-3xl font-light tracking-tight mb-2">Review & Select Personas</h2>
              <p className="text-neutral-500 font-light text-sm">
                Select the {agentCount} personas you want to include in the "{swarmName}" swarm.
              </p>
            </div>

            <div className="space-y-6">
              {/* Selection Status */}
              <div className="flex items-center gap-3 p-3 border border-neutral-200 bg-white rounded-none">
                <div className="flex-1">
                  <div className="flex items-center gap-4">
                    <span className={`text-xs font-medium ${selectedIndices.length === agentCount ? 'text-green-600' : 'text-neutral-600'}`}>
                      {selectedIndices.length}/{agentCount} selected
                    </span>
                    <div className="flex gap-1 flex-1 max-w-xs">
                      {[...Array(agentCount)].map((_, i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 transition-colors rounded-full ${
                            i < selectedIndices.length ? 'bg-neutral-900' : 'bg-neutral-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
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
                      className={`group cursor-pointer p-4 border transition-all duration-200 relative bg-white rounded-none ${
                        isSelected
                          ? "border-neutral-900 ring-1 ring-neutral-900"
                          : canSelect
                          ? "border-neutral-200 hover:border-neutral-400 hover:shadow-sm"
                          : "border-neutral-100 bg-neutral-50 opacity-50 cursor-not-allowed"
                      }`}
                    >
                      {isRecommended && (
                        <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-neutral-100 text-neutral-600 text-[9px] font-medium uppercase tracking-wide rounded-none border border-neutral-200">
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
                      </div>

                      <p className="text-xs text-neutral-400 font-mono uppercase tracking-wider mb-2">
                        {persona.occupation}
                      </p>

                      <p className="text-xs text-neutral-600 font-light leading-relaxed mb-3 line-clamp-2">
                        {persona.primaryGoal}
                      </p>

                      <div className="flex items-center justify-between mt-auto pt-3 border-t border-neutral-100">
                         <div className="text-xs text-neutral-400">
                          Relevance: {persona.relevanceScore}/10
                        </div>
                        <div className="flex gap-0.5">
                          {[...Array(3)].map((_, i) => (
                            <div 
                              key={i} 
                              className={`w-1.5 h-1.5 rounded-full ${
                                i < (persona.techSavviness === 'beginner' ? 1 : persona.techSavviness === 'intermediate' ? 2 : 3)
                                  ? "bg-neutral-900" 
                                  : "bg-neutral-200"
                              }`}
                            />
                          ))}
                        </div>
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

              <div className="flex items-center justify-between gap-4 pt-4 border-t border-neutral-100">
                <button
                  onClick={() => setStep("details")}
                  className="px-5 py-2 text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={handleSaveSwarm}
                  disabled={loading || selectedIndices.length !== agentCount}
                  className="bg-neutral-900 text-white px-6 py-2 hover:bg-neutral-800 transition-all text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-none"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
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
