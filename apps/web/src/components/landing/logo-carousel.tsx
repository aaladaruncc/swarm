"use client";

import Image from "next/image";

type LogoType = "image" | "svg";

interface Logo {
  name: string;
  src: string;
  type?: LogoType;
}

const LOGOS: Logo[] = [
  { name: "Google", src: "/images/logos/google_logo.png", type: "image" },
  { name: "Capital One", src: "/images/logos/capitalone_logo.png", type: "image" },
  { name: "Fidelity", src: "/images/logos/fidelity_logo.png", type: "image" },
  { name: "Chapter One", src: "/images/logos/chapterone_logo.jpg", type: "image" },
  { name: "Ambient", src: "/images/logos/ambient_logo.png", type: "image" },
];

// Helper function to detect if a logo is an SVG
const isSVG = (logo: Logo): boolean => {
  if (logo.type === "svg") return true;
  if (logo.type === "image") return false;
  // Auto-detect by file extension
  return logo.src.toLowerCase().endsWith(".svg");
};

export function LogoCarousel() {
  // Duplicate the logos array for seamless infinite scroll
  const logoSets = [...LOGOS, ...LOGOS];
  
  return (
    <section className="pt-12 pb-10 border-b border-neutral-100 bg-white overflow-hidden">
      <div className="container mx-auto px-4 mb-6 text-center">
        <p className="text-sm font-medium text-neutral-500 uppercase tracking-wider">
          Made with talent from
        </p>
      </div>
      
      <div className="flex relative w-full overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
        
        <div
          className="flex gap-16 min-w-max items-center"
          style={{
            animation: "scroll 20s linear infinite",
          }}
        >
          {logoSets.map((logo, i) => (
            <div
              key={`${logo.name}-${i}`}
              className="flex items-center justify-center h-16 w-32 flex-shrink-0 grayscale opacity-60 hover:opacity-100 hover:grayscale-0 transition-all duration-300"
            >
              {isSVG(logo) ? (
                <img
                  src={logo.src}
                  alt={logo.name}
                  className="h-auto w-auto max-h-12 object-contain"
                />
              ) : (
                <Image
                  src={logo.src}
                  alt={logo.name}
                  width={120}
                  height={48}
                  className="h-auto w-auto max-h-12 object-contain"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
