"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { GitBranch, Activity, Cpu, Shield, BarChart3, Command } from "lucide-react";

const FEATURES = [
  {
    icon: GitBranch,
    title: "Autonomous Exploration",
    description: "Agents automatically map your UI tree, identifying every button, input, and state without writing a single line of Cypress code.",
  },
  {
    icon: Activity,
    title: "Stochastic User Models",
    description: "Configure agents with personalities—from 'The Perfect User' to 'The Rage Clicker'—to validate resilience under various behaviors.",
  },
  {
    icon: Cpu,
    title: "Parallel Swarms",
    description: "Spin up 10,000 concurrent unique sessions in our cloud. Watch them interact in real-time on the dashboard.",
  },
  {
    icon: Shield,
    title: "Self-Healing Scenarios",
    description: "When your UI changes, our agents adapt. No more broken selectors or brittle rigid test scripts.",
  },
  {
    icon: BarChart3,
    title: "Heatmap Analytics",
    description: "Visualize where agents got stuck, where latency spiked, and which flows resulted in unhandled exceptions.",
  },
  {
    icon: Command,
    title: "CLI First",
    description: "Designed for developers. Integrate into your CI/CD pipeline with a single command. `npx agent2 run`.",
  },
];

export function Features() {
  const [activeFeature, setActiveFeature] = useState(0);

  return (
    <section id="features" className="py-24 bg-white border-t border-neutral-100">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-4xl font-light tracking-tight mb-6">Testing, evolved.</h2>
          <p className="text-lg font-light text-neutral-500">
            Deterministic testing misses the chaos of reality. Agent<sup className="text-[10px]">2</sup> introduces 
            stochastic behavior modeling to uncover edge cases you didn't know existed.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          {/* Left: Interactive Accordion */}
          <div className="space-y-4">
            {FEATURES.map((feature, i) => (
              <div
                key={feature.title}
                onClick={() => setActiveFeature(i)}
                className={`group cursor-pointer border-l-2 pl-6 py-4 transition-all duration-300 ${
                  activeFeature === i
                    ? "border-black"
                    : "border-neutral-200 hover:border-neutral-400"
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <feature.icon
                    size={20}
                    className={`transition-colors ${
                      activeFeature === i ? "text-black" : "text-neutral-400 group-hover:text-neutral-600"
                    }`}
                  />
                  <h3
                    className={`text-xl font-medium transition-colors ${
                      activeFeature === i ? "text-black" : "text-neutral-400 group-hover:text-neutral-600"
                    }`}
                  >
                    {feature.title}
                  </h3>
                </div>
                <AnimatePresence>
                  {activeFeature === i && (
                    <motion.p
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="text-neutral-500 font-light overflow-hidden"
                    >
                      {feature.description}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          {/* Right: Visual Preview (Placeholder for feature-specific visualization) */}
          <div className="bg-neutral-50 rounded-2xl h-[500px] flex items-center justify-center border border-neutral-100 p-12 relative overflow-hidden">
             {/* Dynamic content based on activeFeature could go here */}
             <motion.div
                key={activeFeature}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="text-center"
             >
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm mx-auto mb-6">
                    {/* Render the icon of the active feature larger */}
                    {(() => {
                        const Icon = FEATURES[activeFeature].icon;
                        return <Icon size={48} className="text-neutral-900" strokeWidth={1} />;
                    })()}
                </div>
                <h4 className="text-2xl font-light text-neutral-900 mb-2">{FEATURES[activeFeature].title}</h4>
                <div className="text-sm font-mono text-neutral-400 mt-8 bg-white px-4 py-2 rounded border border-neutral-200 inline-block">
                    Processing node: {activeFeature + 1} / {FEATURES.length}
                </div>
             </motion.div>
             
             {/* Decorative background elements */}
             <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-50 pointer-events-none"></div>
          </div>
        </div>
      </div>
    </section>
  );
}
