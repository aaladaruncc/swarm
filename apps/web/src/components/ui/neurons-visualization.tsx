"use client";

import { useRef, useEffect, useState } from "react";

interface Neuron {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  pulsePhase: number;
  pulseSpeed: number;
}

interface Connection {
  from: number;
  to: number;
}

export function NeuronsVisualization({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    // Create neurons
    const neuronCount = 60;
    const neurons: Neuron[] = [];
    const centerX = canvas.width / (window.devicePixelRatio || 1) / 2;
    const centerY = canvas.height / (window.devicePixelRatio || 1) / 2;
    const radius = Math.min(centerX, centerY) * 0.6;

    for (let i = 0; i < neuronCount; i++) {
      const r = radius * (0.5 + Math.random() * 0.5);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      
      neurons.push({
        x: centerX + r * Math.sin(phi) * Math.cos(theta),
        y: centerY + r * Math.sin(phi) * Math.sin(theta),
        z: r * Math.cos(phi),
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        vz: (Math.random() - 0.5) * 0.3,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.5 + Math.random() * 0.5,
      });
    }

    // Create connections
    const connections: Connection[] = [];
    const maxDistance = radius * 0.4;
    
    for (let i = 0; i < neurons.length; i++) {
      for (let j = i + 1; j < neurons.length; j++) {
        const dx = neurons[i].x - neurons[j].x;
        const dy = neurons[i].y - neurons[j].y;
        const dz = neurons[i].z - neurons[j].z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        if (distance < maxDistance && Math.random() > 0.65) {
          connections.push({ from: i, to: j });
        }
      }
    }

    let rotation = 0;
    let lastTime = 0;

    const animate = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);

      // Clear canvas
      ctx.fillStyle = 'transparent';
      ctx.fillRect(0, 0, width, height);

      // Update neurons
      neurons.forEach((neuron) => {
        neuron.x += neuron.vx * deltaTime * 10;
        neuron.y += neuron.vy * deltaTime * 10;
        neuron.z += neuron.vz * deltaTime * 10;
        
        // Keep in bounds
        const distance = Math.sqrt(
          (neuron.x - centerX) ** 2 + 
          (neuron.y - centerY) ** 2 + 
          neuron.z ** 2
        );
        if (distance > radius * 1.2) {
          const scale = radius / distance;
          neuron.x = centerX + (neuron.x - centerX) * scale;
          neuron.y = centerY + (neuron.y - centerY) * scale;
          neuron.z *= scale;
        }
        
        neuron.pulsePhase += deltaTime * neuron.pulseSpeed;
      });

      rotation += deltaTime * 0.15;

      // Draw connections
      const time = currentTime / 1000;
      connections.forEach((conn, idx) => {
        const from = neurons[conn.from];
        const to = neurons[conn.to];
        
        // Project 3D to 2D with rotation
        const fromX = centerX + (from.x - centerX) * Math.cos(rotation) - from.z * Math.sin(rotation);
        const fromY = centerY + (from.y - centerY);
        const toX = centerX + (to.x - centerX) * Math.cos(rotation) - to.z * Math.sin(rotation);
        const toY = centerY + (to.y - centerY);

        // Calculate pulsing intensity
        const intensity = (Math.sin(time * 2 + idx * 0.1) * 0.5 + 0.5) * 
                         (Math.sin(from.pulsePhase) * 0.3 + 0.7) *
                         (Math.sin(to.pulsePhase) * 0.3 + 0.7);

        // Blue to cyan gradient
        const r = Math.floor((0.2 + intensity * 0.5) * 255);
        const g = Math.floor((0.4 + intensity * 0.4) * 255);
        const b = Math.floor((0.8 + intensity * 0.2) * 255);

        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.3 + intensity * 0.3})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();
      });

      // Draw neurons
      neurons.forEach((neuron) => {
        const x = centerX + (neuron.x - centerX) * Math.cos(rotation) - neuron.z * Math.sin(rotation);
        const y = centerY + (neuron.y - centerY);
        
        const pulse = Math.sin(neuron.pulsePhase) * 0.3 + 0.7;
        const size = 3 + pulse * 2;

        // Glow effect
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 2);
        gradient.addColorStop(0, `rgba(96, 165, 250, ${0.8 * pulse})`);
        gradient.addColorStop(0.5, `rgba(96, 165, 250, ${0.4 * pulse})`);
        gradient.addColorStop(1, 'rgba(96, 165, 250, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, size * 2, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = `rgba(96, 165, 250, ${pulse})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [mounted]);

  if (!mounted) {
    return <div className={`w-full h-full ${className || ""}`} />;
  }

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full ${className || ""}`}
      style={{ display: 'block' }}
    />
  );
}
