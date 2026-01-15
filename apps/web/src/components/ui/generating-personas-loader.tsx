"use client";

import { useState, useEffect } from "react";

export function GeneratingPersonasLoader() {
  const [progress, setProgress] = useState(0);
  const stages = [
    {
      label: "Sampling demographics",
      detail: "Deterministic distribution + ICP alignment",
    },
    {
      label: "Generating persona drafts",
      detail: "LLM call with diversity constraints",
    },
    {
      label: "Validating & scoring",
      detail: "Schema checks + relevance scoring",
    },
    {
      label: "Ranking & recommending",
      detail: "Selecting top personas for your swarm",
    },
  ];
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Indeterminate progress loop (no fixed duration)
    let direction: 1 | -1 = 1;
    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + direction * 4;
        if (next >= 100) {
          direction = -1;
          return 100;
        }
        if (next <= 0) {
          direction = 1;
          return 0;
        }
        return next;
      });
    }, 120);

    // Cycle through stages every few seconds to reflect processing steps
    const stageTimer = setInterval(() => {
      setStageIndex((prev) => (prev + 1) % stages.length);
    }, 2500);

    return () => {
      clearInterval(timer);
      clearInterval(stageTimer);
      document.body.style.overflow = 'unset';
    };
  }, [stages.length]);

  const activeStage = stages[stageIndex] || stages[0];
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center w-full h-full overflow-hidden bg-white">
      <div className="relative z-10 flex flex-col items-center justify-center w-full px-6">
        <h2 className="text-3xl md:text-4xl font-light tracking-tight text-neutral-900 text-center mb-6">
          Generating Personas
        </h2>

        <p className="text-xs uppercase tracking-[0.18em] text-neutral-500 mb-3">
          {activeStage.label}
        </p>
        <p className="text-sm font-light text-neutral-500 mb-10">
          {activeStage.detail}
        </p>

        <div className="w-full max-w-lg">
          <div className="h-3 w-full border border-neutral-200 bg-neutral-50 overflow-hidden">
            <div
              className="h-full bg-neutral-900 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
