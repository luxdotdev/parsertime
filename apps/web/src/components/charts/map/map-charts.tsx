import { DOCS_URL } from "@/lib/site";
import { DamageByRoundChart } from "@/components/charts/map/damage-by-round-chart";
import { KillsByFightChart } from "@/components/charts/map/kills-by-fight-chart";
import { KillsByRoleChart } from "@/components/charts/map/kills-by-role-chart";
import { MapUltAdvantageCard } from "@/components/charts/map/map-ult-advantage";
import { TempoChartServer } from "@/components/map/tempo/tempo-chart-server";
import { Link } from "@/components/ui/link";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getMapUltAdvantage } from "@/data/map/ult-advantage";
import type { Locale } from "@/i18n/config";
import { mapTag } from "@/lib/cache-tags";
import { getLocaleTranslations } from "@/lib/metadata-i18n";
import { resolveMapDataId } from "@/lib/map-data-resolver";
import prisma from "@/lib/prisma";
import type { Kill } from "@/generated/prisma/client";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { cacheLife, cacheTag } from "next/cache";

async function ChartTooltip({ locale }: { locale: Locale }) {
  const t = await getLocaleTranslations(locale, "mapPage.charts");
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <InfoCircledIcon className="text-muted-foreground h-3.5 w-3.5" />
      </TooltipTrigger>
      <TooltipContent className="max-w-[280px]">
        {t.rich("tooltip", {
          link: (chunks) => (
            <Link href={`${DOCS_URL}/maps/charts`} external>
              {chunks}
            </Link>
          ),
        })}
      </TooltipContent>
    </Tooltip>
  );
}

async function groupKillsByInterval(id: number, maxInterval: number) {
  const mdId = await resolveMapDataId(id);
  const kills = await prisma.kill.findMany({
    where: {
      MapDataId: mdId,
    },
    orderBy: [{ match_time: "asc" }, { id: "asc" }],
  });

  const groupedKills: Kill[][] = [];
  let currentGroup: Kill[] = [];

  kills.forEach((kill, index) => {
    if (currentGroup.length === 0) {
      currentGroup.push(kill);
    } else {
      const timeDifference = kill.match_time - kills[index - 1].match_time;

      if (timeDifference <= maxInterval) {
        currentGroup.push(kill);
      } else {
        groupedKills.push(currentGroup);
        currentGroup = [kill];
      }
    }
  });

  if (currentGroup.length > 0) {
    groupedKills.push(currentGroup);
  }

  return groupedKills;
}

type ChartSectionProps = {
  id: string;
  locale: Locale;
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

function ChartSection({
  id,
  locale,
  eyebrow,
  title,
  description,
  children,
}: ChartSectionProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <span className="text-muted-foreground font-mono text-[0.6875rem] tracking-[0.06em] uppercase">
          {eyebrow}
        </span>
        <div className="flex items-center gap-1.5">
          <h3
            id={id}
            className="font-sans text-base font-semibold tracking-tight"
          >
            {title}
          </h3>
          <ChartTooltip locale={locale} />
        </div>
      </div>
      <div className="-ml-2">{children}</div>
      <p className="text-muted-foreground text-xs leading-relaxed">
        {description}
      </p>
    </div>
  );
}

export async function MapCharts({
  id,
  locale,
  team1Color,
  team2Color,
  tempoChartEnabled,
}: {
  id: number;
  locale: Locale;
  team1Color: string;
  team2Color: string;
  tempoChartEnabled: boolean;
}) {
  "use cache";
  cacheLife("hours");
  cacheTag(mapTag(id));

  const t = await getLocaleTranslations(locale, "mapPage.charts");
  const mapDataId = await resolveMapDataId(id);
  const teams = await prisma.matchStart.findFirst({
    where: {
      MapDataId: mapDataId,
    },
    select: {
      team_1_name: true,
      team_2_name: true,
    },
  });

  const team1Name = teams?.team_1_name ?? t("team1");
  const team2Name = teams?.team_2_name ?? t("team2");
  const teamNames = [team1Name, team2Name] as const;

  const fights = await groupKillsByInterval(id, 15);

  const ultAdvantage = await getMapUltAdvantage(id, team1Name);

  const team1Kills = await prisma.kill.findMany({
    where: {
      MapDataId: mapDataId,
      attacker_team: team1Name,
    },
  });

  const team2Kills = await prisma.kill.findMany({
    where: {
      MapDataId: mapDataId,
      attacker_team: team2Name,
    },
  });

  const team1DamageByRound = await prisma.playerStat.groupBy({
    by: ["round_number"],
    where: {
      MapDataId: mapDataId,
      player_team: team1Name,
    },
    _sum: {
      hero_damage_dealt: true,
    },
  });

  const team2DamageByRound = await prisma.playerStat.groupBy({
    by: ["round_number"],
    where: {
      MapDataId: mapDataId,
      player_team: team2Name,
    },
    _sum: {
      hero_damage_dealt: true,
    },
  });

  return (
    <section aria-label={t("title")} className="space-y-6">
      {tempoChartEnabled && (
        <>
          <ChartSection
            id="tempo"
            locale={locale}
            eyebrow={t("tempo.eyebrow")}
            title={t("tempo.title")}
            description={t("tempo.description")}
          >
            <TempoChartServer
              id={id}
              locale={locale}
              team1Color={team1Color}
              team2Color={team2Color}
            />
          </ChartSection>

          <Separator />
        </>
      )}

      <ChartSection
        id="kills-by-fight"
        locale={locale}
        eyebrow={t("killsByFight.eyebrow")}
        title={t("killsByFight.title")}
        description={t("killsByFight.description")}
      >
        <KillsByFightChart fights={fights} teamNames={teamNames} />
      </ChartSection>

      {ultAdvantage.timeline.length > 0 && (
        <>
          <Separator />

          <ChartSection
            id="ult-advantage"
            locale={locale}
            eyebrow={t("ultAdvantage.eyebrow")}
            title={t("ultAdvantage.title")}
            description={t("ultAdvantage.description", { team: team1Name })}
          >
            <MapUltAdvantageCard
              timeline={ultAdvantage.timeline}
              analysis={ultAdvantage.analysis}
              team1Name={team1Name}
              team2Name={team2Name}
              team1Color={team1Color}
              team2Color={team2Color}
            />
          </ChartSection>
        </>
      )}

      <Separator />

      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        <ChartSection
          id="final-blows-by-role"
          locale={locale}
          eyebrow={t("finalBlowsByRole.eyebrow")}
          title={t("finalBlowsByRole.title")}
          description={t("finalBlowsByRole.description")}
        >
          <KillsByRoleChart
            team1Kills={team1Kills}
            team2Kills={team2Kills}
            teamNames={teamNames}
          />
        </ChartSection>

        <ChartSection
          id="damage-by-round"
          locale={locale}
          eyebrow={t("dmgByRound.eyebrow")}
          title={t("dmgByRound.title")}
          description={t("dmgByRound.description")}
        >
          <DamageByRoundChart
            team1DamageByRound={team1DamageByRound.sort(
              (a, b) => a.round_number - b.round_number
            )}
            team2DamageByRound={team2DamageByRound.sort(
              (a, b) => a.round_number - b.round_number
            )}
            teamNames={teamNames}
          />
        </ChartSection>
      </div>
    </section>
  );
}
