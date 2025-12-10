"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Lock, Globe2, FileCheck } from "lucide-react";

const STATS = [
  { value: "99.9%", label: "Uptime SLA", icon: Globe2 },
  { value: "SOC 2", label: "Type II Certified", icon: ShieldCheck },
  { value: "GDPR", label: "Compliant", icon: FileCheck },
  { value: "Zero", label: "Data Retention", icon: Lock },
];

export function ComplianceStats() {
  return (
    <section className="py-24 bg-white border-y border-neutral-100">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-light tracking-tight mb-4">Enterprise-grade security.</h2>
          <p className="text-neutral-500 font-light max-w-2xl mx-auto">
            Built for organizations that demand rigorous compliance and data protection standards.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center p-6 border border-neutral-100 bg-neutral-50/50 hover:bg-white hover:shadow-lg transition-all duration-300 group"
            >
              <div className="mx-auto w-12 h-12 bg-white rounded-full flex items-center justify-center border border-neutral-100 mb-4 group-hover:scale-110 transition-transform">
                <stat.icon size={20} className="text-neutral-900" strokeWidth={1.5} />
              </div>
              <div className="text-3xl font-medium text-neutral-900 mb-1">{stat.value}</div>
              <div className="text-sm text-neutral-500 font-light uppercase tracking-wide">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

