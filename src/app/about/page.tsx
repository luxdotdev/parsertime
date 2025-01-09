import {
  AcademicCapIcon,
  HandRaisedIcon,
  PresentationChartLineIcon,
  RocketLaunchIcon,
  ServerStackIcon,
  UserGroupIcon,
} from "@heroicons/react/20/solid";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import Link from "next/link";
import { SVGProps } from "react";

export default async function AboutPage() {
  const t = await getTranslations("aboutPage");

  const stats = [
    { label: t("stats.startDev.label"), value: t("stats.startDev.value") },
    { label: t("stats.used.label"), value: t("stats.used.value") },
    {
      label: t("stats.scrimsUploaded.label"),
      value: t("stats.scrimsUploaded.value"),
    },
    {
      label: t("stats.statsTracked.label"),
      value: t("stats.statsTracked.value"),
    },
  ];
  const values = [
    {
      name: t("values.convenience.name"),
      description: t("values.convenience.description"),
      icon: PresentationChartLineIcon,
    },
    {
      name: t("values.accessibility.name"),
      description: t("values.accessibility.description"),
      icon: HandRaisedIcon,
    },
    {
      name: t("values.community.name"),
      description: t("values.community.description"),
      icon: UserGroupIcon,
    },
    {
      name: t("values.openSource.name"),
      description: t("values.openSource.description"),
      icon: AcademicCapIcon,
    },
    {
      name: t("values.improvement.name"),
      description: t("values.improvement.description"),
      icon: RocketLaunchIcon,
    },
    {
      name: t("values.reliable.name"),
      description: t("values.reliable.description"),
      icon: ServerStackIcon,
    },
  ];
  const team = [
    {
      name: t("team.lucas.name"),
      role: t("team.lucas.role"),
      imageUrl: "/marketing/lucas.jpg",
      location: "Ithaca, NY",
    },
    {
      name: t("team.robin.name"),
      role: t("team.robin.role"),
      imageUrl: "/marketing/robin.png",
      location: "Vancouver, BC",
    },
    {
      name: t("team.xavier.name"),
      role: t("team.xavier.role"),
      imageUrl: "/marketing/xavier.jpg",
      location: "Ithaca, NY",
    },
    {
      name: t("team.adrian.name"),
      role: t("team.adrian.role"),
      imageUrl: "/marketing/adrian.jpg",
      location: "Miami, FL",
    },
    {
      name: t("team.daniel.name"),
      role: t("team.daniel.role"),
      imageUrl: "/marketing/daniel.png",
      location: "Miami, FL",
    },
    {
      name: t("team.diego.name"),
      role: t("team.diego.role"),
      imageUrl: "/marketing/diego.jpg",
      location: "Miami, FL",
    },
    {
      name: t("team.yai.name"),
      role: t("team.yai.role"),
      imageUrl: "/marketing/yai.jpg",
      location: "Miami, FL",
    },
    {
      name: t("team.kenny.name"),
      role: t("team.kenny.role"),
      imageUrl: "/marketing/kenny.jpg",
      location: "Miami, FL",
    },
  ];

  type IconProps = Omit<SVGProps<SVGSVGElement>, "fill" | "viewbox">;

  const footerNavigation = {
    solutions: [
      { name: t("footerNav.solutions.dashboard"), href: "/dashboard" },
      { name: t("footerNav.solutions.signUp"), href: "/sign-up" },
      { name: t("footerNav.solutions.demo"), href: "/demo" },
    ],
    support: [
      { name: t("footerNav.support.pricing"), href: "/pricing" },
      { name: t("footerNav.support.doc"), href: "https://docs.parsertime.app" },
      {
        name: t("footerNav.support.discord"),
        href: "https://discord.gg/svz3qhVDXM",
      },
      { name: t("footerNav.support.contact"), href: "/contact" },
    ],
    company: [
      { name: t("footerNav.company.about"), href: "https://lux.dev" },
      { name: t("footerNav.company.blog"), href: "https://blog.lux.dev" },
      {
        name: t("footerNav.company.github"),
        href: "https://github.com/luxdotdev",
      },
    ],
    legal: [{ name: t("footerNav.legal.policy"), href: "/privacy" }],
    social: [
      {
        name: t("footerNav.socials.twitter"),
        href: "https://twitter.com/luxdotdev",
        icon: (props: IconProps) => (
          <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
            <path d="M13.6823 10.6218L20.2391 3H18.6854L12.9921 9.61788L8.44486 3H3.2002L10.0765 13.0074L3.2002 21H4.75404L10.7663 14.0113L15.5685 21H20.8131L13.6819 10.6218H13.6823ZM11.5541 13.0956L10.8574 12.0991L5.31391 4.16971H7.70053L12.1742 10.5689L12.8709 11.5655L18.6861 19.8835H16.2995L11.5541 13.096V13.0956Z" />
          </svg>
        ),
      },
      {
        name: t("footerNav.socials.bluesky"),
        href: "https://bsky.app/profile/lux.dev",
        icon: (props: IconProps) => (
          <svg fill="currentColor" viewBox="-50 -50 430 390" {...props}>
            <path d="M180 141.964C163.699 110.262 119.308 51.1817 78.0347 22.044C38.4971 -5.86834 23.414 -1.03207 13.526 3.43594C2.08093 8.60755 0 26.1785 0 36.5164C0 46.8542 5.66748 121.272 9.36416 133.694C21.5786 174.738 65.0603 188.607 105.104 184.156C107.151 183.852 109.227 183.572 111.329 183.312C109.267 183.642 107.19 183.924 105.104 184.156C46.4204 192.847 -5.69621 214.233 62.6582 290.33C137.848 368.18 165.705 273.637 180 225.702C194.295 273.637 210.76 364.771 295.995 290.33C360 225.702 313.58 192.85 254.896 184.158C252.81 183.926 250.733 183.645 248.671 183.315C250.773 183.574 252.849 183.855 254.896 184.158C294.94 188.61 338.421 174.74 350.636 133.697C354.333 121.275 360 46.8568 360 36.519C360 26.1811 357.919 8.61012 346.474 3.43851C336.586 -1.02949 321.503 -5.86576 281.965 22.0466C240.692 51.1843 196.301 110.262 180 141.964Z" />
          </svg>
        ),
      },
      {
        name: t("footerNav.socials.github"),
        href: "https://github.com/luxdotdev",
        icon: (props: IconProps) => (
          <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
            <path
              fillRule="evenodd"
              d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              clipRule="evenodd"
            />
          </svg>
        ),
      },
    ],
  };

  return (
    <div className="bg-white dark:bg-black">
      <main className="relative isolate">
        {/* Background */}
        <div
          className="absolute inset-x-0 top-4 -z-10 flex transform-gpu justify-center overflow-hidden blur-3xl"
          aria-hidden="true"
        >
          <div
            className="aspect-[1108/632] w-[69.25rem] flex-none bg-gradient-to-r from-[#80caff] to-[#4f46e5] opacity-25"
            style={{
              clipPath:
                "polygon(73.6% 51.7%, 91.7% 11.8%, 100% 46.4%, 97.4% 82.2%, 92.5% 84.9%, 75.7% 64%, 55.3% 47.5%, 46.5% 49.4%, 45% 62.9%, 50.3% 87.2%, 21.3% 64.1%, 0.1% 100%, 5.4% 51.1%, 21.4% 63.9%, 58.9% 0.2%, 73.6% 51.7%)",
            }}
          />
        </div>
        {/* Header section */}
        <div className="px-6 pt-14 lg:px-8">
          <div className="mx-auto max-w-2xl pt-24 text-center sm:pt-40">
            <h2 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl">
              {t("headerSection.title")}
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-700 dark:text-gray-300">
              {t("headerSection.description")}
            </p>
          </div>
        </div>
        {/* Content section */}
        <div className="mx-auto mt-20 max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-none">
            <div className="grid max-w-xl grid-cols-1 gap-8 text-base leading-7 text-gray-700 dark:text-gray-300 lg:max-w-none lg:grid-cols-2">
              <div>
                <p>{t("contentSection.description1")}</p>
                <p className="mt-8">{t("contentSection.description2")}</p>
              </div>
              <div>
                <p>{t("contentSection.description3")}</p>
                <p className="mt-8">
                  {t.rich("contentSection.description4", {
                    link: (chunks) => (
                      <Link
                        href="https://github.com/luxdotdev/parsertime"
                        target="_blank"
                        className="text-sky-600 dark:text-sky-400"
                      >
                        {chunks}
                      </Link>
                    ),
                  })}
                </p>
              </div>
            </div>
            <dl className="mt-16 grid grid-cols-1 gap-x-8 gap-y-12 sm:mt-20 sm:grid-cols-2 sm:gap-y-16 lg:mt-28 lg:grid-cols-4">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="flex flex-col-reverse gap-y-3 border-l border-gray-900/20 pl-6 dark:border-white/20"
                >
                  <dt className="text-base leading-7 text-gray-700 dark:text-gray-300">
                    {stat.label}
                  </dt>
                  <dd className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
        {/* Image section */}
        {/* <div className="mt-32 sm:mt-40 xl:mx-auto xl:max-w-7xl xl:px-8">
          <img
            src="https://images.unsplash.com/photo-1521737852567-6949f3f9f2b5?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2894&q=80"
            alt=""
            className="aspect-[9/4] w-full object-cover xl:rounded-3xl"
          />
        </div> */}
        {/* Values section */}
        <div className="mx-auto mt-32 max-w-7xl px-6 sm:mt-40 lg:px-8">
          <div className="mx-auto max-w-2xl lg:mx-0">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              {t("featureSection.title")}
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-700 dark:text-gray-300">
              {t("featureSection.description")}
            </p>
          </div>
          <dl className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 text-base leading-7 text-gray-700 dark:text-gray-300 sm:grid-cols-2 lg:mx-0 lg:max-w-none lg:gap-x-16">
            {values.map((value) => (
              <div key={value.name} className="relative pl-9">
                <dt className="inline font-semibold text-gray-900 dark:text-white">
                  <value.icon
                    className="absolute left-1 top-1 h-5 w-5 text-sky-500"
                    aria-hidden="true"
                  />
                  {value.name}
                </dt>{" "}
                <dd className="inline">{value.description}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Team section */}
        <div className="bg-white py-24 dark:bg-black sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl lg:mx-0">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
                {t("teamSection.title")}
              </h2>
              <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
                {t("teamSection.description")}
              </p>
            </div>
            <ul className="mx-auto mt-20 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-14 sm:grid-cols-2 lg:mx-0 lg:max-w-none lg:grid-cols-3 xl:grid-cols-4">
              {team.map((person) => (
                <li key={person.name}>
                  <Image
                    alt=""
                    src={person.imageUrl}
                    className="aspect-[14/13] w-full rounded-2xl object-cover"
                    width={324}
                    height={300}
                  />
                  <h3 className="mt-6 text-lg font-semibold leading-8 tracking-tight text-black dark:text-white">
                    {person.name}
                  </h3>
                  <p className="text-base leading-7 text-gray-600 dark:text-gray-300">
                    {person.role}
                  </p>
                  <p className="text-sm leading-6 text-gray-400 dark:text-gray-500">
                    {person.location}
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-24 text-center text-sm text-gray-600 dark:text-gray-400">
              {t.rich("team.notPictured", {
                name: (chunks) => (
                  <strong className="font-semibold text-gray-950 dark:text-gray-100">
                    {chunks}
                  </strong>
                ),
              })}
            </p>
          </div>
        </div>

        {/* CTA section */}
        <div className="bg-white dark:bg-black">
          <div className="mx-auto max-w-7xl py-24 sm:px-6 sm:py-32 lg:px-8">
            <div className="relative isolate overflow-hidden bg-gray-950 px-6 pt-16 shadow-2xl sm:rounded-3xl sm:px-16 md:pt-24 lg:flex lg:gap-x-20 lg:px-24 lg:pt-0">
              <svg
                viewBox="0 0 1024 1024"
                className="absolute left-1/2 top-1/2 -z-10 h-[64rem] w-[64rem] -translate-y-1/2 [mask-image:radial-gradient(closest-side,white,transparent)] sm:left-full sm:-ml-80 lg:left-1/2 lg:ml-0 lg:-translate-x-1/2 lg:translate-y-0"
                aria-hidden="true"
              >
                <circle
                  cx={512}
                  cy={512}
                  r={512}
                  fill="url(#759c1415-0410-454c-8f7c-9a820de03641)"
                  fillOpacity="0.7"
                />
                <defs>
                  <radialGradient id="759c1415-0410-454c-8f7c-9a820de03641">
                    <stop stopColor="#7775D6" />
                    <stop offset={1} stopColor="#E935C1" />
                  </radialGradient>
                </defs>
              </svg>
              <div className="mx-auto max-w-md text-center lg:mx-0 lg:flex-auto lg:py-32 lg:text-left">
                <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  {t("ctaSection.title")}
                  <br />
                  {t("ctaSection.subtitle")}
                </h2>
                <p className="mt-6 text-lg leading-8 text-gray-300">
                  {t("ctaSection.description")}
                </p>
                <div className="mt-10 flex items-center justify-center gap-x-6 lg:justify-start">
                  <Link
                    href="/sign-up"
                    className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    {t("ctaSection.signUp")}
                  </Link>
                  <Link
                    href="/demo"
                    className="text-sm font-semibold leading-6 text-white"
                  >
                    {t("ctaSection.demo")} <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </div>
              <div className="relative mt-16 h-80 lg:mt-8">
                <Image
                  className="absolute left-0 top-0 hidden w-[57rem] max-w-none rounded-md bg-white/5 ring-1 ring-white/10 dark:flex"
                  src="/player_page.png"
                  alt={t("ctaSection.altText")}
                  width={1824}
                  height={1080}
                />
                <Image
                  className="absolute left-0 top-0 w-[57rem] max-w-none rounded-md bg-white/5 ring-1 ring-white/10 dark:hidden"
                  src="/player_page_light.png"
                  alt={t("ctaSection.altText")}
                  width={1824}
                  height={1080}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        className="relative mt-32 sm:mt-40"
        aria-labelledby="footer-heading"
      >
        <h2 id="footer-heading" className="sr-only">
          {t("footerNav.title")}
        </h2>
        <div className="mx-auto max-w-7xl px-6 pb-8 lg:px-8">
          <div className="xl:grid xl:grid-cols-3 xl:gap-8">
            <div className="space-y-8">
              <Image
                className="h-10 w-auto dark:invert"
                height={48}
                width={48}
                src="/parsertime.png"
                alt="Parsertime Logo"
              />
              <p className="text-sm leading-6 text-gray-700 dark:text-gray-300">
                {t("footerNav.description")}
              </p>
              <div className="flex space-x-6">
                {footerNavigation.social.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
                    target={
                      item.href.startsWith("https") ? "_blank" : undefined
                    }
                  >
                    <span className="sr-only">{item.name}</span>
                    <item.icon className="h-6 w-6" aria-hidden="true" />
                  </Link>
                ))}
              </div>
            </div>
            <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
              <div className="md:grid md:grid-cols-2 md:gap-8">
                <div>
                  <h3 className="text-sm font-semibold leading-6 text-gray-900 dark:text-white">
                    {t("footerNav.solutions.title")}
                  </h3>
                  <ul className="mt-6 space-y-4">
                    {footerNavigation.solutions.map((item) => (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          className="text-sm leading-6 text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white"
                          target={
                            item.href.startsWith("https") ? "_blank" : undefined
                          }
                        >
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-10 md:mt-0">
                  <h3 className="text-sm font-semibold leading-6 text-gray-900 dark:text-white">
                    {t("footerNav.support.title")}
                  </h3>
                  <ul className="mt-6 space-y-4">
                    {footerNavigation.support.map((item) => (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          className="text-sm leading-6 text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white"
                          target={
                            item.href.startsWith("https") ? "_blank" : undefined
                          }
                        >
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="md:grid md:grid-cols-2 md:gap-8">
                <div>
                  <h3 className="text-sm font-semibold leading-6 text-gray-900 dark:text-white">
                    {t("footerNav.company.title")}
                  </h3>
                  <ul className="mt-6 space-y-4">
                    {footerNavigation.company.map((item) => (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          className="text-sm leading-6 text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white"
                          target={
                            item.href.startsWith("https") ? "_blank" : undefined
                          }
                        >
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-10 md:mt-0">
                  <h3 className="text-sm font-semibold leading-6 text-gray-900 dark:text-white">
                    {t("footerNav.legal.title")}
                  </h3>
                  <ul className="mt-6 space-y-4">
                    {footerNavigation.legal.map((item) => (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          className="text-sm leading-6 text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white"
                          target={
                            item.href.startsWith("https") ? "_blank" : undefined
                          }
                        >
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-16 border-t border-black/10 pt-8 dark:border-white/10 sm:mt-20 lg:mt-24">
            <p className="text-xs leading-5 text-gray-600 dark:text-gray-400">
              &copy; 2024&ndash;{new Date().getFullYear()}{" "}
              {t("footerNav.copyright")}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
