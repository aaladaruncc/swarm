"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface ThinLineGridProps {
  className?: string;
  lineColor?: string;
  lineWidth?: number;
  gridSize?: number;
  opacity?: number;
}

/**
 * Thin Line Grid - Payload-style simple grid overlay
 * 
 * Creates a clean, thin line grid pattern (no flickering, just clean lines)
 * Perfect for subtle texture on gradient backgrounds
 */
export function ThinLineGrid({
  className,
  lineColor = "rgba(255, 255, 255, 0.1)", // White lines by default
  lineWidth = 0.5,
  gridSize = 50,
  opacity = 1,
}: ThinLineGridProps) {
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

    // Draw thin grid lines
    const drawGrid = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);

      ctx.strokeStyle = lineColor;
      ctx.lineWidth = lineWidth;
      ctx.globalAlpha = opacity;

      // Vertical lines
      for (let x = 0; x <= width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Horizontal lines
      for (let y = 0; y <= height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    };

    drawGrid();

    return () => {
      window.removeEventListener("resize", resize);
    };
  }, [lineColor, lineWidth, gridSize, opacity]);

  return (
    <canvas
      ref={canvasRef}
      className={cn("absolute inset-0 pointer-events-none", className)}
    />
  );
}
