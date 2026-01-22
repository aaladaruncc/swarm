"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Loader2, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { useTheme } from "@/contexts/theme-context";

interface ScreenshotCanvasProps {
  screenshots: Array<{
    id: string;
    signedUrl?: string;
    s3Url?: string;
    orderIndex: number;
    description?: string | null;
  }>;
  isAnalyzing?: boolean;
  analyzingStep?: number;
  totalSteps?: number;
}

export function ScreenshotCanvas({
  screenshots,
  isAnalyzing = false,
  analyzingStep = 0,
  totalSteps = 0,
}: ScreenshotCanvasProps) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Calculate container size
  useEffect(() => {
    const updateSize = () => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };
    
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Center the canvas on load
  useEffect(() => {
    if (screenshots.length > 0 && containerSize.width > 0) {
      // Calculate total width of all screenshots (assuming each is ~400px wide + 40px gap)
      const screenshotWidth = 400;
      const gap = 40;
      const totalWidth = screenshots.length * (screenshotWidth + gap) - gap;
      
      // Center horizontally
      const centerX = (totalWidth - containerSize.width) / 2;
      setPan({ x: -centerX, y: 0 });
    }
  }, [screenshots.length, containerSize.width]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) { // Left mouse button
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    const newZoom = Math.min(Math.max(0.5, zoom + delta), 3);
    setZoom(newZoom);
  }, [zoom]);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.2, 0.5));
  };

  const handleReset = () => {
    setZoom(1);
    if (screenshots.length > 0 && containerSize.width > 0) {
      const screenshotWidth = 400;
      const gap = 40;
      const totalWidth = screenshots.length * (screenshotWidth + gap) - gap;
      const centerX = (totalWidth - containerSize.width) / 2;
      setPan({ x: -centerX, y: 0 });
    }
  };

  const sortedScreenshots = [...screenshots].sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Canvas Container */}
      <div
        ref={canvasRef}
        className="relative h-full w-full overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* Canvas Background */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: isLight
              ? `radial-gradient(circle, #e5e5e5 1px, transparent 1px)`
              : `radial-gradient(circle, #404040 1px, transparent 1px)`,
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0',
          }}
        />

        {/* Screenshot Sequence */}
        <div
          className="absolute"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            display: 'flex',
            gap: '40px',
            padding: '40px',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          }}
        >
          {sortedScreenshots.map((screenshot, index) => {
            const isAnalyzingThis = isAnalyzing && index === analyzingStep - 1;
            const isAnalyzed = isAnalyzing && index < analyzingStep - 1;
            
            return (
              <div
                key={screenshot.id}
                className="relative flex-shrink-0"
                style={{ width: '400px' }}
              >
                {/* Screenshot Container */}
                <div
                  className={`relative rounded-lg overflow-hidden shadow-lg border-2 transition-all ${
                    isAnalyzingThis
                      ? isLight
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-blue-400 bg-blue-500/20'
                      : isAnalyzed
                        ? isLight
                          ? 'border-green-500 bg-green-50'
                          : 'border-green-400 bg-green-500/20'
                        : isLight
                          ? 'border-neutral-300 bg-white'
                          : 'border-white/20 bg-[#1E1E1E]'
                  }`}
                >
                  {/* Screenshot Image */}
                  <div className={`relative ${isLight ? 'bg-neutral-100' : 'bg-[#252525]'}`}>
                    <img
                      src={screenshot.signedUrl || screenshot.s3Url}
                      alt={`Screenshot ${screenshot.orderIndex + 1}`}
                      className="w-full h-auto block"
                      draggable={false}
                    />
                    
                    {/* Overlay for analyzing state */}
                    {isAnalyzingThis && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                        <div className="text-center">
                          <Loader2 className={`w-8 h-8 animate-spin mx-auto mb-2 ${isLight ? 'text-white' : 'text-white'}`} />
                          <p className={`text-sm font-medium ${isLight ? 'text-white' : 'text-white'}`}>
                            Analyzing...
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* Checkmark for analyzed */}
                    {isAnalyzed && (
                      <div className="absolute top-2 right-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isLight ? 'bg-green-500' : 'bg-green-400'
                        }`}>
                          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Step Number Badge */}
                  <div className={`absolute top-2 left-2 px-3 py-1 rounded-lg text-xs font-medium ${
                    isLight ? 'bg-white/90 text-neutral-900' : 'bg-black/60 text-white'
                  }`}>
                    Step {screenshot.orderIndex + 1}
                  </div>

                  {/* Description */}
                  {screenshot.description && (
                    <div className={`absolute bottom-0 left-0 right-0 p-3 ${
                      isLight ? 'bg-white/90' : 'bg-black/60'
                    }`}>
                      <p className={`text-xs font-light ${
                        isLight ? 'text-neutral-600' : 'text-neutral-300'
                      }`}>
                        {screenshot.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Controls */}
      <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg ${
        isLight ? 'bg-white border border-neutral-200' : 'bg-[#1E1E1E] border border-white/10'
      }`}>
        <button
          onClick={handleZoomOut}
          className={`p-2 rounded transition-colors ${
            isLight
              ? 'hover:bg-neutral-100 text-neutral-700'
              : 'hover:bg-white/10 text-neutral-300'
          }`}
          title="Zoom Out"
        >
          <ZoomOut size={16} />
        </button>
        <span className={`text-xs font-medium px-2 ${
          isLight ? 'text-neutral-600' : 'text-neutral-400'
        }`}>
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={handleZoomIn}
          className={`p-2 rounded transition-colors ${
            isLight
              ? 'hover:bg-neutral-100 text-neutral-700'
              : 'hover:bg-white/10 text-neutral-300'
          }`}
          title="Zoom In"
        >
          <ZoomIn size={16} />
        </button>
        <div className={`w-px h-6 mx-1 ${
          isLight ? 'bg-neutral-200' : 'bg-white/10'
        }`} />
        <button
          onClick={handleReset}
          className={`p-2 rounded transition-colors ${
            isLight
              ? 'hover:bg-neutral-100 text-neutral-700'
              : 'hover:bg-white/10 text-neutral-300'
          }`}
          title="Reset View"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {/* Analysis Progress Indicator */}
      {isAnalyzing && (
        <div className={`absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg shadow-lg ${
          isLight
            ? 'bg-blue-50 border border-blue-200 text-blue-900'
            : 'bg-blue-500/20 border border-blue-500/30 text-blue-300'
        }`}>
          <div className="flex items-center gap-3">
            <Loader2 className="w-4 h-4 animate-spin" />
            <div>
              <p className="text-sm font-medium">Swarm is analyzing your screenshots...</p>
              <p className="text-xs font-light">
                {analyzingStep > 0 && totalSteps > 0
                  ? `Step ${analyzingStep} of ${totalSteps}`
                  : 'This usually takes 30-60 seconds'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
