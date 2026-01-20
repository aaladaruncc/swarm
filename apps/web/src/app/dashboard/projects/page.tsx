"use client";

import { useSession } from "@/lib/auth-client";
import { Loader2 } from "lucide-react";
import { useTheme } from "@/contexts/theme-context";
import { FlickeringGrid } from "@/components/ui/flickering-grid";

export default function ProjectsPage() {
  const { data: session, isPending } = useSession();
  const { theme } = useTheme();
  
  const isLight = theme === "light";

  if (isPending) {
    return (
      <div className={`h-full flex items-center justify-center ${
        isLight ? "bg-neutral-50" : "bg-neutral-950"
      } ${isLight ? "text-neutral-900" : "text-white"}`}>
        <Loader2 className={`animate-spin w-8 h-8 ${
          isLight ? "text-neutral-500" : "text-neutral-400"
        }`} />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[calc(100vh-4rem)] flex items-center justify-center overflow-hidden">
      {/* Flickering grid background */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{ 
          zIndex: 0,
          maskImage: "linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)"
        }}
      >
        <FlickeringGrid
          squareSize={4}
          gridGap={6}
          flickerChance={0.1}
          color={isLight ? "rgb(38, 38, 38)" : "rgb(229, 229, 229)"}
          maxOpacity={isLight ? 0.08 : 0.1}
          className="h-full w-full"
        />
      </div>

      <div className="p-8 max-w-7xl mx-auto w-full relative z-10">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <h1 className={`text-6xl md:text-7xl font-light tracking-tight mb-6 ${
            isLight ? "text-neutral-900" : "text-white"
          }`}>
            Coming Soon
          </h1>
          
          <p className={`text-xl md:text-2xl font-light max-w-2xl ${
            isLight ? "text-neutral-600" : "text-neutral-300"
          }`}>
            We're working on something exciting. Projects will help you organize and manage your simulations more effectively.
          </p>
        </div>
      </div>
    </div>
  );
}
