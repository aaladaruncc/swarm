"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    number: "01",
    title: "Define Your Test Parameters",
    description: "Start by configuring your swarm with target URLs, user personas, and test scenarios. Our system instantly provisions isolated browser contexts for each agent, ensuring clean and independent test runs.",
    details: [
      "Configure target URLs and entry points",
      "Select or create AI personas with specific behaviors",
      "Define test scenarios and critical user flows",
      "Set up device and viewport configurations"
    ]
  },
  {
    number: "02",
    title: "Launch Autonomous Agents",
    description: "Once initialized, AI agents begin intelligently navigating your application. They explore user flows, discover edge cases, and interact with your UI just like real users would—clicking, scrolling, and filling forms autonomously.",
    details: [
      "Agents navigate using context-aware decision making",
      "Parallel execution across multiple browser contexts",
      "Real-time telemetry capture (clicks, scrolls, interactions)",
      "Automatic discovery of user flows and edge cases"
    ]
  },
  {
    number: "03",
    title: "Capture Behavioral Signals",
    description: "Throughout the exploration, Swarm captures comprehensive behavioral data including DOM snapshots, interaction patterns, performance metrics, and visual regressions. Every action is recorded for detailed analysis.",
    details: [
      "DOM snapshots at key interaction points",
      "Video replays of complete user sessions",
      "Visual regression detection across viewports",
      "Performance and accessibility metrics"
    ]
  },
  {
    number: "04",
    title: "Generate Actionable Reports",
    description: "Get comprehensive reports with prioritized issue lists, video replays, and prescriptive recommendations. Our analytics engine identifies common breakdowns, severity scores, and provides ready-to-ship fixes.",
    details: [
      "Prioritized issue lists with severity scoring",
      "Video replays and DOM snapshots for debugging",
      "Prescriptive recommendations for fixes",
      "Exportable reports in PDF format"
    ]
  },
  {
    number: "05",
    title: "Integrate into Your Workflow",
    description: "Run Swarm in your CI/CD pipeline or on-demand through our CLI. Get instant feedback on every deploy, baseline drift alerts, and continuous confidence that your changes work as expected.",
    details: [
      "CI/CD integration hooks",
      "Command-line interface for local testing",
      "Baseline drift detection and alerts",
      "Continuous monitoring of critical flows"
    ]
  }
];

export function HowItWorks() {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"]
  });

  // Calculate which step to show based on scroll progress
  // Map scroll progress (0-1) to step index (0 to STEPS.length-1)
  const stepProgress = useTransform(
    scrollYProgress,
    [0, 1],
    [0, STEPS.length - 1]
  );

  // Get the current step index as a number
  const [currentStep, setCurrentStep] = React.useState(0);

  React.useEffect(() => {
    const unsubscribe = stepProgress.on("change", (latest) => {
      // Clamp the value and round to nearest step
      const clamped = Math.max(0, Math.min(STEPS.length - 1, latest));
      const newStep = Math.round(clamped);
      if (newStep !== currentStep && newStep >= 0 && newStep < STEPS.length) {
        setCurrentStep(newStep);
      }
    });

    return () => unsubscribe();
  }, [stepProgress, currentStep]);

  const activeStep = STEPS[currentStep];

  return (
    <section 
      id="how-it-works" 
      ref={containerRef}
      className="relative z-10 min-h-screen flex items-center border-b border-white/5 bg-transparent"
    >
      <div className="container mx-auto px-6 max-w-7xl w-full py-32">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16 max-w-3xl"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-light text-white mb-6">
            How it <span className="text-white/50">Works</span>
          </h2>
          <p className="text-lg text-white/50 leading-relaxed">
            From a single command to comprehensive test coverage in minutes. Watch as AI agents autonomously explore your application and deliver actionable insights.
          </p>
        </motion.div>

        {/* Step Indicators */}
        <div className="flex gap-4 mb-12 flex-wrap">
          {STEPS.map((step, index) => {
            const isActive = currentStep === index;
            const isPast = currentStep > index;
            
            return (
              <motion.button
                key={index}
                onClick={() => {
                  // Scroll to position that shows this step
                  if (containerRef.current) {
                    const containerTop = containerRef.current.offsetTop;
                    const containerHeight = containerRef.current.offsetHeight;
                    const viewportHeight = window.innerHeight;
                    // Calculate scroll position to center the section
                    const scrollPosition = containerTop - viewportHeight / 2 + (index / (STEPS.length - 1)) * containerHeight;
                    window.scrollTo({ top: Math.max(0, scrollPosition), behavior: "smooth" });
                  }
                }}
                className={cn(
                  "px-4 py-2 rounded-lg border transition-all duration-300 text-sm font-medium",
                  isActive
                    ? "border-blue-400/50 bg-blue-400/10 text-blue-300"
                    : isPast
                    ? "border-white/30 bg-white/5 text-white/60 hover:border-white/40"
                    : "border-white/10 bg-transparent text-white/30 hover:border-white/20"
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {step.number}
              </motion.button>
            );
          })}
        </div>

        {/* Main Content Area - Fixed Position */}
        <div className="relative min-h-[500px] md:min-h-[600px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -30, scale: 0.95 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="bg-white/5 border border-white/10 rounded-lg p-8 md:p-12"
            >
              {/* Step Number */}
              <div className="flex items-center gap-4 mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="w-16 h-16 md:w-20 md:h-20 rounded-full border-2 border-blue-400/50 bg-blue-400/10 flex items-center justify-center text-lg md:text-xl font-medium text-blue-300"
                >
                  {activeStep.number}
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="h-px flex-1 bg-gradient-to-r from-blue-400/50 to-transparent"
                />
              </div>

              {/* Title */}
              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-2xl md:text-3xl lg:text-4xl font-medium text-white mb-6"
              >
                {activeStep.title}
              </motion.h3>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-base md:text-lg text-white/60 leading-relaxed mb-8"
              >
                {activeStep.description}
              </motion.p>

              {/* Details List */}
              <motion.ul
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="space-y-4"
              >
                {activeStep.details.map((detail, detailIndex) => (
                  <motion.li
                    key={detailIndex}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + detailIndex * 0.1 }}
                    className="flex items-start gap-4 text-sm md:text-base text-white/50"
                  >
                    <span className="mt-2 w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                    <span>{detail}</span>
                  </motion.li>
                ))}
              </motion.ul>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Scroll Progress Indicator */}
        <div className="mt-12 flex items-center gap-2">
          <div className="flex-1 h-px bg-white/10 relative overflow-hidden">
            <motion.div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-400/50 to-cyan-400/50"
              style={{
                width: useTransform(scrollYProgress, [0, 1], ["0%", "100%"]),
              }}
            />
          </div>
          <motion.span
            className="text-xs text-white/40 font-medium min-w-[60px] text-right"
            style={{
              opacity: useTransform(scrollYProgress, [0, 0.1, 0.9, 1], [0, 1, 1, 0]),
            }}
          >
            {currentStep + 1} / {STEPS.length}
          </motion.span>
        </div>
      </div>
    </section>
  );
}
