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
    { name: "Alex", color: "from-white/80 to-white/60", action: "Clicking checkout..." },
    { name: "Morgan", color: "from-white/60 to-white/40", action: "Browsing products..." },
    { name: "Sam", color: "from-white/40 to-white/20", action: "Filling form..." },
  ];

  return (
    <div className="flex items-start gap-4 w-full">
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

// Autonomous Exploration Visual - Orbiting dots (bigger and more animated)
const ExplorationVisual = () => {
  return (
    <div className="relative w-56 h-56 flex-shrink-0 mx-auto my-4">
      {/* Central node with pulse animation */}
      <motion.div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-lg bg-gradient-to-br from-white/40 to-white/25 border-2 border-white/50 flex items-center justify-center"
        animate={{
          scale: [1, 1.1, 1],
          rotate: [0, 5, -5, 0],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <motion.div 
          className="w-5 h-5 rounded bg-white/70"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        {/* Pulsing rings */}
        {[0, 1, 2].map((ring) => (
          <motion.div
            key={ring}
            className="absolute inset-0 rounded-lg border-2 border-white/30"
            animate={{
              scale: [1, 1.5 + ring * 0.3, 1.5 + ring * 0.3],
              opacity: [0.3, 0, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: ring * 0.3,
              ease: "easeOut",
            }}
          />
        ))}
      </motion.div>
      
      {/* Multiple orbit paths */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 224 224">
        <motion.circle 
          cx="112" cy="112" r="72" 
          fill="none" 
          stroke="rgba(255,255,255,0.2)" 
          strokeWidth="2" 
          strokeDasharray="8 4"
          animate={{
            strokeDashoffset: [0, -12],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear",
          }}
        />
        <motion.circle 
          cx="112" cy="112" r="56" 
          fill="none" 
          stroke="rgba(255,255,255,0.15)" 
          strokeWidth="1.5" 
          strokeDasharray="6 6"
          animate={{
            strokeDashoffset: [0, 12],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </svg>
      
      {/* Orbiting agents with enhanced animation */}
      {[0, 1, 2, 3, 4].map((i) => {
        const radius = i < 3 ? 72 : 56;
        const angle = (i * 2 * Math.PI) / (i < 3 ? 3 : 2);
        const delay = i * 0.4;
        
        return (
          <motion.div
            key={i}
            className="absolute w-4 h-4 rounded-full bg-gradient-to-r from-white/80 to-white/60 shadow-lg shadow-white/30"
            style={{
              top: "50%",
              left: "50%",
              marginTop: -8,
              marginLeft: -8,
            }}
            animate={{
              x: [
                radius * Math.cos(angle),
                radius * Math.cos(angle + 2 * Math.PI)
              ],
              y: [
                radius * Math.sin(angle),
                radius * Math.sin(angle + 2 * Math.PI)
              ],
              scale: [1, 1.3, 1],
            }}
            transition={{
              duration: i < 3 ? 8 : 6,
              repeat: Infinity,
              ease: "linear",
              delay,
            }}
          >
            {/* Trail effect */}
            <motion.div
              className="absolute inset-0 rounded-full bg-white/40"
              animate={{
                scale: [1, 2, 1],
                opacity: [0.4, 0, 0.4],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: delay + 0.2,
              }}
            />
          </motion.div>
        );
      })}
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
    <div className="w-full max-w-[180px] mx-auto">
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
                backgroundColor: showAfter ? "rgba(255, 255, 255, 0.8)" : "rgba(255, 255, 255, 0.3)"
              }}
              transition={{ duration: 0.3 }}
            />
            <div className="h-1.5 w-1/2 bg-white/20 rounded" />
          </div>
          {showAfter && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute bottom-0.5 right-0.5 text-[7px] text-white/90 bg-white/20 px-1 py-0.5 rounded font-medium border border-white/30"
            >
              ⚠ Diff
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

// Interaction Testing Visual - Animated cursor clicks (bigger and more animated)
const InteractionVisual = () => {
  const [clickPos, setClickPos] = useState({ x: 40, y: 30 });
  const [clicking, setClicking] = useState(false);
  const [activeElement, setActiveElement] = useState(0);

  useEffect(() => {
    const positions = [
      { x: 40, y: 30, element: 0 },
      { x: 180, y: 50, element: 1 },
      { x: 120, y: 100, element: 2 },
      { x: 80, y: 140, element: 3 },
    ];
    let idx = 0;
    
    const interval = setInterval(() => {
      idx = (idx + 1) % positions.length;
      setClickPos(positions[idx]);
      setActiveElement(positions[idx].element);
      setClicking(true);
      setTimeout(() => setClicking(false), 300);
    }, 1800);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full max-w-[320px] h-48 bg-white/10 rounded-lg border border-white/20 overflow-hidden flex-shrink-0">
      {/* Mock UI elements with hover effects */}
      <motion.div 
        className="absolute top-4 left-4 w-16 h-4 bg-white/30 rounded"
        animate={{
          scale: activeElement === 0 && clicking ? 1.1 : 1,
          opacity: activeElement === 0 && clicking ? 0.8 : 0.3,
        }}
        transition={{ duration: 0.2 }}
      />
      <motion.div 
        className="absolute top-4 right-4 w-8 h-4 bg-white/50 rounded"
        animate={{
          scale: activeElement === 1 && clicking ? 1.1 : 1,
          opacity: activeElement === 1 && clicking ? 0.9 : 0.5,
        }}
        transition={{ duration: 0.2 }}
      />
      <motion.div 
        className="absolute bottom-4 left-4 w-24 h-6 bg-white/15 rounded"
        animate={{
          scale: activeElement === 2 && clicking ? 1.1 : 1,
          opacity: activeElement === 2 && clicking ? 0.6 : 0.15,
        }}
        transition={{ duration: 0.2 }}
      />
      <motion.div 
        className="absolute bottom-4 right-4 w-10 h-6 bg-white/40 rounded"
        animate={{
          scale: activeElement === 3 && clicking ? 1.1 : 1,
          opacity: activeElement === 3 && clicking ? 0.8 : 0.4,
        }}
        transition={{ duration: 0.2 }}
      />
      
      {/* Additional UI elements for richer scene */}
      <div className="absolute top-12 left-4 w-12 h-1 bg-white/20 rounded" />
      <div className="absolute top-20 left-4 w-20 h-1 bg-white/15 rounded" />
      <div className="absolute bottom-16 left-4 w-16 h-1 bg-white/10 rounded" />
      
      {/* Animated cursor with trail */}
      <motion.div
        className="absolute pointer-events-none z-10"
        animate={{ x: clickPos.x, y: clickPos.y }}
        transition={{ type: "spring", stiffness: 150, damping: 15 }}
      >
        <motion.svg 
          width="20" 
          height="20" 
          viewBox="0 0 16 16" 
          fill="none"
          animate={{
            rotate: clicking ? [0, -10, 10, 0] : 0,
            scale: clicking ? 1.2 : 1,
          }}
          transition={{ duration: 0.3 }}
        >
          <path
            d="M1 1L6 14L8 8L14 6L1 1Z"
            fill={clicking ? "rgba(255,255,255,1)" : "rgba(255,255,255,0.9)"}
            stroke={clicking ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.7)"}
            strokeWidth="1.5"
          />
        </motion.svg>
        
        {/* Click ripple effect */}
        {clicking && (
          <>
            <motion.div
              initial={{ scale: 0.5, opacity: 1 }}
              animate={{ scale: 3, opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/30 border-2 border-white/50"
            />
            <motion.div
              initial={{ scale: 0.3, opacity: 0.8 }}
              animate={{ scale: 4, opacity: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/20"
            />
          </>
        )}
        
        {/* Cursor trail */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/40"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.4, 0.8, 0.4],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </motion.div>
      
      {/* Connection lines between clicks */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
        <motion.path
          d={`M ${clickPos.x + 10} ${clickPos.y + 10} L ${clickPos.x + 10} ${clickPos.y + 10}`}
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="1"
          strokeDasharray="4 4"
          animate={{
            pathLength: [0, 1, 0],
          }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </svg>
    </div>
  );
};

// CLI & CI/CD Visual - Mini terminal (bigger and more animated)
const TerminalVisual = () => {
  const [line, setLine] = useState(0);
  const [typing, setTyping] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setTyping(true);
      setTimeout(() => {
        setLine(l => (l + 1) % 5);
        setTyping(false);
      }, 800);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setCursorVisible(v => !v);
    }, 530);
    return () => clearInterval(cursorInterval);
  }, []);

  const lines = [
    { text: "$ swarm run --ci", color: "text-white/70", icon: "💻" },
    { text: "✓ 24 tests passed", color: "text-green-400/90", icon: "✓" },
    { text: "✓ No regressions", color: "text-green-400/90", icon: "✓" },
    { text: "🚀 Deploy ready", color: "text-white/80", icon: "🚀" },
    { text: "✨ Build successful", color: "text-white/90", icon: "✨" },
  ];

  return (
    <div className="w-full max-w-[400px] bg-[#0a0a0a] rounded-lg border-2 border-white/20 overflow-hidden flex-shrink-0 shadow-lg shadow-white/5">
      {/* Terminal header with animated dots */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10 bg-[#0d0d0d]">
        <motion.div 
          className="w-2.5 h-2.5 rounded-full bg-red-500/80"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <motion.div 
          className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
        />
        <motion.div 
          className="w-2.5 h-2.5 rounded-full bg-green-500/80"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.4 }}
        />
        <div className="flex-1 text-[9px] text-white/40 font-mono ml-2">swarm-terminal</div>
      </div>
      
      {/* Terminal content with enhanced animations */}
      <div className="p-3 font-mono text-xs h-[100px] overflow-hidden bg-gradient-to-b from-[#0a0a0a] to-[#050505]">
        {lines.slice(0, line + 1).map((l, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ 
              opacity: 1, 
              x: 0,
              scale: i === line && typing ? [1, 1.02, 1] : 1,
            }}
            transition={{ 
              duration: 0.3,
              delay: i * 0.1,
            }}
            className={cn(l.color, "leading-relaxed flex items-center gap-2 mb-1")}
          >
            <span className="text-[10px]">{l.icon}</span>
            <span>{l.text}</span>
            {i === line && (
              <motion.span
                animate={{ opacity: cursorVisible ? 1 : 0 }}
                transition={{ duration: 0.5 }}
                className="inline-block w-2 h-4 bg-white/70 ml-1"
              />
            )}
          </motion.div>
        ))}
        
        {/* Progress indicator */}
        {line < lines.length - 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="flex items-center gap-1 mt-2 text-white/40 text-[9px]"
          >
            <div className="flex gap-0.5">
              <motion.div
                className="w-1 h-1 rounded-full bg-white/40"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}
              />
              <motion.div
                className="w-1 h-1 rounded-full bg-white/40"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
              />
              <motion.div
                className="w-1 h-1 rounded-full bg-white/40"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}
              />
            </div>
            <span className="ml-1">Running tests...</span>
          </motion.div>
        )}
      </div>
      
      {/* Animated bottom border */}
      <motion.div
        className="h-0.5 bg-gradient-to-r from-transparent via-white/20 to-transparent"
        animate={{
          backgroundPosition: ["0%", "100%"],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "linear",
        }}
      />
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
    { label: "AA", color: "from-white/70 to-white/50", score: 95 },
    { label: "AAA", color: "from-white/60 to-white/40", score: 88 },
    { label: "WCAG", color: "from-white/50 to-white/30", score: 92 },
  ];

  return (
    <div className="flex flex-col gap-3 w-full max-w-[180px] mx-auto">
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

// A/B Testing Visual - Two variants with comparison metrics
const ABTestingVisual = () => {
  const [activeVariant, setActiveVariant] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => setActiveVariant(v => (v + 1) % 2), 2000);
    return () => clearInterval(interval);
  }, []);

  const variants = [
    { label: "A", conversion: 42, color: "from-white/60 to-white/40" },
    { label: "B", conversion: 58, color: "from-white/80 to-white/60" },
  ];

  return (
    <div className="w-full max-w-[200px] mx-auto">
      <div className="flex gap-2 mb-3">
        {variants.map((variant, i) => (
          <div
            key={variant.label}
            className={cn(
              "flex-1 rounded-lg border overflow-hidden transition-all",
              activeVariant === i
                ? "border-white/40 bg-white/10"
                : "border-white/15 bg-white/5"
            )}
          >
            <div className={cn(
              "h-12 bg-gradient-to-br flex items-center justify-center text-sm font-bold text-white",
              variant.color
            )}>
              Variant {variant.label}
            </div>
            <div className="p-2">
              <div className="text-[9px] text-white/50 mb-1">Conversion</div>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-semibold text-white">{variant.conversion}%</span>
                {activeVariant === i && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-[8px] text-white/90 font-medium"
                  >
                    ↑ Winner
                  </motion.span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-2 text-[9px] text-white/40">
        <div className="w-1.5 h-1.5 rounded-full bg-white/60" />
        <span>Test running...</span>
      </div>
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
              <stop offset="0%" stopColor="rgba(255,255,255,0.8)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.5)" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-semibold text-white">{value}%</span>
        </div>
      </div>
      <div className="flex flex-col gap-1 text-[9px]">
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-white/80" />
          <span className="text-white/70">12 passed</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-white/50" />
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
  },
  {
    title: "A/B Testing",
    description: "Compare variants and measure performance with statistical confidence to optimize user experiences.",
    visual: ABTestingVisual,
    className: "md:col-span-1 md:row-span-1"
  }
];

export function FeaturesGrid() {
  return (
    <section id="features" className="relative z-10 py-24 md:py-32 border-b border-white/5 bg-transparent dark-scrollbar">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="mb-12 md:mb-16 max-w-2xl">
          <h2 className="text-3xl md:text-4xl font-light text-white mb-4 md:mb-6">
            Complete coverage for your <br />
            <span className="text-white/50">modern application.</span>
          </h2>
          <p className="text-base md:text-lg text-white/50 leading-relaxed">
            From visual regression to complex user flows, Swarm handles the tedious parts of testing so you can ship with confidence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 auto-rows-[minmax(240px,auto)] gap-0 border-l border-t border-white/5">
          {FEATURES.map((feature) => {
            // Determine spacing based on feature
            const needsMoreSpace = feature.title === "Autonomous Exploration" || feature.title === "AI Personas";
            const isCompact = feature.title === "Visual Regression" || feature.title === "Instant Feedback";
            const isWide = feature.className.includes("col-span-2");
            
            return (
              <div 
                key={feature.title}
                className={cn(
                  "group relative border-r border-b border-white/5 hover:bg-white/[0.02] transition-colors duration-300 flex flex-col",
                  needsMoreSpace ? "p-8" : isCompact ? "p-6" : "p-7",
                  feature.className
                )}
              >
                <div className={cn(
                  "flex-shrink-0 flex items-center justify-center",
                  needsMoreSpace ? "mb-6" : isCompact ? "mb-4" : "mb-5",
                  isWide && "justify-start"
                )}>
                  <feature.visual />
                </div>
                <div className="mt-auto pt-2">
                  <h3 className="text-lg font-medium text-white mb-2 group-hover:text-white/90 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-white/50 leading-relaxed group-hover:text-white/70 transition-colors">
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
