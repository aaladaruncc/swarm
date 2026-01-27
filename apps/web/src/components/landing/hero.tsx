"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { AuroraBackground } from "@/components/ui/aurora-background";

export function Hero() {
    return (
        <AuroraBackground className="bg-slate-50 text-slate-950">
            <div className="relative z-10 flex flex-col items-center justify-center h-full px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="text-center max-w-4xl mx-auto"
                >
                    <h1 className="text-5xl md:text-7xl font-sans font-light tracking-tight text-slate-950 mb-8 leading-[1.1]">
                        Understand your users
                        <br />
                        before you ship features.
                    </h1>

                    <p className="text-xl md:text-2xl text-slate-600 mb-10 max-w-3xl mx-auto leading-relaxed font-sans font-light whitespace-pre-line">
                        Test product decisions before users ever touch them.{"\n"}See where people hesitate, drop off, or move forward.
                    </p>

                    <div className="flex items-center justify-center">
                        <Link
                            href="https://cal.com/team/swarm/demo"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-8 py-4 bg-slate-950 text-white hover:bg-slate-800 transition-all text-lg font-light rounded-lg shadow-xl hover:shadow-2xl hover:-translate-y-0.5"
                        >
                            Book Demo
                            <ChevronRight className="w-5 h-5" />
                        </Link>
                    </div>
                </motion.div>
            </div>
        </AuroraBackground>
    );
}
