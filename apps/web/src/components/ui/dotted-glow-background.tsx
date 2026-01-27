"use client";

import React, { useRef, useEffect, useMemo } from "react";

interface DottedGlowBackgroundProps {
  className?: string;
  gap?: number;
  radius?: number;
  color?: string;
  glowColor?: string;
  speedMin?: number;
  speedMax?: number;
  speedScale?: number;
  children?: React.ReactNode;
}

interface Dot {
  x: number;
  y: number;
  baseAlpha: number;
  phase: number;
  speed: number;
}

export function DottedGlowBackground({
  className = "",
  gap = 12,
  radius = 1.5,
  color = "rgba(0,0,0,0.3)",
  glowColor = "rgba(59, 130, 246, 0.8)", // Blue-ish glow
  speedMin = 0.5,
  speedMax = 1.5,
  speedScale = 1,
  children,
}: DottedGlowBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<Dot[]>([]);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
      initDots(width, height);
    };

    const initDots = (width: number, height: number) => {
      const cols = Math.ceil(width / gap);
      const rows = Math.ceil(height / gap);
      const newDots: Dot[] = [];

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          newDots.push({
            x: i * gap + gap / 2,
            y: j * gap + gap / 2,
            baseAlpha: 0.2 + Math.random() * 0.3,
            phase: Math.random() * Math.PI * 2,
            speed: (speedMin + Math.random() * (speedMax - speedMin)) * speedScale,
          });
        }
      }
      dotsRef.current = newDots;
    };

    const animate = (time: number) => {
      const { width, height } = container.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);

      const t = time / 1000;

      dotsRef.current.forEach((dot) => {
        // Calculate dynamic alpha based on sine wave
        const alpha = dot.baseAlpha + Math.sin(dot.phase + t * dot.speed) * 0.2;
        const currentAlpha = Math.max(0.1, Math.min(1, alpha));
        
        // Check if this dot should glow (peak of sine wave)
        const isGlowing = currentAlpha > 0.6;

        ctx.beginPath();
        ctx.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
        
        if (isGlowing) {
          ctx.fillStyle = glowColor;
          ctx.shadowBlur = 8;
          ctx.shadowColor = glowColor;
        } else {
          ctx.fillStyle = color;
          ctx.shadowBlur = 0;
        }
        
        ctx.globalAlpha = currentAlpha;
        ctx.fill();
        ctx.globalAlpha = 1.0;
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    resize();
    window.addEventListener("resize", resize);
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gap, radius, color, glowColor, speedMin, speedMax, speedScale]);

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className}`}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
      <div className="relative z-10 w-full h-full flex items-center justify-center">{children}</div>
    </div>
  );
}
