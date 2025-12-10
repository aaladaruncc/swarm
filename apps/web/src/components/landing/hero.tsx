"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, ChevronRight, Terminal } from "lucide-react";

export function Hero() {
  return (
    <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden bg-white">
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-5xl mx-auto">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex justify-start mb-8"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-600 text-sm font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neutral-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-neutral-500"></span>
              </span>
              v3.0 Public Beta
            </div>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-7xl md:text-9xl font-semibold tracking-tighter text-neutral-900 mb-8 leading-[0.9]"
          >
            Break your app <br />
            <span className="text-neutral-400 font-light italic">before they do.</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl md:text-2xl text-neutral-500 mb-12 max-w-2xl leading-relaxed font-light"
          >
            Unleash a swarm of AI personas to stress-test your user experience. 
            Find the bugs that only chaos can reveal.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-start gap-4"
          >
            <Link
              href="/login"
              className="h-14 px-8 bg-neutral-900 text-white hover:bg-neutral-800 transition-all flex items-center gap-2 justify-center group text-lg font-medium"
            >
              Start Testing 
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            
            <Link
              href="https://github.com/browserbase/stagehand"
              target="_blank"
              className="h-14 px-8 bg-white border border-neutral-200 text-neutral-900 hover:bg-neutral-50 transition-all flex items-center gap-2 justify-center group text-lg font-medium"
            >
              <Terminal className="w-5 h-5" />
              npm install stagehand
            </Link>
          </motion.div>
        </div>
      </div>
      
      {/* Background decoration - subtle grid or noise could go here if needed, but keeping it clean for now */}
    </section>
  );
}
