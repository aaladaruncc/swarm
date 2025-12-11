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

  const smoothScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (!element) return;

    const targetPosition = element.getBoundingClientRect().top + window.pageYOffset;
    const startPosition = window.pageYOffset;
    const distance = targetPosition - startPosition;
    const duration = 600; // Faster scroll duration (600ms)
    let start: number | null = null;

    function step(timestamp: number) {
      if (!start) start = timestamp;
      const progress = timestamp - start;
      
      // Easing function for smooth animation (easeInOutCubic)
      const ease = (t: number) => t < .5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
      
      const percentage = Math.min(progress / duration, 1);
      
      window.scrollTo(0, startPosition + distance * ease(percentage));

      if (progress < duration) {
        window.requestAnimationFrame(step);
      }
    }

    window.requestAnimationFrame(step);
  };

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 pt-4 px-4"
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
          <div className="px-8 h-20 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Image 
                src="/images/vantage_regular.png" 
                alt="Vantage" 
                width={400} 
                height={120} 
                className="h-20 w-auto object-contain"
              />
            </Link>

            <nav className="hidden md:flex items-center gap-6 text-base font-sans font-light text-neutral-600">
              <a 
                href="#features" 
                onClick={(e) => smoothScrollTo(e, 'features')}
                className="hover:text-black transition-opacity hover:opacity-70 cursor-pointer"
              >
                Features
              </a>
              <a 
                href="#how-it-works" 
                onClick={(e) => smoothScrollTo(e, 'how-it-works')}
                className="hover:text-black transition-opacity hover:opacity-70 cursor-pointer"
              >
                How it Works
              </a>
              <a 
                href="#pricing" 
                onClick={(e) => smoothScrollTo(e, 'pricing')}
                className="hover:text-black transition-opacity hover:opacity-70 cursor-pointer"
              >
                Pricing
              </a>
              <a 
                href="#faq" 
                onClick={(e) => smoothScrollTo(e, 'faq')}
                className="hover:text-black transition-opacity hover:opacity-70 cursor-pointer"
              >
                FAQ
              </a>
            </nav>

            <div className="flex items-center gap-4">
              <Link href="/login" className="text-base font-sans font-light hover:opacity-70 text-neutral-900 transition-colors px-4 py-2">
                Log in
              </Link>
              <Link href="/login" className="text-base px-6 py-3 transition-all font-sans font-light bg-neutral-900 text-white hover:bg-neutral-800 rounded-none">
                Get Started
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.header>
  );
}
