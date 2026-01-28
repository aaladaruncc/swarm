"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { LiquidGlassCard } from "@/components/ui/liquid-glass";

const NAV_ITEMS = ["How it Works", "Insights", "Value"];

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <motion.header
        className="fixed top-0 left-0 right-0 z-50 pt-3 md:pt-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="w-full max-w-7xl mx-auto px-3 md:px-4">
          <div className="w-full md:w-[85%] md:max-w-[1200px] mx-auto">
            <LiquidGlassCard
              glowIntensity="sm"
              shadowIntensity="sm"
              borderRadius="16px"
              blurIntensity="sm"
              variant="dark"
              className="p-0"
            >
              <div className="flex items-center justify-between px-4 md:px-5 h-12 md:h-14">
                {/* Logo */}
                <Link
                  href="/"
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0 z-10"
                >
                  <div className="h-10 md:h-14">
                    <Image
                      src="/images/swarm_regular_2_white.png"
                      alt="Swarm"
                      width={280}
                      height={84}
                      className="w-auto object-contain h-full"
                    />
                  </div>
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center gap-6 font-sans font-light absolute left-1/2 -translate-x-1/2 z-10">
                  {NAV_ITEMS.map((item) => (
                    <a
                      key={item}
                      href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
                      className="text-sm cursor-pointer transition-colors hover:text-white text-white/80"
                    >
                      {item}
                    </a>
                  ))}
                </nav>

                {/* Desktop CTA Buttons */}
                <div className="hidden md:flex items-center gap-3 ml-auto flex-shrink-0 z-10">
                  <Link
                    href="/login"
                    className="font-sans font-light text-sm px-3 py-1.5 transition-colors text-white/80 hover:text-white"
                  >
                    Log in
                  </Link>
                  <Link
                    href="https://cal.com/team/swarm/demo"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-sans font-light text-sm px-4 py-2 bg-slate-950 text-white hover:bg-slate-800 rounded-lg transition-all"
                  >
                    Book Demo
                  </Link>
                </div>

                {/* Mobile Menu Button */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-2 text-white/80 hover:text-white transition-colors z-10"
                  aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                >
                  {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
              </div>
            </LiquidGlassCard>
          </div>
        </div>
      </motion.header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Menu Panel */}
            <motion.div
              className="fixed top-[72px] left-3 right-3 z-50 md:hidden"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <LiquidGlassCard
                glowIntensity="sm"
                shadowIntensity="md"
                borderRadius="16px"
                blurIntensity="md"
                variant="dark"
                className="p-0"
              >
                <div className="p-4">
                  {/* Navigation Links */}
                  <nav className="space-y-1 mb-4">
                    {NAV_ITEMS.map((item, index) => (
                      <motion.a
                        key={item}
                        href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
                        className="block px-4 py-3 text-base font-light text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        {item}
                      </motion.a>
                    ))}
                  </nav>

                  {/* Divider */}
                  <div className="h-px bg-white/10 mx-4 mb-4" />

                  {/* CTA Buttons */}
                  <div className="space-y-2 px-4">
                    <Link
                      href="/login"
                      className="block w-full text-center py-3 text-base font-light text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Log in
                    </Link>
                    <Link
                      href="https://cal.com/team/swarm/demo"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full text-center py-3 text-base font-medium bg-white text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Book Demo
                    </Link>
                  </div>
                </div>
              </LiquidGlassCard>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
