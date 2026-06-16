import { StatPanel } from "@/components/player/stat-panel";
import { Link } from "@/components/ui/link";
import { getHeroNames, toHero } from "@/lib/utils";
import { type HeroName, roleHeroMapping } from "@/types/heroes";
import type { PagePropsWithLocale } from "@/types/next";
import type { Metadata, Route } from "next";
import { getTranslations } from "next-intl/server";
import Image from "next/image";

export async function generateMetadata(
  props: PagePropsWithLocale<"/stats/hero">
): Promise<Metadata> {
  const params = await props.params;
  const t = await getTranslations("statsPage.heroStatsMetadata");
  return {
    title: t("title"),
    description: t("description"),
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      url: "https://parsertime.app",
      type: "website",
      siteName: "Parsertime",
      images: [
        {
          url: `https://parsertime.app/api/og?title=${t("ogImage")}`,
          width: 1200,
          height: 630,
        },
      ],
      locale: params.locale,
    },
  };
}

export default async function HeroSelect() {
  const t = await getTranslations("statsPage.heroStats");
  const heroNames = await getHeroNames();

  const groups: { id: string; title: string; heroes: HeroName[] }[] = [
    { id: "tank-roster", title: t("tank"), heroes: roleHeroMapping.Tank },
    { id: "damage-roster", title: t("damage"), heroes: roleHeroMapping.Damage },
    {
      id: "support-roster",
      title: t("support"),
      heroes: roleHeroMapping.Support,
    },
  ];

  return (
    <div className="flex-1 px-6 pt-6 pb-12 md:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          {t("pickerTitle")}
        </h1>
        <p className="text-muted-foreground mt-1 max-w-prose text-sm">
          {t("description")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {groups.map((group) => (
          <section
            key={group.id}
            aria-labelledby={group.id}
            className="flex flex-col gap-3"
          >
            <h2
              id={group.id}
              className="text-muted-foreground font-mono text-[0.6875rem] tracking-[0.08em] uppercase"
            >
              {group.title}
            </h2>
            <StatPanel className="flex-1">
              <div className="bg-border grid grid-cols-3 gap-px sm:grid-cols-4 md:grid-cols-3">
                {group.heroes.map((hero) => {
                  const heroLabel = heroNames.get(toHero(hero)) ?? hero;
                  return (
                    <Link
                      key={hero}
                      href={`/stats/hero/${hero}` as Route}
                      className="bg-card [@media(hover:hover)_and_(pointer:fine)]:hover:bg-muted/40 flex flex-col items-center gap-2 px-3 py-4 text-center no-underline transition-colors"
                    >
                      <Image
                        src={`/heroes/${toHero(hero)}.png`}
                        alt={t("altText", { hero: heroLabel })}
                        width={128}
                        height={128}
                        className="ring-foreground/10 size-14 rounded-md object-cover ring-1"
                      />
                      <span className="truncate text-xs font-medium">
                        {heroLabel}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </StatPanel>
          </section>
        ))}
      </div>
    </div>
  );
}
