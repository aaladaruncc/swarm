"use client";

import React from 'react';
import { LandingBackground } from "@/components/landing/landing-background";
import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { LogoGrid } from "@/components/landing/logo-grid";
import { ResearchPapers } from "@/components/landing/research-papers";
import { FeaturesGrid } from "@/components/landing/features-grid";
import { HowItWorks } from "@/components/landing/how-it-works";
import { FAQ } from "@/components/landing/faq";
import { Footer } from "@/components/landing/footer";

export default function App() {
  return (
    <div className="min-h-screen bg-transparent text-neutral-900 font-sans selection:bg-neutral-900 selection:text-white" style={{ overscrollBehaviorY: 'auto' }}>
      
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

      {/* --- RESEARCH PAPERS --- */}
      <ResearchPapers />

      {/* --- HOW IT WORKS SECTION --- */}
      <HowItWorks />

      {/* --- FAQ --- */}
      <FAQ />

      {/* --- FOOTER --- */}
      <Footer />
      
    </div>
  );
}
