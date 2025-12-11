"use client";

import { motion } from "framer-motion";
import { Terminal, Search, AlertCircle, Zap, Play } from "lucide-react";
import { Ripple } from "@/components/ui/ripple";

const STEPS = [
  {
    title: "Initialize Swarm",
    description: "Define your test parameters and target URL. Our system instantly provisions isolated browser contexts.",
  },
  {
    title: "Autonomous Exploration",
    description: "AI agents intelligently navigate your application, discovering user flows and edge cases automatically.",
  },
  {
    title: "Actionable Reporting",
    description: "Get comprehensive reports with video replays, DOM snapshots, and prioritized issue lists.",
  }
];

export function InteractiveDemo() {
  return (
    <section id="how-it-works" className="py-32 bg-white overflow-hidden">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="text-center max-w-3xl mx-auto mb-24">
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-medium tracking-tight text-neutral-900 mb-6 leading-[1.1]">
              The <span className="italic text-neutral-500">Flow</span>
            </h2>
          <p className="text-lg md:text-xl text-neutral-600 font-sans font-light leading-relaxed">
            From single command to comprehensive coverage in minutes.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          {/* Left: Steps */}
          <div className="space-y-12">
            {STEPS.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="relative pl-8 border-l border-neutral-200"
              >
                <div className="absolute left-[-5px] top-0 w-2.5 h-2.5 rounded-none bg-neutral-900" />
                <h3 className="text-2xl font-serif font-normal text-neutral-900 mb-3">
                  {step.title}
                </h3>
                <p className="text-base text-neutral-600 font-sans font-light leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Right: Ripple Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative flex items-center justify-center min-h-[500px] w-full"
          >
            <div className="relative flex h-[500px] w-full flex-col items-center justify-center overflow-hidden rounded-none bg-white md:shadow-xl border border-neutral-100">
              <p className="z-10 whitespace-pre-wrap text-center text-5xl font-medium tracking-tighter text-black">
                Deploy
              </p>
              <Ripple mainCircleSize={150} mainCircleOpacity={0.15} numCircles={8} />
              
              {/* Floating Icons */}
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-1/4 left-1/4 bg-white p-3 rounded-none shadow-lg border border-neutral-100 z-20"
              >
                <Terminal size={20} className="text-neutral-600" />
              </motion.div>
              
              <motion.div 
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute bottom-1/3 right-1/4 bg-white p-3 rounded-none shadow-lg border border-neutral-100 z-20"
              >
                <Search size={20} className="text-neutral-600" />
              </motion.div>

              <motion.div 
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                className="absolute top-1/3 right-1/3 bg-white p-3 rounded-none shadow-lg border border-neutral-100 z-20"
              >
                <Zap size={20} className="text-neutral-600" />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}