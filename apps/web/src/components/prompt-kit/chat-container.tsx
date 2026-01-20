"use client";

import { useEffect, useRef, ReactNode } from "react";

interface ChatContainerRootProps {
  children: ReactNode;
  className?: string;
}

export function ChatContainerRoot({ children, className = "" }: ChatContainerRootProps) {
  return (
    <div className={`flex flex-col overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

interface ChatContainerContentProps {
  children: ReactNode;
  className?: string;
}

export function ChatContainerContent({ children, className = "" }: ChatContainerContentProps) {
  return (
    <div 
      className={`flex-1 overflow-y-auto chat-scroll ${className}`}
      style={{
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(255, 255, 255, 0.1) transparent',
      }}
    >
      {children}
    </div>
  );
}

export function ChatContainerScrollAnchor() {
  const anchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    anchorRef.current?.scrollIntoView({ behavior: "smooth" });
  });

  return <div ref={anchorRef} />;
}
