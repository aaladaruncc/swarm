"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    question: "How does AI persona testing work?",
    answer: "Our platform uses advanced behavioral language models to generate realistic user personas based on your audience description. AI agents then navigate your website as these personas, providing authentic user experience feedback from different perspectives."
  },
  {
    question: "Do I need to know how to code to use this?",
    answer: "No coding required. Simply describe your target audience in plain English, and the platform handles everything automatically."
  },
  {
    question: "How many personas can I test with at once?",
    answer: "You can test with 1-5 personas per test run. Our AI generates 10 diverse personas and automatically recommends the most relevant ones for you to review."
  },
  {
    question: "What kind of insights do I get?",
    answer: "You receive comprehensive UX reports with overall scores, persona-specific findings, common usability issues, and prioritized recommendations. Reports are aggregated from multiple persona perspectives to give you a holistic view."
  },
  {
    question: "Can I save and reuse personas?",
    answer: "Yes. You can save collections of personas as 'Swarms' for future use, making it easy to test your website with the same user profiles across different iterations."
  },
  {
    question: "How long does a test take?",
    answer: "Tests take 5-10 minutes."
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
