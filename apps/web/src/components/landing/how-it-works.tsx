"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const INPUT_MODES = [
  {
    id: "live-capture",
    title: "Live Capture",
    description: "Paste any URL and watch AI agents explore your product in real-time.",
  },
  {
    id: "visual-scan",
    title: "Visual Scan",
    description: "Drop screenshots or designs for instant accessibility and UX analysis.",
  },
  {
    id: "session-replay",
    title: "Session Replay",
    description: "Upload session recordings to uncover friction points you missed.",
  },
];

const VISUAL_ITEMS = [
  { type: "url", content: "https://app.acme.io/checkout", label: "Live URL" },
  { type: "image", content: "onboarding_flow.png", label: "Screenshot" },
  { type: "video", content: "user_session_047.mp4", label: "Recording" },
  { type: "url", content: "https://dashboard.io/settings", label: "Live URL" },
  { type: "image", content: "mobile_nav_v2.png", label: "Screenshot" },
  { type: "video", content: "checkout_replay.webm", label: "Recording" },
];

export function HowItWorks() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [visualIndex, setVisualIndex] = useState(0);

  // Cycle through input modes (left side)
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % INPUT_MODES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Cycle through visual items (right side) - faster
  useEffect(() => {
    const interval = setInterval(() => {
      setVisualIndex((prev) => (prev + 1) % VISUAL_ITEMS.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section
      id="how-it-works"
      className="relative z-10 py-24 md:py-32 bg-transparent"
    >
      <div className="container mx-auto px-6 max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-light text-white mb-4">
            Test any interface
          </h2>
          <p className="text-base md:text-lg text-white/50 max-w-2xl mx-auto">
            Works with live URLs, static designs, and video recordings.
          </p>
        </motion.div>

        {/* Two column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">

          {/* Left: Mode selectors */}
          <div className="space-y-4">
            {INPUT_MODES.map((mode, idx) => {
              const isActive = idx === activeIndex;
              return (
                <motion.button
                  key={mode.id}
                  onClick={() => setActiveIndex(idx)}
                  className={`w-full text-left p-6 rounded-xl border transition-all duration-300 ${isActive
                    ? "border-white/20 bg-white/[0.05]"
                    : "border-white/5 bg-transparent hover:border-white/10"
                    }`}
                  whileHover={{ x: isActive ? 0 : 4 }}
                >
                  <div className="flex items-start gap-4">
                    {/* Active indicator */}
                    <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 transition-colors duration-300 ${isActive ? "bg-white" : "bg-white/20"
                      }`} />

                    <div>
                      <h3 className={`text-lg font-medium mb-1 transition-colors duration-300 ${isActive ? "text-white" : "text-white/50"
                        }`}>
                        {mode.title}
                      </h3>
                      <AnimatePresence mode="wait">
                        {isActive && (
                          <motion.p
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="text-sm text-white/40 leading-relaxed"
                          >
                            {mode.description}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Right: Shuffling visual */}
          <div className="relative">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 md:p-10 min-h-[320px] flex flex-col justify-center">

              {/* Stack of cards effect */}
              <div className="relative h-[200px] flex items-center justify-center">
                {/* Background cards for depth */}
                <div className="absolute w-full max-w-[320px] h-16 rounded-lg border border-white/5 bg-white/[0.02] transform translate-y-8 scale-95 opacity-30" />
                <div className="absolute w-full max-w-[320px] h-16 rounded-lg border border-white/5 bg-white/[0.02] transform translate-y-4 scale-[0.98] opacity-50" />

                {/* Active card */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={visualIndex}
                    initial={{ opacity: 0, y: -40, rotateX: -15 }}
                    animate={{ opacity: 1, y: 0, rotateX: 0 }}
                    exit={{ opacity: 0, y: 40, rotateX: 15 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="relative w-full max-w-[320px] rounded-lg border border-white/20 bg-white/[0.05] p-5"
                  >
                    {/* Type badge */}
                    <div className="absolute -top-2.5 left-4 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-white/10 border border-white/10 rounded text-white/50">
                      {VISUAL_ITEMS[visualIndex].label}
                    </div>

                    {/* Content */}
                    <div className="font-mono text-sm text-white/70 pt-2 truncate">
                      {VISUAL_ITEMS[visualIndex].content}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Processing dots */}
              <div className="flex justify-center gap-1.5 mt-6">
                {[0, 1, 2].map((dot) => (
                  <motion.div
                    key={dot}
                    className="w-1.5 h-1.5 rounded-full bg-white/30"
                    animate={{
                      opacity: [0.3, 1, 0.3],
                      scale: [1, 1.2, 1]
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      delay: dot * 0.2
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
