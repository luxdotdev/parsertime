import { Badge } from "@/components/ui/badge";
import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import { createCheckout, getCustomerPortalUrl } from "@/lib/stripe";
import { toTitleCase } from "@/lib/utils";
import { CheckIcon, MinusIcon } from "@heroicons/react/20/solid";
import Link from "next/link";
import React, { Fragment } from "react";
import Image from "next/image";

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
        tiers: {
          Free: "Up to 2 teams",
          Basic: "Up to 5 teams",
          Premium: "Up to 10 teams",
        },
        comingSoon: false,
      },
      {
        name: "Team Members",
        tiers: { Basic: "Up to 10 users", Premium: "Up to 20 users" },
        comingSoon: false,
      },
      {
        name: "Early Access to New Features",
        tiers: { Premium: true },
        comingSoon: false,
      },
    ],
  },
  {
    name: "Map Statistics",
    features: [
      {
        name: "Advanced Analytics",
        tiers: { Free: true, Basic: true, Premium: true },
        comingSoon: false,
      },
      {
        name: "Map Killfeeds",
        tiers: { Free: true, Basic: true, Premium: true },
        comingSoon: false,
      },
      {
        name: "Custom Charts",
        tiers: { Free: true, Basic: true, Premium: true },
        comingSoon: false,
      },
      {
        name: "Map Events",
        tiers: { Free: true, Basic: true, Premium: true },
        comingSoon: false,
      },
      {
        name: "Player Comparison",
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

const faqs = [
  {
    question: "Do you offer discounts for collegiate teams?",
    answer:
      "Yes! Please reach out to our support team and we'll be happy to help.",
  },
  {
    question: "Do you offer discounts for Calling All Heroes teams?",
    answer:
      "Yes! We want to support the CAH community as much as possible. Please reach out to our support team and we'll be happy to discuss a solution.",
  },
  {
    question: "How can I manage my subscription?",
    answer: (
      <p>
        You can manage your subscription{" "}
        <Link
          href="/settings"
          className="font-semibold text-sky-600 hover:text-sky-500 dark:text-sky-400 dark:hover:text-sky-300"
          target="_blank"
        >
          here
        </Link>
        . If you have any issues, please reach out to our support team.
      </p>
    ),
  },
  {
    question: "Can I cancel my subscription at any time?",
    answer:
      "Yes, you can cancel your subscription at any time. Your subscription will remain active until the end of the billing period.",
  },
  {
    question: "Do you offer a free trial?",
    answer: (
      <p>
        We do not currently offer a free trial through our website. If you would
        like to try out our service, please reach out to our{" "}
        <Link
          href="/contact"
          className="font-semibold text-sky-600 hover:text-sky-500 dark:text-sky-400 dark:hover:text-sky-300"
          target="_blank"
        >
          support team
        </Link>
        .
      </p>
    ),
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
    <main className="bg-white dark:bg-black">
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

      <div className="mx-auto mt-8 max-w-7xl px-6 sm:mt-16 lg:px-8">
        <div className="mx-auto mt-10 grid max-w-lg grid-cols-4 items-center gap-x-8 gap-y-10 sm:max-w-xl sm:grid-cols-6 sm:gap-x-10 lg:mx-0 lg:max-w-none lg:grid-cols-5">
          <Image
            className="col-span-2 max-h-12 w-full object-contain invert dark:invert-0 lg:col-span-1"
            src="/teams/stclair.svg"
            alt="St. Clair College"
            width={158}
            height={48}
          />
          <Image
            className="col-span-2 max-h-12 w-full object-contain invert dark:invert-0 lg:col-span-1"
            src="/teams/cornell.svg"
            alt="Cornell University"
            width={158}
            height={48}
          />
          <Image
            className="col-span-2 max-h-12 w-full object-contain invert dark:invert-0 lg:col-span-1"
            src="/teams/fiu.svg"
            alt="Florida International University"
            width={158}
            height={48}
          />
          <Image
            className="col-span-2 max-h-12 w-full object-contain invert dark:invert-0 lg:col-span-1"
            src="/teams/gsu.svg"
            alt="Georgia State University"
            width={158}
            height={48}
          />
          <Image
            className="col-span-2 max-h-12 w-full object-contain invert dark:invert-0 lg:col-span-1"
            src="/teams/vlln.png"
            alt="VLLN"
            width={158}
            height={48}
          />
        </div>
        <div className="mt-16 flex justify-center">
          <p className="relative rounded-full bg-gray-50 px-4 py-1.5 text-sm leading-6 text-gray-600 ring-1 ring-inset ring-gray-900/5 dark:bg-zinc-950 dark:text-gray-300 dark:ring-gray-50/5">
            <span className="hidden md:inline">
              Learn how teams use Parsertime to improve their coaching strategy.
            </span>
            <Link
              href="https://lux.dev/blog"
              className="font-semibold text-sky-600 dark:text-sky-300"
            >
              <span className="absolute inset-0" aria-hidden="true" /> See our
              case study <span aria-hidden="true">&rarr;</span>
            </Link>
          </p>
        </div>
      </div>

      <section className="relative isolate overflow-hidden bg-white px-6 py-24 dark:bg-black sm:py-32 lg:px-8">
        <div className="mx-auto max-w-2xl lg:max-w-4xl">
          <Image
            className="mx-auto h-12 dark:invert"
            src="/teams/o7.png"
            alt=""
            width={158}
            height={48}
          />
          <figure className="mt-10">
            <blockquote className="text-center text-xl font-semibold leading-8 text-gray-900 dark:text-white sm:text-2xl sm:leading-9">
              <p>
                “Parsertime is so impactful to the point where my players can be
                coached on things they actively need help with, like living
                more, or holding their ult longer and being patient.”
              </p>
            </blockquote>
            <figcaption className="mt-10">
              <Image
                className="mx-auto h-10 w-10 rounded-full"
                src="https://cdn.discordapp.com/avatars/328704972822806529/558726bf88ce33f94fea8794a0bf924d?size=1024"
                alt=""
                width={48}
                height={48}
              />
              <div className="mt-4 flex items-center justify-center space-x-3 text-base">
                <div className="font-semibold text-gray-900 dark:text-white">
                  coy (@shy.coy)
                </div>
                <svg
                  viewBox="0 0 2 2"
                  width={3}
                  height={3}
                  aria-hidden="true"
                  className="fill-gray-900 dark:fill-white"
                >
                  <circle cx={1} cy={1} r={1} />
                </svg>
                <div className="text-gray-600 dark:text-gray-300">
                  Manager for o7 Esports
                </div>
              </div>
            </figcaption>
          </figure>
        </div>
      </section>

      <div className="bg-white dark:bg-black">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:pt-32 lg:px-8 lg:py-40">
          <div className="lg:grid lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-5">
              <h2 className="text-2xl font-bold leading-10 tracking-tight text-gray-900 dark:text-white">
                Frequently asked questions
              </h2>
              <p className="mt-4 text-base leading-7 text-gray-600 dark:text-gray-300">
                Can&apos;t find the answer you&apos;re looking for? Reach out to
                our{" "}
                <Link
                  href="/contact"
                  className="font-semibold text-sky-600 hover:text-sky-500 dark:text-sky-400 dark:hover:text-sky-300"
                >
                  support
                </Link>{" "}
                team.
              </p>
            </div>
            <div className="mt-10 lg:col-span-7 lg:mt-0">
              <dl className="space-y-10">
                {faqs.map((faq) => (
                  <div key={faq.question}>
                    <dt className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
                      {faq.question}
                    </dt>
                    <dd className="mt-2 text-base leading-7 text-gray-600 dark:text-gray-300">
                      {faq.answer}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
