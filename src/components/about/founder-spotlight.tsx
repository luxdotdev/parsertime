"use client";

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";

type SocialLink = {
  name: string;
  href: string;
};

type FounderSpotlightProps = {
  label: string;
  name: string;
  role: string;
  bio: string;
  imageSrc: string;
  socialLinks: SocialLink[];
};

const socialIcons: Record<string, React.ReactNode> = {
  GitHub: (
    <svg
      className="h-5 w-5"
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
        clipRule="evenodd"
      />
    </svg>
  ),
  X: (
    <svg
      className="h-5 w-5"
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M13.6823 10.6218L20.2391 3H18.6854L12.9921 9.61788L8.44486 3H3.2002L10.0765 13.0074L3.2002 21H4.75404L10.7663 14.0113L15.5685 21H20.8131L13.6819 10.6218H13.6823ZM11.5541 13.0956L10.8574 12.0991L5.31391 4.16971H7.70053L12.1742 10.5689L12.8709 11.5655L18.6861 19.8835H16.2995L11.5541 13.096V13.0956Z" />
    </svg>
  ),
  Bluesky: (
    <svg
      className="h-5 w-5"
      fill="currentColor"
      viewBox="-50 -50 430 390"
      aria-hidden="true"
    >
      <path d="M180 141.964C163.699 110.262 119.308 51.1817 78.0347 22.044C38.4971 -5.86834 23.414 -1.03207 13.526 3.43594C2.08093 8.60755 0 26.1785 0 36.5164C0 46.8542 5.66748 121.272 9.36416 133.694C21.5786 174.738 65.0603 188.607 105.104 184.156C107.151 183.852 109.227 183.572 111.329 183.312C109.267 183.642 107.19 183.924 105.104 184.156C46.4204 192.847 -5.69621 214.233 62.6582 290.33C137.848 368.18 165.705 273.637 180 225.702C194.295 273.637 210.76 364.771 295.995 290.33C360 225.702 313.58 192.85 254.896 184.158C252.81 183.926 250.733 183.645 248.671 183.315C250.773 183.574 252.849 183.855 254.896 184.158C294.94 188.61 338.421 174.74 350.636 133.697C354.333 121.275 360 46.8568 360 36.519C360 26.1811 357.919 8.61012 346.474 3.43851C336.586 -1.02949 321.503 -5.86576 281.965 22.0466C240.692 51.1843 196.301 110.262 180 141.964Z" />
    </svg>
  ),
};

export function FounderSpotlight({
  label,
  name,
  role,
  bio,
  imageSrc,
  socialLinks,
}: FounderSpotlightProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="py-24 sm:py-32" aria-labelledby="founder-heading">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto grid max-w-2xl grid-cols-1 items-center gap-12 lg:max-w-none lg:grid-cols-[1fr_auto]">
          {/* Text column */}
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: 0.5,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
          >
            <p className="text-primary text-sm font-semibold tracking-wider uppercase">
              {label}
            </p>
            <h2
              id="founder-heading"
              className="mt-2 font-[family-name:var(--font-instrument-serif)] text-3xl tracking-tight text-gray-900 italic sm:text-4xl dark:text-white"
            >
              {name}
            </h2>
            <p className="text-primary mt-1 text-sm font-medium">{role}</p>
            <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-400">
              {bio}
            </p>

            {/* Social links */}
            <div className="mt-6 flex gap-x-4">
              {socialLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative inline-flex items-center justify-center text-gray-500 transition-colors hover:text-gray-700 dark:hover:text-gray-300"
                  style={{ touchAction: "manipulation" }}
                >
                  <span className="sr-only">{link.name}</span>
                  {/* 44px tap target via padding */}
                  <span className="absolute -inset-2.5" aria-hidden="true" />
                  {socialIcons[link.name]}
                </a>
              ))}
            </div>
          </motion.div>

          {/* Photo column */}
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{
              duration: 0.5,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
          >
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white/50 p-2 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
              <Image
                src={imageSrc}
                alt={`${name}, Founder of Parsertime`}
                className="rounded-xl object-cover"
                width={400}
                height={500}
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
