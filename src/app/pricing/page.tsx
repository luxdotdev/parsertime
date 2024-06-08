import { Badge } from "@/components/ui/badge";
import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import { createCheckout, getCustomerPortalUrl } from "@/lib/stripe";
import { toTitleCase } from "@/lib/utils";
import { CheckIcon, MinusIcon } from "@heroicons/react/20/solid";
import Link from "next/link";
import React, { Fragment } from "react";

const sections = [
  {
    name: "Features",
    features: [
      {
        name: "Individual Scrims",
        tiers: { Free: true, Basic: true, Premium: true },
        comingSoon: false,
      },
      {
        name: "Join Teams via Invite",
        tiers: { Free: true, Basic: true, Premium: true },
        comingSoon: false,
      },
      {
        name: "Data Analytics",
        tiers: { Free: true, Basic: true, Premium: true },
        comingSoon: false,
      },
      {
        name: "Create Teams",
        tiers: { Basic: true, Premium: true },
        comingSoon: false,
      },
      {
        name: "Team Members",
        tiers: { Basic: "Up to 5 users", Premium: "Up to 15 users" },
        comingSoon: false,
      },
    ],
  },
  {
    name: "Scrim Statistics",
    features: [
      {
        name: "Advanced Analytics",
        tiers: { Free: true, Basic: true, Premium: true },
        comingSoon: false,
      },
      {
        name: "Custom Targets",
        tiers: { Premium: true },
        comingSoon: true,
      },
    ],
  },
  {
    name: "Player Statistics",
    features: [
      {
        name: "Last Week",
        tiers: { Free: true, Basic: true, Premium: true },
        comingSoon: false,
      },
      {
        name: "Last 2 Weeks",
        tiers: { Free: true, Basic: true, Premium: true },
        comingSoon: false,
      },
      {
        name: "Last Month",
        tiers: { Free: true, Basic: true, Premium: true },
        comingSoon: false,
      },
      {
        name: "Last 3 Months",
        tiers: { Basic: true, Premium: true },
        comingSoon: false,
      },
      {
        name: "Last 6 Months",
        tiers: { Basic: true, Premium: true },
        comingSoon: false,
      },
      {
        name: "Last Year",
        tiers: { Premium: true },
        comingSoon: false,
      },
      {
        name: "All Time",
        tiers: { Premium: true },
        comingSoon: false,
      },
      {
        name: "Custom Timeframe",
        tiers: { Premium: true },
        comingSoon: false,
      },
    ],
  },
  {
    name: "Support",
    features: [
      {
        name: "Community Discord",
        tiers: { Free: true, Basic: true, Premium: true },
        comingSoon: false,
      },
      {
        name: "Priority Support",
        tiers: { Basic: true, Premium: true },
        comingSoon: false,
      },
      {
        name: "Monthly Developer Check-ins",
        tiers: { Basic: true, Premium: true },
        comingSoon: false,
      },
      {
        name: "Custom Feature Requests",
        tiers: { Premium: true },
        comingSoon: false,
      },
    ],
  },
];

