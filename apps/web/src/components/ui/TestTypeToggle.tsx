"use client";

import { useTheme } from "@/contexts/theme-context";

interface TestTypeToggleProps {
    activeType: "live" | "screenshot";
    onTypeChange: (type: "live" | "screenshot") => void;
}

export function TestTypeToggle({ activeType, onTypeChange }: TestTypeToggleProps) {
    const { theme } = useTheme();
    const isLight = theme === "light";

    return (
        <div className={`inline-flex p-1 rounded-lg ${isLight ? "bg-neutral-100" : "bg-[#252525]"
            }`}>
            <button
                onClick={() => onTypeChange("live")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeType === "live"
                        ? isLight
                            ? "bg-white text-neutral-900 shadow-sm"
                            : "bg-[#1E1E1E] text-white shadow-sm"
                        : isLight
                            ? "text-neutral-500 hover:text-neutral-900"
                            : "text-neutral-400 hover:text-white"
                    }`}
            >
                Live Tests
            </button>
            <button
                onClick={() => onTypeChange("screenshot")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeType === "screenshot"
                        ? isLight
                            ? "bg-white text-neutral-900 shadow-sm"
                            : "bg-[#1E1E1E] text-white shadow-sm"
                        : isLight
                            ? "text-neutral-500 hover:text-neutral-900"
                            : "text-neutral-400 hover:text-white"
                    }`}
            >
                Screenshot Tests
            </button>
        </div>
    );
}
