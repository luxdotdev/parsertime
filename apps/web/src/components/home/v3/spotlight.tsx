import Image from "next/image";

type SpotlightProps = {
  subtitle: string;
  title: string;
  description: string;
  highlights: { label: string; description: string }[];
  imageSrcDark: string;
  imageSrcLight: string;
  imageAlt: string;
  imagePosition: "left" | "right";
};

export function Spotlight({
  subtitle,
  title,
  description,
  highlights,
  imageSrcDark,
  imageSrcLight,
  imageAlt,
  imagePosition,
}: SpotlightProps) {
  return (
    <section className="py-24 sm:py-32" aria-label={subtitle}>
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto grid max-w-2xl grid-cols-1 items-center gap-12 lg:max-w-none lg:grid-cols-2 lg:gap-16">
          {/* Text column */}
          <div>
            <p className="text-muted-foreground font-mono text-xs tracking-[0.18em] uppercase">
              <span
                aria-hidden="true"
                className="bg-primary mr-3 inline-block h-px w-6 align-middle"
              />
              {subtitle}
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              {title}
            </h2>
            <p className="text-muted-foreground mt-4 text-lg leading-relaxed text-balance">
              {description}
            </p>

            <ul className="border-border mt-10 border-t">
              {highlights.map((item) => (
                <li
                  key={item.label}
                  className="border-border border-b py-4 text-sm leading-6"
                >
                  <span className="text-foreground font-semibold">
                    {item.label}
                  </span>{" "}
                  <span className="text-muted-foreground">
                    {item.description}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Image column */}
          <div
            className={
              imagePosition === "left" ? "lg:order-first" : "lg:order-last"
            }
          >
            <div className="bg-card ring-foreground/10 overflow-hidden rounded-xl shadow-xs ring-1">
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
                  parsertime.app
                </span>
              </div>
              <Image
                src={imageSrcDark}
                alt={imageAlt}
                className="hidden w-full dark:block"
                width={2432}
                height={1442}
              />
              <Image
                src={imageSrcLight}
                alt={imageAlt}
                className="block w-full dark:hidden"
                width={2432}
                height={1442}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
