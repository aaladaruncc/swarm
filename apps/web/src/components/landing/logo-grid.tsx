"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

const LOGOS = [
  { name: "Google", src: "/images/logos/google_logo.png", isWhite: true },
  { name: "Capital One", src: "/images/logos/capitalone_logo.png", hasBackground: false },
  { name: "Fidelity", src: "/images/logos/fidelity_logo.png", hasBackground: false },
  { name: "Chapter One", src: "/images/logos/chapterone_logo.jpg", isWhite: true },
  { name: "Ambient", src: "/images/logos/ambient_logo.png", hasBackground: false },
];

const LOGO_TRACK = [...LOGOS, ...LOGOS, ...LOGOS, ...LOGOS, ...LOGOS, ...LOGOS];

export function LogoGrid() {
  const gap = "4rem";

  return (
    <section className="relative py-10 overflow-hidden bg-transparent border-t border-b border-white/5">
      
      <div className="relative z-10 container mx-auto px-6 max-w-7xl flex items-center h-24">
        
        {/* Left Text */}
        <div className="flex-shrink-0 pr-8 border-r border-white/5 h-full flex items-center">
          <p className="text-sm font-medium text-white/40 whitespace-nowrap">
            From talent at
          </p>
        </div>

        {/* Carousel */}
        <div className="relative flex-1 overflow-hidden h-full flex items-center pl-8">
           
          <div
            className="flex w-max items-center will-change-transform"
            style={
              {
                "--gap": gap,
                gap,
                animation: "marquee 40s linear infinite", 
              } as CSSProperties
            }
          >
            {LOGO_TRACK.map((logo, i) => (
              <div
                key={`${logo.name}-${i}`}
                className="flex items-center justify-center h-20 w-40 flex-shrink-0 opacity-50 hover:opacity-100 transition-all duration-500 ease-in-out"
              >
                <div className="relative w-full h-12 flex items-center justify-center">
                  <Image
                    src={logo.src}
                    alt={logo.name}
                    width={160}
                    height={48}
                    className={cn(
                      "h-auto w-auto max-h-8 object-contain",
                      logo.isWhite
                        ? "" // No effects for white logos
                        : logo.hasBackground 
                        ? "grayscale invert mix-blend-screen opacity-100" 
                        : "grayscale brightness-0 invert"
                    )}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
