"use client";

import { useState, useEffect } from "react";

export function GeneratingPersonasLoader() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    
    // Simulate progress over ~10 seconds
    const duration = 10000; // 10 seconds
    const interval = 50; // Update every 50ms
    const increment = (100 / (duration / interval));

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return Math.min(prev + increment, 100);
      });
    }, interval);

    return () => {
      clearInterval(timer);
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center w-full h-full overflow-hidden bg-white">
      {/* Content - Subtle and elegant */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full">
        {/* Subtle text - no box, lighter weight */}
        <h2 className="text-3xl md:text-4xl font-light tracking-tight text-neutral-900 text-center mb-12">
          Generating Personas
        </h2>
        
        {/* Thin, subtle loading bar */}
        <div className="w-full max-w-xs">
          <div className="w-full h-px bg-neutral-200 rounded-none overflow-hidden">
            <div 
              className="h-full bg-neutral-400 rounded-none transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
