"use client";

import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import Image from "next/image";

const logos = [
  { src: "/teams/dsg.png", alt: "Disguised" },
  { src: "/teams/stclair.svg", alt: "St. Clair College" },
  { src: "/teams/cornell.svg", alt: "Cornell University" },
  { src: "/teams/fiu.svg", alt: "Florida International University" },
  { src: "/teams/gsu.svg", alt: "Georgia State University" },
  { src: "/teams/vlln.png", alt: "VLLN" },
  { src: "/teams/briar-cliff.png", alt: "Briar Cliff University" },
  { src: "/teams/bowling-green.png", alt: "Bowling Green State University" },
  { src: "/teams/ets-esports.png", alt: "ETS Esports" },
];

function LogoMarquee() {
  const xPercent = useMotionValue(0);
  const x = useTransform(xPercent, (v) => `${v}%`);
  const prefersReducedMotion = useReducedMotion();

  useAnimationFrame((_time, delta) => {
    if (prefersReducedMotion) return;
    const speed = 1;
    const moveBy = (speed * delta) / 1000;
    const newX = xPercent.get() - moveBy;

    if (newX <= -50) {
      xPercent.set(0);
    } else {
      xPercent.set(newX);
    }
  });

  return (
    <div className="relative flex w-full flex-col items-center justify-center overflow-hidden">
      <div className="flex w-full max-w-5xl flex-row gap-8 overflow-hidden p-2">
        {[1, 2].map((track) => (
          <motion.div
            key={`track-${track}`}
            className="flex min-w-full shrink-0 flex-row justify-around gap-8"
            style={{ x }}
            aria-hidden={track === 2 ? "true" : undefined}
          >
            {[...logos, ...logos].map((logo, idx) => (
              <div
                // oxlint-disable-next-line react/no-array-index-key
                key={`logo-${track}-${idx}`}
                className="flex h-12 w-32 items-center justify-center opacity-60 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0"
              >
                <Image
                  src={logo.src}
                  alt={logo.alt}
                  className="max-h-8 w-auto object-contain invert dark:invert-0"
                  width={158}
                  height={48}
                />
              </div>
            ))}
          </motion.div>
        ))}
      </div>

      <div className="from-background pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r to-transparent" />
      <div className="from-background pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l to-transparent" />
    </div>
  );
}

type LogoCloudProps = {
  title: string;
};

export function LogoCloud({ title }: LogoCloudProps) {
  return (
    <section
      className="mx-auto max-w-7xl px-6 py-16 sm:py-20 lg:px-8"
      aria-label="Teams using Parsertime"
    >
      <p className="text-muted-foreground mb-8 text-center text-sm font-medium">
        {title}
      </p>
      <LogoMarquee />
    </section>
  );
}
