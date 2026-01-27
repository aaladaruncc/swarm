"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { LiquidGlassCard } from "@/components/ui/liquid-glass";

export function Navbar() {
  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50 pt-4"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="w-full max-w-7xl mx-auto px-4">
        <div className="w-[85%] max-w-[1200px] mx-auto">
          <LiquidGlassCard
            glowIntensity="sm"
            shadowIntensity="sm"
            borderRadius="16px"
            blurIntensity="sm"
            variant="dark"
            className="p-0"
          >
            <div className="flex items-center px-5 h-14">
              <Link
                href="/"
                className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0 z-10"
              >
                {/* White logo for translucent dark navbar */}
                <div className="h-14">
                  <Image
                    src="/images/swarm_regular_2_white.png"
                    alt="Swarm"
                    width={280}
                    height={84}
                    className="w-auto object-contain h-full"
                  />
                </div>
              </Link>

              <nav className="hidden md:flex items-center gap-6 font-sans font-light absolute left-1/2 -translate-x-1/2 z-10">
                {["How it Works", "Insights", "Value"].map((item) => (
                  <a
                    key={item}
                    href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
                    className="text-sm cursor-pointer transition-colors hover:text-white text-white/80"
                  >
                    {item}
                  </a>
                ))}
              </nav>

              <div className="flex items-center gap-3 ml-auto flex-shrink-0 z-10">
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
            </div>
          </LiquidGlassCard>
        </div>
      </div>
    </motion.header>
  );
}
