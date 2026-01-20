"use client";

import { AnimatedGradientCurtain } from "./animated-gradient-curtain";
import { cn } from "@/lib/utils";

/**
 * Payload-Style Hero Demo
 * 
 * Demonstrates the layered composition technique:
 * 1. Base dark background
 * 2. Animated gradient curtain (Layer 1)
 * 3. Lighting effects (Layer 2) 
 * 4. Mesh/grid overlay (Layer 3)
 * 5. Content on top (Layer 4)
 */
export function PayloadStyleHeroDemo({ className }: { className?: string }) {
  return (
    <section className={cn("relative min-h-screen flex items-center overflow-hidden", className)}>
      {/* Base Layer: Dark Background */}
      <div className="absolute inset-0 bg-neutral-950" />

      {/* Layer 1: Animated Gradient Curtain */}
      <AnimatedGradientCurtain
        colors={[
          "rgba(59, 130, 246, 0.2)",   // Blue
          "rgba(147, 51, 234, 0.2)",   // Purple  
          "rgba(251, 191, 36, 0.2)",   // Gold
          "rgba(59, 130, 246, 0.2)",   // Blue (loop)
        ]}
        speed={20}
        meshOpacity={0.05}
        meshSize={50}
      />

      {/* Layer 2: Additional subtle overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-neutral-950/20" />

      {/* Layer 3: Content Layer (on top) */}
      <div className="relative z-10 container mx-auto px-6 py-24">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-light tracking-tight text-white mb-6">
            The backend to build
            <br />
            <span className="text-white/90">the modern web.</span>
          </h1>

          {/* Command Line Input (Payload-style) */}
          <div className="mt-12 mb-8">
            <div className="inline-flex items-center gap-3 px-6 py-4 bg-neutral-900/80 backdrop-blur-sm border border-neutral-800 rounded-lg font-mono text-sm text-neutral-200">
              <span className="text-neutral-500">$</span>
              <span>npx create-payload-app</span>
              <button className="ml-2 p-1.5 hover:bg-neutral-800 rounded transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>

          {/* CTA Button */}
          <button className="px-8 py-4 bg-white text-neutral-900 hover:bg-neutral-100 transition-colors font-medium rounded-lg">
            Get a Demo
          </button>
        </div>
      </div>
    </section>
  );
}
