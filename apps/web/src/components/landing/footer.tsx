"use client";

import Link from "next/link";
import Image from "next/image";

export function Footer() {
  const navLinks = ["Features", "How it Works", "FAQ"];

  return (
    <footer className="relative bg-white overflow-hidden">
      {/* Logo in the middle - centered (hidden on mobile) */}
      <div className="absolute inset-0 hidden sm:flex items-center justify-center pointer-events-none z-0">
        <Image
          src="/images/swarm_logo_black.png"
          alt="Swarm"
          width={140}
          height={47}
          className="object-contain opacity-20"
        />
      </div>

      {/* Content Layer */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 md:px-8 max-w-[1300px] pt-10 sm:pt-16 pb-8 sm:pb-12 md:pb-16">
        <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-6 md:gap-12 text-center md:text-left">

          {/* Left Side - Copyright and Legal */}
          <div className="flex flex-col gap-3 sm:gap-4 items-center md:items-start">
            <div className="text-slate-500 text-xs sm:text-sm font-light">
              © {new Date().getFullYear()} Swarm, All rights reserved
            </div>
            <div className="flex gap-4 text-xs sm:text-sm">
              <Link
                href="/privacy"
                className="text-slate-500 hover:text-slate-900 transition-colors font-light"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="text-slate-500 hover:text-slate-900 transition-colors font-light"
              >
                Terms of Service
              </Link>
            </div>
          </div>

          {/* Right Side - Navigation Links */}
          <nav className="flex flex-wrap items-center justify-center md:justify-end gap-4 sm:gap-6 md:gap-8">
            {navLinks.map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
                className="text-xs sm:text-sm text-slate-600 hover:text-slate-900 transition-colors font-light"
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
