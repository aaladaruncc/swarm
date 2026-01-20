"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const TABS = [
  {
    id: "input-formats",
    title: "Multiple Input Formats",
    shortTitle: "Input Formats",
    description: "Screenshots, videos, or live URLs—test from any angle.",
    content: {
      items: [
        {
          label: "Screenshots",
          description: "Upload static images for visual analysis"
        },
        {
          label: "Videos",
          description: "Analyze user recordings and replays"
        },
        {
          label: "Live URLs",
          description: "Test real-time with browser automation"
        },
        {
          label: "Visual Diffs",
          description: "Compare before and after states"
        }
      ]
    }
  },
  {
    id: "authentication",
    title: "Authentication & Access",
    shortTitle: "Authentication",
    description: "Test public pages and protected routes alike.",
    content: {
      items: [
        {
          label: "Authenticated Links",
          description: "Test logged-in user experiences"
        },
        {
          label: "Public Links",
          description: "Test open, accessible pages"
        },
        {
          label: "Protected Routes",
          description: "Validate permission-based access"
        },
        {
          label: "Session Management",
          description: "Maintain state across test runs"
        }
      ]
    }
  },
  {
    id: "integrations",
    title: "Integration Options",
    shortTitle: "Integrations",
    description: "CI/CD, online portal, or API—choose your workflow.",
    content: {
      items: [
        {
          label: "CI/CD Pipelines",
          description: "Automate tests in your deployment flow"
        },
        {
          label: "Online Portal",
          description: "Manage tests through our web interface"
        },
        {
          label: "REST API",
          description: "Build custom integrations programmatically"
        },
        {
          label: "CLI Tools",
          description: "Run tests from your terminal"
        }
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
            Test from every angle <br />
            <span className="text-white/50">and modality.</span>
          </h2>
          <p className="text-base md:text-lg text-white/50 leading-relaxed">
            Screenshots, videos, authenticated links, CI/CD—we accept it all.
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
          <div className="relative min-h-[400px]">
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
                <h3 className="text-2xl md:text-3xl font-medium text-white mb-3">
                  {activeTabData.title}
                </h3>

                {/* Description */}
                <p className="text-base text-white/60 mb-8">
                  {activeTabData.description}
                </p>

                {/* Items Grid */}
                <div className="grid md:grid-cols-2 gap-6">
                  {activeTabData.content.items.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-4"
                    >
                      <div className="mt-1 w-2 h-2 rounded-full bg-white/60 flex-shrink-0" />
                      <div>
                        <h4 className="text-base font-medium text-white mb-1">
                          {item.label}
                        </h4>
                        <p className="text-sm text-white/50 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
