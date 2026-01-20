"use client";

import React, { useState } from "react";
import { motion } from "motion/react";
import { ExternalLink, FileText, ArrowRight, Bot, TestTube } from "lucide-react";
import { cn } from "@/lib/utils";

const PAPERS = [
  {
    title: "UXAgent: An LLM-Agent-Based Usability Testing Framework",
    shortDesc: "LLM agents simulate usability tests with qualitative feedback and quantitative metrics, enabling early iteration of study designs.",
    link: "https://arxiv.org/pdf/2502.12561",
    icon: Bot,
  },
  {
    title: "AgentA/B: Automated Web A/B Testing with LLM Agents",
    shortDesc: "Large-scale agent simulations replicate real user behavior patterns, enabling rapid validation of design variants.",
    link: "https://arxiv.org/pdf/2504.09723",
    icon: TestTube,
  },
];

export function ResearchPapers() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <section className="relative z-10 py-24 md:py-32 border-b border-white/5 bg-transparent">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="mb-12 md:mb-16 max-w-2xl">
          <h2 className="text-3xl md:text-4xl font-light text-white mb-4 md:mb-6">
            Backed by <span className="text-white/50">research.</span>
          </h2>
          <p className="text-base md:text-lg text-white/50 leading-relaxed">
            Grounded in peer-reviewed research showing that LLM-agent simulations and synthetic user behavior correlate with real user actions, delivering early feedback and measurable insights.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-l border-t border-white/5">
          {PAPERS.map((paper, idx) => {
            const IconComponent = paper.icon;
            return (
            <motion.a
              key={paper.title}
              href={paper.link}
              target="_blank"
              rel="noopener noreferrer"
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={cn(
                "group relative border-r border-b border-white/5 hover:bg-white/[0.02] transition-colors duration-300 flex flex-col p-8 md:p-10"
              )}
            >
              {/* Icon and Arrow */}
              <div className="flex items-start justify-between mb-6">
                <motion.div
                  className="w-12 h-12 md:w-14 md:h-14 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center group-hover:bg-white/15 transition-colors"
                  animate={{
                    scale: hoveredIndex === idx ? 1.1 : 1,
                    rotate: hoveredIndex === idx ? [0, -5, 5, -5, 0] : 0,
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <IconComponent className="w-6 h-6 md:w-7 md:h-7 text-white/70" />
                </motion.div>
                <motion.div
                  animate={{
                    x: hoveredIndex === idx ? 4 : 0,
                    opacity: hoveredIndex === idx ? 1 : 0.5,
                  }}
                  transition={{ duration: 0.2 }}
                >
                  <ArrowRight className="w-5 h-5 text-white/60" />
                </motion.div>
              </div>

              {/* Content */}
              <div className="mt-auto">
                <h3 className="text-xl md:text-2xl font-medium text-white mb-3 group-hover:text-white/90 transition-colors">
                  {paper.title}
                </h3>
                <p className="text-sm text-white/50 leading-relaxed group-hover:text-white/70 transition-colors mb-4">
                  {paper.shortDesc}
                </p>
                <div className="flex items-center gap-2 text-xs text-white/40 group-hover:text-white/60 transition-colors">
                  <FileText className="w-3.5 h-3.5" />
                  <span>View paper</span>
                  <ExternalLink className="w-3 h-3" />
                </div>
              </div>

              {/* Hover glow effect */}
              <motion.div
                className="absolute inset-0 pointer-events-none"
                animate={{
                  opacity: hoveredIndex === idx ? 0.1 : 0,
                }}
                transition={{ duration: 0.3 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
              </motion.div>
            </motion.a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
