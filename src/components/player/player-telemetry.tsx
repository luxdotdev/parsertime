import { SectionHeader } from "@/components/section-header";
import { StatBlock, StatGrid, StatPanel } from "@/components/player/stat-panel";
import { PlayerHeatmap } from "@/components/player/telemetry/player-heatmap";
import { PlayerMatchups } from "@/components/player/telemetry/player-matchups";
import { PlayerTelemetryChart } from "@/components/player/telemetry/player-telemetry-chart";
import { PlayerTelemetryService } from "@/data/map";
import type { PlayerTelemetry as PlayerTelemetryData } from "@/data/map/player-telemetry-types";
import { AppRuntime } from "@/data/runtime";
import { Effect } from "effect";
import { getTranslations } from "next-intl/server";

type Props = {
  id: number;
  playerName: string;
};

export async function PlayerTelemetry({ id, playerName }: Props) {
  const t = await getTranslations("mapPage.player.telemetry");

  const result = await AppRuntime.runPromise(
    PlayerTelemetryService.pipe(
      Effect.flatMap((svc) => svc.getPlayerTelemetry(id, playerName))
    )
  );

  if (result.type === "no_data") {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 text-center">
        <p className="text-sm font-medium">{t("noData.title")}</p>
        <p className="text-muted-foreground max-w-md text-sm">
          {t("noData.description")}
        </p>
      </div>
    );
  }

  const { telemetry, heatmap } = result;

  return (
    <main className="min-h-[65vh] space-y-8">
      <StatPanel>
        <StatGrid>
          {headerStats(telemetry, t).map((stat) => (
            <StatBlock key={stat.label} label={stat.label} value={stat.value} />
          ))}
        </StatGrid>
      </StatPanel>

      <section aria-labelledby="telemetry-trace-heading">
        <SectionHeader
          id="telemetry-trace-heading"
          title={t("trace.title")}
          description={t("trace.description")}
        />
        <StatPanel className="px-4 py-5 sm:px-5">
          <PlayerTelemetryChart telemetry={telemetry} playerName={playerName} />
        </StatPanel>
      </section>

      <section aria-labelledby="telemetry-matchups-heading">
        <SectionHeader
          id="telemetry-matchups-heading"
          title={t("matchups.title")}
          description={t("matchups.description")}
        />
        <StatPanel>
          <PlayerMatchups
            totals={telemetry.damageByRoleTotals}
            opponents={telemetry.opponents}
            playerTeam={telemetry.playerTeam}
          />
        </StatPanel>
      </section>

      <section aria-labelledby="telemetry-heatmap-heading">
        <SectionHeader
          id="telemetry-heatmap-heading"
          title={t("heatmap.title")}
          description={t("heatmap.description")}
        />
        <StatPanel className="px-4 py-5 sm:px-5">
          <PlayerHeatmap result={heatmap} />
        </StatPanel>
      </section>
    </main>
  );
}

function num(value: number) {
  return Math.round(value).toLocaleString();
}

function headerStats(
  telemetry: PlayerTelemetryData,
  t: Awaited<ReturnType<typeof getTranslations>>
): { label: string; value: string }[] {
  const { totals, role } = telemetry;

  const damageDealt = {
    label: t("stats.damageDealt"),
    value: num(totals.damageDealt),
  };
  const damageTaken = {
    label: t("stats.damageTaken"),
    value: num(totals.damageTaken),
  };
  const healingDealt = {
    label: t("stats.healingDealt"),
    value: num(totals.healingDealt),
  };
  const eliminations = {
    label: t("stats.eliminations"),
    value: totals.eliminations.toLocaleString(),
  };
  const deaths = {
    label: t("stats.deaths"),
    value: totals.deaths.toLocaleString(),
  };

  if (role === "Support") {
    return [healingDealt, damageDealt, damageTaken, deaths];
  }
  if (role === "Tank") {
    return [damageDealt, damageTaken, eliminations, deaths];
  }
  return [damageDealt, eliminations, deaths, damageTaken];
}
