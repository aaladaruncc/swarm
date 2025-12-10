"use client";

import { motion } from "framer-motion";

const LOGOS = [
  "Google",
  "Meta",
  "OpenAI",
  "Anthropic",
  "Vercel",
  "Stripe",
  "Airbnb",
  "Linear",
];

export function LogoCarousel() {
  return (
    <section className="py-10 border-y border-neutral-100 bg-white overflow-hidden">
      <div className="container mx-auto px-4 mb-6 text-center">
        <p className="text-sm font-medium text-neutral-500 uppercase tracking-wider">
          Made with talent from
        </p>
      </div>
      
      <div className="flex relative w-full overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-white to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-white to-transparent z-10" />
        
        <motion.div
          className="flex gap-16 min-w-max px-4"
          animate={{ x: "-50%" }}
          transition={{
            duration: 20,
            ease: "linear",
            repeat: Infinity,
          }}
        >
          {[...LOGOS, ...LOGOS].map((logo, i) => (
            <div
              key={`${logo}-${i}`}
              className="text-2xl font-bold text-neutral-300 select-none whitespace-nowrap"
            >
              {logo}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
