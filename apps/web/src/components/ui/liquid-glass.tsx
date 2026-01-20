"use client";

import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface LiquidGlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  glowIntensity?: "xs" | "sm" | "md" | "lg" | "xl";
  shadowIntensity?: "xs" | "sm" | "md" | "lg" | "xl";
  borderRadius?: string;
  blurIntensity?: "xs" | "sm" | "md" | "lg" | "xl";
  draggable?: boolean;
}

const intensityMap = {
  xs: { blur: "4px", glow: "0 0 8px", shadow: "0 2px 8px" },
  sm: { blur: "8px", glow: "0 0 16px", shadow: "0 4px 16px" },
  md: { blur: "12px", glow: "0 0 24px", shadow: "0 8px 24px" },
  lg: { blur: "16px", glow: "0 0 32px", shadow: "0 12px 32px" },
  xl: { blur: "20px", glow: "0 0 40px", shadow: "0 16px 40px" },
};

export function LiquidGlassCard({
  children,
  className,
  glowIntensity = "md",
  shadowIntensity = "md",
  borderRadius = "16px",
  blurIntensity = "md",
  draggable = false,
  ...props
}: LiquidGlassCardProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const glow = intensityMap[glowIntensity];
  const shadow = intensityMap[shadowIntensity];
  const blur = intensityMap[blurIntensity];

  useEffect(() => {
    if (!draggable || !isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - startPos.x;
      const dy = e.clientY - startPos.y;
      setPosition({ x: position.x + dx, y: position.y + dy });
      setStartPos({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, startPos, position, draggable]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!draggable) return;
    setIsDragging(true);
    setStartPos({ x: e.clientX, y: e.clientY });
  };

  return (
    <div
      ref={cardRef}
      className={cn("relative", className)}
      style={{
        transform: draggable
          ? `translate(${position.x}px, ${position.y}px)`
          : undefined,
        cursor: draggable ? (isDragging ? "grabbing" : "grab") : undefined,
      }}
      onMouseDown={handleMouseDown}
      {...props}
    >
      <div
        className="relative w-full h-full"
        style={{
          borderRadius,
          background: "rgba(255, 255, 255, 0.05)",
          backdropFilter: `blur(${blur.blur})`,
          WebkitBackdropFilter: `blur(${blur.blur})`,
          border: "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow: `
            ${shadow.shadow} rgba(0, 0, 0, 0.1),
            ${glow.glow} rgba(255, 255, 255, 0.1) inset
          `,
        }}
      >
        {/* Animated gradient overlay */}
        <div
          className="absolute inset-0 rounded-[inherit] opacity-30 pointer-events-none"
          style={{
            background: `
              radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.15) 0%, transparent 50%),
              radial-gradient(circle at 80% 70%, rgba(147, 51, 234, 0.15) 0%, transparent 50%)
            `,
            borderRadius: "inherit",
          }}
        />
        {/* Content */}
        <div className="relative z-10">{children}</div>
      </div>
    </div>
  );
}
