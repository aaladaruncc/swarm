"use client";

import { motion } from "framer-motion";
import { DottedGlowBackground } from "@/components/ui/dotted-glow-background";

const STATS = [
  {
    title: "Lower launch risk",
    description: "Catch usability issues before they reach users.",
  },
  {
    title: "Faster decisions",
    description: "Focus the team on what actually matters.",
  },
  {
    title: "Earlier insight",
    description: "Get clarity in hours, not weeks.",
  },
];

export function ProductDecisions() {
  return (
    <section id="value" className="relative py-16 sm:py-20 md:py-24 lg:py-32 bg-slate-50 overflow-hidden">
      {/* Subtle gradient overlays for depth and visual interest */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-100/50 via-transparent to-slate-100/50" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50/30 via-transparent to-transparent" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 md:px-8 max-w-[1300px] relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-5xl mx-auto"
        >
          {/* Header Section */}
          <div className="text-center mb-12 sm:mb-16 md:mb-20">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-sans font-light tracking-tight text-slate-950 mb-4 sm:mb-6 leading-[1.15]">
              Built to fit into how
              <br />
              teams already ship
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-slate-600 font-light leading-relaxed max-w-2xl mx-auto px-4">
              1 in 3 product launches miss their KPIs because UX issues slip through unnoticed. Swarm catches friction before your users do.
            </p>
          </div>

          {/* Stats Grid - Mobile: Stacked cards, Tablet+: Circles */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 md:gap-12 lg:gap-16 justify-items-center">
            {STATS.map((stat, index) => (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 * (index + 1) }}
                className="w-full max-w-[320px] md:max-w-[280px] group"
              >
                {/* Mobile: Card layout */}
                <div className="md:hidden">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
                    <div className="text-xl font-medium text-slate-900 mb-2">{stat.title}</div>
                    <p className="text-sm text-slate-500 leading-relaxed">
                      {stat.description}
                    </p>
                  </div>
                </div>

                {/* Desktop: Circle layout */}
                <div className="hidden md:block aspect-square relative">
                  <DottedGlowBackground
                    className="w-full h-full rounded-full border border-slate-200 bg-white shadow-sm group-hover:shadow-md transition-shadow flex items-center justify-center"
                    color="rgba(59, 130, 246, 0.2)"
                    glowColor="rgba(59, 130, 246, 0.8)"
                  >
                    <div className="flex flex-col items-center justify-center p-4 lg:p-6 text-center">
                      <div className="text-lg lg:text-2xl font-medium text-slate-900 mb-2 relative z-20">{stat.title}</div>
                      <p className="text-xs lg:text-sm text-slate-500 leading-relaxed relative z-20 max-w-[150px] lg:max-w-[180px]">
                        {stat.description}
                      </p>
                    </div>
                  </DottedGlowBackground>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
