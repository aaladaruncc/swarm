"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import Link from "next/link";

const PLANS = [
  {
    name: "Free",
    price: "$0",
    description: "Perfect for indie hackers and small teams.",
    features: [
      "5 Agent Personas",
      "100 Sessions / month",
      "Basic Reporting",
      "Community Support",
    ],
  },
  {
    name: "Pro",
    price: "$50",
    popular: true,
    description: "For scaling startups needing robust feedback.",
    features: [
      "25 Agent Personas",
      "1,000 Sessions / month",
      "Advanced Analytics",
      "Priority Support",
      "API Access",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For large organizations with specific needs.",
    features: [
      "Unlimited Personas",
      "Unlimited Sessions",
      "Custom Integrations",
      "Dedicated Success Manager",
      "SLA & SSO",
    ],
  },
  ];

export function Pricing() {
  return (
    <section id="pricing" className="py-24 bg-white border-t border-neutral-100">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-light mb-6 text-neutral-900">
            Simple, transparent pricing
          </h2>
          <p className="text-xl text-neutral-500 font-light">
            Start small and scale as your user base grows.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`relative p-8 rounded-none border ${
                plan.popular
                  ? "border-neutral-900 bg-neutral-50"
                  : "border-neutral-200 bg-white"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-neutral-900 text-white px-4 py-1 text-xs font-medium uppercase tracking-wider">
                  Most Popular
                </div>
              )}
              <h3 className="text-2xl font-light mb-2 text-neutral-900">
                {plan.name}
              </h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-normal text-neutral-900">
                  {plan.price}
                </span>
                {plan.price !== "Custom" && (
                  <span className="text-neutral-500">/month</span>
                )}
              </div>
              <p className="text-neutral-500 mb-8 font-light">
                {plan.description}
              </p>
              <ul className="space-y-4 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-neutral-900 shrink-0" strokeWidth={1.5} />
                    <span className="text-neutral-600 font-light">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                className={`block w-full py-3 text-center text-sm font-medium transition-all rounded-none ${
                  plan.popular
                    ? "bg-neutral-900 hover:bg-neutral-800 text-white"
                    : "bg-white border border-neutral-200 hover:border-neutral-900 text-neutral-900"
                }`}
              >
                Get Started
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
