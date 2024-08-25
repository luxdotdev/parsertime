import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/components/ui/link";
import { toHero } from "@/lib/utils";
import { roleHeroMapping } from "@/types/heroes";
import { Metadata } from "next";
import { useTranslations } from "next-intl";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Hero Stats | Parsertime",
  description:
    "Hero stats for Overwatch heroes on Parsertime. Parsertime is a tool for analyzing Overwatch scrims.",
  openGraph: {
    title: "Hero Stats | Parsertime",
    description:
      "Hero stats for Overwatch heroes on Parsertime. Parsertime is a tool for analyzing Overwatch scrims.",
    url: "https://parsertime.app",
    type: "website",
    siteName: "Parsertime",
    images: [
      {
        url: "https://parsertime.app/api/og?title=Hero Stats",
        width: 1200,
        height: 630,
      },
    ],
    // locale: "en_US",
  },
};

export default function HeroSelect() {
  const t = useTranslations("statsPage.heroStats");
  const allHeroesByRole = Object.entries(roleHeroMapping);

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
            <CardTitle>{t("tank.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 md:grid-cols-6">
              {tankHeroes.map((hero) => (
                <Link
                  key={hero}
                  href={`/stats/hero/${hero}`}
                  className="flex flex-col items-center text-center"
                >
                  <Image
                    src={`/heroes/${toHero(hero)}.png`}
                    alt={`The portrait for ${hero}.`}
                    width={128}
                    height={128}
                    className="h-12 w-12 rounded border md:h-16 md:w-16"
                  />
                  <span className="text-sm font-semibold tracking-tight">
                    {t(`tank.${hero}`)}
                  </span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-full xl:col-span-2">
          <CardHeader>
            <CardTitle>{t("damage.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 md:grid-cols-6">
              {damageHeroes.map((hero) => (
                <Link
                  key={hero}
                  href={`/stats/hero/${hero}`}
                  className="flex flex-col items-center text-center"
                >
                  <Image
                    src={`/heroes/${toHero(hero)}.png`}
                    alt={`The portrait for ${hero}.`}
                    width={128}
                    height={128}
                    className="h-12 w-12 rounded border md:h-16 md:w-16"
                  />
                  <span className="text-sm font-semibold tracking-tight">
                    {t(`damage.${hero}`)}
                  </span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-full xl:col-span-2">
          <CardHeader>
            <CardTitle>{t("support.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 md:grid-cols-6">
              {supportHeroes.map((hero) => (
                <Link
                  key={hero}
                  href={`/stats/hero/${hero}`}
                  className="flex flex-col items-center text-center"
                >
                  <Image
                    src={`/heroes/${toHero(hero)}.png`}
                    alt={`The portrait for ${hero}.`}
                    width={128}
                    height={128}
                    className="h-12 w-12 rounded border md:h-16 md:w-16"
                  />
                  <span className="text-sm font-semibold tracking-tight">
                    {t(`support.${hero}`)}
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
