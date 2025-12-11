"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    question: "How does Stagehand differ from Playwright or Cypress?",
    answer: "Stagehand operates at a higher level of abstraction. Instead of writing brittle selectors that break when your UI changes, you give natural language instructions to AI agents. These agents intelligently navigate and interact with your application, adapting to changes automatically."
  },
  {
    question: "Do I need to know how to code to use this?",
    answer: "While Stagehand is designed with a 'CLI-first' approach for developers, the instructions are written in plain English. We also offer a web dashboard where non-technical team members can view session replays and reports."
  },
  {
    question: "What happens if an agent gets stuck?",
    answer: "Our agents are designed with self-healing capabilities. If an expected element isn't found, the agent will attempt alternative strategies, look for semantic equivalents, or retry with different interactions. If it's truly stuck, it will flag the session for human review and provide a detailed state snapshot."
  },
  {
    question: "Can I run this in my CI/CD pipeline?",
    answer: "Absolutely. Stagehand is built to integrate seamlessly with GitHub Actions, GitLab CI, and other CI providers. You can trigger swarms on every pull request to ensure no regressions are introduced."
  },
  {
    question: "How secure is the browser execution environment?",
    answer: "Each agent session runs in an isolated, ephemeral container. We never store sensitive data from your application unless explicitly configured for debugging. All traffic is encrypted, and containers are destroyed immediately after the session concludes."
  }
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24 bg-neutral-50 border-t border-neutral-200">
      <div className="container mx-auto px-6 max-w-3xl">
        <div className="text-center mb-16">
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-medium tracking-tight text-neutral-900 mb-6 leading-[1.1]">
              FAQ
            </h2>
          <p className="text-lg text-neutral-600 font-sans font-light">
            Everything you need to know about the platform.
          </p>
        </div>

        <div className="space-y-4">
          {FAQS.map((faq, i) => (
            <div
              key={i}
              className={`
                border rounded-none transition-all duration-300
                ${openIndex === i 
                  ? "bg-white border-neutral-200 shadow-sm" 
                  : "bg-white/50 border-neutral-200 hover:bg-white hover:border-neutral-300"
                }
              `}
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-6 text-left"
              >
                <span className={`text-lg font-medium pr-8 transition-colors ${openIndex === i ? "text-neutral-900" : "text-neutral-700"}`}>
                  {faq.question}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-neutral-500 transition-transform duration-300 ${
                    openIndex === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              <AnimatePresence>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6 text-neutral-600 font-sans font-light leading-relaxed">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
