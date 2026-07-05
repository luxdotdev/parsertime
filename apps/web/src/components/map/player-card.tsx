import { AllHeroes } from "@/components/player/all-heroes";
import { SpecificHero } from "@/components/player/specific-hero";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrimService } from "@/data/scrim";
import { AppRuntime } from "@/data/runtime";
import { Effect } from "effect";
import type { Locale } from "@/i18n/config";
import { getLocaleTranslations } from "@/lib/metadata-i18n";
import { toHero } from "@/lib/utils";

type Props = { id: number; playerName: string; locale: Locale };

export async function PlayerCard({ playerName, id, locale }: Props) {
  const [t, heroesT] = await Promise.all([
    getLocaleTranslations(locale, "mapPage.compare.playerCard"),
    getLocaleTranslations(locale, "heroes"),
  ]);

  const playerStatsByFinalRound = await AppRuntime.runPromise(
    ScrimService.pipe(
      Effect.flatMap((svc) => svc.getFinalRoundStatsForPlayer(id, playerName))
    )
  );

  const playerStats = playerStatsByFinalRound.filter(
    (stat) => stat.hero_time_played > 0
  );

  const heroesPlayed = playerStats
    .sort((a, b) => b.hero_time_played - a.hero_time_played)
    .map((stat) => stat.player_hero);

  if (heroesPlayed.length === 0) return null;

  if (heroesPlayed.length === 1) {
    return (
      <SpecificHero
        playerStats={playerStats}
        showTable={false}
        locale={locale}
      />
    );
  }

  return (
    <Tabs defaultValue="all-heroes" className="space-y-4">
      <TabsList>
        <TabsTrigger value="all-heroes">{t("allHeroes.title")}</TabsTrigger>
        {heroesPlayed.map((hero) => (
          <TabsTrigger key={hero} value={hero}>
            {heroesT.has(toHero(hero)) ? heroesT(toHero(hero)) : hero}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="all-heroes" className="space-y-4">
        <AllHeroes
          playerStats={playerStats}
          showTable={false}
          locale={locale}
        />
      </TabsContent>
      {heroesPlayed.map((hero) => (
        <TabsContent key={hero} value={hero} className="space-y-4">
          <SpecificHero
            playerStats={playerStats.filter(
              (stat) => stat.player_hero === hero
            )}
            showTable={false}
            locale={locale}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}
