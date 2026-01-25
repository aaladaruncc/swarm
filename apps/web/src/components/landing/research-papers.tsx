"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "motion/react";

const STATS = [
  {
    value: 97,
    suffix: "%",
    label: "Correlation",
    description: "AI agents match real user behavior in peer-reviewed studies",
  },
  {
    value: 10,
    suffix: "x",
    label: "Faster",
    description: "Ship with confidence without waiting for manual testing",
  },
  {
    value: 100,
    suffix: "+",
    label: "Personas",
    description: "Diverse user profiles testing every flow simultaneously",
  },
];

function AnimatedStat({ value, suffix, label, description, index }: {
  value: number;
  suffix: string;
  label: string;
  description: string;
  index: number;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const duration = 1200;
          const steps = 40;
          const increment = value / steps;
          let current = 0;

          const timer = setInterval(() => {
            current += increment;
            if (current >= value) {
              setCount(value);
              clearInterval(timer);
            } else {
              setCount(Math.floor(current));
            }
          }, duration / steps);
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8 hover:bg-white/[0.04] transition-colors"
    >
      {/* Large number display */}
      <div className="mb-6">
        <div className="flex items-baseline">
          <span
            className="text-5xl md:text-6xl lg:text-7xl text-white tracking-tight"
            style={{ fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}
          >
            {count}
          </span>
          <span
            className="text-3xl md:text-4xl text-white/50 ml-0.5"
            style={{ fontWeight: 400 }}
          >
            {suffix}
          </span>
        </div>
        <div className="text-sm font-medium text-white/50 mt-2 uppercase tracking-wide">
          {label}
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-white/40 leading-relaxed group-hover:text-white/50 transition-colors">
        {description}
      </p>
    </motion.div>
  );
}

export function ResearchPapers() {
  return (
    <section className="relative z-10 py-24 md:py-32 border-b border-white/5 bg-transparent">
      <div className="container mx-auto px-6 max-w-6xl">
        {/* Header - matching features section style */}
        <div className="mb-12 md:mb-16 text-center">
          <h2 className="text-3xl md:text-4xl font-light text-white mb-4">
            Built for teams who ship fast
          </h2>
          <p className="text-base md:text-lg text-white/50 max-w-2xl mx-auto">
            AI agents simulate real user behavior at scale, validated by peer-reviewed research.
          </p>
        </div>

        {/* Stats grid - matching bento card style */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {STATS.map((stat, idx) => (
            <AnimatedStat
              key={stat.label}
              value={stat.value}
              suffix={stat.suffix}
              label={stat.label}
              description={stat.description}
              index={idx}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
