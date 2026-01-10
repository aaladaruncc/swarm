"use client";

import React from 'react';
import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { LogoCarousel } from "@/components/landing/logo-carousel";
import { Features } from "@/components/landing/features";
import { InteractiveDemo } from "@/components/landing/demo/interactive-demo";
import { Pricing } from "@/components/landing/pricing";
import { FAQ } from "@/components/landing/faq";
import { Footer } from "@/components/landing/footer";

export default function App() {
  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans selection:bg-neutral-900 selection:text-white overflow-x-hidden">
      
      {/* --- NAVBAR --- */}
      <Navbar />

      {/* --- HERO SECTION --- */}
      <Hero />

      {/* --- SOCIAL PROOF --- */}
      <LogoCarousel />

      {/* --- VALUE PROPOSITION (Features Accordion) --- */}
      <Features />

      {/* --- INTERACTIVE DEMO / TERMINAL SECTION --- */}
      <InteractiveDemo />


      {/* --- BIG CTA (Pricing) --- */}
      <Pricing />

      {/* --- FAQ --- */}
      <FAQ />

      {/* --- FOOTER --- */}
      <Footer />
      
    </div>
  );
}
