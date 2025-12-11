"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Terminal, TypingAnimation, AnimatedSpan } from "@/components/ui/terminal";
import { FlickeringGrid } from "@/components/ui/flickering-grid";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-white pt-32 pb-0">
      {/* Subtle Flickering Grid Background */}
      <div className="absolute inset-0 opacity-[0.15]">
        <FlickeringGrid
          squareSize={4}
          gridGap={6}
          flickerChance={0.15}
          color="rgb(0, 0, 0)"
          maxOpacity={0.2}
        />
      </div>
      
      {/* Fade-out gradient at bottom to blend into next section */}
      <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-b from-transparent via-white/50 to-white pointer-events-none z-10" />

      <div className="container mx-auto px-6 relative z-10 w-full max-w-6xl">
        <div className="text-center mb-16">
          {/* Main Headline - Centered, Serif Style */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-6xl md:text-8xl lg:text-9xl font-serif font-normal tracking-tight text-neutral-900 mb-6 leading-[1.1]"
          >
            Test with
            <br />
            <span className="font-light italic" style={{ fontWeight: 300 }}>intelligence</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="text-xl md:text-2xl text-neutral-600 mb-12 max-w-2xl mx-auto leading-relaxed font-sans font-light"
          >
            Deploy AI personas to discover bugs, test accessibility, and validate user experiences at scale.
          </motion.p>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="flex justify-center"
          >
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-8 py-4 bg-neutral-900 text-white hover:bg-neutral-800 transition-all text-lg font-light group"
            >
              Get Started
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>

        {/* Interactive Terminal Demo - Centered */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
          className="max-w-3xl mx-auto mt-20"
        >
          <Terminal className="bg-neutral-900 border-neutral-800 max-w-full">
            <TypingAnimation className="text-emerald-400">
              $ vantage run --agents=5 --url=https://example.com
            </TypingAnimation>
            <AnimatedSpan className="text-neutral-400">
              [SYSTEM] Deploying 5 AI agents...
            </AnimatedSpan>
            <AnimatedSpan className="text-neutral-300">
              ✓ Agent 1: Exploring checkout flow
            </AnimatedSpan>
            <AnimatedSpan className="text-neutral-400">
              [AGENT-2] Testing form validation...
            </AnimatedSpan>
            <AnimatedSpan className="text-orange-400">
              ⚠ Agent 3: Found accessibility issue
            </AnimatedSpan>
            <AnimatedSpan className="text-neutral-300">
              ✓ Agent 4: Completed user journey
            </AnimatedSpan>
            <AnimatedSpan className="text-neutral-400">
              [AGENT-5] Stress testing payment flow...
            </AnimatedSpan>
            <AnimatedSpan className="text-emerald-400">
              ✓ Analysis complete. 3 issues found.
            </AnimatedSpan>
            <AnimatedSpan className="text-neutral-500 mt-4 pt-4 border-t border-neutral-800">
              Found 3 issues • 5 personas tested • 12 minutes elapsed
            </AnimatedSpan>
          </Terminal>

        </motion.div>
      </div>
    </section>
  );
}
