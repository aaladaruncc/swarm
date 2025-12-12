"use client"

import { useEffect, useId, useRef, useState } from "react"
import { motion } from "motion/react"

import { cn } from "@/lib/utils"

interface LightRaysProps {
  count?: number
  color?: string
  blur?: number
  opacity?: number
  speed?: number
  length?: string | number
  className?: string
  style?: React.CSSProperties
}

export function LightRays({
  count = 7,
  color = "rgba(160, 210, 255, 0.2)",
  blur = 36,
  opacity = 0.65,
  speed = 14,
  length = "70vh",
  className,
  style,
}: LightRaysProps) {
  const id = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect()
        setDimensions({ width, height })
      }
    }

    updateDimensions()
    window.addEventListener("resize", updateDimensions)
    return () => window.removeEventListener("resize", updateDimensions)
  }, [])

  const rays = Array.from({ length: count }, (_, i) => {
    const delay = Math.random() * speed
    const x = (i / (count - 1 || 1)) * 100
    return { delay, x, id: i }
  })

  return (
    <div
      ref={containerRef}
      className={cn("absolute inset-0 overflow-hidden", className)}
      style={style}
    >
      <svg
        className="absolute inset-0 w-full h-full"
        style={{ height: typeof length === "string" ? length : `${length}px` }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={`${id}-gradient`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0" />
            <stop offset="50%" stopColor={color} stopOpacity={opacity} />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
          <filter id={`${id}-blur`}>
            <feGaussianBlur stdDeviation={blur} />
          </filter>
        </defs>
        {rays.map((ray) => (
          <motion.line
            key={ray.id}
            x1={`${ray.x}%`}
            y1="0%"
            x2={`${ray.x}%`}
            y2="100%"
            stroke={`url(#${id}-gradient)`}
            strokeWidth="2"
            filter={`url(#${id}-blur)`}
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0, opacity, 0],
            }}
            transition={{
              duration: speed,
              delay: ray.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </svg>
    </div>
  )
}


