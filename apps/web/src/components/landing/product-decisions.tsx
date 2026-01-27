"use client";

import { motion } from "framer-motion";
import { DottedGlowBackground } from "@/components/ui/dotted-glow-background";

export function ProductDecisions() {
  return (
    <section id="value" className="relative py-24 md:py-32 bg-slate-50 overflow-hidden">
      {/* Subtle gradient overlays for depth and visual interest */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-100/50 via-transparent to-slate-100/50" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50/30 via-transparent to-transparent" />
      </div>

      <div className="container mx-auto px-4 md:px-8 max-w-[1300px] relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-5xl mx-auto"
        >
          {/* Header Section */}
          <div className="text-center mb-16 md:mb-20">
            <h2 className="text-4xl md:text-5xl font-sans font-light tracking-tight text-slate-950 mb-6 leading-[1.15]">
              Built to fit into how
              <br />
              teams already ship
            </h2>
            <p className="text-lg md:text-xl text-slate-600 font-light leading-relaxed max-w-2xl mx-auto">
              1 in 3 product launches miss their KPIs because UX issues slip through unnoticed. Swarm catches friction before your users do.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16 justify-items-center">
            {/* Stat 1: Lower launch risk */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="w-full max-w-[280px] aspect-square relative group"
            >
              <DottedGlowBackground 
                className="w-full h-full rounded-full border border-slate-200 bg-white shadow-sm group-hover:shadow-md transition-shadow flex items-center justify-center"
                color="rgba(59, 130, 246, 0.2)"
                glowColor="rgba(59, 130, 246, 0.8)"
              >
                <div className="flex flex-col items-center justify-center p-6 text-center">
                  <div className="text-2xl font-medium text-slate-900 mb-2 relative z-20">Lower launch risk</div>
                  <p className="text-sm text-slate-500 leading-relaxed relative z-20 max-w-[180px]">
                    Catch usability issues before they reach users.
                  </p>
                </div>
              </DottedGlowBackground>
            </motion.div>

            {/* Stat 2: Faster decisions */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="w-full max-w-[280px] aspect-square relative group"
            >
              <DottedGlowBackground 
                className="w-full h-full rounded-full border border-slate-200 bg-white shadow-sm group-hover:shadow-md transition-shadow flex items-center justify-center"
                color="rgba(59, 130, 246, 0.2)"
                glowColor="rgba(59, 130, 246, 0.8)"
              >
                <div className="flex flex-col items-center justify-center p-6 text-center">
                  <div className="text-2xl font-medium text-slate-900 mb-2 relative z-20">Faster decisions</div>
                  <p className="text-sm text-slate-500 leading-relaxed relative z-20 max-w-[180px]">
                    Focus the team on what actually matters.
                  </p>
                </div>
              </DottedGlowBackground>
            </motion.div>

            {/* Stat 3: Earlier insight */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="w-full max-w-[280px] aspect-square relative group"
            >
              <DottedGlowBackground 
                className="w-full h-full rounded-full border border-slate-200 bg-white shadow-sm group-hover:shadow-md transition-shadow flex items-center justify-center"
                color="rgba(59, 130, 246, 0.2)"
                glowColor="rgba(59, 130, 246, 0.8)"
              >
                <div className="flex flex-col items-center justify-center p-6 text-center">
                  <div className="text-2xl font-medium text-slate-900 mb-2 relative z-20">Earlier insight</div>
                  <p className="text-sm text-slate-500 leading-relaxed relative z-20 max-w-[180px]">
                    Get clarity in hours, not weeks.
                  </p>
                </div>
              </DottedGlowBackground>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
