"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const FEATURES = [
  {
    title: "Provide Context",
    description:
      "Upload a feature flow, screen, or product link and describe the decision you want to test.",
    visual: ContextVisual,
  },
  {
    title: "Simulate Users",
    description:
      "Swarm generates realistic users that interact with your product based on your customer profile.",
    visual: SimulateVisual,
  },
  {
    title: "Observe Behavior",
    description:
      "Watch how users move through the feature. See where they hesitate, get confused, or drop off.",
    visual: ObserveVisual,
  },
  {
    title: "Get Clear Insights",
    description:
      "Swarm summarizes what worked, what didn't, and what to fix before you ship.",
    visual: InsightsVisual,
  },
];

// Typing effect hook
function useTypingEffect(texts: string[], typingSpeed = 100, deletingSpeed = 50, pauseDuration = 2000) {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentFullText = texts[currentTextIndex];
    
    if (!isDeleting && currentText === currentFullText) {
      // Finished typing, pause then start deleting
      const timeout = setTimeout(() => {
        setIsDeleting(true);
      }, pauseDuration);
      return () => clearTimeout(timeout);
    }

    if (isDeleting && currentText === "") {
      // Finished deleting, move to next text
      setIsDeleting(false);
      setCurrentTextIndex((prev) => (prev + 1) % texts.length);
      return;
    }

    const timeout = setTimeout(() => {
      if (isDeleting) {
        setCurrentText((prev) => prev.slice(0, -1));
      } else {
        setCurrentText((prev) => currentFullText.slice(0, prev.length + 1));
      }
    }, isDeleting ? deletingSpeed : typingSpeed);

    return () => clearTimeout(timeout);
  }, [currentText, currentTextIndex, isDeleting, texts, typingSpeed, deletingSpeed, pauseDuration]);

  return currentText;
}

