"use client";

import Link from "next/link";
import Image from "next/image";
import { useScroll, useMotionValueEvent, motion } from "framer-motion";
import { useState } from "react";

export function Navbar() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 20);
  });

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 pt-3 px-4"
      initial={{ y: 0 }}
    >
      <div className="w-full max-w-7xl mx-auto">
        <motion.div
          className={`w-full rounded-none transition-all duration-300 ${
            scrolled 
              ? "bg-white/90 backdrop-blur-md border border-neutral-200 shadow-sm" 
              : "bg-white/80 backdrop-blur-md border border-neutral-200"
          }`}
          initial={{ y: 0 }}
        >
          <div className="px-6 h-14 flex items-center relative">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0">
              <Image 
                src="/images/swarm_small.png" 
                alt="Swarm" 
                width={120} 
                height={40} 
                className="h-8 w-auto object-contain"
              />
            </Link>

            <nav className="hidden md:flex items-center gap-5 text-sm font-sans font-light text-neutral-600 absolute left-1/2 -translate-x-1/2">
              <a 
                href="#features" 
                className="hover:text-neutral-900 transition-colors cursor-pointer"
              >
                Features
              </a>
              <a 
                href="#how-it-works" 
                className="hover:text-neutral-900 transition-colors cursor-pointer"
              >
                How it Works
              </a>
              <a 
                href="#pricing" 
                className="hover:text-neutral-900 transition-colors cursor-pointer"
              >
                Pricing
              </a>
              <a 
                href="#faq" 
                className="hover:text-neutral-900 transition-colors cursor-pointer"
              >
                FAQ
              </a>
            </nav>

            <div className="flex items-center gap-3 ml-auto flex-shrink-0">
              <Link href="/login" className="text-sm font-sans font-light hover:text-neutral-900 text-neutral-600 transition-colors px-3 py-1.5">
                Log in
              </Link>
              <Link href="/login" className="text-sm px-4 py-2 transition-all font-sans font-light bg-neutral-900 text-white hover:bg-neutral-800 rounded-none">
                Get Started
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.header>
  );
}
