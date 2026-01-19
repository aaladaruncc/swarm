"use client";

import Link from "next/link";
import Image from "next/image";

export function Footer() {
  const navLinks = ["Features", "How it Works", "Pricing", "FAQ"];
  
  return (
    <footer className="relative overflow-hidden bg-transparent border-t border-white/5">
      {/* Large Faded Swarm Logo Background */}
      <div className="absolute inset-0 z-10 flex items-end justify-center pointer-events-none select-none overflow-hidden">
        <div 
          className="relative w-full flex justify-center"
          style={{
            transform: 'translateY(25%)',
          }}
        >
          {/* Gradient overlay from top to create the fade into content */}
          <div 
            className="absolute inset-0 z-10"
            style={{
              background: `linear-gradient(to bottom, 
                rgba(10, 10, 10, 1) 0%, 
                rgba(10, 10, 10, 0.9) 10%,
                rgba(10, 10, 10, 0.5) 30%,
                transparent 55%
              )`,
            }}
          />
          
          {/* The logo with gradient metallic effect */}
          <div 
            className="relative"
            style={{
              width: 'clamp(900px, 120vw, 1600px)',
              height: 'clamp(300px, 40vw, 600px)',
            }}
          >
            {/* Base logo layer with vertical gradient fade */}
            <Image
              src="/images/swarm_logo_white.png"
              alt=""
              fill
              className="object-contain"
              style={{
                opacity: 0.08,
                maskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 25%, rgba(0,0,0,0.4) 50%, transparent 80%)',
                WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 25%, rgba(0,0,0,0.4) 50%, transparent 80%)',
              }}
            />
            
            {/* Metallic gradient overlay - creates subtle gradient sheen */}
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(175deg, rgba(140, 160, 180, 0.15) 0%, rgba(100, 130, 160, 0.1) 30%, rgba(70, 90, 110, 0.06) 60%, rgba(50, 70, 90, 0.03) 100%)',
                maskImage: `url('/images/swarm_logo_white.png')`,
                WebkitMaskImage: `url('/images/swarm_logo_white.png')`,
                maskSize: 'contain',
                WebkitMaskSize: 'contain',
                maskPosition: 'center',
                WebkitMaskPosition: 'center',
                maskRepeat: 'no-repeat',
                WebkitMaskRepeat: 'no-repeat',
              }}
            />
          </div>
        </div>
      </div>

      {/* Content Layer */}
      <div className="relative z-20 container mx-auto px-6 max-w-7xl pt-12 pb-48 md:pb-64">
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
