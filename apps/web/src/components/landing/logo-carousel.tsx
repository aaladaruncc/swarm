"use client";

import Image from "next/image";
import type { CSSProperties } from "react";

type LogoType = "image" | "svg";

interface Logo {
  name: string;
  src: string;
  type?: LogoType;
  isWhite?: boolean;
}

const LOGOS: Logo[] = [
  { name: "Google", src: "/images/logos/google_logo.png", type: "image", isWhite: true },
  { name: "Capital One", src: "/images/logos/capitalone_logo.png", type: "image" },
  { name: "Fidelity", src: "/images/logos/fidelity_logo.png", type: "image" },
  { name: "Chapter One", src: "/images/logos/chapterone_logo.jpg", type: "image", isWhite: true },
  { name: "Ambient", src: "/images/logos/ambient_logo.png", type: "image" },
];

// Helper function to detect if a logo is an SVG
const isSVG = (logo: Logo): boolean => {
  if (logo.type === "svg") return true;
  if (logo.type === "image") return false;
  // Auto-detect by file extension
  return logo.src.toLowerCase().endsWith(".svg");
};

// Create enough duplicates to ensure seamless infinite scrolling
// We duplicate 6 times to ensure there's always content visible and smooth loop
const LOGO_TRACK = [...LOGOS, ...LOGOS, ...LOGOS, ...LOGOS, ...LOGOS, ...LOGOS];

export function LogoCarousel() {
  const gap = "4rem"; // Increased gap for cleaner look

  return (
    <section className="py-10 overflow-hidden bg-slate-50 border-b border-slate-100/50">
      <div className="relative w-full overflow-hidden">
        {/* Gradients to fade edges - matching slate-50 background */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-slate-50 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-slate-50 to-transparent z-10 pointer-events-none" />

        <div
          className="flex w-max items-center will-change-transform"
          style={
            {
              "--gap": gap,
              gap,
              animation: "marquee 40s linear infinite", // Slower, smoother animation
            } as CSSProperties
          }
        >
          {LOGO_TRACK.map((logo, i) => (
            <div
              key={`${logo.name}-${i}`}
              className={`flex items-center justify-center h-20 w-40 flex-shrink-0 transition-all duration-500 ease-in-out ${
                logo.isWhite
                  ? "opacity-50 hover:opacity-100"
                  : "grayscale opacity-50 hover:opacity-100 hover:grayscale-0"
              }`}
            >
              {isSVG(logo) ? (
                <img
                  src={logo.src}
                  alt={logo.name}
                  loading="lazy"
                  className="h-auto w-auto max-h-8 object-contain"
                />
              ) : (
                <Image
                  src={logo.src}
                  alt={logo.name}
                  width={160}
                  height={64}
                  className={`h-auto w-auto max-h-8 object-contain ${
                    logo.isWhite ? "" : "mix-blend-multiply"
                  }`}
                  priority={i < LOGOS.length}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
