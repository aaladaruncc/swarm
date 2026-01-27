"use client";

import React from 'react';
import { LandingBackground } from "@/components/landing/landing-background";
import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { LogoShowcase } from "@/components/landing/logo-showcase";
import { Features } from "@/components/landing/features";
import { RevenueSection } from "@/components/landing/revenue-section";
import { ProductDecisions } from "@/components/landing/product-decisions";
import { CTASection } from "@/components/landing/cta-section";
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

      {/* --- TRUSTED BY --- */}
      <LogoShowcase />

      {/* --- VALUE PROPOSITION (Features) --- */}
      <Features />

      {/* --- REVENUE SECTION --- */}
      <RevenueSection />

      {/* --- PRODUCT DECISIONS SECTION --- */}
      <ProductDecisions />

      {/* --- CTA SECTION --- */}
      <CTASection />

      {/* --- FOOTER --- */}
      <Footer />
      
    </div>
  );
}
