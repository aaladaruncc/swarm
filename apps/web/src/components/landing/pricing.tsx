"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import Link from "next/link";

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
    <section id="pricing" className="relative py-32 bg-white overflow-hidden">
      <div className="container mx-auto px-6 max-w-7xl">
        {/* Header - Matching Testing, evolved Style */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center max-w-3xl mx-auto mb-20"
        >
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-serif font-normal tracking-tight text-neutral-900 mb-6 leading-[1.1]">
            Pricing
          </h2>
          <p className="text-xl md:text-2xl text-neutral-600 font-sans font-light leading-relaxed">
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
              className={`
                bg-gradient-to-br ${i % 2 === 0 ? "from-neutral-50 to-white" : "from-white to-neutral-50"}
                border border-neutral-200
                p-8
                flex flex-col
                hover:border-neutral-300
                transition-all duration-300
                group
              `}
            >
              <div className="mb-6">
                <h3 className="text-2xl font-serif font-normal text-neutral-900 mb-4 tracking-tight">
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-serif font-normal text-neutral-900">
                    {plan.price}
                  </span>
                  {plan.price !== "Custom" && (
                    <span className="text-neutral-600 font-sans font-light">/month</span>
                  )}
                </div>
                <p className="text-base text-neutral-600 font-sans font-light leading-relaxed">
                  {plan.description}
                </p>
              </div>
              
              <ul className="space-y-4 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-neutral-900 shrink-0" strokeWidth={1.5} />
                    <span className="text-base text-neutral-600 font-sans font-light">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
              
              <Link
                href={plan.price === "Custom" ? "/login" : "/login"}
                className="block w-full py-3 text-center text-sm font-sans font-light transition-all bg-neutral-900 text-white hover:bg-neutral-800"
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
