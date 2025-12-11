"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Sparkles, Zap, Target, TrendingUp, Code2, Terminal, Activity, GitBranch } from "lucide-react";

const TABS = [
  {
    id: "intelligent",
    title: "Intelligent Automation",
    description: "AI-powered agents that understand context and adapt to your application's unique workflows.",
    icon: Sparkles,
    preview: {
      title: "Context-Aware Testing",
      subtitle: "Autonomous Agent Execution",
      visual: "terminal"
    },
  },
  {
    id: "parallel",
    title: "Parallel Execution",
    description: "Run hundreds of test scenarios simultaneously across multiple personas.",
    icon: Zap,
    preview: {
      title: "Massive Scale",
      subtitle: "Concurrent Sessions",
      visual: "grid"
    },
  },
  {
    id: "insights",
    title: "Actionable Insights",
    description: "Get beyond pass/fail results with deep behavioral analysis and recommendations.",
    icon: Target,
    preview: {
      title: "Deep Analysis",
      subtitle: "Behavioral Heatmaps",
      visual: "graph"
    },
  },
  {
    id: "continuous",
    title: "Continuous Validation",
    description: "Integrate seamlessly into your CI/CD pipeline for automated quality assurance.",
    icon: TrendingUp,
    preview: {
      title: "Always-On Testing",
      subtitle: "CI/CD Integration",
      visual: "pipeline"
    },
  },
];

