"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckIcon, MinusIcon } from "@heroicons/react/20/solid";
import { motion, useReducedMotion } from "framer-motion";
import type { Route } from "next";
import Link from "next/link";
import { Fragment } from "react";

export type SectionData = {
  name: string;
  features: {
    name: string;
    tiers: Record<string, boolean | string>;
    comingSoon: boolean;
  }[];
};

type TierData = {
  name: string;
  id: string;
  href: Route;
  priceMonthly: string;
  mostPopular: boolean;
};

type PricingComparisonProps = {
  tiers: TierData[];
  sections: SectionData[];
  currentPlan: string;
  isLoggedIn: boolean;
  comingSoonLabel: string;
  translations: {
    priceComparison: string;
    price: string;
    month: string;
    getStarted: string;
    buyPlan: string;
    currentPlan: string;
    included: string;
    notIncluded: string;
  };
};

export function PricingComparison({
  tiers,
  sections,
  currentPlan,
  isLoggedIn,
  comingSoonLabel,
  translations,
}: PricingComparisonProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section
      className="py-16 sm:py-24"
      aria-label={translations.priceComparison}
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Mobile: stacked view */}
        <div className="mx-auto max-w-md space-y-8 lg:hidden">
          {tiers.map((tier, tierIdx) => (
            <motion.section
              key={tier.id}
              className={`rounded-2xl border p-8 backdrop-blur-xl ${
                tier.mostPopular
                  ? "border-primary bg-white/60 dark:bg-white/10"
                  : "border-gray-200 bg-white/50 dark:border-white/10 dark:bg-white/5"
              }`}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                delay: tierIdx * 0.1,
                duration: 0.5,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
            >
              <h3
                id={`mobile-${tier.id}`}
                className="text-sm leading-6 font-semibold text-gray-900 dark:text-white"
              >
                {tier.name}
              </h3>
              <p className="mt-2 flex items-baseline gap-x-1">
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
                  <Link
                    href={isLoggedIn ? tier.href : "/sign-in"}
                    aria-describedby={`mobile-${tier.id}`}
                  >
                    {tier.name === "Free"
                      ? translations.getStarted
                      : translations.buyPlan}
                  </Link>
                </Button>
              )}
              <ul className="mt-10 space-y-4 text-sm leading-6 text-gray-900 dark:text-white">
                {sections.map((section) => (
                  <li key={section.name}>
                    <ul className="space-y-4">
                      {section.features.map((feature) =>
                        feature.tiers[tier.id] ? (
                          <li key={feature.name} className="flex gap-x-3">
                            <CheckIcon
                              className="text-primary h-6 w-5 flex-none"
                              aria-hidden="true"
                            />
                            <span>
                              {feature.name}{" "}
                              {typeof feature.tiers[tier.id] === "string" ? (
                                <span className="text-sm leading-6 text-gray-500 dark:text-gray-400">
                                  ({feature.tiers[tier.id]})
                                </span>
                              ) : null}
                            </span>
                          </li>
                        ) : null
                      )}
                    </ul>
                  </li>
                ))}
              </ul>
            </motion.section>
          ))}
        </div>

        {/* Desktop: table view */}
        <motion.div
          className="isolate mt-20 hidden lg:block"
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="relative -mx-8">
            {tiers.some((tier) => tier.mostPopular) ? (
              <div className="absolute inset-x-4 inset-y-0 -z-10 flex">
                <div
                  className="flex w-1/4 px-4"
                  aria-hidden="true"
                  style={{
                    marginLeft: `${
                      (tiers.findIndex((tier) => tier.mostPopular) + 1) * 25
                    }%`,
                  }}
                >
                  <div className="border-primary/20 bg-primary/5 w-full rounded-t-xl border-x border-t" />
                </div>
              </div>
            ) : null}
            <table className="w-full table-fixed border-separate border-spacing-x-8 text-left">
              <caption className="sr-only">
                {translations.priceComparison}
              </caption>
              <colgroup>
                <col className="w-1/4" />
                <col className="w-1/4" />
                <col className="w-1/4" />
                <col className="w-1/4" />
              </colgroup>
              <thead>
                <tr>
                  <td />
                  {tiers.map((tier) => (
                    <th
                      key={tier.id}
                      scope="col"
                      className="px-6 pt-6 xl:px-8 xl:pt-8"
                    >
                      <div className="text-sm leading-7 font-semibold text-gray-900 dark:text-white">
                        {tier.name}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">
                    <span className="sr-only">{translations.price}</span>
                  </th>
                  {tiers.map((tier) => (
                    <td key={tier.id} className="px-6 pt-2 xl:px-8">
                      <div className="flex items-baseline gap-x-1 text-gray-900 dark:text-white">
                        <span className="text-4xl font-bold">
                          {tier.priceMonthly}
                        </span>
                        <span className="text-sm leading-6 font-semibold">
                          {translations.month}
                        </span>
                      </div>
                      {tier.name === currentPlan ? (
                        <Button
                          variant={tier.mostPopular ? "default" : "outline"}
                          className="mt-8 w-full"
                          asChild
                        >
                          <Link href="/settings">
                            {translations.currentPlan}
                          </Link>
                        </Button>
                      ) : (
                        <Button
                          variant={tier.mostPopular ? "default" : "outline"}
                          className="mt-8 w-full"
                          asChild
                        >
                          <Link href={isLoggedIn ? tier.href : "/sign-in"}>
                            {tier.name === "Free"
                              ? translations.getStarted
                              : translations.buyPlan}
                          </Link>
                        </Button>
                      )}
                    </td>
                  ))}
                </tr>
                {sections.map((section, sectionIdx) => (
                  <Fragment key={section.name}>
                    <tr>
                      <th
                        scope="colgroup"
                        colSpan={4}
                        className={`${
                          sectionIdx === 0 ? "pt-8" : "pt-16"
                        } text-primary pb-4 text-sm leading-6 font-semibold tracking-wider uppercase`}
                      >
                        {section.name}
                        <div className="absolute inset-x-8 mt-4 h-px bg-gray-900/10 dark:bg-white/10" />
                      </th>
                    </tr>
                    {section.features.map((feature) => (
                      <tr key={feature.name}>
                        <th
                          scope="row"
                          className="py-4 text-sm leading-6 font-normal text-gray-900 dark:text-white"
                        >
                          {feature.name}{" "}
                          {feature.comingSoon && (
                            <Badge variant="secondary" className="ml-2">
                              {comingSoonLabel}
                            </Badge>
                          )}
                          <div className="absolute inset-x-8 mt-4 h-px bg-gray-900/5 dark:bg-white/5" />
                        </th>
                        {tiers.map((tier) => (
                          <td key={tier.id} className="px-6 py-4 xl:px-8">
                            {typeof feature.tiers[tier.id] === "string" ? (
                              <div className="text-center text-sm leading-6 text-gray-500 dark:text-gray-300">
                                {feature.tiers[tier.id]}
                              </div>
                            ) : (
                              <>
                                {feature.tiers[tier.id] === true ? (
                                  <CheckIcon
                                    className="text-primary mx-auto h-5 w-5"
                                    aria-hidden="true"
                                  />
                                ) : (
                                  <MinusIcon
                                    className="mx-auto h-5 w-5 text-gray-400 dark:text-gray-500"
                                    aria-hidden="true"
                                  />
                                )}
                                <span className="sr-only">
                                  {feature.tiers[tier.id] === true
                                    ? translations.included
                                    : translations.notIncluded}{" "}
                                  {tier.name}
                                </span>
                              </>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
