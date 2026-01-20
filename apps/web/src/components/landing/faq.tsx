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
    <section id="faq" className="py-24 md:py-32 border-b border-white/5 bg-transparent">
      <div className="container mx-auto px-6 max-w-3xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-light text-white mb-6">
            FAQ
          </h2>
          <p className="text-lg text-white/50 leading-relaxed">
            Everything you need to know about the platform.
          </p>
        </div>

        <div className="space-y-4">
          {FAQS.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className={`
                border rounded-lg transition-all duration-300
                ${openIndex === i 
                  ? "bg-white/5 border-white/20" 
                  : "bg-white/5 border-white/10 hover:bg-white/[0.07] hover:border-white/15"
                }
              `}
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-6 text-left"
              >
                <span className={`text-base md:text-lg font-medium pr-8 transition-colors ${
                  openIndex === i ? "text-white" : "text-white/70"
                }`}>
                  {faq.question}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-white/50 transition-all duration-300 flex-shrink-0 ${
                    openIndex === i ? "rotate-180 text-white/70" : ""
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
                    <div className="px-6 pb-6 text-white/50 font-light leading-relaxed">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
