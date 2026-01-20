"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

export function Navbar() {
  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50 pt-4"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="w-full max-w-7xl mx-auto px-4">
        <div
          className="flex items-center mx-auto px-5 h-14 rounded-2xl border shadow-lg"
          style={{
            width: "85%",
            maxWidth: "1200px",
            backgroundColor: "rgba(0, 0, 0, 0.1)", // Hero state background
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderColor: "rgba(255, 255, 255, 0.2)", // Hero state border
            boxShadow: "0 4px 24px -4px rgba(0, 0, 0, 0.1), 0 2px 8px -2px rgba(0, 0, 0, 0.06)",
          }}
        >
          <Link 
            href="/" 
            className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0 z-10"
          >
            {/* White logo (Hero state) */}
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
            {["Features", "How it Works", "FAQ"].map((item) => (
              <a 
                key={item}
                href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
                className="text-sm cursor-pointer transition-colors hover:opacity-70"
                style={{
                  color: "rgba(255, 255, 255, 0.9)" // Hero state text color
                }}
              >
                {item}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3 ml-auto flex-shrink-0 z-10">
            <Link 
              href="/login" 
              className="font-sans font-light text-sm px-3 py-1.5 transition-colors"
              style={{
                color: "rgba(255, 255, 255, 0.9)" // Hero state text color
              }}
            >
              Log in
            </Link>
            <div
              className="rounded-lg"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.2)", // Hero state button bg
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "rgba(255, 255, 255, 0.3)", // Hero state button border
              }}
            >
              <div
                className="px-4 py-2"
              >
                <Link 
                  href="/login" 
                  className="font-sans font-light text-sm text-white hover:opacity-90 block rounded-lg transition-all"
                >
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
