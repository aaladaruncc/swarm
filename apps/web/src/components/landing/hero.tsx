"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ChevronRight, Play } from "lucide-react";
import { Terminal, TypingAnimation, AnimatedSpan } from "@/components/ui/terminal";

export function Hero() {
  return (
    <section className="relative h-screen flex items-center overflow-hidden bg-white pt-24 pb-12 lg:pt-0 lg:pb-0">
      {/* Cleaner, Enterprise Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-neutral-50 via-white to-white opacity-80" />
      
      {/* Subtle Grid Lines (Very faint) */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)`,
          backgroundSize: '100px 100px',
        }}
      />

      <div className="container mx-auto px-6 relative z-10 w-full max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Left Column: Text */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-left"
          >
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif font-normal tracking-tight text-neutral-900 mb-6 leading-[1.1]">
              Simulate users
              <br />
              <span className="text-neutral-900">before you ship.</span>
            </h1>

            <p className="text-lg md:text-xl text-neutral-500 mb-8 max-w-xl leading-relaxed font-sans font-light">
              Deploy AI personas to discover bugs, test accessibility, and validate user experiences at scale—without writing a single test script.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white hover:bg-neutral-800 transition-all text-base font-light rounded-none min-w-[140px] justify-center"
              >
                Start Testing
                <ChevronRight className="w-4 h-4" />
              </Link>
              <Link
                href="#demo"
                className="inline-flex items-center gap-2 px-6 py-3 border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:border-neutral-300 transition-all text-base font-light rounded-none min-w-[140px] justify-center bg-white"
              >
                <Play className="w-4 h-4 fill-current" />
                See how it works
              </Link>
            </div>
          </motion.div>

          {/* Right Column: Visual */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
            className="relative"
          >
            {/* Decorative Background Blob */}
            <div className="absolute -inset-4 bg-gradient-to-r from-neutral-100 to-neutral-50 rounded-full blur-3xl opacity-50 -z-10" />

            {/* Main Visual Window */}
            <div className="relative rounded-lg overflow-hidden border border-neutral-200 shadow-2xl bg-white">
              {/* Window Header */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-100 bg-neutral-50/50">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-neutral-200" />
                  <div className="w-3 h-3 rounded-full bg-neutral-200" />
                  <div className="w-3 h-3 rounded-full bg-neutral-200" />
                </div>
                <div className="ml-4 text-xs text-neutral-400 font-mono">simulation_v3.ts</div>
              </div>

              {/* Window Content */}
              <div className="p-6 bg-neutral-50/30">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {/* Stats Cards */}
                  <div className="bg-white p-4 rounded border border-neutral-100 shadow-sm">
                    <div className="text-xs text-neutral-400 mb-1">Active Agents</div>
                    <div className="text-xl font-medium text-neutral-900">12</div>
                    <div className="mt-2 h-1 w-full bg-neutral-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 w-[80%]"></div>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded border border-neutral-100 shadow-sm">
                    <div className="text-xs text-neutral-400 mb-1">Coverage</div>
                    <div className="text-xl font-medium text-neutral-900">84%</div>
                    <div className="mt-2 h-1 w-full bg-neutral-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 w-[84%]"></div>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded border border-neutral-100 shadow-sm">
                    <div className="text-xs text-neutral-400 mb-1">Issues</div>
                    <div className="text-xl font-medium text-neutral-900">3</div>
                    <div className="mt-2 h-1 w-full bg-neutral-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 w-[20%]"></div>
                    </div>
                  </div>
                </div>

                {/* Terminal Integrated */}
                <div className="rounded overflow-hidden border border-neutral-200 shadow-sm">
                  <Terminal showHeader={false} className="bg-white text-neutral-800 border-none shadow-none min-h-[240px]">
                    <TypingAnimation className="text-neutral-900 font-medium">
                      $ swarm start --target=production
                    </TypingAnimation>
                    <AnimatedSpan className="text-neutral-500">
                      → Initializing swarm cluster...
                    </AnimatedSpan>
                    <AnimatedSpan className="text-emerald-600 font-medium">
                      ✓ Cluster ready (node-1, node-2, node-3)
                    </AnimatedSpan>
                    <AnimatedSpan className="text-neutral-500">
                      → Spawning 12 intelligent agents...
                    </AnimatedSpan>
                    <div className="my-2 p-2 bg-neutral-50 border border-neutral-100 rounded text-xs">
                      <div className="flex justify-between text-neutral-600 mb-1">
                        <span>Agent-01 (Shopper)</span>
                        <span className="text-emerald-600">Active</span>
                      </div>
                      <div className="flex justify-between text-neutral-600 mb-1">
                        <span>Agent-02 (Admin)</span>
                        <span className="text-emerald-600">Active</span>
                      </div>
                      <div className="flex justify-between text-neutral-600">
                        <span>Agent-03 (Guest)</span>
                        <span className="text-blue-600">Navigating...</span>
                      </div>
                    </div>
                    <AnimatedSpan className="text-amber-600">
                      ⚠ Accessibility issue detected on /checkout
                    </AnimatedSpan>
                    <AnimatedSpan className="text-neutral-500">
                      → Generating report...
                    </AnimatedSpan>
                  </Terminal>
                </div>
              </div>
            </div>

            {/* Floating Elements for Depth */}
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -right-8 top-20 bg-white p-3 rounded shadow-xl border border-neutral-100 z-20 max-w-[180px] hidden md:block"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <div className="text-xs font-medium text-neutral-900">Critical Error</div>
              </div>
              <div className="text-[10px] text-neutral-500 leading-tight">
                Payment modal fails to close on ESC key press.
              </div>
            </motion.div>

            <motion.div 
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -left-8 bottom-20 bg-white p-3 rounded shadow-xl border border-neutral-100 z-20 max-w-[180px] hidden md:block"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <div className="text-xs font-medium text-neutral-900">User Flow</div>
              </div>
              <div className="text-[10px] text-neutral-500 leading-tight">
                Signup → Onboarding → First Project created successfully.
              </div>
            </motion.div>

          </motion.div>
        </div>
      </div>
    </section>
  );
}
