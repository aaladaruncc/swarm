"use client";

import { useSession } from "@/lib/auth-client";
import { Loader2, FolderKanban } from "lucide-react";
import { useTheme } from "@/contexts/theme-context";

export default function ProjectsPage() {
  const { data: session, isPending } = useSession();
  const { theme } = useTheme();
  
  const isLight = theme === "light";

  if (isPending) {
    return (
      <div className={`h-full flex items-center justify-center ${
        isLight ? "bg-neutral-50" : "bg-neutral-950"
      } ${isLight ? "text-neutral-900" : "text-white"}`}>
        <Loader2 className={`animate-spin w-8 h-8 ${
          isLight ? "text-neutral-500" : "text-neutral-400"
        }`} />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className={`mb-6 p-6 rounded-full ${
          isLight 
            ? "bg-neutral-100" 
            : "bg-white/5"
        }`}>
          <FolderKanban 
            size={64} 
            className={`${
              isLight ? "text-neutral-400" : "text-neutral-500"
            }`}
            strokeWidth={1.5}
          />
        </div>
        
        <h1 className={`text-4xl font-light tracking-tight mb-4 ${
          isLight ? "text-neutral-900" : "text-white"
        }`}>
          Projects
        </h1>
        
        <p className={`text-xl font-light mb-2 max-w-md ${
          isLight ? "text-neutral-600" : "text-neutral-400"
        }`}>
          Coming Soon
        </p>
        
        <p className={`text-sm font-light max-w-lg ${
          isLight ? "text-neutral-500" : "text-neutral-500"
        }`}>
          We're working on something exciting. Projects will help you organize and manage your simulations more effectively.
        </p>
      </div>
    </div>
  );
}
