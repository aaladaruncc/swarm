"use client";

import { motion } from "framer-motion";

export function CTASection() {
  return (
    <section className="relative py-16 md:py-20 overflow-hidden">
      {/* Background image - full section, faded */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/background_cards/6.png')" }}
      />
      {/* Dark overlay to fade the image */}
      <div className="absolute inset-0 bg-slate-900/60" />
      {/* Additional gradient overlay for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900/40 via-slate-900/60 to-slate-900/70" />
      
      {/* Very subtle fade to footer at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white/20 via-white/5 to-transparent pointer-events-none z-20" />
      
      {/* Content */}
      <div className="container mx-auto px-4 md:px-8 max-w-4xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          {/* Main CTA Block with Aurora */}
          <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl border border-white/20 shadow-2xl p-8 md:p-10 overflow-hidden">
            {/* Aurora effect */}
            <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
              <motion.div
                className="absolute -inset-[10px] opacity-30 blur-xl"
                style={{
                  background: "repeating-linear-gradient(100deg, #60a5fa 10%, #818cf8 15%, #a78bfa 20%, #c4b5fd 25%, #3b82f6 30%)",
                  backgroundSize: "300% 200%",
                }}
                animate={{
                  x: ["-50%", "50%", "-50%"],
                }}
                transition={{
                  duration: 20,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            </div>
            
            {/* Content */}
            <div className="relative z-10">
              <h2 className="text-2xl md:text-3xl font-light text-slate-900 mb-3 leading-tight">
                Ready to unlock the future?
              </h2>
              <p className="text-base md:text-lg text-slate-600 font-light leading-relaxed mb-6 max-w-2xl mx-auto">
                Stop shipping blind. Validate your product decisions with real user behavior before launch.
              </p>
              <a
                href="#"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors shadow-lg"
              >
                Start testing your decisions
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
