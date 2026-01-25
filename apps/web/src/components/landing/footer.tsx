"use client";

import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="relative bg-transparent">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="py-10 md:py-12">
          <div className="flex flex-col items-center gap-6">
            {/* Logo */}
            <Link href="/">
              <Image
                src="/images/swarm_logo_white.png"
                alt="Swarm"
                width={100}
                height={32}
                className="h-6 w-auto opacity-70 hover:opacity-100 transition-opacity"
              />
            </Link>

            {/* Center links */}
            <div className="flex items-center gap-8">
              <a
                href="#features"
                className="text-sm text-white/40 hover:text-white transition-colors"
              >
                Features
              </a>
              <a
                href="#faq"
                className="text-sm text-white/40 hover:text-white transition-colors"
              >
                FAQ
              </a>
              <Link
                href="/privacy"
                className="text-sm text-white/40 hover:text-white transition-colors"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="text-sm text-white/40 hover:text-white transition-colors"
              >
                Terms
              </Link>
            </div>

            {/* Copyright */}
            <span className="text-xs text-white/30">
              © {new Date().getFullYear()} Swarm
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
