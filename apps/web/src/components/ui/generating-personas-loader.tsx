"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/theme-context";

export function GeneratingPersonasLoader() {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Fast progress to ~85%, then slow down and wait
    const fastDuration = 2000; // 2 seconds to reach 85%
    const slowDuration = 8000; // 8 seconds to go from 85% to 100%
    const interval = 50; // Update every 50ms
    
    const fastIncrement = (85 / (fastDuration / interval));
    const slowIncrement = (15 / (slowDuration / interval));
    
    let startTime = Date.now();
    let isFastPhase = true;

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      
      setProgress((prev) => {
        if (isFastPhase && prev < 85) {
          const newProgress = Math.min(prev + fastIncrement, 85);
          if (newProgress >= 85) {
            isFastPhase = false;
            startTime = Date.now(); // Reset timer for slow phase
          }
          return newProgress;
        } else {
          // Slow phase - gradually go from 85% to 100%
          const newProgress = Math.min(prev + slowIncrement, 100);
          if (newProgress >= 100) {
            clearInterval(timer);
            return 100;
          }
          return newProgress;
        }
      });
    }, interval);

    return () => {
      clearInterval(timer);
    };
  }, []);

  // Calculate stroke-dasharray for circular progress
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] w-full">
      <div className="relative w-40 h-40 mb-8">
        {/* Circular progress background */}
        <svg className="transform -rotate-90 w-40 h-40">
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            className={isLight ? "text-neutral-200" : "text-white/10"}
          />
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={`transition-all duration-300 ease-out ${
              isLight ? "text-neutral-900" : "text-white"
            }`}
          />
        </svg>
      </div>
      
      <h2 className={`text-4xl font-light tracking-tight text-center ${
        isLight ? "text-neutral-900" : "text-white"
      }`}>
        Generating Personas
      </h2>
    </div>
  );
}