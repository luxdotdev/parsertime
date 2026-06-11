import Image from "next/image";

type FeaturesProps = {
  subtitle: string;
  title: string;
  description: string;
  bentoHeadings: {
    dataDecisions: string;
    everyMetric: string;
    noSpreadsheets: string;
    spotChanges: string;
    yourData: string;
  };
  features: {
    builtByCoaches: { name: string; description: string };
    shareWithTeam: { name: string; description: string };
    dataCharts: { name: string; description: string };
    filterStats: { name: string; description: string };
    advancedSecurity: { name: string; description: string };
    fullyCustomizable: { name: string; description: string };
  };
};

type SpotlightEntry = {
  label: string;
  heading: string;
  description: string;
  imageSrcDark: string;
  imageSrcLight: string;
  imageAlt: string;
};

type RowEntry = {
  label: string;
  heading: string;
  description: string;
};

export function Features({
  subtitle,
  title,
  description,
  bentoHeadings,
  features,
}: FeaturesProps) {
  const spotlights: SpotlightEntry[] = [
    {
      label: features.dataCharts.name,
      heading: bentoHeadings.dataDecisions,
      description: features.dataCharts.description,
      imageSrcDark: "/new-killfeed.png",
      imageSrcLight: "/new-killfeed-light.png",
      imageAlt: "Parsertime killfeed visualization showing match events",
    },
    {
      label: features.builtByCoaches.name,
      heading: bentoHeadings.everyMetric,
      description: features.builtByCoaches.description,
      imageSrcDark: "/scrim-overview-card.png",
      imageSrcLight: "/scrim-overview-card-light.png",
      imageAlt: "Parsertime scrim overview card with match results",
    },
  ];

  const row: RowEntry[] = [
    {
      label: features.shareWithTeam.name,
      heading: bentoHeadings.noSpreadsheets,
      description: features.shareWithTeam.description,
    },
    {
      label: features.filterStats.name,
      heading: bentoHeadings.spotChanges,
      description: features.filterStats.description,
    },
    {
      label: features.advancedSecurity.name,
      heading: bentoHeadings.yourData,
      description: features.advancedSecurity.description,
    },
  ];

  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="mx-auto max-w-7xl scroll-mt-20 px-6 py-24 sm:py-32 lg:px-8"
    >
      <div className="max-w-2xl">
        <p className="text-muted-foreground font-mono text-xs tracking-[0.18em] uppercase">
          <span
            aria-hidden="true"
            className="bg-primary mr-3 inline-block h-px w-6 align-middle"
          />
          {subtitle}
        </p>
        <h2
          id="features-heading"
          className="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
        >
          {title}
        </h2>
        <p className="text-muted-foreground mt-4 text-lg leading-relaxed text-balance">
          {description}
        </p>
      </div>

      {/* Two screenshot-led features */}
      <div className="mt-16 grid gap-x-10 gap-y-14 lg:grid-cols-2">
        {spotlights.map((entry) => (
          <figure key={entry.label} className="group">
            <div className="bg-card ring-foreground/10 group-hover:ring-primary/40 overflow-hidden rounded-lg ring-1 transition-shadow duration-300">
              <div className="border-border flex items-center gap-2 border-b px-3.5 py-2">
                <span
                  aria-hidden="true"
                  className="bg-muted-foreground/30 h-2 w-2 rounded-full"
                />
                <span
                  aria-hidden="true"
                  className="bg-muted-foreground/30 h-2 w-2 rounded-full"
                />
                <span
                  aria-hidden="true"
                  className="bg-muted-foreground/30 h-2 w-2 rounded-full"
                />
              </div>
              <div className="bg-muted relative h-56 overflow-hidden sm:h-64">
                <Image
                  src={entry.imageSrcDark}
                  alt={entry.imageAlt}
                  className="hidden object-cover object-top dark:block"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                <Image
                  src={entry.imageSrcLight}
                  alt={entry.imageAlt}
                  className="block object-cover object-top dark:hidden"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </div>
            <figcaption className="mt-6">
              <p className="text-muted-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
                {entry.label}
              </p>
              <h3 className="mt-2 text-lg font-semibold">{entry.heading}</h3>
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                {entry.description}
              </p>
            </figcaption>
          </figure>
        ))}
      </div>

      {/* Three ruled features */}
      <div className="border-border divide-border mt-16 grid divide-y border-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {row.map((entry) => (
          <div
            key={entry.label}
            className="px-0 py-8 sm:px-8 sm:first:pl-0 sm:last:pr-0"
          >
            <p className="text-muted-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
              {entry.label}
            </p>
            <h3 className="mt-2 text-base font-semibold">{entry.heading}</h3>
            <p className="text-muted-foreground mt-2 text-sm leading-6">
              {entry.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
