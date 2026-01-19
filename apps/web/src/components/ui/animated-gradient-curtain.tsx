"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface AnimatedGradientCurtainProps {
  className?: string;
  colors?: string[];
  speed?: number;
  meshOpacity?: number;
  meshSize?: number;
}

/**
 * Animated Gradient Curtain Effect
 * 
 * Creates a Payload-style animated gradient background with:
 * 1. Animated gradient "curtain" (moving gradient with lighting effects)
 * 2. Mesh/grid overlay on top
 * 3. Content layers on top of that
 * 
 * Technique:
 * - Uses CSS gradients with animated background-position for the curtain effect
 * - Canvas-based mesh overlay for performance
 * - Layered z-index stacking
 */
export function AnimatedGradientCurtain({
  className,
  colors = [
    "rgba(59, 130, 246, 0.15)",  // Blue
    "rgba(147, 51, 234, 0.15)",   // Purple
    "rgba(236, 72, 153, 0.15)",   // Pink
    "rgba(251, 191, 36, 0.15)",   // Gold/Yellow
  ],
  speed = 20,
  meshOpacity = 0.03,
  meshSize = 50,
}: AnimatedGradientCurtainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener("resize", resize);

    // Draw mesh grid
    const drawMesh = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);

      ctx.strokeStyle = `rgba(0, 0, 0, ${meshOpacity})`;
      ctx.lineWidth = 0.5;

      // Vertical lines
      for (let x = 0; x <= width; x += meshSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Horizontal lines
      for (let y = 0; y <= height; y += meshSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    };

    drawMesh();

    return () => {
      window.removeEventListener("resize", resize);
    };
  }, [meshOpacity, meshSize]);

  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)}>
      {/* Layer 1: Animated Gradient Curtain */}
      <div
        className="absolute inset-0 opacity-100"
        style={{
          background: `
            linear-gradient(
              135deg,
              ${colors[0]} 0%,
              ${colors[1]} 25%,
              ${colors[2]} 50%,
              ${colors[3]} 75%,
              ${colors[0]} 100%
            )
          `,
          backgroundSize: "400% 400%",
          animation: `gradient-curtain ${speed}s ease infinite`,
          willChange: "background-position",
        }}
      />

      {/* Layer 2: Additional lighting effects (radial gradients) */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background: `
            radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.2) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(251, 191, 36, 0.2) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(147, 51, 234, 0.15) 0%, transparent 70%)
          `,
        }}
      />

      {/* Layer 3: Mesh Grid Overlay (Canvas) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ mixBlendMode: "overlay" }}
      />

    </div>
  );
}
