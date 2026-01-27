"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

const LOGOS = [
  { name: "Google", src: "/images/logos/google_logo.png", noEffect: true },
  { name: "Capital One", src: "/images/logos/capitalone_logo.png", hasBackground: false },
  { name: "Fidelity", src: "/images/logos/fidelity_logo.png", hasBackground: false },
  { name: "Chapter One", src: "/images/logos/chapterone_logo.jpg", noEffect: true },
  { name: "Ambient", src: "/images/logos/ambient_logo.png", hasBackground: false },
];

const LOGO_TRACK = [...LOGOS, ...LOGOS, ...LOGOS, ...LOGOS, ...LOGOS, ...LOGOS];

export function LogoGrid() {
  const gap = "4rem";

  return (
    <section className="relative py-10 overflow-hidden bg-slate-50 border-t border-b border-slate-200/50">
      
      <div className="relative z-10 container mx-auto px-6 max-w-7xl flex items-center h-24">
        
        {/* Left Text */}
        <div className="flex-shrink-0 pr-8 h-full flex items-center">
          <p className="text-sm font-sans font-light text-slate-500 whitespace-nowrap">
            From talent at
          </p>
        </div>

        {/* Carousel */}
        <div className="relative flex-1 overflow-hidden h-full flex items-center pl-4">
           
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
                className={cn(
                  "flex items-center justify-center h-20 w-40 flex-shrink-0 transition-all duration-500 ease-in-out",
                  logo.noEffect 
                    ? "opacity-80 hover:opacity-100" 
                    : "opacity-60 hover:opacity-100"
                )}
              >
                <div className="relative w-full h-12 flex items-center justify-center">
                  <Image
                    src={logo.src}
                    alt={logo.name}
                    width={160}
                    height={48}
                    className="h-auto w-auto max-h-8 object-contain"
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
