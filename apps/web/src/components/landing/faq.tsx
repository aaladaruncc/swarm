"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";

const FAQS = [
  {
    question: "How does AI persona testing work?",
    answer: "Our platform generates realistic user personas from your audience description. AI agents then navigate your site as these personas, providing authentic feedback from different user perspectives."
  },
  {
    question: "Do I need to write any code?",
    answer: "Nope. Describe your target audience in plain English and the platform handles everything automatically."
  },
  {
    question: "How many personas can I test with?",
    answer: "Up to 5 personas per test run. The AI generates 10 diverse options and recommends the most relevant ones for your use case."
  },
  {
    question: "What kind of insights will I get?",
    answer: "Comprehensive UX reports with usability scores, persona-specific findings, common issues, and prioritized recommendations aggregated across all test sessions."
  },
  {
    question: "Can I reuse personas across tests?",
    answer: "Yes. Save collections of personas as 'Swarms' and reuse them across different iterations of your product."
  },
  {
    question: "How long does a test take?",
    answer: "Most tests complete in 5-10 minutes, depending on the complexity of your flows."
  }
];

function FAQItem({
  faq,
  isOpen,
  onToggle,
  index
}: {
  faq: typeof FAQS[0];
  isOpen: boolean;
  onToggle: () => void;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <button
        onClick={onToggle}
        className="w-full group"
      >
        <div className={`
          flex items-start justify-between gap-4 py-6 text-left border-b transition-colors duration-200
          ${isOpen ? "border-white/20" : "border-white/10"}
        `}>
          <span className={`text-base md:text-lg transition-colors duration-200 ${isOpen ? "text-white" : "text-white/70 group-hover:text-white/90"
            }`}>
            {faq.question}
          </span>
          <div className={`
            flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center transition-all duration-200
            ${isOpen
              ? "bg-white/10 border-white/30"
              : "border-white/20 group-hover:border-white/30"
            }
          `}>
            {isOpen ? (
              <Minus className="w-3 h-3 text-white/70" />
            ) : (
              <Plus className="w-3 h-3 text-white/50 group-hover:text-white/70" />
            )}
          </div>
        </div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <p className="py-4 text-sm md:text-base text-white/50 leading-relaxed pr-10">
              {faq.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  // Split FAQs into two columns
  const midpoint = Math.ceil(FAQS.length / 2);
  const leftColumn = FAQS.slice(0, midpoint);
  const rightColumn = FAQS.slice(midpoint);

  return (
    <section id="faq" className="py-24 md:py-32 border-b border-white/5 bg-transparent">
      <div className="container mx-auto px-6 max-w-6xl">
        {/* Header */}
        <div className="mb-12 md:mb-16">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h2 className="text-3xl md:text-4xl font-light text-white">
                Questions & answers
              </h2>
            </div>
            <p className="text-sm md:text-base text-white/40 max-w-sm">
              Everything you need to know about the platform.
            </p>
          </div>
        </div>

        {/* Two-column FAQ grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 lg:gap-x-20">
          {/* Left column */}
          <div>
            {leftColumn.map((faq, i) => (
              <FAQItem
                key={i}
                faq={faq}
                isOpen={openIndex === i}
                onToggle={() => setOpenIndex(openIndex === i ? null : i)}
                index={i}
              />
            ))}
          </div>

          {/* Right column */}
          <div>
            {rightColumn.map((faq, i) => {
              const actualIndex = i + midpoint;
              return (
                <FAQItem
                  key={actualIndex}
                  faq={faq}
                  isOpen={openIndex === actualIndex}
                  onToggle={() => setOpenIndex(openIndex === actualIndex ? null : actualIndex)}
                  index={actualIndex}
                />
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
