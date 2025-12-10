"use client";

import React, { useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import { Play, Terminal, Zap, Shield, GitBranch, Cpu, ChevronRight, BarChart3, Activity, Command } from 'lucide-react';
import Link from 'next/link';
import { Navbar } from "@/components/landing/navbar";
import { LogoCarousel } from "@/components/landing/logo-carousel";
import { Features } from "@/components/landing/features";
import { InteractiveDemo } from "@/components/landing/demo/interactive-demo";
import { ComplianceStats } from "@/components/landing/compliance-stats";
import { Pricing } from "@/components/landing/pricing";
import { FAQ } from "@/components/landing/faq";
import { Footer } from "@/components/landing/footer";

/**
 * COMPONENT: SwarmSimulation
 * Used for scroll animations to trigger elements when they enter the viewport.
 */
function useOnScreen(ref: React.RefObject<HTMLElement>, rootMargin = '0px') {
  const [isIntersecting, setIntersecting] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIntersecting(entry.isIntersecting),
      { rootMargin }
    );
    if (ref.current) observer.observe(ref.current);
    return () => {
      if (ref.current) observer.unobserve(ref.current);
    };
  }, [ref, rootMargin]);

  return isIntersecting;
}

/**
 * COMPONENT: SwarmSimulation
 * The interactive canvas element for the hero section.
 * Visualizes a connected network of nodes with mouse interaction.
 */
const SwarmSimulation = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef<{ x: number, y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let nodes: any[] = [];

    const resizeCanvas = () => {
      const parent = containerRef.current;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
        initSimulation();
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        mouseRef.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    const handleMouseLeave = () => {
        mouseRef.current = null;
    };

    const initSimulation = () => {
      const w = canvas.width;
      const h = canvas.height;
      nodes = [];
      
      const nodeCount = 50; // Adjust for density
      for (let i = 0; i < nodeCount; i++) {
        nodes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          radius: Math.random() * 2 + 1, // 1 to 3
          baseX: Math.random() * w, // Keep them somewhat tethered or free? Let's go free but bounce
          baseY: Math.random() * h,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;

      // Update Nodes
      nodes.forEach(node => {
        // Base movement
        node.x += node.vx;
        node.y += node.vy;

        // Bounce off walls
        if (node.x < 0 || node.x > w) node.vx *= -1;
        if (node.y < 0 || node.y > h) node.vy *= -1;

        // Mouse Interaction
        if (mouseRef.current) {
            const dx = mouseRef.current.x - node.x;
            const dy = mouseRef.current.y - node.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const maxDistance = 200;

            if (distance < maxDistance) {
                const force = (maxDistance - distance) / maxDistance;
                // Gently push away or attract? Let's attract slightly for "interactive" feel
                // Or push away to disturb the net? Push away feels more "physics" usually.
                // Let's push away.
                const angle = Math.atan2(dy, dx);
                const pushX = Math.cos(angle) * force * 1.5;
                const pushY = Math.sin(angle) * force * 1.5;
                
                node.x -= pushX;
                node.y -= pushY;
            }
        }
      });

      // Draw Connections
      ctx.lineWidth = 0.5;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const dx = nodes[i].x - nodes[j].x;
            const dy = nodes[i].y - nodes[j].y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const maxConnectDistance = 150;

            if (distance < maxConnectDistance) {
                const opacity = 1 - (distance / maxConnectDistance);
                ctx.beginPath();
                ctx.moveTo(nodes[i].x, nodes[i].y);
                ctx.lineTo(nodes[j].x, nodes[j].y);
                ctx.strokeStyle = `rgba(0, 0, 0, ${opacity * 0.15})`; // Subtle black lines
                ctx.stroke();
            }
        }
      }

      // Draw Nodes
      nodes.forEach(node => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 0, 0, 0.4)`; // Semi-transparent black dots
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    
    draw();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-white">
      <canvas ref={canvasRef} className="absolute inset-0 block" />
    </div>
  );
};

/**
 * COMPONENT: LogoMarquee
 * Infinite scrolling logos to build trust.
 */
const LogoMarquee = () => {
  const logos = [
    "Vortex", "Acme Corp", "NextGen", "Starlight", "Umbrella", "Cyberdyne", "Hooli", "Initech"
  ];

    return (
    <div className="w-full overflow-hidden py-12 border-b border-neutral-100 bg-white">
      <p className="text-center text-xs font-mono text-neutral-400 mb-8 tracking-widest uppercase">Engineered by talent from</p>
      <div className="relative flex overflow-x-hidden group">
        <div className="animate-marquee whitespace-nowrap flex space-x-24 items-center">
          {[...logos, ...logos, ...logos].map((logo, i) => (
            <span key={i} className="text-xl font-semibold tracking-tighter text-neutral-300 font-sans select-none">
              {logo}
            </span>
          ))}
        </div>
        <div className="absolute top-0 right-0 h-full w-32 bg-gradient-to-l from-white to-transparent" />
        <div className="absolute top-0 left-0 h-full w-32 bg-gradient-to-r from-white to-transparent" />
      </div>
      </div>
    );
};

/**
 * COMPONENT: FadeIn
 * Helper for scroll animations.
 */
const FadeIn = ({ children, delay = 0, className = "" }: { children: React.ReactNode, delay?: number, className?: string }) => {
  const ref = useRef(null);
  const onScreen = useOnScreen(ref, '-50px');

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-1000 ease-out ${
        onScreen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      } ${className}`}
    >
      {children}
    </div>
  );
};

