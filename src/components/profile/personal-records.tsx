"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  const bestAccuracy = stats.reduce((best, stat) => {
    if (stat.weapon_accuracy === 0) return best;
    return stat.weapon_accuracy > best.weapon_accuracy ? stat : best;
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

  if (bestAccuracy.weapon_accuracy > 0) {
    records.push({
      label: "Best Accuracy",
      value: `${Math.round(bestAccuracy.weapon_accuracy)}%`,
      subtext: bestAccuracy.player_hero,
      icon: <Crosshair className="h-5 w-5 text-purple-500" />,
    });
  }

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
      <Card>
        <CardHeader>
          <CardTitle>Personal Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground py-8 text-center text-sm">
            No records available yet
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal Records</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {records.map((record) => (
            <div
              key={record.label}
              className="hover:bg-accent flex items-center justify-between rounded-lg border p-3 transition-colors"
            >
              <div className="flex items-center gap-3">
                {record.icon}
                <div>
                  <p className="text-sm font-medium">{record.label}</p>
                  {record.subtext && (
                    <p className="text-muted-foreground text-xs">
                      {record.subtext}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right font-bold">{record.value}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
