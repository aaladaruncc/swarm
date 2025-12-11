"use client";

import { useState, useEffect } from "react";

export function GeneratingPersonasLoader() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
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

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] w-full mx-auto p-8">
      {/* Text in a box */}
      <div className="border border-neutral-200 bg-white rounded-none px-12 py-8 mb-8">
        <h2 className="text-4xl md:text-5xl font-sans font-bold text-neutral-900 text-center">
          Generating Personas
        </h2>
      </div>
      
      {/* Thin Black Loading Bar */}
      <div className="w-full max-w-md">
        <div className="w-full h-1 bg-neutral-200 rounded-none overflow-hidden">
          <div 
            className="h-full bg-neutral-900 rounded-none transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