// Tall visual components for vertical cards
function ContextVisual() {
  const exampleTexts = [
    "Checkout a product",
    "Signup for the platform",
    "Find contact info"
  ];
  const typedText = useTypingEffect(exampleTexts, 80, 40, 2000);

  return (
    <div className="relative w-full h-full min-h-[420px] rounded-xl overflow-hidden">
      {/* Background image - more faint */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-40"
        style={{ backgroundImage: "url('/images/background_cards/1.png')" }}
      />
      {/* Bottom fade overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-slate-50/70 via-35% to-transparent" />
      
      {/* UI Mockup - Input and Upload */}
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className="w-full max-w-[220px] space-y-3">
          {/* Text Input */}
          <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-6">
            <div className="text-[10px] text-slate-500 mb-2 font-medium">Describe your test</div>
            <div className="bg-slate-50 rounded border border-slate-200 px-3 py-3 min-h-[36px] flex items-center">
              <div className="text-xs text-slate-400">
                {typedText}
                <span className="animate-pulse">|</span>
              </div>
            </div>
          </div>
          
          {/* Upload Box */}
          <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-4">
            <div className="border-2 border-dashed border-blue-200 rounded-lg p-4 flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <div className="text-[10px] text-slate-500 text-center">
                Drop screenshot or URL
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SimulateVisual() {
  const personas = [
    { initials: "JD", name: "Jane Doe", role: "Head of Sales", goal: "Complete checkout flow" },
    { initials: "MK", name: "Mike Kim", role: "Retail Shopper", goal: "Find pricing info" },
    { initials: "SL", name: "Sarah Lee", role: "Enterprise Buyer", goal: "Upgrade subscription" },
  ];

  // Track which persona is currently "active" (in focus)
  const [activeIndex, setActiveIndex] = useState(0);

  // Cycle through personas
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % personas.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [personas.length]);

  return (
    <div className="relative w-full h-full min-h-[420px] rounded-xl overflow-hidden">
      {/* Background image - more faint */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-40"
        style={{ backgroundImage: "url('/images/background_cards/2.png')" }}
      />
      {/* Bottom fade overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-slate-50/70 via-35% to-transparent" />
      
      {/* Persona Generator UI */}
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className="w-full max-w-[220px] space-y-2">
          
          {/* Header Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="bg-white rounded-lg shadow-lg border border-slate-200 px-3 py-2"
          >
            <div className="flex items-center gap-1.5">
              <div className="text-[10px] text-slate-500 font-medium">Generating Personas</div>
              <div className="flex gap-0.5 items-center">
                <motion.div
                  className="w-1 h-1 rounded-full bg-blue-500"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
                />
                <motion.div
                  className="w-1 h-1 rounded-full bg-blue-500"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
                />
                <motion.div
                  className="w-1 h-1 rounded-full bg-blue-500"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
                />
              </div>
            </div>
          </motion.div>
          
          {/* Persona Cards with alternating focus */}
          {personas.map((persona, index) => {
            const isActive = index === activeIndex;
            
            return (
              <motion.div
                key={persona.initials}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.2 }}
                animate={{
                  filter: isActive ? "blur(0px)" : "blur(1.5px)",
                  opacity: isActive ? 1 : 0.6,
                  scale: isActive ? 1 : 0.98,
                }}
                className="bg-white rounded-lg shadow-lg border border-slate-200 p-2.5"
                style={{ transition: "filter 0.4s ease, opacity 0.4s ease, transform 0.4s ease" }}
              >
                <div className="flex items-start gap-2">
                  {/* Avatar */}
                  <motion.div 
                    className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-[9px] font-semibold flex-shrink-0"
                    animate={{
                      boxShadow: isActive ? "0 0 0 2px rgba(59, 130, 246, 0.3)" : "0 0 0 0px rgba(59, 130, 246, 0)",
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    {persona.initials}
                  </motion.div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-medium text-slate-700">{persona.name}</div>
                    <div className="text-[10px] text-slate-500">{persona.role}</div>
                    <div className="text-[9px] text-blue-600 mt-0.5 truncate">&quot;{persona.goal}&quot;</div>
                  </div>
                </div>
              </motion.div>
            );
          })}
          
        </div>
      </div>
    </div>
  );
}

function ObserveVisual() {
  // Journey points with coordinates matching the SVG path
  const journeyPoints = [
    { x: 20, y: 30, isDropoff: false },
    { x: 80, y: 50, isDropoff: false },
    { x: 140, y: 70, isDropoff: false },
    { x: 100, y: 120, isDropoff: false },
    { x: 60, y: 140, isDropoff: true },
  ];

  // Animation timing constants
  const pathDuration = 3; // seconds to draw the full path
  const dotRevealInterval = pathDuration / journeyPoints.length;
  const pauseDuration = 1.5; // pause at end before restart
  const totalDuration = pathDuration + pauseDuration;

  // Calculate approximate path length for stroke-dashoffset animation
  const pathLength = 220; // approximate length of the path

  return (
    <div className="relative w-full h-full min-h-[420px] rounded-xl overflow-hidden">
      {/* Background image - more faint */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-40"
        style={{ backgroundImage: "url('/images/background_cards/3.png')" }}
      />
      {/* Bottom fade overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-slate-50/70 via-35% to-transparent" />
      
      {/* Analytics Dashboard Mockup */}
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className="w-full max-w-[240px] bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-semibold text-slate-700">User Journey</div>
              <div className="flex gap-1">
                <motion.div
                  className="w-1.5 h-1.5 rounded-full bg-blue-400"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                  className="w-1.5 h-1.5 rounded-full bg-blue-400"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                />
                <motion.div
                  className="w-1.5 h-1.5 rounded-full bg-blue-400"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 text-[9px] text-slate-500">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Active</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-slate-400" />
                <span>Drop-off</span>
              </div>
            </div>
          </div>
          
          {/* Content Area */}
          <div className="p-4 relative h-52 bg-gradient-to-b from-slate-50/30 to-white">
            {/* Simplified UI mockup */}
            <div className="space-y-3 mb-4">
              {/* Header section */}
              <div className="space-y-1.5">
                <div className="h-2.5 bg-slate-200 rounded w-3/4" />
                <div className="h-2 bg-slate-100 rounded w-1/2" />
              </div>
              
              {/* Button area */}
              <div className="flex gap-2">
                <div className="h-5 w-16 bg-slate-200 rounded" />
                <div className="h-5 w-20 bg-slate-300 rounded" />
              </div>
              
              {/* Content blocks */}
              <div className="space-y-1.5 pt-2">
                <div className="h-1.5 bg-slate-100 rounded w-full" />
                <div className="h-1.5 bg-slate-100 rounded w-4/5" />
                <div className="h-1.5 bg-slate-100 rounded w-3/4" />
              </div>
            </div>
            
            {/* Animated SVG path that draws itself */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {/* Background faint path (always visible) */}
              <path
                d="M 20 30 L 80 50 L 140 70 L 100 120 L 60 140"
                stroke="#e2e8f0"
                strokeWidth="2"
                fill="none"
                strokeDasharray="4 4"
                opacity="0.6"
              />
              {/* Animated drawing path */}
              <motion.path
                d="M 20 30 L 80 50 L 140 70 L 100 120 L 60 140"
                stroke="#3b82f6"
                strokeWidth="2"
                fill="none"
                strokeDasharray={pathLength}
                initial={{ strokeDashoffset: pathLength }}
                animate={{ 
                  strokeDashoffset: [pathLength, 0, 0, pathLength],
                }}
                transition={{
                  duration: totalDuration,
                  times: [0, pathDuration / totalDuration, (pathDuration + 0.5) / totalDuration, 1],
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </svg>
            
            {/* Animated journey dots that appear sequentially */}
            {journeyPoints.map((point, i) => (
              <motion.div
                key={i}
                className={`absolute rounded-full shadow-sm ${
                  point.isDropoff ? "w-2 h-2 bg-slate-400" : i === 0 ? "w-2 h-2 bg-blue-500" : "w-1.5 h-1.5 bg-blue-400"
                }`}
                style={{ left: point.x - 4, top: point.y - 4 }}
                animate={{
                  opacity: [0, 0, 1, 1, 0],
                  scale: [0.5, 0.5, 1, 1, 0.5],
                }}
                transition={{
                  duration: totalDuration,
                  times: [
                    0,
                    (i * dotRevealInterval) / totalDuration,
                    ((i * dotRevealInterval) + 0.15) / totalDuration,
                    (pathDuration + pauseDuration * 0.7) / totalDuration,
                    1
                  ],
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              />
            ))}
            
            {/* Animated cursor/pointer that follows the path */}
            <motion.div
              className="absolute w-3 h-3 pointer-events-none"
              style={{ left: -6, top: -6 }}
              animate={{
                x: [
                  journeyPoints[0].x,
                  journeyPoints[1].x,
                  journeyPoints[2].x,
                  journeyPoints[3].x,
                  journeyPoints[4].x,
                  journeyPoints[4].x,
                ],
                y: [
                  journeyPoints[0].y,
                  journeyPoints[1].y,
                  journeyPoints[2].y,
                  journeyPoints[3].y,
                  journeyPoints[4].y,
                  journeyPoints[4].y,
                ],
                opacity: [1, 1, 1, 1, 1, 0],
                scale: [1, 1, 1, 1, 1, 0.5],
              }}
              transition={{
                duration: totalDuration,
                times: [0, 0.15, 0.35, 0.5, pathDuration / totalDuration, 1],
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              {/* Cursor icon */}
              <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-md">
                <path
                  d="M4 4L10 20L12 14L18 12L4 4Z"
                  fill="#1e40af"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
            </motion.div>
            
            {/* Pulsing ring at current cursor position */}
            <motion.div
              className="absolute w-6 h-6 rounded-full border-2 border-blue-400 pointer-events-none"
              style={{ left: -12, top: -12 }}
              animate={{
                x: [
                  journeyPoints[0].x,
                  journeyPoints[1].x,
                  journeyPoints[2].x,
                  journeyPoints[3].x,
                  journeyPoints[4].x,
                  journeyPoints[4].x,
                ],
                y: [
                  journeyPoints[0].y,
                  journeyPoints[1].y,
                  journeyPoints[2].y,
                  journeyPoints[3].y,
                  journeyPoints[4].y,
                  journeyPoints[4].y,
                ],
                opacity: [0.6, 0.6, 0.6, 0.6, 0.6, 0],
                scale: [1, 1.3, 1, 1.3, 1, 0],
              }}
              transition={{
                duration: totalDuration,
                times: [0, 0.15, 0.35, 0.5, pathDuration / totalDuration, 1],
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            
            {/* Stats overlay */}
            <div className="absolute bottom-2 left-2 right-2 bg-white/90 backdrop-blur-sm rounded-lg p-2 border border-slate-200/50">
              <div className="flex items-center justify-between text-[9px]">
                <div className="text-slate-600">
                  <span className="font-semibold text-slate-900">1.4m</span> avg time
                </div>
                <div className="text-slate-600">
                  <span className="font-semibold text-slate-900">2</span> hesitations
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InsightsVisual() {
  const issues = [
    { text: "Button label unclear", delay: 0 },
    { text: "Form takes too long", delay: 1.5 },
  ];

  return (
    <div className="relative w-full h-full min-h-[420px] rounded-xl overflow-hidden">
      {/* Background image - more faint */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-40"
        style={{ backgroundImage: "url('/images/background_cards/4.png')" }}
      />
      {/* Bottom fade overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-slate-50/70 via-35% to-transparent" />
      
      {/* Dashboard Insights Mockup */}
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className="w-full max-w-[220px] space-y-3">
          
          {/* Summary Card */}
          <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-3">
            <div className="text-[10px] text-slate-500 mb-2 font-medium">Test Summary</div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                <svg className="w-3 h-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="text-xs font-medium text-slate-700">4 of 4 users completed</div>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full w-4/4 bg-blue-500 rounded-full" />
            </div>
          </div>
          
          {/* Issues Found */}
          <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-3">
            <div className="text-[10px] text-slate-500 mb-2 font-medium">Issues Found</div>
            <div className="space-y-2">
              {issues.map((issue, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="relative mt-1 flex-shrink-0">
                    {/* Pulsing ring behind the dot */}
                    <motion.div
                      className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-blue-400"
                      animate={{
                        scale: [1, 2, 1],
                        opacity: [0.6, 0, 0.6],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: issue.delay,
                        ease: "easeOut",
                      }}
                    />
                    {/* Main dot */}
                    <motion.div
                      className="w-1.5 h-1.5 rounded-full bg-blue-500"
                      animate={{
                        scale: [1, 1.2, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: issue.delay,
                        ease: "easeOut",
                      }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-600">{issue.text}</div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Recommendation */}
          <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-3">
            <div className="text-[10px] text-slate-500 mb-1.5 font-medium">Recommendation</div>
            <div className="text-[10px] text-slate-700 leading-relaxed">
              Simplify checkout to 2 steps and rename CTA to &quot;Complete Purchase&quot;
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}

export function Features() {
  return (
    <section
      id="how-it-works"
      className="relative py-24 md:py-32 bg-slate-50 overflow-hidden"
    >
      {/* Subtle gradient overlays for depth and visual interest */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-100/50 via-transparent to-slate-100/50" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50/30 via-transparent to-transparent" />
      </div>

      <div className="container mx-auto px-4 md:px-8 max-w-[1300px] relative z-10">
        {/* Header - Centered */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16 md:mb-20"
        >
          <h2 className="text-4xl md:text-5xl font-sans font-light tracking-tight text-slate-950 mb-5 leading-[1.15]">
            Simulate user behavior 
            <br />
            before you impact them
          </h2>
          <p className="text-lg md:text-xl text-slate-600 font-light leading-relaxed">
          Preview how users move through a feature 
          <br />
          and catch friction early, while changes are still easy.
          </p>
        </motion.div>

        {/* Feature Cards - 4 Vertical Cards Side by Side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((feature, idx) => {
            const Visual = feature.visual;

            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="group flex flex-col"
              >
                {/* Tall Visual Area */}
                <div className="mb-5">
                  <Visual />
                  </div>

                {/* Text Content */}
                  <div>
                  <h3 className="text-lg font-medium text-slate-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
