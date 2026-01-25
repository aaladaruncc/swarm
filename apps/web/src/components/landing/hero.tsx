"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ChevronRight, Play } from "lucide-react";
import { Terminal, TypingAnimation, AnimatedSpan } from "@/components/ui/terminal";
import posthog from "posthog-js";

export function Hero() {
  return (
    <section className="relative h-screen flex flex-col items-center justify-center bg-transparent pt-0 pb-12 lg:pt-0 lg:pb-0">

      {/* Flickering Grid overlay - MagicUI style with fade out at bottom */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)`,
          backgroundSize: '100px 100px',
        }}
      />

      <div className="container mx-auto px-6 relative z-10 w-full max-w-4xl flex-1 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center w-full"
        >
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-sans font-light tracking-tight text-white mb-6 leading-[1.1] drop-shadow-lg">
            The user simulator
            <br />
            <span className="text-white/95">for product teams.</span>
          </h1>

          <p className="text-lg md:text-xl text-white/80 mb-8 max-w-2xl mx-auto leading-relaxed font-sans font-light drop-shadow">
            Deploy AI personas to discover bugs, test accessibility, and validate user experiences at scale. No test scripts required.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/login"
              onClick={() => posthog.capture("cta_clicked", { cta_type: "start_testing", location: "hero" })}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-slate-900 hover:bg-white/90 transition-all text-base font-light rounded-lg min-w-[140px] justify-center shadow-lg"
            >
              Start Testing
              <ChevronRight className="w-4 h-4" />
            </Link>
            <Link
              href="#demo"
              onClick={() => posthog.capture("cta_clicked", { cta_type: "see_demo", location: "hero" })}
              className="inline-flex items-center gap-2 px-6 py-3 border border-white/30 text-white hover:bg-white/10 hover:border-white/50 transition-all text-base font-light rounded-lg min-w-[140px] justify-center backdrop-blur-sm"
            >
              <Play className="w-4 h-4 fill-current" />
              See how it works
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
