import {
  ChevronRightIcon,
  CloudIcon,
  FingerPrintIcon,
  ChartBarIcon,
  CalendarDaysIcon,
  IdentificationIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/20/solid";
import {
  AcademicCapIcon,
  ArrowUpOnSquareIcon,
  PresentationChartBarIcon,
} from "@heroicons/react/24/outline";
import { SVGProps } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { get } from "@vercel/edge-config";

const primaryFeatures = [
  {
    name: "Built by coaches, for coaches",
    description:
      "Designed with collegiate and professional coaches in mind. Our platform is built to help you understand trends and patterns in your team's performance.",
    href: "#",
    icon: AcademicCapIcon,
  },
  {
    name: "Share with your team",
    description:
      "Invite your players to your team and allow them to see their stats. Share your team's stats with your players and coaches. Keep everyone in the loop.",
    href: "#",
    icon: ArrowUpOnSquareIcon,
  },
  {
    name: "Advanced statistics",
    description:
      "Gain insight into your players' performance over time. Track their stats and see how they improve. See trends and patterns week over week.",
    href: "#",
    icon: PresentationChartBarIcon,
  },
];

const secondaryFeatures = [
  {
    name: "Player and team data charts.",
    description:
      "Visualize your team's stats. See what can be improved and where your team is excelling. Understand your team's strengths and weaknesses.",
    icon: ChartBarIcon,
  },
  {
    name: "Filter stats by time.",
    description:
      "See your team's stats over time. Filter by week, month, or year to see how your team is improving.",
    icon: CalendarDaysIcon,
  },
  {
    name: "User profiles.",
    description:
      "See individual player stats and trends over time. Understand how your players are improving and where they need help.",
    icon: IdentificationIcon,
  },
  {
    name: "Advanced security.",
    description:
      "User accounts do not store passwords. Only users you invite to your team can see your team's scrims.",
    icon: FingerPrintIcon,
  },
  {
    name: "Fast and reliable.",
    description:
      "We're built on top of the latest cloud infrastructure. Speed is never an issue. We're always up and running.",
    icon: CloudIcon,
  },
  {
    name: "Fully customizable.",
    description:
      "Need custom functionality or want to track specific metrics? Let us know and we'll make it happen.",
    icon: WrenchScrewdriverIcon,
  },
];

type IconProps = Omit<SVGProps<SVGSVGElement>, "fill" | "viewbox">;

const footerNavigation = {
  social: [
    {
      name: "X",
      href: "https://twitter.com/lucasdoell",
      icon: (props: IconProps) => (
        <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
          <path d="M13.6823 10.6218L20.2391 3H18.6854L12.9921 9.61788L8.44486 3H3.2002L10.0765 13.0074L3.2002 21H4.75404L10.7663 14.0113L15.5685 21H20.8131L13.6819 10.6218H13.6823ZM11.5541 13.0956L10.8574 12.0991L5.31391 4.16971H7.70053L12.1742 10.5689L12.8709 11.5655L18.6861 19.8835H16.2995L11.5541 13.096V13.0956Z" />
        </svg>
      ),
    },
    {
      name: "Bluesky",
      href: "https://bsky.app/profile/lux.dev",
      icon: (props: IconProps) => (
        <svg fill="currentColor" viewBox="-50 -50 430 390" {...props}>
          <path d="M180 141.964C163.699 110.262 119.308 51.1817 78.0347 22.044C38.4971 -5.86834 23.414 -1.03207 13.526 3.43594C2.08093 8.60755 0 26.1785 0 36.5164C0 46.8542 5.66748 121.272 9.36416 133.694C21.5786 174.738 65.0603 188.607 105.104 184.156C107.151 183.852 109.227 183.572 111.329 183.312C109.267 183.642 107.19 183.924 105.104 184.156C46.4204 192.847 -5.69621 214.233 62.6582 290.33C137.848 368.18 165.705 273.637 180 225.702C194.295 273.637 210.76 364.771 295.995 290.33C360 225.702 313.58 192.85 254.896 184.158C252.81 183.926 250.733 183.645 248.671 183.315C250.773 183.574 252.849 183.855 254.896 184.158C294.94 188.61 338.421 174.74 350.636 133.697C354.333 121.275 360 46.8568 360 36.519C360 26.1811 357.919 8.61012 346.474 3.43851C336.586 -1.02949 321.503 -5.86576 281.965 22.0466C240.692 51.1843 196.301 110.262 180 141.964Z" />
        </svg>
      ),
    },
    {
      name: "GitHub",
      href: "https://github.com/lucasdoell",
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

export default async function LandingPage() {
  const stats = (await get("landingPageStats")) as [
    { id: string; name: string; value: string },
  ];

  return (
    <div className="bg-white dark:bg-black">
      <main>
        {/* Hero section */}
        <div className="relative isolate overflow-hidden bg-white dark:bg-black">
          <svg
            className="absolute inset-0 -z-10 h-full w-full stroke-gray-200 [mask-image:radial-gradient(100%_100%_at_top_right,white,transparent)] dark:stroke-white/10"
            aria-hidden="true"
          >
            <defs>
              <pattern
                id="983e3e4c-de6d-4c3f-8d64-b9761d1534cc"
                width={200}
                height={200}
                x="50%"
                y={-1}
                patternUnits="userSpaceOnUse"
                className="hidden dark:flex"
              >
                <path d="M.5 200V.5H200" fill="none" />
              </pattern>
              <pattern
                id="0787a7c5-978c-4f66-83c7-11c213f99cb7"
                width={200}
                height={200}
                x="50%"
                y={-1}
                patternUnits="userSpaceOnUse"
                className="flex dark:hidden"
              >
                <path d="M.5 200V.5H200" fill="none" />
              </pattern>
            </defs>
            <svg x="50%" y={-1} className="overflow-visible fill-gray-800/20">
              <path
                d="M-200 0h201v201h-201Z M600 0h201v201h-201Z M-400 600h201v201h-201Z M200 800h201v201h-201Z"
                strokeWidth={0}
                className="hidden dark:flex"
              />
              <path
                d="M.5 200V.5H200"
                fill="none"
                className="flex dark:hidden"
              />
            </svg>
            <rect
              width="100%"
              height="100%"
              strokeWidth={0}
              fill="url(#983e3e4c-de6d-4c3f-8d64-b9761d1534cc)"
              className="hidden dark:flex"
            />
            <rect
              width="100%"
              height="100%"
              strokeWidth={0}
              fill="url(#0787a7c5-978c-4f66-83c7-11c213f99cb7)"
              className="flex dark:hidden"
            />
          </svg>
          <div
            className="absolute left-[calc(50%-4rem)] top-10 -z-10 hidden transform-gpu blur-3xl dark:flex sm:left-[calc(50%-18rem)] lg:left-48 lg:top-[calc(50%-30rem)] xl:left-[calc(50%-24rem)]"
            aria-hidden="true"
          >
            <div
              className="aspect-[1108/632] w-[69.25rem] bg-gradient-to-r from-[#80caff] to-[#4f46e5] opacity-20"
              style={{
                clipPath:
                  "polygon(73.6% 51.7%, 91.7% 11.8%, 100% 46.4%, 97.4% 82.2%, 92.5% 84.9%, 75.7% 64%, 55.3% 47.5%, 46.5% 49.4%, 45% 62.9%, 50.3% 87.2%, 21.3% 64.1%, 0.1% 100%, 5.4% 51.1%, 21.4% 63.9%, 58.9% 0.2%, 73.6% 51.7%)",
              }}
            />
          </div>
          <div className="mx-auto max-w-7xl px-6 pb-24 pt-10 sm:pb-40 lg:flex lg:px-8 lg:pt-40">
            <div className="mx-auto max-w-2xl flex-shrink-0 lg:mx-0 lg:max-w-xl lg:pt-8">
              <Image
                className="h-12 dark:invert"
                height={48}
                width={48}
                src="/parsertime.png"
                alt="Parsertime Logo"
              />
              <div className="mt-24 sm:mt-32 lg:mt-16">
                <Link
                  href="https://blog.lux.dev/blog/parsertime-public-beta/"
                  target="_blank"
                  className="inline-flex space-x-6"
                >
                  <span className="rounded-full bg-sky-600/10 px-3 py-1 text-sm font-semibold leading-6 text-sky-600 ring-1 ring-inset ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-500/20">
                    Latest updates
                  </span>
                  <span className="inline-flex items-center space-x-2 text-sm font-medium leading-6 text-gray-600 dark:text-gray-300">
                    <span>Public Beta Release 🎉</span>
                    <ChevronRightIcon
                      className="h-5 w-5 text-gray-400 dark:text-gray-500"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              </div>
              <h1 className="mt-10 text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl">
                Revolutionize your scrim experience
              </h1>
              <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
                Using our platform, you can visualize your scrim data, track
                individual player performance, and more. Invite your players to
                your team and allow them to see their stats.
              </p>
              <div className="mt-10 flex items-center gap-x-6">
                <Button asChild>
                  <Link href="/sign-up">Get started</Link>
                </Button>
                <Link
                  href="/demo"
                  className="text-sm font-semibold leading-6 text-gray-900 dark:text-white"
                >
                  Live demo <span aria-hidden="true">→</span>
                </Link>
              </div>
              <div className="mt-4 flex items-center gap-x-2 text-muted-foreground">
                <p className="text-xs">
                  Already have an account?{" "}
                  <Link
                    href="/sign-in"
                    className="font-semibold leading-6 text-gray-900 dark:text-white"
                  >
                    Sign In <span aria-hidden="true">→</span>
                  </Link>
                </p>
              </div>
            </div>
            <div className="mx-auto mt-16 flex max-w-2xl sm:mt-24 lg:ml-10 lg:mr-0 lg:mt-0 lg:max-w-none lg:flex-none xl:ml-32">
              <div className="max-w-3xl flex-none sm:max-w-5xl lg:max-w-none">
                <Image
                  src="/player_page.png"
                  alt="App screenshot"
                  width={2432}
                  height={1442}
                  className="hidden w-[76rem] rounded-md bg-white/5 shadow-2xl ring-1 ring-white/10 dark:flex"
                  priority
                />
                <Image
                  src="/player_page_light.png"
                  alt="App screenshot"
                  width={2432}
                  height={1442}
                  className="w-[76rem] rounded-md bg-white/5 shadow-2xl ring-1 ring-white/10 dark:hidden"
                  priority
                />
              </div>
            </div>
          </div>
        </div>

        {/* Logo cloud */}
        <div className="mx-auto mt-8 max-w-7xl px-6 sm:mt-16 lg:px-8">
          <h2 className="text-center text-lg font-semibold leading-8 text-gray-900 dark:text-white">
            Used by a variety of teams for stat tracking
          </h2>
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
        </div>

        {/* Feature section */}
        <div className="mx-auto mt-32 max-w-7xl px-6 sm:mt-56 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-base font-semibold leading-7 text-sky-600 dark:text-sky-400">
              Improve faster
            </h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Everything you need to improve your team performance
            </p>
            <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
              Streamline your improvement process with our platform. Gain
              insight into your players&apos; and teams&apos; strengths and
              weaknesses. See their biggest areas of improvement and adjust your
              coaching accordingly.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
              {primaryFeatures.map((feature) => (
                <div key={feature.name} className="flex flex-col">
                  <dt className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
                    <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-lg text-sky-600 dark:bg-sky-500">
                      <feature.icon
                        className="h-6 w-6 dark:text-white"
                        aria-hidden="true"
                      />
                    </div>
                    {feature.name}
                  </dt>
                  <dd className="mt-1 flex flex-auto flex-col text-base leading-7 text-gray-600 dark:text-gray-300">
                    <p className="flex-auto">{feature.description}</p>
                    <p className="mt-6">
                      <Link
                        href={feature.href}
                        className="text-sm font-semibold leading-6 text-sky-600 dark:text-sky-400"
                      >
                        Learn more <span aria-hidden="true">→</span>
                      </Link>
                    </p>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Feature section */}
        <div className="mt-32 sm:mt-56">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl sm:text-center">
              <h2 className="text-base font-semibold leading-7 text-sky-600 dark:text-sky-400">
                Everything you need
              </h2>
              <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
                Scrim stats at your fingertips
              </p>
              <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
                See your stats after your scrims instead of only relying on
                replay codes. Our platform allows you to keep your data no
                matter what happens to your replays.
              </p>
            </div>
          </div>
          <div className="relative overflow-hidden pt-16">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
              <Image
                src="/team_charts.png"
                alt="App screenshot"
                className="hidden rounded-xl shadow-2xl ring-1 ring-white/10 dark:flex"
                width={2432}
                height={1442}
              />
              <Image
                src="/team_charts_light.png"
                alt="App screenshot"
                className="flex rounded-xl shadow-2xl ring-1 ring-gray-900/10 dark:hidden"
                width={2432}
                height={1442}
              />
              <div className="relative" aria-hidden="true">
                <div className="absolute -inset-x-20 bottom-0 bg-gradient-to-t from-white pt-[7%] dark:from-black" />
              </div>
            </div>
          </div>
          <div className="mx-auto mt-16 max-w-7xl px-6 sm:mt-20 md:mt-24 lg:px-8">
            <dl className="mx-auto grid max-w-2xl grid-cols-1 gap-x-6 gap-y-10 text-base leading-7 text-gray-600 dark:text-gray-300 sm:grid-cols-2 lg:mx-0 lg:max-w-none lg:grid-cols-3 lg:gap-x-8 lg:gap-y-16">
              {secondaryFeatures.map((feature) => (
                <div key={feature.name} className="relative pl-9">
                  <dt className="inline font-semibold text-gray-900 dark:text-white">
                    <feature.icon
                      className="absolute left-1 top-1 h-5 w-5 text-sky-600 dark:text-sky-500"
                      aria-hidden="true"
                    />
                    {feature.name}
                  </dt>{" "}
                  <dd className="inline">{feature.description}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Stats */}
        <div className="mx-auto mt-32 max-w-7xl px-6 sm:mt-56 lg:px-8">
          <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-xl">
            <h2 className="text-base font-semibold leading-8 text-sky-600 dark:text-sky-400">
              Our track record
            </h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Trusted by the best
            </p>
            <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
              We&apos;re proud to work with top teams and coaches to create
              better experiences for everyone. Our platform is built to suit the
              needs of collegiate and professional teams.
            </p>
          </div>
          <dl className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-10 text-gray-900 dark:text-white sm:mt-20 sm:grid-cols-2 sm:gap-y-16 lg:mx-0 lg:max-w-none lg:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.id}
                className="flex flex-col gap-y-3 border-l border-gray-900/10 pl-6 dark:border-white/10"
              >
                <dt className="text-sm leading-6">{stat.name}</dt>
                <dd className="order-first text-3xl font-semibold tracking-tight">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* CTA section */}
        <div className="relative isolate mt-32 px-6 py-32 sm:mt-56 sm:py-40 lg:px-8">
          <svg
            className="absolute inset-0 -z-10 h-full w-full stroke-gray-200 [mask-image:radial-gradient(100%_100%_at_top_right,white,transparent)] dark:stroke-white/10"
            aria-hidden="true"
          >
            <defs>
              <pattern
                id="983e3e4c-de6d-4c3f-8d64-b9761d1534cc"
                width={200}
                height={200}
                x="50%"
                y={-1}
                patternUnits="userSpaceOnUse"
                className="hidden dark:flex"
              >
                <path d="M.5 200V.5H200" fill="none" />
              </pattern>
              <pattern
                id="0787a7c5-978c-4f66-83c7-11c213f99cb7"
                width={200}
                height={200}
                x="50%"
                y={-1}
                patternUnits="userSpaceOnUse"
                className="flex dark:hidden"
              >
                <path d="M.5 200V.5H200" fill="none" />
              </pattern>
            </defs>
            <svg x="50%" y={-1} className="overflow-visible fill-gray-800/20">
              <path
                d="M-200 0h201v201h-201Z M600 0h201v201h-201Z M-400 600h201v201h-201Z M200 800h201v201h-201Z"
                strokeWidth={0}
                className="hidden dark:flex"
              />
              <path
                d="M.5 200V.5H200"
                fill="none"
                className="flex dark:hidden"
              />
            </svg>
            <rect
              width="100%"
              height="100%"
              strokeWidth={0}
              fill="url(#983e3e4c-de6d-4c3f-8d64-b9761d1534cc)"
              className="hidden dark:flex"
            />
            <rect
              width="100%"
              height="100%"
              strokeWidth={0}
              fill="url(#0787a7c5-978c-4f66-83c7-11c213f99cb7)"
              className="flex dark:hidden"
            />
          </svg>
          <div
            className="absolute inset-x-0 top-10 -z-10 hidden transform-gpu justify-center overflow-hidden blur-3xl dark:flex"
            aria-hidden="true"
          >
            <div
              className="aspect-[1108/632] w-[69.25rem] flex-none bg-gradient-to-r from-[#80caff] to-[#4f46e5] opacity-20"
              style={{
                clipPath:
                  "polygon(73.6% 51.7%, 91.7% 11.8%, 100% 46.4%, 97.4% 82.2%, 92.5% 84.9%, 75.7% 64%, 55.3% 47.5%, 46.5% 49.4%, 45% 62.9%, 50.3% 87.2%, 21.3% 64.1%, 0.1% 100%, 5.4% 51.1%, 21.4% 63.9%, 58.9% 0.2%, 73.6% 51.7%)",
              }}
            />
          </div>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Ready to get started?
              <br />
              Start using our app today.
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-600 dark:text-gray-300">
              Sign up and start using our platform today. We&apos;re excited to
              change the way you think about coaching.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Button asChild>
                <Link href="/sign-up">Get started</Link>
              </Button>
              <Link
                href="/about"
                className="text-sm font-semibold leading-6 text-gray-900 dark:text-white"
              >
                Learn more <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer aria-labelledby="footer-heading" className="relative">
        <h2 id="footer-heading" className="sr-only">
          Footer
        </h2>
        <div className="mx-auto max-w-7xl px-6 pb-8 pt-4 lg:px-8">
          <div className="border-t border-gray-900/10 pt-8 dark:border-white/10 md:flex md:items-center md:justify-between">
            <div className="flex space-x-6 md:order-2">
              {footerNavigation.social.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  target="_blank"
                  className="text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
                >
                  <span className="sr-only">{item.name}</span>
                  <item.icon className="h-6 w-6" aria-hidden="true" />
                </Link>
              ))}
            </div>
            <p className="mt-8 text-xs leading-5 text-gray-400 md:order-1 md:mt-0">
              &copy; 2024 lux.dev. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
