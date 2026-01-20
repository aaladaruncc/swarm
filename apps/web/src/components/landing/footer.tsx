"use client";

import Link from "next/link";
import Image from "next/image";

export function Footer() {
  const navLinks = ["Features", "How it Works", "FAQ"];
  
  return (
    <footer className="relative overflow-visible bg-transparent">
      {/* Faded Swarm Logo Background */}
      <div className="absolute inset-0 z-10 flex items-start justify-center pointer-events-none select-none overflow-visible">
        <div 
          className="relative w-full flex justify-center"
          style={{
            transform: 'translateY(0%)',
          }}
        >
          {/* The logo with subtle gradient fade from top */}
          <div 
            className="relative"
            style={{
              width: 'clamp(600px, 80vw, 1000px)',
              height: 'clamp(200px, 25vw, 350px)',
            }}
          >
            {/* Base logo layer with smooth gradient fade from top */}
            <Image
              src="/images/swarm_logo_white.png"
              alt=""
              fill
              className="object-contain"
              style={{
                opacity: 0.06,
                maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 20%, rgba(0,0,0,0.4) 50%, transparent 85%)',
                WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 20%, rgba(0,0,0,0.4) 50%, transparent 85%)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Content Layer */}
      <div className="relative z-20 container mx-auto px-6 max-w-7xl pt-16 pb-24 md:pb-32">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
          
          {/* Left Side - Copyright & Legal */}
          <div className="flex flex-col gap-3">
            <div className="text-neutral-500 text-sm font-light">
              © {new Date().getFullYear()} Swarm, All rights reserved
            </div>
            <div className="flex gap-4 text-sm">
              <Link 
                href="/privacy" 
                className="text-neutral-500 hover:text-white/80 transition-colors font-light"
              >
                Privacy Policy
              </Link>
              <Link 
                href="/terms" 
                className="text-neutral-500 hover:text-white/80 transition-colors font-light"
              >
                Terms of Service
              </Link>
            </div>
          </div>

          {/* Right Side - Navigation Links */}
          <nav className="flex flex-wrap items-center gap-6 md:gap-8">
            {navLinks.map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
                className="text-sm text-neutral-400 hover:text-white transition-colors font-light"
              >
                {item}
              </a>
            ))}
            
            
          </nav>
        </div>
      </div>
    </footer>
  );
}
