"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { generatePersonas, createSwarm, type GeneratedPersona } from "@/lib/batch-api";
import { 
  Plus, 
  Loader2, 
  Users, 
  Globe, 
  Zap, 
  Minus, 
  Check, 
  ArrowLeft
} from "lucide-react";

export default function CreateSwarmPage() {
  const router = useRouter();
  
  // Create Flow State
  const [step, setStep] = useState<"details" | "generate" | "select">("details");
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
    setLoading(true);

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
    <div className="min-h-screen bg-white text-neutral-900 font-sans selection:bg-neutral-900 selection:text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-neutral-100 h-16">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center">
          <Link 
            href="/dashboard/swarms"
            className="text-sm font-light text-neutral-500 hover:text-neutral-900 transition-colors flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Back to Swarms
          </Link>
        </div>
      </header>

      <div className="pt-32 pb-24 px-6 max-w-4xl mx-auto">
        {/* Step 1: Details */}
        {step === "details" && (
          <>
            <div className="mb-12">
              <h1 className="text-4xl font-light tracking-tight mb-4">Create New Swarm</h1>
              <p className="text-neutral-500 font-light text-lg">
                Define the characteristics of your persona swarm. AI will generate relevant profiles based on your description.
              </p>
            </div>

            <form onSubmit={handleGeneratePersonas} className="space-y-12">
              {/* Swarm Details */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 text-neutral-900 border-b border-neutral-100 pb-2">
                  <Users size={20} className="stroke-1" />
                  <h2 className="text-xl font-medium">Swarm Details</h2>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide block mb-2">Swarm Name</label>
                    <input
                      type="text"
                      value={swarmName}
                      onChange={(e) => setSwarmName(e.target.value)}
                      placeholder="e.g., E-commerce Shoppers"
                      className="w-full bg-white border border-neutral-200 text-neutral-900 px-4 py-4 focus:border-neutral-900 focus:ring-0 outline-none transition-all placeholder:text-neutral-300 font-light text-lg rounded-none"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide block mb-2">Description <span className="text-neutral-400 font-light ml-1">(Optional)</span></label>
                    <input
                      type="text"
                      value={swarmDescription}
                      onChange={(e) => setSwarmDescription(e.target.value)}
                      placeholder="Brief description for internal reference..."
                      className="w-full bg-white border border-neutral-200 text-neutral-900 px-4 py-4 focus:border-neutral-900 focus:ring-0 outline-none transition-all placeholder:text-neutral-300 font-light text-lg rounded-none"
                    />
                  </div>
                </div>
              </section>

              {/* Generation Context */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 text-neutral-900 border-b border-neutral-100 pb-2">
                  <Globe size={20} className="stroke-1" />
                  <h2 className="text-xl font-medium">Generation Context</h2>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide block mb-2">Reference URL <span className="text-neutral-400 font-light ml-1">(Optional)</span></label>
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://example.com"
                      className="w-full bg-white border border-neutral-200 text-neutral-900 px-4 py-4 focus:border-neutral-900 focus:ring-0 outline-none transition-all placeholder:text-neutral-300 font-light text-lg rounded-none"
                    />
                    <p className="mt-2 text-xs text-neutral-400 font-light">
                      Providing a URL helps the AI understand the context better.
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide block mb-2">Audience Description</label>
                    <textarea
                      value={userDescription}
                      onChange={(e) => setUserDescription(e.target.value)}
                      placeholder="Describe the target audience for this swarm..."
                      className="w-full bg-white border border-neutral-200 text-neutral-900 px-4 py-4 focus:border-neutral-900 focus:ring-0 outline-none transition-all placeholder:text-neutral-300 font-light min-h-[140px] resize-none rounded-none"
                      required
                      minLength={10}
                    />
                  </div>
                </div>
              </section>

              {/* Concurrency */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 text-neutral-900 border-b border-neutral-100 pb-2">
                  <Zap size={20} className="stroke-1" />
                  <h2 className="text-xl font-medium">Swarm Size</h2>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Number of Personas</label>
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
                    Max 5 personas per swarm
                  </p>
                </div>
              </section>

              {error && (
                <div className="p-4 bg-red-50 text-red-600 border border-red-100 text-sm font-light rounded-none">
                  <span className="font-medium">Error:</span> {error}
                </div>
              )}

              <div className="flex items-center justify-end gap-4 pt-4">
                <button
                  type="submit"
                  disabled={loading || !userDescription || !swarmName}
                  className="bg-neutral-900 text-white px-8 py-3 hover:bg-neutral-800 transition-all text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-w-[180px] justify-center rounded-none"
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

        {/* Step 2: Select */}
        {step === "select" && (
          <>
            <div className="mb-12">
              <h2 className="text-4xl font-light tracking-tight mb-4">Review & Select Personas</h2>
              <p className="text-neutral-500 font-light text-lg">
                Select the {agentCount} personas you want to include in the "{swarmName}" swarm.
              </p>
            </div>

            <div className="space-y-8">
              {/* Selection Status */}
              <div className="flex items-center gap-3 p-4 border border-neutral-200 bg-white rounded-none">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <span className={`text-sm font-medium ${selectedIndices.length === agentCount ? 'text-green-600' : 'text-neutral-600'}`}>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {generatedPersonas.map((persona, index) => {
                  const isSelected = selectedIndices.includes(index);
                  const isRecommended = recommendedIndices.includes(index);
                  const canSelect = isSelected || selectedIndices.length < agentCount;
                  
                  return (
                    <div
                      key={index}
                      onClick={() => canSelect && togglePersonaSelection(index)}
                      className={`group cursor-pointer p-6 border transition-all duration-200 relative bg-white rounded-none ${
                        isSelected
                          ? "border-neutral-900 ring-1 ring-neutral-900"
                          : canSelect
                          ? "border-neutral-200 hover:border-neutral-400 hover:shadow-sm"
                          : "border-neutral-100 bg-neutral-50 opacity-50 cursor-not-allowed"
                      }`}
                    >
                      {isRecommended && (
                        <div className="absolute top-3 right-3 px-2 py-0.5 bg-neutral-100 text-neutral-600 text-[10px] font-medium uppercase tracking-wide rounded-none border border-neutral-200">
                          Recommended
                        </div>
                      )}

                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-medium text-lg mb-1">{persona.name}</h3>
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

                      <p className="text-sm text-neutral-600 font-light leading-relaxed mb-4 line-clamp-3">
                        {persona.primaryGoal}
                      </p>

                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-neutral-100">
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
                        <div className="absolute top-0 left-0 w-0 h-0 border-t-[32px] border-r-[32px] border-t-neutral-900 border-r-transparent">
                          <Check size={14} className="absolute -top-[26px] left-[2px] text-white" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-4 pt-6 border-t border-neutral-100 mt-8">
                <button
                  onClick={() => setStep("details")}
                  className="px-8 py-3 text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={handleSaveSwarm}
                  disabled={loading || selectedIndices.length !== agentCount}
                  className="bg-neutral-900 text-white px-8 py-3 hover:bg-neutral-800 transition-all text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-w-[200px] justify-center rounded-none"
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
    </div>
  );
}
