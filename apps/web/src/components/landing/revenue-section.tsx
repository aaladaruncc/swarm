"use client";

import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.3,
    },
  },
};

const stepVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: [0, 0, 0.2, 1] as const }
  },
};

const lineVariants = {
  hidden: { scaleY: 0 },
  visible: { 
    scaleY: 1,
    transition: { duration: 1.2, ease: [0.4, 0, 0.2, 1] as const }
  },
};

export function RevenueSection() {
  return (
    <section id="insights" className="relative py-12 sm:py-16 md:py-20 bg-white overflow-hidden">
      {/* Subtle gradient overlays */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50/50 via-transparent to-slate-50/50" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 md:px-8 max-w-7xl relative z-10">
        {/* Header - Centered */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-8 sm:mb-10"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-sans font-light tracking-tight text-slate-950 mb-3 sm:mb-4 leading-[1.15]">
            Identify what's blocking
            <br className="hidden sm:block" />
            <span className="sm:hidden"> </span>
            users from revenue
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-slate-600 font-light leading-relaxed px-2">
            Swarm shows where user behavior breaks down in
            revenue-critical <br className="hidden md:block" />moments, so your team knows exactly what to fix before launch.
          </p>
        </motion.div>

        {/* Centered Card with Arrow Annotations */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative flex justify-center"
        >
          {/* Arrow Annotations Container */}
          <div className="relative w-full" style={{ maxWidth: '800px' }}>
            {/* Arrow 1 - Left side, pointing to "View Product" */}
            <div className="hidden md:flex absolute left-0 top-[60px] -translate-x-full items-center pr-3">
              <div className="text-right mr-3">
                <p className="text-sm font-medium text-slate-700">Track every user action</p>
                <p className="text-xs text-slate-500">from first click</p>
              </div>
              <svg width="40" height="20" viewBox="0 0 40 20" className="text-slate-400">
                <path 
                  d="M0 10 L30 10 M25 5 L32 10 L25 15" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            {/* Arrow 2 - Right side, pointing to "Confusion" callout */}
            <div className="hidden md:flex absolute right-0 top-[180px] translate-x-full items-center pl-3">
              <svg width="40" height="20" viewBox="0 0 40 20" className="text-slate-400">
                <path 
                  d="M40 10 L10 10 M15 5 L8 10 L15 15" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="text-left ml-3">
                <p className="text-sm font-medium text-slate-700">Identify friction points</p>
                <p className="text-xs text-slate-500">in real-time</p>
              </div>
            </div>

            {/* Arrow 3 - Right side, pointing to "66% drop-off" */}
            <div className="hidden md:flex absolute right-0 top-[310px] translate-x-full items-center pl-3">
              <svg width="40" height="20" viewBox="0 0 40 20" className="text-slate-400">
                <path 
                  d="M40 10 L10 10 M15 5 L8 10 L15 15" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="text-left ml-3">
                <p className="text-sm font-medium text-slate-700">Pinpoint where</p>
                <p className="text-xs text-slate-500">revenue is lost</p>
              </div>
            </div>

            {/* The Card */}
            <div className="relative w-full rounded-2xl overflow-hidden" style={{ maxWidth: '800px' }}>
              {/* Background image - faded */}
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-40"
                style={{ backgroundImage: "url('/images/background_cards/5.png')" }}
              />
              {/* Bottom fade overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-slate-50/70 via-35% to-transparent" />
              
              {/* Content */}
              <div className="relative z-10 p-6 md:p-8">
                <div className="w-full space-y-6">
                  {/* User Journey Flow */}
                  <motion.div 
                    className="relative"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.3 }}
                  >
                    {/* Vertical flow line - animated */}
                    <motion.div 
                      className="absolute left-6 top-0 bottom-0 w-0.5 bg-blue-200 origin-top"
                      variants={lineVariants}
                    />
                    
                    <motion.div
                      className="space-y-6 relative"
                      variants={containerVariants}
                    >
                      {/* Step 1: View Product - Success */}
                      <motion.div className="flex items-start gap-4 relative" variants={stepVariants}>
                        <div className="w-12 h-12 rounded-full bg-white border-2 border-blue-300 flex items-center justify-center flex-shrink-0 relative z-10 shadow-sm">
                          <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </div>
                        <div className="flex-1 pt-2">
                          <div className="text-sm font-medium text-slate-900 mb-1">View Product</div>
                          <div className="text-xs text-slate-600">98% users continue</div>
                        </div>
                      </motion.div>

                      {/* Step 2: Add to Cart - Confusion Point */}
                      <motion.div className="flex items-start gap-4 relative" variants={stepVariants}>
                        <div className="w-12 h-12 rounded-full bg-white border-2 border-blue-300 flex items-center justify-center flex-shrink-0 relative z-10 shadow-sm">
                          <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <div className="flex-1 pt-2">
                          <div className="text-sm font-medium text-slate-900 mb-1">Add to Cart</div>
                          <div className="text-xs text-slate-600 mb-2">72% users continue</div>
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5">
                            <div className="flex items-center gap-2 mb-1">
                              <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-[10px] font-semibold text-blue-700 uppercase tracking-wide">Confusion</span>
                            </div>
                            <div className="text-[11px] text-blue-800 leading-tight">8 users hesitated at payment form</div>
                          </div>
                        </div>
                      </motion.div>

                      {/* Step 3: Checkout - Trust Issue & Drop-off */}
                      <motion.div className="flex items-start gap-4 relative" variants={stepVariants}>
                        <div className="w-12 h-12 rounded-full bg-white border-2 border-blue-400 flex items-center justify-center flex-shrink-0 relative z-10 shadow-sm">
                          <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                        </div>
                        <div className="flex-1 pt-2">
                          <div className="text-sm font-medium text-slate-900 mb-1">Checkout</div>
                          <div className="text-xs text-red-600 font-medium mb-2">34% users continue • 66% drop-off</div>
                          <div className="space-y-2">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5">
                              <div className="flex items-center gap-2 mb-1">
                                <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <span className="text-[10px] font-semibold text-blue-700 uppercase tracking-wide">Trust Issue</span>
                              </div>
                              <div className="text-[11px] text-blue-800 leading-tight">6 users abandoned at security step</div>
                            </div>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5">
                              <div className="flex items-center gap-2 mb-1">
                                <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span className="text-[10px] font-semibold text-blue-700 uppercase tracking-wide">Functionality</span>
                              </div>
                              <div className="text-[11px] text-blue-800 leading-tight">4 form validation errors detected</div>
                            </div>
                          </div>
                        </div>
                      </motion.div>

                      {/* Step 4: Complete Purchase - Low conversion */}
                      <motion.div className="flex items-start gap-4 relative" variants={stepVariants}>
                        <div className="w-12 h-12 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center flex-shrink-0 relative z-10 shadow-sm opacity-60">
                          <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="flex-1 pt-2 opacity-60">
                          <div className="text-sm font-medium text-slate-500 mb-1">Complete Purchase</div>
                          <div className="text-xs text-slate-400">12% users complete</div>
                        </div>
                      </motion.div>
                    </motion.div>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
