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
    const duration = 1000; // Increased duration for slower scroll (1000ms = 1s)
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
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-white/80 backdrop-blur-md border-b border-neutral-100" : "bg-transparent"
      }`}
      initial={{ y: 0 }}
    >
      <div className="w-full max-w-7xl mx-auto px-6 h-28 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image 
            src="/images/nomos-agent.png" 
            alt="Nomos" 
            width={300} 
            height={90} 
            className="h-20 w-auto object-contain"
          />
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-base font-light text-neutral-600">
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
          <Link href="/login" className="text-sm font-medium hover:opacity-70 text-neutral-900 transition-colors">
            Log in
          </Link>
          <Link href="/login" className="text-sm px-4 py-1.5 transition-all font-light border bg-neutral-900 text-white hover:bg-neutral-800 border-transparent rounded-none">
            Get Started
          </Link>
        </div>
      </div>
    </motion.header>
  );
}