/**
 * COMPONENT: FeatureCard
 */
const FeatureCard = ({ icon: Icon, title, description, delay }: { icon: any, title: string, description: string, delay: number }) => (
    <FadeIn delay={delay} className="p-8 border border-neutral-200 bg-white hover:border-neutral-400 transition-colors duration-300 group">
        <div className="mb-6 inline-block p-3 bg-neutral-50 rounded-full group-hover:bg-neutral-900 group-hover:text-white transition-colors duration-300">
            <Icon size={20} strokeWidth={1.5} />
        </div>
        <h3 className="text-lg font-normal mb-3 text-neutral-900">{title}</h3>
        <p className="text-sm font-light leading-relaxed text-neutral-500">{description}</p>
    </FadeIn>
);

export default function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans selection:bg-neutral-900 selection:text-white overflow-x-hidden">
      
      {/* --- NAVBAR --- */}
      <Navbar />

      {/* --- HERO SECTION --- */}
      <header className="pt-32 pb-32 relative overflow-hidden min-h-screen flex items-center">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          
          {/* Left Column: Text */}
          <div className="max-w-2xl">
            <h1 className="text-6xl md:text-8xl font-normal leading-[1.1] tracking-tight text-neutral-900 mb-8 drop-shadow-sm">
              Break your app <br />
              <span className="text-neutral-400 italic font-light">before they do.</span>
            </h1>
            
            <p className="text-xl font-light text-neutral-500 max-w-lg leading-relaxed mb-10 drop-shadow-sm">
              Unleash a swarm of AI personas to stress-test your user experience. 
              Find the bugs that only chaos can reveal.
            </p>

            <div className="flex flex-col sm:flex-row items-start gap-4">
              <Link href="/login" className="h-14 px-8 bg-neutral-900 text-white hover:bg-neutral-800 transition-all flex items-center gap-2 w-full sm:w-auto justify-center group shadow-xl hover:shadow-2xl hover:-translate-y-0.5 duration-300 rounded-none">
                Start Testing <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

            {/* Right Column: Interactive Swarm Area */}
            <div className="w-full aspect-[4/3] relative z-10 border border-neutral-200 bg-white shadow-2xl group">
              <SwarmSimulation />
            </div>

        </div>
      </header>

      {/* --- SOCIAL PROOF --- */}
      <div className="pt-20">
        <LogoCarousel />
      </div>

      {/* --- VALUE PROPOSITION (Features Accordion) --- */}
      <Features />

      {/* --- INTERACTIVE DEMO / TERMINAL SECTION --- */}
      <InteractiveDemo />

      {/* --- COMPLIANCE & STATS --- */}
      <ComplianceStats />

      {/* --- BIG CTA (Pricing) --- */}
      <Pricing />

      {/* --- FAQ --- */}
      <FAQ />

      {/* --- FOOTER --- */}
      <Footer />
      
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 40s linear infinite;
        }
      `}</style>
    </div>
  );
}
