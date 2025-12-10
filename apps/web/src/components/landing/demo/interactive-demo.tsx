"use client";

import { motion } from "framer-motion";
import { Terminal, Search, AlertCircle, Zap } from "lucide-react";

const STEPS = [
  {
    id: "init",
    title: "Deploy Agents",
    description: "Run a single command to spawn your swarm. Each agent gets a unique persona and browser context.",
    icon: Terminal,
    color: "bg-blue-500",
    textColor: "text-blue-500",
  },
  {
    id: "explore",
    title: "Autonomous Navigation",
    description: "Agents explore your application independently, discovering routes and interactions you didn't explicitly define.",
    icon: Search,
    color: "bg-purple-500",
    textColor: "text-purple-500",
  },
  {
    id: "stress",
    title: "Stress Testing",
    description: "Agents simulate real-world chaos—slow networks, rage-clicking, and edge cases to find breaking points.",
    icon: AlertCircle,
    color: "bg-orange-500",
    textColor: "text-orange-500",
  },
  {
    id: "resolve",
    title: "Get Reports",
    description: "Receive prioritized issues with video replays and DOM snapshots, ready for your team to fix.",
    icon: Zap,
    color: "bg-emerald-500",
    textColor: "text-emerald-500",
  }
];

export function InteractiveDemo() {
  return (
    <section id="how-it-works" className="bg-white border-t border-neutral-100 py-32">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-4xl font-light tracking-tight mb-6">How it works</h2>
          <p className="text-lg font-light text-neutral-500">
            From deployment to actionable reports in four simple steps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative"
            >
              {/* Step Number */}
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-12 h-12 ${step.color} bg-opacity-10 rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <step.icon size={24} className={step.textColor} />
                </div>
                <div className="text-4xl font-light text-neutral-300">
                  {String(i + 1).padStart(2, '0')}
                </div>
              </div>

              {/* Content */}
              <h3 className="text-xl font-light mb-3 text-neutral-900">
                {step.title}
              </h3>
              <p className="text-neutral-500 font-light leading-relaxed">
                {step.description}
              </p>

              {/* Connector Line (hidden on last item) */}
              {i < STEPS.length - 1 && (
                <div className="hidden lg:block absolute top-6 left-full w-full h-px bg-neutral-200 -z-10" style={{ width: 'calc(100% - 3rem)', left: 'calc(100% - 1.5rem)' }}>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-neutral-200 rounded-full"></div>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Visual Separator */}
        <div className="mt-16 pt-16 border-t border-neutral-100">
          <div className="max-w-4xl mx-auto">
            <div className="bg-neutral-900 rounded-xl p-8 font-mono text-sm text-neutral-300">
              <div className="flex items-center gap-2 mb-6 opacity-50">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="ml-auto text-neutral-500 text-xs">agent2 run</span>
              </div>
              <div className="space-y-2">
                <div className="text-emerald-500">➜  ~ agent2 run --agents=50</div>
                <div className="text-neutral-400">[SYSTEM] Spawning 50 autonomous agents...</div>
                <div className="text-neutral-400">[AGENT-01] Navigating to /checkout</div>
                <div className="text-neutral-400">[AGENT-07] Exploring /settings/profile</div>
                <div className="text-orange-400">[AGENT-07] Error: 500 Internal Server Error</div>
                <div className="text-emerald-500">[SYSTEM] Analysis complete. 3 critical issues found.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
