"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckIcon } from "@heroicons/react/20/solid";
import { motion, useReducedMotion } from "framer-motion";
import type { Route } from "next";
import Link from "next/link";

export type TierData = {
  name: string;
  id: string;
  href: Route;
  priceMonthly: string;
  description: string;
  mostPopular: boolean;
  highlights: string[];
  ctaLabel: string;
};

type PricingCardsProps = {
  tiers: TierData[];
  currentPlan: string;
  isLoggedIn: boolean;
  translations: {
    currentPlan: string;
    month: string;
    mostPopular: string;
  };
};

export function PricingCards({
  tiers,
  currentPlan,
  isLoggedIn,
  translations,
}: PricingCardsProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="py-16 sm:py-24" aria-label="Pricing plans">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tiers.map((tier, i) => (
            <motion.div
              key={tier.id}
              className={`group relative rounded-2xl border bg-white/50 p-8 shadow-sm backdrop-blur-xl dark:bg-white/5 ${
                tier.mostPopular
                  ? "border-primary ring-primary/20 ring-2"
                  : "border-gray-200 dark:border-white/10"
              }`}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                delay: i * 0.1,
                duration: 0.5,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
            >
              {tier.mostPopular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  {translations.mostPopular}
                </Badge>
              )}

              <div className="transition-transform duration-150 ease-out hover:translate-y-[-2px]">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {tier.name}
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {tier.description}
                </p>
                <p className="mt-6 flex items-baseline gap-x-1">
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">
                    {tier.priceMonthly}
                  </span>
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                    {translations.month}
                  </span>
                </p>

                {tier.name === currentPlan ? (
                  <Button
                    variant={tier.mostPopular ? "default" : "outline"}
                    className="mt-8 w-full"
                    asChild
                  >
                    <Link href="/settings">{translations.currentPlan}</Link>
                  </Button>
                ) : (
                  <Button
                    variant={tier.mostPopular ? "default" : "outline"}
                    className="mt-8 w-full"
                    asChild
                  >
                    <Link href={isLoggedIn ? tier.href : "/sign-in"}>
                      {tier.ctaLabel}
                    </Link>
                  </Button>
                )}

                <ul className="mt-8 space-y-3">
                  {tier.highlights.map((highlight) => (
                    <li
                      key={highlight}
                      className="flex items-start gap-x-3 text-sm text-gray-600 dark:text-gray-400"
                    >
                      <CheckIcon
                        className="text-primary mt-0.5 h-5 w-5 flex-none"
                        aria-hidden="true"
                      />
                      {highlight}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
