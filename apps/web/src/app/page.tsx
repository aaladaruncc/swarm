"use client";

import React from 'react';
import { LandingBackground } from "@/components/landing/landing-background";
import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { LogoGrid } from "@/components/landing/logo-grid";
import { FeaturesGrid } from "@/components/landing/features-grid";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Pricing } from "@/components/landing/pricing";
import { FAQ } from "@/components/landing/faq";
import { Footer } from "@/components/landing/footer";

export default function App() {
  return (
    <div className="min-h-screen bg-transparent text-neutral-900 font-sans selection:bg-neutral-900 selection:text-white overflow-x-hidden">
      
      {/* --- SHARED BACKGROUND --- */}
      <LandingBackground />

      {/* --- NAVBAR --- */}
      <Navbar />

      {/* --- HERO SECTION --- */}
      <Hero />

      {/* --- SOCIAL PROOF --- */}
      <LogoGrid />

      {/* --- VALUE PROPOSITION (Features Grid) --- */}
      <FeaturesGrid />

      {/* --- HOW IT WORKS SECTION --- */}
      <HowItWorks />


      {/* --- BIG CTA (Pricing) --- */}
      <Pricing />

      {/* --- FAQ --- */}
      <FAQ />

      {/* --- FOOTER --- */}
      <Footer />
      
    </div>
  );
}
