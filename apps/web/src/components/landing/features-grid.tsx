"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

// AI Personas Visual - Static card stack
const PersonasVisual = () => {
  const personas = [
    {
      name: "Sarah Chen",
      age: 28,
      role: "Product Designer",
      trait: "Detail-oriented",
      tech: "Advanced"
    },
    {
      name: "Marcus Johnson",
      age: 45,
      role: "Business Executive",
      trait: "Time-conscious",
      tech: "Beginner"
    },
    {
      name: "Alex Rivera",
      age: 34,
      role: "Software Engineer",
      trait: "Fast-paced",
      tech: "Expert"
    },
  ];

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Stacked persona cards - static */}
      <div className="relative w-[280px] h-[200px]">
        {personas.map((persona, i) => {
          // Stack offset - first card on top
          const offset = i;

          return (
            <div
              key={persona.name}
              className="absolute inset-0 rounded-xl border border-white/20 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm p-5"
              style={{
                transform: `translateY(${offset * 12}px) translateX(${offset * 8}px) scale(${1 - offset * 0.05})`,
                opacity: 1 - offset * 0.3,
                zIndex: 10 - offset,
              }}
            >
              {/* Avatar */}
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white/40 to-white/20 flex items-center justify-center text-lg font-medium text-white">
                  {persona.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h4 className="text-white font-medium text-base">{persona.name}</h4>
                  <p className="text-white/50 text-sm">{persona.role}, {persona.age}</p>
                </div>
              </div>

              {/* Traits */}
              <div className="flex flex-wrap gap-2">
                <span className="px-2.5 py-1 rounded-full bg-white/10 text-white/70 text-xs border border-white/10">
                  {persona.trait}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-white/10 text-white/70 text-xs border border-white/10">
                  Tech: {persona.tech}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Autonomous Exploration Visual - Browser with cursor
const ExplorationVisual = () => {
  const [cursorPos, setCursorPos] = useState({ x: 60, y: 40 });
  const [clicking, setClicking] = useState(false);

  useEffect(() => {
    const positions = [
      { x: 60, y: 40 },
      { x: 200, y: 60 },
      { x: 320, y: 45 },
      { x: 150, y: 90 },
      { x: 280, y: 80 },
    ];
    let idx = 0;

    const interval = setInterval(() => {
      idx = (idx + 1) % positions.length;
      setCursorPos(positions[idx]);
      setClicking(true);
      setTimeout(() => setClicking(false), 200);
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full max-w-[420px] mx-auto">
      {/* Browser chrome */}
      <div className="rounded-xl overflow-hidden border border-white/20 bg-[#0a0a0a]">
        {/* Browser header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-[#111]">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-white/20" />
            <div className="w-3 h-3 rounded-full bg-white/20" />
            <div className="w-3 h-3 rounded-full bg-white/20" />
          </div>
          <div className="flex-1 mx-4">
            <div className="bg-white/10 rounded-md px-3 py-1.5 text-xs text-white/40 font-mono">
              yourapp.com/checkout
            </div>
          </div>
        </div>

        {/* Browser content */}
        <div className="relative h-[120px] p-4 bg-gradient-to-b from-[#0a0a0a] to-[#080808]">
          {/* Mock UI elements */}
          <div className="flex items-center gap-3 mb-3">
            <div className="h-4 w-20 bg-white/20 rounded" />
            <div className="h-4 w-16 bg-white/10 rounded" />
            <div className="h-4 w-24 bg-white/10 rounded" />
          </div>
          <div className="flex gap-4">
            <div className="flex-1 space-y-2">
              <div className="h-3 w-full bg-white/15 rounded" />
              <div className="h-3 w-3/4 bg-white/10 rounded" />
              <div className="h-3 w-1/2 bg-white/10 rounded" />
            </div>
            <div className="w-20 h-8 bg-white/25 rounded-md flex items-center justify-center">
              <span className="text-[10px] text-white/70">Buy Now</span>
            </div>
          </div>

          {/* Animated cursor */}
          <motion.div
            className="absolute pointer-events-none z-20"
            animate={{ x: cursorPos.x, y: cursorPos.y }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M1 1L6 14L8 8L14 6L1 1Z"
                fill="white"
                stroke="rgba(255,255,255,0.5)"
                strokeWidth="1"
              />
            </svg>
            {clicking && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0.8 }}
                animate={{ scale: 2.5, opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="absolute top-0 left-0 w-4 h-4 rounded-full border-2 border-white/60"
              />
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

// Instant Insights Visual - Dashboard metrics
const InsightsVisual = () => {
  const [counts, setCounts] = useState({ issues: 0, tests: 0, score: 0 });

  useEffect(() => {
    const targets = { issues: 12, tests: 47, score: 94 };
    const duration = 1500;
    const steps = 30;
    const interval = duration / steps;

    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      setCounts({
        issues: Math.round(targets.issues * progress),
        tests: Math.round(targets.tests * progress),
        score: Math.round(targets.score * progress),
      });
      if (step >= steps) clearInterval(timer);
    }, interval);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full h-full flex flex-col justify-center px-2">
      {/* Score ring */}
      <div className="flex items-center justify-center mb-6">
        <div className="relative w-24 h-24">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50" cy="50" r="42"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="8"
            />
            <motion.circle
              cx="50" cy="50" r="42"
              fill="none"
              stroke="rgba(255,255,255,0.8)"
              strokeWidth="8"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: counts.score / 100 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              style={{
                strokeDasharray: "264",
                strokeDashoffset: 264 - (264 * counts.score / 100),
              }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-light text-white">{counts.score}%</span>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-white/5 border border-white/10">
          <span className="text-sm text-white/60">Issues Found</span>
          <span className="text-lg font-medium text-white">{counts.issues}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-white/5 border border-white/10">
          <span className="text-sm text-white/60">Tests Run</span>
          <span className="text-lg font-medium text-white">{counts.tests}</span>
        </div>
      </div>
    </div>
  );
};

// CI/CD Visual - Static terminal with expanding animation
const CICDVisual = () => {
  const [visibleLines, setVisibleLines] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        setVisibleLines(v => {
          if (v >= 4) {
            clearInterval(interval);
            return 4;
          }
          return v + 1;
        });
      }, 800);
      return () => clearInterval(interval);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const lines = [
    { text: "$ swarm test", icon: "→", color: "text-white/40" },
    { text: "Running 24 tests...", icon: "◐", color: "text-white/40" },
    { text: "All tests passed", icon: "✓", color: "text-green-400" },
    { text: "Ready to deploy", icon: "→", color: "text-green-400" },
  ];

  return (
    <div className="w-full">
      <motion.div
        className="rounded-lg overflow-hidden border border-white/20 bg-[#0a0a0a]"
        initial={{ height: "auto" }}
        animate={{ height: "auto" }}
        transition={{ duration: 0.3 }}
      >
        {/* Terminal header */}
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/10">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400/60" />
        </div>

        {/* Terminal content */}
        <div className="p-4 font-mono text-sm">
          {lines.slice(0, visibleLines).map((l, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2 mb-1.5 text-white/80"
            >
              <span className={l.color}>{l.icon}</span>
              <span>{l.text}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export function FeaturesGrid() {
  return (
    <section id="features" className="relative z-10 py-24 md:py-32 bg-transparent">
      <div className="container mx-auto px-6 max-w-6xl">
        {/* Header - minimal */}
        <div className="mb-16 text-center">
          <h2 className="text-3xl md:text-4xl font-light text-white mb-4">
            Everything you need to ship with confidence
          </h2>
          <p className="text-base md:text-lg text-white/50 max-w-2xl mx-auto">
            From visual testing to complex user flows, all in one platform.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* AI Personas - Large card spanning 2x2 */}
          <div className="md:col-span-2 md:row-span-2 group">
            <div className="h-full rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8 hover:bg-white/[0.04] transition-colors flex flex-col">
              <div className="flex-1 min-h-0">
                <PersonasVisual />
              </div>
              <div className="mt-auto pt-4">
                <h3 className="text-xl font-medium text-white mb-1">Synthetic Users</h3>
                <p className="text-sm text-white/50">Deploy diverse user profiles that think and act like real users</p>
              </div>
            </div>
          </div>

          {/* Instant Insights - Tall card 1x2 */}
          <div className="md:row-span-2 group">
            <div className="h-full rounded-2xl border border-white/10 bg-white/[0.02] p-6 hover:bg-white/[0.04] transition-colors flex flex-col">
              <div className="flex-1 min-h-0">
                <InsightsVisual />
              </div>
              <div className="mt-auto pt-4">
                <h3 className="text-xl font-medium text-white mb-1">Instant Insights</h3>
                <p className="text-sm text-white/50">Real-time analysis and actionable reports</p>
              </div>
            </div>
          </div>

          {/* CI/CD - Standard 1x1 */}
          <div className="group">
            <div className="h-full rounded-2xl border border-white/10 bg-white/[0.02] p-6 hover:bg-white/[0.04] transition-colors">
              <div className="mb-4">
                <CICDVisual />
              </div>
              <div>
                <h3 className="text-xl font-medium text-white mb-1">CI/CD Ready</h3>
                <p className="text-sm text-white/50">Integrate into your existing workflow</p>
              </div>
            </div>
          </div>

          {/* Autonomous Exploration - Wide card 2x1 */}
          <div className="md:col-span-2 group">
            <div className="h-full rounded-2xl border border-white/10 bg-white/[0.02] p-6 hover:bg-white/[0.04] transition-colors">
              <div className="mb-4">
                <ExplorationVisual />
              </div>
              <div>
                <h3 className="text-xl font-medium text-white mb-1">Autonomous Exploration</h3>
                <p className="text-sm text-white/50">AI agents navigate your app and find what tests miss</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
