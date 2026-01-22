"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import Link from "next/link";
import posthog from "posthog-js";

const PLANS = [
  {
    name: "Free",
    price: "$0",
    description: "Perfect for getting started with intelligent testing.",
    features: [
      "10 Agents",
      "Up to 5 Tests",
      "Basic Reporting",
      "Export Options",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For large organizations with specific needs.",
    features: [
      "Unlimited Agents",
      "Unlimited Tests",
      "Custom Integrations",
      "Dedicated Success Manager",
      "SLA & SSO",
    ],
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="relative py-32 bg-transparent overflow-hidden border-b border-white/5">
      <div className="container mx-auto px-6 max-w-7xl">
        {/* Header - Matching dark theme style */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center max-w-3xl mx-auto mb-20"
        >
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-sans font-light tracking-tight text-white mb-6 leading-[1.1]">
            <span className="text-white/50">Simple</span> Pricing
          </h2>
          <p className="text-xl md:text-2xl text-white/60 font-sans font-light leading-relaxed">
            Start small and scale as your user base grows.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: "easeOut" }}
              className="
                bg-white/5
                backdrop-blur-sm
                border border-white/10
                p-8
                flex flex-col
                hover:bg-white/[0.08]
                hover:border-white/15
                transition-all duration-300
                group
              "
            >
              <div className="mb-6">
                <h3 className="text-2xl font-sans font-light text-white mb-4 tracking-tight">
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-sans font-light text-white">
                    {plan.price}
                  </span>
                  {plan.price !== "Custom" && (
                    <span className="text-white/50 font-sans font-light">/month</span>
                  )}
                </div>
                <p className="text-base text-white/60 font-sans font-light leading-relaxed">
                  {plan.description}
                </p>
              </div>
              
              <ul className="space-y-4 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-white/80 shrink-0" strokeWidth={1.5} />
                    <span className="text-base text-white/70 font-sans font-light">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
              
              <Link
                href={plan.price === "Custom" ? "/login" : "/login"}
                onClick={() => posthog.capture("pricing_plan_clicked", {
                  plan_name: plan.name,
                  plan_price: plan.price,
                  cta_text: plan.price === "Custom" ? "Book Demo" : "Get Started",
                })}
                className="block w-full py-3 text-center text-sm font-sans font-light transition-all text-white hover:opacity-90 rounded-lg"
                style={{
                  backgroundColor: plan.price === "Custom"
                    ? "rgba(255, 255, 255, 0.1)"
                    : "rgba(255, 255, 255, 0.15)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                }}
              >
                {plan.price === "Custom" ? "Book Demo" : "Get Started"}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
