"use client";

import { toTimestampWithHours } from "@/lib/utils";
import type { PlayerStat } from "@prisma/client";
import { Award, Crosshair, Heart, Shield, Zap } from "lucide-react";

type PersonalRecordsProps = {
  stats: PlayerStat[];
  heroesData: {
    player_hero: string;
    total_time_played: number;
    hero_rating: number;
    mapsPlayed: number;
    percentile: string;
    rank: number;
  }[];
};

type Record = {
  label: string;
  value: string;
  icon: React.ReactNode;
  subtext?: string;
};

function calculatePersonalRecords(
  stats: PlayerStat[],
  heroesData: PersonalRecordsProps["heroesData"]
): Record[] {
  if (stats.length === 0) {
    return [];
  }

  const bestKD = stats.reduce((best, stat) => {
    const kd =
      stat.deaths > 0 ? stat.eliminations / stat.deaths : stat.eliminations;
    const bestKD =
      best.deaths > 0 ? best.eliminations / best.deaths : best.eliminations;
    return kd > bestKD ? stat : best;
  }, stats[0]);

  const mostElims = stats.reduce((best, stat) => {
    return stat.eliminations > best.eliminations ? stat : best;
  }, stats[0]);

  const mostHealing = stats.reduce((best, stat) => {
    return stat.healing_dealt > best.healing_dealt ? stat : best;
  }, stats[0]);

  const mostDamage = stats.reduce((best, stat) => {
    return stat.hero_damage_dealt > best.hero_damage_dealt ? stat : best;
  }, stats[0]);

  const highestSR = heroesData.reduce((best, hero) => {
    return hero.hero_rating > best.hero_rating ? hero : best;
  }, heroesData[0]);

  const totalTimePlayed = heroesData.reduce(
    (sum, hero) => sum + hero.total_time_played,
    0
  );

  const records: Record[] = [
    {
      label: "Highest SR",
      value:
        highestSR?.hero_rating > 0 ? `${highestSR.hero_rating} SR` : "Unplaced",
      subtext: highestSR?.player_hero,
      icon: <Award className="h-5 w-5 text-amber-500" />,
    },
    {
      label: "Best K/D Ratio",
      value:
        bestKD.deaths > 0
          ? (bestKD.eliminations / bestKD.deaths).toFixed(2)
          : bestKD.eliminations.toString(),
      subtext: `${bestKD.player_hero} (${bestKD.eliminations}/${bestKD.deaths})`,
      icon: <Crosshair className="h-5 w-5 text-red-500" />,
    },
    {
      label: "Most Eliminations",
      value: mostElims.eliminations.toString(),
      subtext: mostElims.player_hero,
      icon: <Zap className="h-5 w-5 text-orange-500" />,
    },
    {
      label: "Most Healing",
      value: Math.round(mostHealing.healing_dealt).toLocaleString(),
      subtext: mostHealing.player_hero,
      icon: <Heart className="h-5 w-5 text-green-500" />,
    },
    {
      label: "Most Damage",
      value: Math.round(mostDamage.hero_damage_dealt).toLocaleString(),
      subtext: mostDamage.player_hero,
      icon: <Shield className="h-5 w-5 text-blue-500" />,
    },
  ];

  records.push({
    label: "Total Playtime",
    value: toTimestampWithHours(totalTimePlayed),
    subtext: `Across ${heroesData.length} heroes`,
    icon: <Award className="h-5 w-5 text-indigo-500" />,
  });

  return records;
}

export function PersonalRecords({ stats, heroesData }: PersonalRecordsProps) {
  const records = calculatePersonalRecords(stats, heroesData);

  if (records.length === 0) {
    return (
      <div className="bg-card text-muted-foreground flex h-32 items-center justify-center px-5 text-sm">
        No records available yet
      </div>
    );
  }

  return (
    <ul className="bg-border grid grid-cols-1 gap-px sm:grid-cols-2 lg:grid-cols-3">
      {records.map((record) => (
        <li
          key={record.label}
          className="bg-card flex items-start justify-between gap-3 px-5 py-4"
        >
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 shrink-0">{record.icon}</span>
            <div className="min-w-0">
              <p className="text-muted-foreground font-mono text-[0.6875rem] tracking-[0.06em] uppercase">
                {record.label}
              </p>
              <p className="mt-1.5 truncate font-mono text-base font-semibold tabular-nums">
                {record.value}
              </p>
              {record.subtext ? (
                <p className="text-muted-foreground/80 mt-0.5 truncate text-xs">
                  {record.subtext}
                </p>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
