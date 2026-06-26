import Image from "next/image";

type PanelLabel = {
  label: string;
};

function ChromeBar({ label }: PanelLabel) {
  return (
    <div className="border-border flex items-center gap-2 border-b px-4 py-2.5">
      <span
        aria-hidden="true"
        className="bg-muted-foreground/30 h-2.5 w-2.5 rounded-full"
      />
      <span
        aria-hidden="true"
        className="bg-muted-foreground/30 h-2.5 w-2.5 rounded-full"
      />
      <span
        aria-hidden="true"
        className="bg-muted-foreground/30 h-2.5 w-2.5 rounded-full"
      />
      <span className="text-muted-foreground ml-3 font-mono text-[10px] tracking-[0.18em] uppercase">
        {label}
      </span>
    </div>
  );
}

type PositionalShowcaseProps = {
  badge: string;
  title: string;
  description: string;
  subFeatures: {
    name: string;
    description: string;
  }[];
};

/**
 * Illustrative positional averages, styled after the team stats positional
 * tab. Decorative artifact, not live data.
 */
const averageRows = [
  { label: "Engagement distance", value: "11.2m", delta: "▲ 0.8m" },
  { label: "High ground kill %", value: "38%", delta: "▲ 5%" },
  { label: "Isolation death %", value: "9%", delta: "▼ 3%" },
];

export function PositionalShowcase({
  badge,
  title,
  description,
  subFeatures,
}: PositionalShowcaseProps) {
  return (
    <section
      aria-labelledby="positional-heading"
      className="relative overflow-hidden"
    >
      {/* Signal light cast from off-canvas left; decays before the section
          edges so there is no visible seam. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-[70%]"
        style={{
          background:
            "radial-gradient(65% 42% at 0% 42%, color-mix(in oklab, var(--primary) 15%, transparent) 0%, transparent 72%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
        <div className="max-w-3xl">
          <p className="border-primary/40 bg-primary/10 text-primary inline-flex items-center gap-2.5 rounded-md border px-3 py-1.5 font-mono text-[10px] font-medium tracking-[0.18em] uppercase">
            <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
              <span className="bg-primary absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 motion-reduce:animate-none" />
              <span className="bg-primary relative inline-flex h-1.5 w-1.5 rounded-full" />
            </span>
            {badge}
          </p>
          <h2
            id="positional-heading"
            className="mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-5xl"
          >
            {title}
          </h2>
          <p className="text-muted-foreground mt-5 max-w-2xl text-lg leading-relaxed text-balance">
            {description}
          </p>
        </div>

        {/* Flagship panels */}
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {/* Map replay viewer */}
          <div className="bg-card ring-foreground/10 overflow-hidden rounded-xl ring-1 lg:col-span-2">
            <ChromeBar label="parsertime.app · map replay" />
            <div className="relative h-72 sm:h-96">
              <Image
                src="/map-replay.png"
                alt="Top-down map replay of a King's Row teamfight with player positions for both teams"
                className="hidden object-cover object-[50%_55%] dark:block"
                fill
                sizes="(max-width: 1024px) 100vw, 66vw"
              />
              <Image
                src="/map-replay-light.png"
                alt="Top-down map replay of a King's Row teamfight with player positions for both teams"
                className="block object-cover object-[50%_55%] dark:hidden"
                fill
                sizes="(max-width: 1024px) 100vw, 66vw"
              />
            </div>
          </div>

          <div className="flex flex-col gap-6">
            {/* Heatmap */}
            <div className="bg-card ring-foreground/10 overflow-hidden rounded-xl ring-1">
              <ChromeBar label="heatmap" />
              <div className="relative h-44 sm:h-52">
                <Image
                  src="/map-heatmap.png"
                  alt="Damage and kill density heatmap rendered over King's Row"
                  className="hidden object-cover object-[50%_45%] dark:block"
                  fill
                  sizes="(max-width: 1024px) 100vw, 33vw"
                />
                <Image
                  src="/map-heatmap-light.png"
                  alt="Damage and kill density heatmap rendered over King's Row"
                  className="block object-cover object-[50%_45%] dark:hidden"
                  fill
                  sizes="(max-width: 1024px) 100vw, 33vw"
                />
              </div>
            </div>

            {/* Positional averages */}
            <div
              className="bg-card ring-foreground/10 flex-1 rounded-xl ring-1"
              aria-hidden="true"
            >
              <div className="border-border border-b px-4 py-2.5">
                <p className="text-muted-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
                  Positional averages · Last 10 scrims
                </p>
              </div>
              <dl className="divide-border divide-y px-4">
                {averageRows.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-baseline justify-between gap-3 py-3"
                  >
                    <dt className="text-muted-foreground text-sm">
                      {row.label}
                    </dt>
                    <dd className="flex items-baseline gap-2.5">
                      <span className="font-mono text-base leading-none font-semibold tabular-nums">
                        {row.value}
                      </span>
                      <span className="text-primary font-mono text-xs tabular-nums">
                        {row.delta}
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>

        {/* Sub-features */}
        <div className="border-border divide-border mt-14 grid divide-y border-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {subFeatures.map((feature) => (
            <div
              key={feature.name}
              className="px-0 py-8 sm:px-8 sm:first:pl-0 sm:last:pr-0"
            >
              <p className="text-muted-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
                <span
                  aria-hidden="true"
                  className="bg-primary mr-3 inline-block h-px w-5 align-middle"
                />
                {feature.name}
              </p>
              <p className="text-muted-foreground mt-3 text-sm leading-6">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