function classNames(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function ComingSoonBadge({ children }: { children: React.ReactNode }) {
  return (
    <Badge className="ml-2 bg-sky-500 text-white hover:bg-sky-700">
      {children}
    </Badge>
  );
}

export default async function PricingPage() {
  const session = await auth();
  const user = await getUser(session?.user?.email);

  const plan = toTitleCase(user?.billingPlan ?? "");

  async function getLink(tier: string) {
    if (session) {
      if (plan === "Free") {
        const checkout = await createCheckout(session, tier);
        return checkout.url;
      }
      return await getCustomerPortalUrl(user!);
    }

    return "/dashboard";
  }

  const tiers = [
    {
      name: "Free",
      id: "tier-free",
      href: "/dashboard",
      priceMonthly: "$0",
      description: "For people who want to try out Parsertime.",
      mostPopular: false,
    },
    {
      name: "Basic",
      id: "tier-basic",
      href: (await getLink("Basic")) ?? "/sign-in",
      priceMonthly: "$10",
      description: "For teams that are ready to grow with Parsertime.",
      mostPopular: true,
    },
    {
      name: "Premium",
      id: "tier-premium",
      href: (await getLink("Premium")) ?? "/sign-in",
      priceMonthly: "$15",
      description:
        "For larger teams that want to take their productivity to the next level.",
      mostPopular: false,
    },
  ];

  return (
    <>
      <div className="bg-white px-6 py-32 dark:bg-black lg:px-8">
        <div className="mx-auto max-w-3xl text-base leading-7 text-gray-700 dark:text-gray-200">
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-200 sm:text-4xl">
            Why Pricing?
          </h1>
          <p className="mt-6 text-xl leading-8">
            We want to provide a service to the Overwatch community that is
            affordable and accessible to everyone. Our service does cost money
            to run, so we need to charge for it for the sake of longevity of our
            website. Our goal is to ensure that our pricing, when released, will
            be fair and we are willing to work with you if you have any
            concerns. Below is a preview of what our pricing will look like.
            Please note that this is subject to change entirely and is far from
            being considered final.
          </p>
        </div>
      </div>
      <div className="bg-white py-24 dark:bg-black sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-base font-semibold leading-7 text-sky-600 dark:text-sky-400">
              Pricing
            </h2>
            <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
              Plans for teams of&nbsp;all&nbsp;sizes
            </p>
          </div>
          <p className="mx-auto mt-6 max-w-2xl text-center text-lg leading-8 text-gray-600 dark:text-gray-300">
            As your team grows, Parsertime grows with you. We have the tools and
            features to meet your needs.
          </p>

          {/* xs to lg */}
          <div className="mx-auto mt-12 max-w-md space-y-8 sm:mt-16 lg:hidden">
            {tiers.map((tier) => (
              <section
                key={tier.id}
                className={classNames(
                  tier.mostPopular
                    ? "rounded-xl bg-gray-400/5 ring-1 ring-inset ring-gray-200 dark:bg-white/5 dark:ring-white/10"
                    : "",
                  "p-8"
                )}
              >
                <h3
                  id={tier.id}
                  className="text-sm font-semibold leading-6 text-gray-900 dark:text-white"
                >
                  {tier.name}
                </h3>
                <p className="mt-2 flex items-baseline gap-x-1">
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">
                    {tier.priceMonthly}
                  </span>
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                    /month
                  </span>
                </p>
                <Link
                  href={session ? tier.href : "/sign-in"}
                  aria-describedby={tier.id}
                  className={classNames(
                    tier.mostPopular
                      ? "bg-sky-600 text-white hover:bg-sky-400 focus-visible:outline-sky-500 dark:bg-sky-500"
                      : "text-sky-600 hover:bg-white/20 focus-visible:outline-white dark:bg-white/10 dark:text-white",
                    "mt-8 block rounded-md px-3 py-2 text-center text-sm font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  )}
                >
                  {tier.name === "Free" ? "Get Started" : "Buy plan"}
                </Link>
                <ul className="mt-10 space-y-4 text-sm leading-6 text-gray-900 dark:text-white">
                  {sections.map((section) => (
                    <li key={section.name}>
                      <ul className="space-y-4">
                        {section.features.map((feature) =>
                          feature.tiers[
                            tier.name as keyof typeof feature.tiers
                          ] ? (
                            <li key={feature.name} className="flex gap-x-3">
                              <CheckIcon
                                className="h-6 w-5 flex-none text-sky-600 dark:text-sky-400"
                                aria-hidden="true"
                              />
                              <span>
                                {feature.name}{" "}
                                {typeof feature.tiers[
                                  tier.name as keyof typeof feature.tiers
                                ] === "string" ? (
                                  <span className="text-sm leading-6 text-gray-500 dark:text-gray-400">
                                    (
                                    {
                                      feature.tiers[
                                        tier.name as keyof typeof feature.tiers
                                      ]
                                    }
                                    )
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
              </section>
            ))}
          </div>

          {/* lg+ */}
          <div className="isolate mt-20 hidden lg:block">
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
                    <div className="w-full rounded-t-xl border-x border-t border-gray-900/10 bg-gray-400/5 dark:border-white/10 dark:bg-white/5" />
                  </div>
                </div>
              ) : null}
              <table className="w-full table-fixed border-separate border-spacing-x-8 text-left">
                <caption className="sr-only">Pricing plan comparison</caption>
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
                        <div className="text-sm font-semibold leading-7 text-gray-900 dark:text-white">
                          {tier.name}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">
                      <span className="sr-only">Price</span>
                    </th>
                    {tiers.map((tier) => (
                      <td key={tier.id} className="px-6 pt-2 xl:px-8">
                        <div className="flex items-baseline gap-x-1 text-gray-900 dark:text-white">
                          <span className="text-4xl font-bold">
                            {tier.priceMonthly}
                          </span>
                          <span className="text-sm font-semibold leading-6">
                            /month
                          </span>
                        </div>
                        {tier.name === plan ? (
                          <Link
                            href="/settings"
                            className={classNames(
                              tier.mostPopular
                                ? "bg-sky-600 text-white hover:bg-sky-500 dark:bg-sky-500 dark:hover:bg-sky-400 dark:focus-visible:outline-sky-600"
                                : "text-sky-600 ring-1 ring-inset ring-sky-200 hover:ring-sky-300 dark:bg-white/10 dark:ring-0 dark:hover:bg-white/20 dark:focus-visible:outline-white",
                              "mt-8 block rounded-md px-3 py-2 text-center text-sm font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 dark:text-white dark:focus-visible:ring-0"
                            )}
                          >
                            Your Current Plan
                          </Link>
                        ) : (
                          <Link
                            href={session ? tier.href : "/sign-in"}
                            className={classNames(
                              tier.mostPopular
                                ? "bg-sky-600 text-white hover:bg-sky-500 dark:bg-sky-500 dark:hover:bg-sky-400 dark:focus-visible:outline-sky-600"
                                : "text-sky-600 ring-1 ring-inset ring-sky-200 hover:ring-sky-300 dark:bg-white/10 dark:ring-0 dark:hover:bg-white/20 dark:focus-visible:outline-white",
                              "mt-8 block rounded-md px-3 py-2 text-center text-sm font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 dark:text-white dark:focus-visible:ring-0"
                            )}
                          >
                            {tier.name === "Free" ? "Get Started" : "Buy plan"}
                          </Link>
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
                          className={classNames(
                            sectionIdx === 0 ? "pt-8" : "pt-16",
                            "pb-4 text-sm font-semibold leading-6 text-gray-900 dark:text-white"
                          )}
                        >
                          {section.name}
                          <div className="absolute inset-x-8 mt-4 h-px bg-gray-900/10 dark:bg-white/10" />
                        </th>
                      </tr>
                      {section.features.map((feature) => (
                        <tr key={feature.name}>
                          <th
                            scope="row"
                            className="py-4 text-sm font-normal leading-6 text-gray-900 dark:text-white"
                          >
                            {feature.name}{" "}
                            {feature.comingSoon && (
                              <ComingSoonBadge>Coming soon</ComingSoonBadge>
                            )}
                            <div className="absolute inset-x-8 mt-4 h-px bg-gray-900/5 dark:bg-white/5" />
                          </th>
                          {tiers.map((tier) => (
                            <td key={tier.id} className="px-6 py-4 xl:px-8">
                              {typeof feature.tiers[
                                tier.name as keyof typeof feature.tiers
                              ] === "string" ? (
                                <div className="text-center text-sm leading-6 text-gray-500 dark:text-gray-300">
                                  {
                                    feature.tiers[
                                      tier.name as keyof typeof feature.tiers
                                    ]
                                  }
                                </div>
                              ) : (
                                <>
                                  {feature.tiers[
                                    tier.name as keyof typeof feature.tiers
                                  ] === true ? (
                                    <CheckIcon
                                      className="mx-auto h-5 w-5 text-sky-600 dark:text-sky-400"
                                      aria-hidden="true"
                                    />
                                  ) : (
                                    <MinusIcon
                                      className="mx-auto h-5 w-5 text-gray-400 dark:text-gray-500"
                                      aria-hidden="true"
                                    />
                                  )}

                                  <span className="sr-only">
                                    {feature.tiers[
                                      tier.name as keyof typeof feature.tiers
                                    ] === true
                                      ? "Included"
                                      : "Not included"}{" "}
                                    in {tier.name}
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
          </div>
        </div>
      </div>
    </>
  );
}
