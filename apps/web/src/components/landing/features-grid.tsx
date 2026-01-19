"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";

// AI Personas Visual - Overlapping avatars with chat bubbles
const PersonasVisual = () => {
  const [activeIdx, setActiveIdx] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => setActiveIdx(i => (i + 1) % 3), 2000);
    return () => clearInterval(interval);
  }, []);

  const personas = [
    { name: "Alex", color: "from-violet-400 to-purple-500", action: "Clicking checkout..." },
    { name: "Morgan", color: "from-amber-400 to-orange-500", action: "Browsing products..." },
    { name: "Sam", color: "from-emerald-400 to-teal-500", action: "Filling form..." },
  ];

  return (
    <div className="flex items-start gap-4">
      {/* Stacked avatars */}
      <div className="flex -space-x-3">
        {personas.map((p, i) => (
          <motion.div
            key={p.name}
            className={cn(
              "w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center text-sm font-bold text-white border-2 border-[#0d1117]",
              p.color
            )}
            animate={{
              scale: activeIdx === i ? 1.15 : 1,
              zIndex: activeIdx === i ? 10 : 3 - i,
            }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            {p.name[0]}
          </motion.div>
        ))}
      </div>
      
      {/* Action bubble */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeIdx}
          initial={{ opacity: 0, y: 5, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -5, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/20"
        >
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full bg-gradient-to-br", personas[activeIdx].color)} />
            <span className="text-xs text-white/80 font-medium">{personas[activeIdx].name}</span>
          </div>
          <p className="text-[11px] text-white/50 mt-0.5">{personas[activeIdx].action}</p>
          <div className="flex gap-0.5 mt-1">
            <motion.div
              className="w-1 h-1 rounded-full bg-white/40"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0 }}
            />
            <motion.div
              className="w-1 h-1 rounded-full bg-white/40"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
            />
            <motion.div
              className="w-1 h-1 rounded-full bg-white/40"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
            />
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// Autonomous Exploration Visual - Orbiting dots (more space, but not too much)
const ExplorationVisual = () => {
  return (
    <div className="relative w-32 h-32 flex-shrink-0 mx-auto">
      {/* Central node */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-400/40 to-teal-500/40 border border-emerald-400/50 flex items-center justify-center">
        <div className="w-3.5 h-3.5 rounded bg-emerald-400" />
      </div>
      
      {/* Orbit path */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 128 128">
        <circle cx="64" cy="64" r="48" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeDasharray="5 5" />
      </svg>
      
      {/* Orbiting agents */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute w-3.5 h-3.5 rounded-full bg-gradient-to-r from-blue-400 to-cyan-400 shadow-lg shadow-blue-400/30"
          style={{
            top: "50%",
            left: "50%",
            marginTop: -7,
            marginLeft: -7,
          }}
          animate={{
            x: [48 * Math.cos((i * 2 * Math.PI) / 3), 48 * Math.cos((i * 2 * Math.PI) / 3 + 2 * Math.PI)],
            y: [48 * Math.sin((i * 2 * Math.PI) / 3), 48 * Math.sin((i * 2 * Math.PI) / 3 + 2 * Math.PI)],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "linear",
            delay: i * 0.5,
          }}
        />
      ))}
    </div>
  );
};

// Visual Regression Visual - Before/After comparison (compact)
const RegressionVisual = () => {
  const [showAfter, setShowAfter] = useState(false);
  
  useEffect(() => {
    const interval = setInterval(() => setShowAfter(s => !s), 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-[180px]">
      <div className="flex gap-1.5">
        <div className="relative flex-1 h-[64px] rounded-lg overflow-hidden bg-white/10 border border-white/20">
          <div className="absolute top-0.5 left-0.5 text-[7px] text-white/70 px-1 py-0.5 bg-black/50 rounded font-medium">Before</div>
          <div className="flex flex-col gap-1 p-1 pt-4">
            <div className="h-1.5 w-full bg-white/30 rounded" />
            <div className="h-1.5 w-3/4 bg-white/30 rounded" />
            <div className="h-1.5 w-1/2 bg-white/20 rounded" />
          </div>
        </div>
        <div className="relative flex-1 h-[64px] rounded-lg overflow-hidden bg-white/10 border border-white/20">
          <div className="absolute top-0.5 left-0.5 text-[7px] text-white/70 px-1 py-0.5 bg-black/50 rounded font-medium">After</div>
          <div className="flex flex-col gap-1 p-1 pt-4">
            <div className="h-1.5 w-full bg-white/30 rounded" />
            <motion.div 
              className="h-1.5 rounded"
              animate={{ 
                width: showAfter ? "50%" : "75%",
                backgroundColor: showAfter ? "rgba(239, 68, 68, 0.6)" : "rgba(255, 255, 255, 0.3)"
              }}
              transition={{ duration: 0.3 }}
            />
            <div className="h-1.5 w-1/2 bg-white/20 rounded" />
          </div>
          {showAfter && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute bottom-0.5 right-0.5 text-[7px] text-red-300 bg-red-500/30 px-1 py-0.5 rounded font-medium border border-red-500/30"
            >
              ⚠ Diff
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

// Interaction Testing Visual - Animated cursor clicks
const InteractionVisual = () => {
  const [clickPos, setClickPos] = useState({ x: 30, y: 20 });
  const [clicking, setClicking] = useState(false);

  useEffect(() => {
    const positions = [
      { x: 30, y: 20 },
      { x: 90, y: 40 },
      { x: 60, y: 60 },
    ];
    let idx = 0;
    
    const interval = setInterval(() => {
      idx = (idx + 1) % positions.length;
      setClickPos(positions[idx]);
      setClicking(true);
      setTimeout(() => setClicking(false), 200);
    }, 1500);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-36 h-20 bg-white/10 rounded-lg border border-white/20 overflow-hidden flex-shrink-0">
      {/* Mock UI elements */}
      <div className="absolute top-2 left-2 w-10 h-3 bg-white/30 rounded" />
      <div className="absolute top-2 right-2 w-5 h-3 bg-blue-400/50 rounded" />
      <div className="absolute bottom-2 left-2 w-16 h-4 bg-white/15 rounded" />
      <div className="absolute bottom-2 right-2 w-6 h-4 bg-emerald-400/40 rounded" />
      
      {/* Animated cursor */}
      <motion.div
        className="absolute pointer-events-none"
        animate={{ x: clickPos.x, y: clickPos.y }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M1 1L6 14L8 8L14 6L1 1Z"
            fill={clicking ? "#60A5FA" : "white"}
            stroke={clicking ? "#3B82F6" : "rgba(255,255,255,0.7)"}
            strokeWidth="1"
          />
        </svg>
        {clicking && (
          <motion.div
            initial={{ scale: 0.5, opacity: 1 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute top-0 left-0 w-4 h-4 rounded-full bg-blue-400/60"
          />
        )}
      </motion.div>
    </div>
  );
};

// CLI & CI/CD Visual - Mini terminal (fixed height, no overflow)
const TerminalVisual = () => {
  const [line, setLine] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => setLine(l => (l + 1) % 4), 1000);
    return () => clearInterval(interval);
  }, []);

  const lines = [
    { text: "$ swarm run --ci", color: "text-white/70" },
    { text: "✓ 24 tests passed", color: "text-emerald-400" },
    { text: "✓ No regressions", color: "text-emerald-400" },
    { text: "Deploy ready ✨", color: "text-blue-400" },
  ];

  return (
    <div className="w-full max-w-[260px] bg-[#0a0a0a] rounded-lg border border-white/15 overflow-hidden flex-shrink-0">
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-b border-white/10">
        <div className="w-2 h-2 rounded-full bg-red-500/80" />
        <div className="w-2 h-2 rounded-full bg-yellow-500/80" />
        <div className="w-2 h-2 rounded-full bg-green-500/80" />
      </div>
      <div className="p-2.5 font-mono text-[10px] h-[60px] overflow-hidden">
        {lines.slice(0, line + 1).map((l, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(l.color, "leading-tight")}
          >
            {l.text}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// Accessibility Testing Visual - WCAG compliance indicators
const AccessibilityVisual = () => {
  const [activeLevel, setActiveLevel] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => setActiveLevel(l => (l + 1) % 3), 2000);
    return () => clearInterval(interval);
  }, []);

  const levels = [
    { label: "AA", color: "from-blue-400 to-cyan-400", score: 95 },
    { label: "AAA", color: "from-emerald-400 to-teal-400", score: 88 },
    { label: "WCAG", color: "from-purple-400 to-pink-400", score: 92 },
  ];

  return (
    <div className="flex flex-col gap-3 w-full max-w-[180px]">
      {levels.map((level, i) => (
        <div key={level.label} className="flex items-center gap-2">
          <div className={cn(
            "w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center text-xs font-bold text-white border border-white/20 flex-shrink-0",
            level.color,
            activeLevel === i && "ring-2 ring-white/40 scale-105"
          )}>
            {level.label}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-white/60">{level.label} Compliant</span>
              <span className="text-[10px] font-medium text-white/80">{level.score}%</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className={cn("h-full rounded-full bg-gradient-to-r", level.color)}
                initial={{ width: 0 }}
                animate={{ width: `${level.score}%` }}
                transition={{ duration: 0.8, delay: i * 0.1 }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Instant Feedback Visual - Animated progress ring (compact)
const FeedbackVisual = () => {
  const [value, setValue] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setValue(v => v >= 100 ? 0 : v + 5);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const circumference = 2 * Math.PI * 24;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-14 h-14 flex-shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
          <circle
            cx="28"
            cy="28"
            r="24"
            fill="none"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="3.5"
          />
          <circle
            cx="28"
            cy="28"
            r="24"
            fill="none"
            stroke="url(#feedbackGradient)"
            strokeWidth="3.5"
            strokeLinecap="round"
            style={{
              strokeDasharray: circumference,
              strokeDashoffset,
              transition: "stroke-dashoffset 0.1s ease",
            }}
          />
          <defs>
            <linearGradient id="feedbackGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#06B6D4" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-semibold text-white">{value}%</span>
        </div>
      </div>
      <div className="flex flex-col gap-1 text-[9px]">
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-white/70">12 passed</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span className="text-white/70">2 warnings</span>
        </div>
      </div>
    </div>
  );
};

const FEATURES = [
  {
    title: "AI Personas",
    description: "Create diverse user personas with unique traits, goals, and behaviors to test your app authentically.",
    visual: PersonasVisual,
    className: "md:col-span-2 md:row-span-1"
  },
  {
    title: "Autonomous Exploration",
    description: "Agents intelligently navigate your application, discovering edge cases and user flows you missed.",
    visual: ExplorationVisual,
    className: "md:col-span-1 md:row-span-2"
  },
  {
    title: "Visual Regression",
    description: "Automatically detect UI changes and visual bugs across different viewports and devices.",
    visual: RegressionVisual,
    className: "md:col-span-1 md:row-span-1"
  },
  {
    title: "Instant Feedback",
    description: "Get real-time reports, video replays, and actionable insights to fix issues faster.",
    visual: FeedbackVisual,
    className: "md:col-span-1 md:row-span-1"
  },
  {
    title: "Accessibility Testing",
    description: "Automatically verify WCAG compliance and accessibility standards across your application.",
    visual: AccessibilityVisual,
    className: "md:col-span-1 md:row-span-1"
  },
  {
    title: "Interaction Testing",
    description: "Verify complex interactions like drag-and-drop, modals, and dynamic forms work flawlessly.",
    visual: InteractionVisual,
    className: "md:col-span-2 md:row-span-1"
  },
  {
    title: "CLI & CI/CD",
    description: "Integrate seamlessly into your existing workflow with our powerful CLI and CI/CD pipelines.",
    visual: TerminalVisual,
    className: "md:col-span-2 md:row-span-1"
  }
];

export function FeaturesGrid() {
  return (
    <section id="features" className="relative z-10 py-32 border-b border-white/5 bg-transparent">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="mb-16 max-w-2xl">
          <h2 className="text-3xl md:text-4xl font-light text-white mb-6">
            Complete coverage for your <br />
            <span className="text-white/50">modern web application.</span>
          </h2>
          <p className="text-lg text-white/50 leading-relaxed">
            From visual regression to complex user flows, Swarm handles the tedious parts of testing so you can ship with confidence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 auto-rows-[220px] border-l border-t border-white/5">
          {FEATURES.map((feature) => {
            // Determine spacing based on feature
            const needsMoreSpace = feature.title === "Autonomous Exploration" || feature.title === "AI Personas";
            const isCompact = feature.title === "Visual Regression" || feature.title === "Instant Feedback";
            
            return (
              <div 
                key={feature.title}
                className={cn(
                  "group relative border-r border-b border-white/5 hover:bg-white/[0.02] transition-colors duration-300 flex flex-col overflow-hidden",
                  needsMoreSpace ? "p-7" : isCompact ? "p-5" : "p-6",
                  feature.className
                )}
              >
                <div className={cn(
                  "flex-shrink-0",
                  needsMoreSpace ? "mb-4" : isCompact ? "mb-2" : "mb-4"
                )}>
                  <feature.visual />
                </div>
                <div className="mt-auto">
                  <h3 className="text-lg font-medium text-white mb-1 group-hover:text-blue-400 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-white/50 leading-relaxed group-hover:text-white/70 transition-colors line-clamp-2">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
