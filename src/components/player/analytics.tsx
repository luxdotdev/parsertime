import { DmgDoneVsDmgTakenChart } from "@/components/charts/player/dmg-done-vs-dmg-taken-chart";
import { DmgTakenVsHealingReceivedChart } from "@/components/charts/player/dmg-taken-vs-healing-chart";
import { KillfeedTable } from "@/components/map/killfeed-table";
import { MVPCard } from "@/components/player/mvp-card";
import {
  StatBlock,
  StatGrid,
  StatPanel,
} from "@/components/player/stat-panel";
import { CardIcon } from "@/components/ui/card-icon";
import {
  calculateDroughtTime,
  getAverageTimeToUseUlt,
  getAverageUltChargeTime,
  getDuelWinrates,
} from "@/lib/analytics";
import { auth } from "@/lib/auth";
import { calculateMVPScoresForMap } from "@/lib/mvp-score";
import { resolveMapDataId } from "@/lib/map-data-resolver";
import prisma from "@/lib/prisma";
import {
  getColorblindMode,
  groupPlayerKillsIntoFights,
  removeDuplicateRows,
  toHero,
  toTimestamp,
} from "@/lib/utils";
import { getTranslations } from "next-intl/server";
import Image from "next/image";

export async function PlayerAnalytics({
  id,
  playerName,
}: {
  id: number;
  playerName: string;
}) {
  const t = await getTranslations("mapPage.player.analytics");
  const mapDataId = await resolveMapDataId(id);

  const [
    averageTimeToUltimate,
    averageTimeToUseUlt,
    droughtTime,
    duels,
    match,
    fights,
    allDamageTakens,
    allHealingReceiveds,
    allHeroDamageDone,
    session,
    mvpScore,
  ] = await Promise.all([
    getAverageUltChargeTime(id, playerName),
    getAverageTimeToUseUlt(id, playerName),
    calculateDroughtTime(id, playerName),
    getDuelWinrates(id, playerName),
    prisma.matchStart.findFirst({ where: { MapDataId: mapDataId } }),
    groupPlayerKillsIntoFights(id, playerName),
    prisma.playerStat.findMany({
      where: { MapDataId: mapDataId, player_name: playerName },
      select: { id: true, round_number: true, damage_taken: true },
    }),
    prisma.playerStat.findMany({
      where: { MapDataId: mapDataId, player_name: playerName },
      select: { id: true, round_number: true, healing_received: true },
    }),
    prisma.playerStat.findMany({
      where: { MapDataId: mapDataId, player_name: playerName },
      select: { id: true, round_number: true, hero_damage_dealt: true },
    }),
    auth(),
    calculateMVPScoresForMap(id),
  ]);

  const allDamageTakensByRound = removeDuplicateRows(allDamageTakens);
  const allHealingReceivedsByRound = removeDuplicateRows(allHealingReceiveds);
  const allHeroDamageDoneByRound = removeDuplicateRows(allHeroDamageDone);

  const damageTakenByRound = allDamageTakensByRound.reduce(
    (acc, { round_number, damage_taken }) => {
      if (!acc[round_number]) {
        acc[round_number] = 0;
      }
      acc[round_number] += damage_taken;
      return acc;
    },
    {} as Record<number, number>
  );

  const healingReceivedByRound = allHealingReceivedsByRound.reduce(
    (acc, { round_number, healing_received }) => {
      if (!acc[round_number]) {
        acc[round_number] = 0;
      }
      acc[round_number] += healing_received;
      return acc;
    },
    {} as Record<number, number>
  );

  const damageDoneByRound = allHeroDamageDoneByRound.reduce(
    (acc, { round_number, hero_damage_dealt }) => {
      if (!acc[round_number]) {
        acc[round_number] = 0;
      }
      acc[round_number] += hero_damage_dealt;
      return acc;
    },
    {} as Record<number, number>
  );

  const { team1: team1Color, team2: team2Color } = await getColorblindMode(
    session?.user.id ?? ""
  );

  return (
    <main className="min-h-[65vh] space-y-8">
      <section aria-labelledby="rhythm-heading">
        <SectionHeader id="rhythm-heading" title={t("rhythm")} />
        <StatPanel>
          <StatGrid>
            <StatBlock
              label={t("avgUltChargeTime.title")}
              icon={
                <CardIcon>
                  <line x1="10" x2="14" y1="2" y2="2" />
                  <line x1="12" x2="15" y1="14" y2="11" />
                  <circle cx="12" cy="14" r="8" />
                </CardIcon>
              }
              value={toTimestamp(averageTimeToUltimate)}
              sub={t("avgUltChargeTime.footer")}
            />
            <StatBlock
              label={t("avgTimeUseUlt.title")}
              icon={
                <CardIcon>
                  <path d="M5 22h14" />
                  <path d="M5 2h14" />
                  <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" />
                  <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
                </CardIcon>
              }
              value={toTimestamp(averageTimeToUseUlt)}
              sub={t("avgTimeUseUlt.footer")}
            />
            <StatBlock
              label={t("avgDroughtTime.title")}
              icon={
                <CardIcon>
                  <path d="M10 2h4" />
                  <path d="M4.6 11a8 8 0 0 0 1.7 8.7 8 8 0 0 0 8.7 1.7" />
                  <path d="M7.4 7.4a8 8 0 0 1 10.3 1 8 8 0 0 1 .9 10.2" />
                  <path d="m2 2 20 20" />
                  <path d="M12 12v-2" />
                </CardIcon>
              }
              value={toTimestamp(droughtTime)}
              sub={t("avgDroughtTime.footer")}
            />
            <MVPCard playerName={playerName} mvpScores={mvpScore} />
          </StatGrid>
        </StatPanel>
      </section>

      <section aria-labelledby="versus-heading">
        <SectionHeader
          id="versus-heading"
          title={t("versus.title")}
          description={t("versus.description", { playerName })}
        />
        {duels.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("versus.empty")}</p>
        ) : (
          <div className="ring-foreground/10 bg-card divide-border max-h-[60vh] divide-y overflow-y-auto rounded-xl shadow-xs ring-1">
            {duels.map((duel) => {
              const playerColor =
                duel.player_team === match?.team_1_name
                  ? team1Color
                  : team2Color;
              const enemyColor =
                duel.enemy_team === match?.team_1_name
                  ? team1Color
                  : team2Color;
              const winningColor =
                duel.enemy_deaths > duel.enemy_kills
                  ? playerColor
                  : duel.enemy_deaths < duel.enemy_kills
                    ? enemyColor
                    : "var(--muted-foreground)";
              const winrate = (
                (duel.enemy_deaths / (duel.enemy_kills + duel.enemy_deaths)) *
                100
              ).toFixed(0);

              return (
                <div
                  key={duel.enemy_name}
                  className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4"
                >
                  <DuelSide
                    name={duel.player_name}
                    hero={duel.player_hero}
                    color={playerColor}
                  />
                  <span
                    className="text-muted-foreground text-base"
                    aria-hidden="true"
                  >
                    →
                  </span>
                  <DuelSide
                    name={duel.enemy_name}
                    hero={duel.enemy_hero}
                    color={enemyColor}
                  />
                  <div className="ml-auto flex items-center gap-5">
                    <div className="flex items-baseline gap-1.5 font-mono tabular-nums">
                      <span
                        style={{ color: playerColor }}
                        className="text-lg font-semibold"
                      >
                        {duel.enemy_deaths}
                      </span>
                      <span className="text-muted-foreground text-sm">–</span>
                      <span
                        style={{ color: enemyColor }}
                        className="text-lg font-semibold"
                      >
                        {duel.enemy_kills}
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span
                        className="font-mono text-base font-semibold tabular-nums"
                        style={{ color: winningColor }}
                      >
                        {winrate}%
                      </span>
                      <span className="text-muted-foreground font-mono text-[0.625rem] tracking-[0.06em] uppercase">
                        {t("versus.winrateLabel")}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section aria-labelledby="killfeed-heading">
        <SectionHeader
          id="killfeed-heading"
          title={t("playerKillfeed.title")}
          description={t("playerKillfeed.description", { playerName })}
        />
        <div className="ring-foreground/10 bg-card max-h-[80vh] overflow-y-auto rounded-xl px-4 py-2 shadow-xs ring-1">
          <KillfeedTable
            fights={fights}
            team1={match?.team_1_name ?? t("playerKillfeed.team1")}
            team2={match?.team_2_name ?? t("playerKillfeed.team2")}
            team1Color={team1Color}
            team2Color={team2Color}
          />
        </div>
      </section>

      <section aria-labelledby="round-trends-heading">
        <SectionHeader id="round-trends-heading" title={t("roundTrends")} />
        <StatPanel>
          <div className="bg-border grid grid-cols-1 gap-px lg:grid-cols-2">
            <ChartCell
              title={t("dmgTakenHealingReceived.title")}
              footer={t("dmgTakenHealingReceived.footer")}
            >
              <DmgTakenVsHealingReceivedChart
                damageTakenByRound={damageTakenByRound}
                healingReceivedByRound={healingReceivedByRound}
              />
            </ChartCell>
            <ChartCell
              title={t("dmgDoneDmgTaken.title")}
              footer={t("dmgDoneDmgTaken.footer")}
            >
              <DmgDoneVsDmgTakenChart
                damageDoneByRound={damageDoneByRound}
                damageTakenByRound={damageTakenByRound}
              />
            </ChartCell>
          </div>
        </StatPanel>
      </section>
    </main>
  );
}

function SectionHeader({
  id,
  title,
  description,
}: {
  id: string;
  title: string;
  description?: string;
}) {
  return (
    <header className="mb-5 flex flex-col gap-1">
      <h2
        id={id}
        className="text-muted-foreground font-mono text-[0.6875rem] tracking-[0.08em] uppercase"
      >
        {title}
      </h2>
      {description ? (
        <p className="text-muted-foreground text-xs">{description}</p>
      ) : null}
    </header>
  );
}

function DuelSide({
  name,
  hero,
  color,
}: {
  name: string;
  hero: string;
  color: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Image
        src={`/heroes/${toHero(hero)}.png`}
        alt=""
        width={256}
        height={256}
        className="size-10 rounded-md border-2 object-cover"
        style={{ borderColor: color }}
      />
      <span className="truncate text-sm font-medium">{name}</span>
    </div>
  );
}

function ChartCell({
  title,
  footer,
  children,
}: {
  title: string;
  footer?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card flex flex-col px-5 py-5">
      <h3 className="text-muted-foreground font-mono text-[0.6875rem] tracking-[0.06em] uppercase">
        {title}
      </h3>
      <div className="mt-5">{children}</div>
      {footer ? (
        <p className="text-muted-foreground mt-4 text-xs">{footer}</p>
      ) : null}
    </div>
  );
}
