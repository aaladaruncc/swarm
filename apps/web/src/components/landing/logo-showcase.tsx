"use client";

import Image from "next/image";

const LOGOS = [
  { name: "Google", src: "/images/logos/google_logo.png", noEffect: true },
  { name: "Capital One", src: "/images/logos/capitalone_logo.png", hasBackground: false },
  { name: "Fidelity", src: "/images/logos/fidelity_logo.png", hasBackground: false },
  { name: "Chapter One", src: "/images/logos/chapterone_logo.jpg", noEffect: true },
  { name: "Ambient", src: "/images/logos/ambient_logo.png", hasBackground: false },
];

export function LogoShowcase() {
  return (
    <section className="relative pt-6 sm:pt-8 pb-12 sm:pb-16 overflow-hidden bg-slate-50">
      <div className="relative container mx-auto px-4 sm:px-6 max-w-7xl">
        {/* Heading */}
        <div className="text-center mb-8 sm:mb-12">
          <p className="text-sm sm:text-base font-sans font-light text-slate-500">
            Made by talent from
          </p>
        </div>

        {/* Logo Grid - Responsive */}
        <div className="flex items-center justify-center gap-6 sm:gap-8 md:gap-12 flex-wrap">
          {LOGOS.map((logo) => (
            <div
              key={logo.name}
              className="flex items-center justify-center h-12 sm:h-14 md:h-16 w-28 sm:w-32 md:w-40 transition-opacity duration-300 hover:opacity-80"
            >
              <Image
                src={logo.src}
                alt={logo.name}
                width={160}
                height={64}
                className={`h-auto w-auto object-contain ${logo.name === "Chapter One" ? "max-h-12 sm:max-h-14 md:max-h-16" : "max-h-8 sm:max-h-10 md:max-h-12"}`}
                unoptimized={logo.name === "Google"}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
