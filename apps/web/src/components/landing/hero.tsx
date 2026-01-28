"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { AuroraBackground } from "@/components/ui/aurora-background";

export function Hero() {
    return (
        <AuroraBackground className="bg-slate-50 text-slate-950">
            <div className="relative z-10 flex flex-col items-center justify-center h-full px-4 sm:px-6 pt-20 md:pt-0">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="text-center max-w-4xl mx-auto"
                >
                    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-sans font-light tracking-tight text-slate-950 mb-6 md:mb-8 leading-[1.15]">
                        Understand your users
                        <br />
                        before you ship features.
                    </h1>

                    <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-slate-600 mb-8 md:mb-10 max-w-3xl mx-auto leading-relaxed font-sans font-light">
                        Test product decisions before users ever touch them.
                        <span className="hidden sm:inline"><br /></span>
                        <span className="sm:hidden"> </span>
                        See where people hesitate, drop off, or move forward.
                    </p>

                    <div className="flex items-center justify-center">
                        <Link
                            href="https://cal.com/team/swarm/demo"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-slate-950 text-white hover:bg-slate-800 transition-all text-base sm:text-lg font-light rounded-lg shadow-xl hover:shadow-2xl hover:-translate-y-0.5"
                        >
                            Book Demo
                            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                        </Link>
                    </div>
                </motion.div>
            </div>
        </AuroraBackground>
    );
}