export function Features() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <section id="features" className="relative py-32 bg-neutral-50 overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />
      </div>

      <div className="container mx-auto px-6 max-w-7xl">
        <div className="flex flex-col lg:flex-row gap-16 lg:gap-24 items-start">
          
          {/* Left Side: Content & Navigation */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex-1 lg:sticky lg:top-32 w-full lg:max-w-md"
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-medium tracking-tight text-neutral-900 mb-6 leading-[1.1]">
              Simulation, <span className="italic text-neutral-500">evolved.</span>
            </h2>
            <p className="text-lg text-neutral-600 font-sans font-light leading-relaxed mb-12">
              Next-generation testing powered by AI. Discover issues, validate experiences, and ensure quality at scale without the maintenance overhead.
            </p>

            {/* Vertical Navigation for better structure */}
            <div className="space-y-2">
              {TABS.map((tab, index) => {
                const Icon = tab.icon;
                const isActive = activeTab === index;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(index)}
                    className={`
                      w-full text-left p-4 rounded-none transition-all duration-300 group
                      border hover:border-neutral-200
                      ${isActive 
                        ? "bg-white border-neutral-200 shadow-sm" 
                        : "bg-transparent border-transparent hover:bg-white/50"
                      }
                    `}
                  >
                    <div className="flex items-center gap-3 mb-1">
                      <div className={`
                        p-2 rounded-none transition-colors
                        ${isActive ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 group-hover:bg-white group-hover:text-neutral-900"}
                      `}>
                        <Icon size={18} strokeWidth={1.5} />
                      </div>
                      <span className={`font-medium transition-colors ${isActive ? "text-neutral-900" : "text-neutral-600"}`}>
                        {tab.title}
                      </span>
                    </div>
                    <p className={`text-sm pl-[52px] transition-colors leading-relaxed ${isActive ? "text-neutral-600" : "text-neutral-400"}`}>
                      {tab.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* Right Side: Interactive Preview */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex-1 w-full"
          >
            <div className="relative aspect-square lg:aspect-[4/3] bg-white rounded-none border border-neutral-200 shadow-2xl shadow-neutral-200/50 overflow-hidden">
              {/* Window Controls */}
              <div className="absolute top-0 left-0 right-0 h-10 bg-neutral-50 border-b border-neutral-100 flex items-center px-4 gap-2 z-10">
                <div className="w-3 h-3 rounded-full bg-red-400/20 border border-red-400/30" />
                <div className="w-3 h-3 rounded-full bg-amber-400/20 border border-amber-400/30" />
                <div className="w-3 h-3 rounded-full bg-green-400/20 border border-green-400/30" />
              </div>

              {/* Content Area */}
              <div className="absolute inset-0 top-10 p-8 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="h-full flex flex-col"
                  >
                    {/* Dynamic Header */}
                    <div className="mb-8">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-none bg-neutral-100 border border-neutral-200 text-xs font-medium text-neutral-600 mb-4">
                        {TABS[activeTab].preview.subtitle}
                      </div>
                      <h3 className="text-3xl font-serif text-neutral-900">
                        {TABS[activeTab].preview.title}
                      </h3>
                    </div>

                    {/* Visual Content Placeholder */}
                    <div className="flex-1 bg-white rounded-none border border-neutral-200 shadow-sm overflow-hidden relative group">
                      {TABS[activeTab].preview.visual === "terminal" && (
                        <div className="p-6 font-mono text-sm space-y-2 text-neutral-600">
                          <div className="flex items-center gap-2 text-green-600">
                            <span className="text-neutral-400">➜</span>
                            <span>stagehand start --mode=auto</span>
                          </div>
                          <div className="text-neutral-400 pl-4">Initializing AI agent...</div>
                          <div className="text-neutral-400 pl-4">Analyzing DOM structure...</div>
                          <div className="text-blue-500 pl-4">Found login form. Attempting authentication.</div>
                          <div className="flex items-center gap-2 pl-4 text-neutral-800 bg-neutral-50 p-2 rounded-none border border-neutral-100 mt-2">
                            <Activity size={14} className="animate-pulse text-green-500" />
                            <span>Agent exploring user dashboard...</span>
                          </div>
                        </div>
                      )}
                      
                      {TABS[activeTab].preview.visual === "grid" && (
                        <div className="p-6 grid grid-cols-2 gap-4">
                           {[1, 2, 3, 4].map((i) => (
                             <div key={i} className="bg-neutral-50 rounded-none p-3 border border-neutral-100">
                               <div className="flex items-center justify-between mb-2">
                                 <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                 <span className="text-xs text-neutral-400 font-mono">ID: {2490 + i}</span>
                               </div>
                               <div className="space-y-2">
                                 <div className="h-1.5 w-3/4 bg-neutral-200 rounded-full" />
                                 <div className="h-1.5 w-1/2 bg-neutral-200 rounded-full" />
                               </div>
                             </div>
                           ))}
                        </div>
                      )}

                      {TABS[activeTab].preview.visual === "graph" && (
                        <div className="p-6 flex items-end justify-between h-full gap-2 pb-8">
                          {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                            <motion.div
                              key={i}
                              initial={{ height: 0 }}
                              animate={{ height: `${h}%` }}
                              transition={{ duration: 0.5, delay: i * 0.1 }}
                              className="w-full bg-neutral-100 rounded-none relative overflow-hidden group-hover:bg-neutral-900 transition-colors duration-500"
                            >
                              <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/5 to-transparent" />
                            </motion.div>
                          ))}
                        </div>
                      )}

                      {TABS[activeTab].preview.visual === "pipeline" && (
                        <div className="p-6 flex flex-col justify-center h-full gap-4">
                          {[
                            { label: "Build", status: "success" },
                            { label: "Unit Tests", status: "success" },
                            { label: "E2E Tests", status: "processing" },
                            { label: "Deploy", status: "pending" }
                          ].map((step, i) => (
                            <div key={i} className="flex items-center gap-4">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center border
                                ${step.status === 'success' ? 'bg-green-50 border-green-200 text-green-600' :
                                  step.status === 'processing' ? 'bg-blue-50 border-blue-200 text-blue-600 animate-pulse' :
                                  'bg-neutral-50 border-neutral-200 text-neutral-300'}
                              `}>
                                {step.status === 'success' ? <Zap size={14} /> : 
                                 step.status === 'processing' ? <Activity size={14} /> :
                                 <div className="w-2 h-2 rounded-full bg-neutral-300" />}
                              </div>
                              <div className="flex-1 h-px bg-neutral-100" />
                              <span className="text-sm font-medium text-neutral-600">{step.label}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}