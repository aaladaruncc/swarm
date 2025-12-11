"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, CheckCircle2, Circle } from "lucide-react";

export function GeneratingPersonasLoader() {
  const [elapsed, setElapsed] = useState(0);
  
  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const steps = [
    { text: "Analyzing audience requirements", startTime: 0 },
    { text: "Generating diverse demographic profiles", startTime: 2 },
    { text: "Creating detailed backstories & goals", startTime: 6 },
    { text: "Finalizing persona attributes", startTime: 10 }
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] w-full max-w-2xl mx-auto p-8">
      
      <h2 className="text-3xl font-serif font-medium text-neutral-900 mb-2">Generating Personas</h2>
      
      {/* Progress Bar */}
      <div className="w-full max-w-md h-1 bg-neutral-100 mb-8 overflow-hidden">
        <motion.div 
          className="h-full bg-neutral-900" 
          initial={{ width: "0%" }}
          animate={{ width: `${Math.min((elapsed / 12) * 100, 100)}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      <p className="text-neutral-500 font-sans font-light mb-12 text-center max-w-md text-lg">
        AI is crafting realistic user profiles based on your description. This usually takes 15-20 seconds.
      </p>

      <div className="w-full max-w-md space-y-2">
        {steps.map((step, idx) => {
           const nextStepTime = steps[idx + 1]?.startTime ?? Infinity;
           const isStarted = elapsed >= step.startTime;
           const isCompleted = elapsed >= nextStepTime;
           const isActive = isStarted && !isCompleted;

           return (
             <motion.div 
               key={idx}
               initial={{ opacity: 0, x: -10 }}
               animate={{ opacity: isStarted ? 1 : 0.3, x: 0 }}
               className="flex items-center gap-4 py-2"
             >
               {isCompleted ? (
                 <div className="w-4 h-4 bg-neutral-900 flex items-center justify-center">
                   <CheckCircle2 className="w-3 h-3 text-white" />
                 </div>
               ) : isActive ? (
                 <Loader2 className="w-4 h-4 text-neutral-900 animate-spin" />
               ) : (
                 <div className="w-4 h-4 border border-neutral-200" />
               )}
               
               <span className={`text-sm font-medium transition-colors ${
                 isActive ? 'text-neutral-900' : isCompleted ? 'text-neutral-900' : 'text-neutral-400'
               }`}>
                 {step.text}
               </span>
             </motion.div>
           );
        })}
      </div>
    </div>
  );
}
