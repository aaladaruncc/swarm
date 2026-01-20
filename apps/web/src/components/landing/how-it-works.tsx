"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const TABS = [
  {
    id: "simulated-data",
    title: "Simulated Data",
    shortTitle: "Simulated Data",
    description: "Generate realistic user behavior patterns and test scenarios using advanced simulation techniques.",
    content: {
      overview: "Our simulated data engine creates authentic user interactions by modeling real-world behavior patterns, demographics, and interaction flows.",
      features: [
        "Behavioral pattern generation based on real user analytics",
        "Demographic and psychographic persona modeling",
        "Realistic interaction sequences and user journeys",
        "Context-aware scenario generation for edge cases",
        "Statistical distribution modeling for realistic test coverage"
      ],
      benefits: [
        "Test with data that mirrors real user behavior",
        "Discover edge cases before production deployment",
        "Validate UI/UX decisions with realistic scenarios",
        "Reduce reliance on manual test data creation"
      ]
    }
  },
  {
    id: "user-sessions-synthetic",
    title: "Synthetic User Sessions",
    shortTitle: "Synthetic Sessions",
    description: "Create and replay synthetic user sessions that mimic real user interactions across your application.",
    content: {
      overview: "Synthetic user sessions are AI-generated interaction sequences that replicate authentic user behavior, enabling comprehensive testing without requiring real user data or manual test case creation.",
      features: [
        "AI-powered session generation with natural interaction patterns",
        "Multi-step user flows with realistic timing and pauses",
        "Cross-device and cross-browser session replication",
        "Session replay and debugging capabilities",
        "Parallel execution of multiple synthetic sessions"
      ],
      benefits: [
        "Scale testing without manual test case creation",
        "Reproduce complex user journeys automatically",
        "Test edge cases and error scenarios systematically",
        "Maintain test coverage as your application evolves"
      ]
    }
  },
  {
    id: "uxagent-research",
    title: "UXAgent Research",
    shortTitle: "UXAgent Research",
    description: "Built on cutting-edge research in autonomous agent systems and user experience testing methodologies.",
    content: {
      overview: "UXAgent leverages state-of-the-art research in autonomous AI agents, combining dual-loop reasoning systems with memory streams to create intelligent testing agents that think and act like real users.",
      features: [
        "Dual-loop architecture: fast reactive loop and slow reasoning loop",
        "Memory stream system with importance scoring and relevance matching",
        "Context-aware perception and action planning",
        "Autonomous exploration with strategic decision-making",
        "Continuous learning from interaction patterns"
      ],
      benefits: [
        "Agents that understand context and make intelligent decisions",
        "Comprehensive exploration beyond predefined test cases",
        "Adaptive testing that evolves with your application",
        "Research-backed methodology for reliable results"
      ]
    }
  }
];

export function HowItWorks() {
  const [activeTab, setActiveTab] = useState(TABS[0].id);

  const activeTabData = TABS.find(tab => tab.id === activeTab) || TABS[0];

  return (
    <section 
      id="how-it-works" 
      className="relative z-10 py-24 md:py-32 border-b border-white/5 bg-transparent"
    >
      <div className="container mx-auto px-6 max-w-7xl w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16 max-w-3xl"
        >
          <h2 className="text-3xl md:text-4xl font-light text-white mb-4 md:mb-6">
            Intelligent testing for your <br />
            <span className="text-white/50">development workflow.</span>
          </h2>
          <p className="text-base md:text-lg text-white/50 leading-relaxed">
            Understanding the underlying concepts that power Swarm's intelligent testing capabilities.
          </p>
        </motion.div>

        {/* Horizontal Accordion */}
        <div className="space-y-0">
          {/* Tab Headers */}
          <div className="flex gap-2 mb-8 border-b border-white/10 pb-2">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "px-6 py-3 text-sm md:text-base font-medium transition-all duration-300 relative",
                    isActive
                      ? "text-white"
                      : "text-white/50 hover:text-white/70"
                  )}
                >
                  {tab.shortTitle}
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/80"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="relative min-h-[500px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="bg-white/5 border border-white/10 rounded-lg p-8 md:p-12"
              >
                {/* Title */}
                <h3 className="text-2xl md:text-3xl lg:text-4xl font-medium text-white mb-4">
                  {activeTabData.title}
                </h3>

                {/* Description */}
                <p className="text-base md:text-lg text-white/60 leading-relaxed mb-8">
                  {activeTabData.description}
                </p>

                {/* Overview */}
                <div className="mb-8">
                  <h4 className="text-lg font-medium text-white/90 mb-3">Overview</h4>
                  <p className="text-base text-white/50 leading-relaxed">
                    {activeTabData.content.overview}
                  </p>
                </div>

                {/* Features and Benefits Grid */}
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Features */}
                  <div>
                    <h4 className="text-lg font-medium text-white/90 mb-4">Key Features</h4>
                    <ul className="space-y-3">
                      {activeTabData.content.features.map((feature, index) => (
                        <motion.li
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-start gap-3 text-sm md:text-base text-white/50"
                        >
                          <span className="mt-2 w-1.5 h-1.5 rounded-full bg-white/60 flex-shrink-0" />
                          <span>{feature}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>

                  {/* Benefits */}
                  <div>
                    <h4 className="text-lg font-medium text-white/90 mb-4">Benefits</h4>
                    <ul className="space-y-3">
                      {activeTabData.content.benefits.map((benefit, index) => (
                        <motion.li
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-start gap-3 text-sm md:text-base text-white/50"
                        >
                          <span className="mt-2 w-1.5 h-1.5 rounded-full bg-white/40 flex-shrink-0" />
                          <span>{benefit}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
