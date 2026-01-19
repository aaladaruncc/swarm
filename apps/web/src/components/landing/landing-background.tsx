"use client";

import { AnimatedGradientCurtain } from "@/components/ui/animated-gradient-curtain";

export function LandingBackground() {
  return (
    <div className="fixed inset-0 -z-50 bg-neutral-950">
      {/* Shared Animated Gradient Curtain Background */}
      <AnimatedGradientCurtain
        colors={[
          "rgba(0, 0, 0, 0.8)",    // Deep black/blue
          "rgba(20, 20, 30, 0.8)", // Dark navy
          "rgba(0, 0, 0, 0.8)",    // Deep black
          "rgba(20, 20, 30, 0.8)", // Dark navy (loop)
        ]}
        speed={15}
        meshOpacity={0.05} // Subtle mesh
        meshSize={40}
      />
      
      {/* Shared dark lighting effects */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background: `
            radial-gradient(circle at 20% 30%, rgba(30, 41, 59, 0.4) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(15, 23, 42, 0.4) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(2, 6, 23, 0.5) 0%, transparent 70%)
          `,
        }}
      />
    </div>
  );
}
