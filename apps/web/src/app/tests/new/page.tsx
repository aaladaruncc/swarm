"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { createTest } from "@/lib/api";
import { Loader2, ArrowLeft, Globe, User, Shield, Zap, Info } from "lucide-react";
import { motion } from "framer-motion";

const PERSONAS = [
  {
    index: 0,
    name: "Sarah",
    age: 42,
    occupation: "Busy Parent & Nurse",
    techSavviness: "intermediate",
    country: "United States",
    description: "Multitasking constantly, needs fast and obvious interfaces",
  },
  {
    index: 1,
    name: "James",
    age: 67,
    occupation: "Retired Teacher",
    techSavviness: "beginner",
    country: "United Kingdom",
    description: "Needs large text, clear instructions, concerned about mistakes",
  },
  {
    index: 2,
    name: "Alex",
    age: 26,
    occupation: "Software Developer",
    techSavviness: "advanced",
    country: "Canada",
    description: "Expects efficiency, keyboard shortcuts, minimal friction",
  },
  {
    index: 3,
    name: "Maria",
    age: 35,
    occupation: "Small Business Owner",
    techSavviness: "intermediate",
    country: "Mexico",
    description: "English is second language, prefers clear visuals over text",
  },
  {
    index: 4,
    name: "David",
    age: 23,
    occupation: "University Student",
    techSavviness: "advanced",
    country: "Nigeria",
    description: "Budget phone, concerned about data usage and performance",
  },
  {
    index: 5,
    name: "Yuki",
    age: 52,
    occupation: "Office Manager",
    techSavviness: "beginner",
    country: "Japan",
    description: "Nervous about technology, needs reassurance and guidance",
  },
  {
    index: 6,
    name: "Emma",
    age: 29,
    occupation: "Marketing Specialist",
    techSavviness: "advanced",
    country: "Australia",
    description: "Early adopter, explores features, shares experiences socially",
  },
  {
    index: 7,
    name: "Carlos",
    age: 58,
    occupation: "Restaurant Manager",
    techSavviness: "beginner",
    country: "Spain",
    description: "Goal-focused, learns by doing, prefers consistency",
  },
  {
    index: 8,
    name: "Aisha",
    age: 31,
    occupation: "Freelance Designer",
    techSavviness: "advanced",
    country: "Kenya",
    description: "Design-conscious, notices details, values accessibility",
  },
  {
    index: 9,
    name: "Robert",
    age: 71,
    occupation: "Retired Veteran",
    techSavviness: "beginner",
    country: "United States",
    description: "Vision/hearing/mobility issues, needs accessibility features",
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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin w-8 h-8 text-neutral-300" />
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
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans selection:bg-neutral-900 selection:text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-neutral-100 h-16">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="flex items-center gap-2 group">
              <div className="w-5 h-5 bg-black rounded-sm"></div>
              <span className="text-xl font-medium tracking-tight group-hover:opacity-70 transition-opacity">Agent<sup className="text-xs ml-0.5">2</sup></span>
            </Link>
          </div>
          <Link href="/dashboard" className="text-sm font-light text-neutral-500 hover:text-neutral-900 transition-colors flex items-center gap-2">
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="pt-32 pb-24 px-6 max-w-4xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl font-light tracking-tight mb-4">Initialize Simulation</h1>
          <p className="text-neutral-500 font-light text-lg">
            Deploy an autonomous agent to stress-test your user experience.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-12">
          {/* Section 1: Target */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 text-neutral-900 border-b border-neutral-100 pb-2">
              <Globe size={20} className="stroke-1" />
              <h2 className="text-xl font-medium">Target Environment</h2>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Website URL</label>
              <div className="relative">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full bg-white border border-neutral-200 text-neutral-900 px-4 py-4 focus:border-neutral-900 focus:ring-0 outline-none transition-all placeholder:text-neutral-300 font-light text-lg rounded-none"
                  required
                />
              </div>
              <p className="text-xs text-neutral-400 font-light">
                The agent will begin its session at this URL. Ensure the environment is accessible.
              </p>
            </div>
          </section>

          {/* Section 2: Persona */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 text-neutral-900 border-b border-neutral-100 pb-2">
              <User size={20} className="stroke-1" />
              <h2 className="text-xl font-medium">Agent Persona</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PERSONAS.map((persona) => (
                <div
                  key={persona.index}
                  onClick={() => setSelectedPersona(persona.index)}
                  className={`group cursor-pointer p-6 border transition-all duration-200 relative overflow-hidden ${
                    selectedPersona === persona.index
                      ? "border-neutral-900 bg-neutral-50"
                      : "border-neutral-200 bg-white hover:border-neutral-400"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-lg">{persona.name}</h3>
                    <div className="flex gap-1">
                      {/* Tech Savviness Indicator */}
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
                  
                  <div className="text-sm text-neutral-500 font-light mb-4 flex items-center gap-2">
                    <span>{persona.age} yrs</span>
                    <span className="w-1 h-1 bg-neutral-300 rounded-full"></span>
                    <span>{persona.country}</span>
                  </div>

                  <p className="text-sm text-neutral-600 font-light leading-relaxed mb-3">
                    {persona.description}
                  </p>
                  
                  <div className="text-xs text-neutral-400 font-mono uppercase tracking-wider">
                    {persona.occupation}
                  </div>

                  {/* Selection Indicator */}
                  {selectedPersona === persona.index && (
                    <div className="absolute top-0 right-0 w-0 h-0 border-t-[32px] border-l-[32px] border-t-neutral-900 border-l-transparent">
                         <div className="absolute -top-7 -left-2 text-white transform -rotate-45 text-[10px]">✓</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Error & Info */}
          {error && (
            <div className="p-4 bg-red-50 text-red-600 border border-red-100 text-sm font-light">
              <span className="font-medium">Error:</span> {error}
            </div>
          )}

          <div className="flex items-start gap-3 p-4 bg-neutral-50 border border-neutral-100 text-sm font-light text-neutral-600">
            <Info size={16} className="mt-0.5 shrink-0" />
            <p>
              Simulations typically take 2-5 minutes. You can close this window; the agent will continue running in the cloud.
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
              disabled={loading || !url}
              className="bg-neutral-900 text-white px-8 py-3 hover:bg-neutral-800 transition-all text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-w-[160px] justify-center"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Zap size={16} />
                  Deploy Agent
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
