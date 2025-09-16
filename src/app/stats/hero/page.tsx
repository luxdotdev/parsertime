import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/components/ui/link";
import { getHeroNames, toHero } from "@/lib/utils";
import { roleHeroMapping } from "@/types/heroes";
import { PagePropsWithLocale } from "@/types/next";
import { Metadata, Route } from "next";
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
  const allHeroesByRole = Object.entries(roleHeroMapping);

  const heroNames = await getHeroNames();

  const tankHeroes = allHeroesByRole[0][1];
  const damageHeroes = allHeroesByRole[1][1];
  const supportHeroes = allHeroesByRole[2][1];

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">{t("title")}</h2>
      </div>

      <div className="grid grid-cols-6 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Card className="col-span-full xl:col-span-2">
          <CardHeader>
            <CardTitle>{t("tank")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 md:grid-cols-6">
              {tankHeroes.map((hero) => (
                <Link
                  key={hero}
                  href={`/stats/hero/${hero}` as Route}
                  className="flex flex-col items-center text-center"
                >
                  <Image
                    src={`/heroes/${toHero(hero)}.png`}
                    alt={t("altText", {
                      hero: heroNames.get(toHero(hero)) || hero,
                    })}
                    width={128}
                    height={128}
                    className="h-12 w-12 rounded border md:h-16 md:w-16"
                  />
                  <span className="text-sm font-semibold tracking-tight">
                    {heroNames.get(toHero(hero)) || hero}
                  </span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-full xl:col-span-2">
          <CardHeader>
            <CardTitle>{t("damage")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 md:grid-cols-6">
              {damageHeroes.map((hero) => (
                <Link
                  key={hero}
                  href={`/stats/hero/${hero}` as Route}
                  className="flex flex-col items-center text-center"
                >
                  <Image
                    src={`/heroes/${toHero(hero)}.png`}
                    alt={t("altText", {
                      hero: heroNames.get(toHero(hero)) || hero,
                    })}
                    width={128}
                    height={128}
                    className="h-12 w-12 rounded border md:h-16 md:w-16"
                  />
                  <span className="text-sm font-semibold tracking-tight">
                    {heroNames.get(toHero(hero)) || hero}
                  </span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-full xl:col-span-2">
          <CardHeader>
            <CardTitle>{t("support")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 md:grid-cols-6">
              {supportHeroes.map((hero) => (
                <Link
                  key={hero}
                  href={`/stats/hero/${hero}` as Route}
                  className="flex flex-col items-center text-center"
                >
                  <Image
                    src={`/heroes/${toHero(hero)}.png`}
                    alt={t("altText", {
                      hero: heroNames.get(toHero(hero)) || hero,
                    })}
                    width={128}
                    height={128}
                    className="h-12 w-12 rounded border md:h-16 md:w-16"
                  />
                  <span className="text-sm font-semibold tracking-tight">
                    {heroNames.get(toHero(hero)) || hero}
                  </span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <p className="col-span-6 text-center text-muted-foreground">
          {t("description")}
        </p>
      </div>
    </div>
  );
}
