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
    answer: "Absolutely. Stagehand is built to integrate seamlessy with GitHub Actions, GitLab CI, and other CI providers. You can trigger swarms on every pull request to ensure no regressions are introduced."
  },
  {
    question: "How secure is the browser execution environment?",
    answer: "Each agent session runs in an isolated, ephemeral container. We never store sensitive data from your application unless explicitly configured for debugging. All traffic is encrypted, and containers are destroyed immediately after the session concludes."
  }
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24 bg-white border-t border-neutral-100">
      <div className="container mx-auto px-6 max-w-4xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-light mb-6 text-neutral-900">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-neutral-500 font-light">
            Everything you need to know about the platform.
          </p>
        </div>

        <div className="space-y-4">
          {FAQS.map((faq, i) => (
            <div
              key={i}
              className="border border-neutral-200 bg-neutral-50/50 hover:bg-neutral-50 transition-colors"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-6 text-left"
              >
                <span className="text-lg font-normal text-neutral-900 pr-8">
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
                    <div className="px-6 pb-6 text-neutral-500 font-light leading-relaxed">
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

