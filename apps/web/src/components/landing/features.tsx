"use client";

import { motion } from "framer-motion";
import { Sparkles, Zap, Target, TrendingUp } from "lucide-react";

const ITEMS = [
  {
    title: "Behavior-first agents",
    description: "AI personas adapt to your ICP, exploring flows the way real users do.",
    icon: Sparkles,
    bullets: ["Context-aware navigation", "Device + patience heuristics", "Real click/scroll telemetry"],
  },
  {
    title: "Parallel swarms",
    description: "Launch swarms to cover critical paths in minutes—not days.",
    icon: Zap,
    bullets: ["1-5 concurrent agents", "Queueing to avoid rate limits", "Live status + progress"],
  },
  {
    title: "Prescriptive analytics",
    description: "Move beyond pass/fail. Get prioritized actions backed by behavioral evidence.",
    icon: Target,
    bullets: ["Common breakdowns across personas", "Severity + priority scoring", "Ready-to-ship fixes"],
  },
  {
    title: "Continuous confidence",
    description: "Run every deploy through the swarm to ship with data, not guesses.",
    icon: TrendingUp,
    bullets: ["CI-friendly hooks", "Exportable reports (PDF)", "Baseline drift alerts"],
  },
];

const STATS = [
  { label: "Avg. time to signal", value: "6 min" },
  { label: "Personas per run", value: "1–5" },
  { label: "Evidence captured", value: "Clicks • Scrolls • Notes" },
];

export function Features() {
  return (
    <section id="features" className="relative py-28 bg-neutral-50 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />
      </div>

      <div className="container mx-auto px-6 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-14"
        >
          <h2 className="text-4xl md:text-5xl font-serif font-medium tracking-tight text-neutral-900 mb-4 leading-[1.1]">
            Ship features with <span className="italic text-neutral-500">evidence</span>, not guesses.
          </h2>
          <p className="text-lg text-neutral-600 font-light">
            Swarms of AI agents run your critical flows, capture behavioral signals, and turn them into prescriptive recommendations.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          {STATS.map((stat) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="p-5 border border-neutral-200 bg-white shadow-sm"
            >
              <div className="text-sm uppercase tracking-wide text-neutral-500 font-medium mb-2">{stat.label}</div>
              <div className="text-xl font-semibold text-neutral-900">{stat.value}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {ITEMS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: idx * 0.05 }}
                className="border border-neutral-200 bg-white shadow-sm p-6 flex flex-col gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 flex items-center justify-center border border-neutral-200 bg-neutral-50 text-neutral-900">
                    <Icon size={18} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900">{item.title}</h3>
                    <p className="text-sm text-neutral-600 font-light">{item.description}</p>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-neutral-600 font-light pl-1">
                  {item.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-2">
                      <span className="mt-[6px] block w-1 h-1 bg-neutral-400" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}