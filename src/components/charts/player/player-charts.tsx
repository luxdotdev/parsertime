import { DamageByRoundChart } from "@/components/charts/player/damage-by-round-chart";
import { HealingByRoundChart } from "@/components/charts/player/healing-by-round-chart";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import prisma from "@/lib/prisma";

type Props = {
  id: number;
  playerName: string;
};

type PlayerDamage = {
  round_number: number;
  player_hero: string;
  hero_damage_dealt: number;
};

type PlayerHealing = {
  round_number: number;
  player_hero: string;
  healing_dealt: number;
};

function sumDamageByRound(playerDamages: PlayerDamage[]) {
  const sumByRound = new Map<number, number>();
  const uniqueEntries = new Set<string>();

  // Accumulate damage by round, ensuring no double counting for the same player-hero in the same round
  playerDamages.forEach(({ round_number, player_hero, hero_damage_dealt }) => {
    const key = `${round_number}-${player_hero}`;
    if (!uniqueEntries.has(key)) {
      uniqueEntries.add(key);
      const currentSum = sumByRound.get(round_number) || 0;
      sumByRound.set(round_number, currentSum + hero_damage_dealt);
    }
  });

  // Prepare the final output, subtracting the damage of the previous round from the current one
  const result = [] as { round_number: number; hero_damage_dealt: number }[];
  let previousRoundDamage = 0; // Track damage from the previous round
  Array.from(sumByRound.keys())
    .sort((a, b) => a - b) // Ensure rounds are in ascending order
    .forEach((round_number) => {
      const currentRoundDamage = sumByRound.get(round_number)!; // Non-null assertion since we know it exists
      const damageDifference = currentRoundDamage - previousRoundDamage;
      result.push({
        round_number,
        hero_damage_dealt: damageDifference,
      });
      previousRoundDamage = currentRoundDamage; // Update the previous round damage for the next iteration
    });

  return result;
}

function sumHealingByRound(playerHealings: PlayerHealing[]) {
  const sumByRound = new Map<number, number>();
  const uniqueEntries = new Set<string>();

  // Accumulate healing by round, ensuring no double counting for the same player-hero in the same round
  playerHealings.forEach(({ round_number, player_hero, healing_dealt }) => {
    const key = `${round_number}-${player_hero}`;
    if (!uniqueEntries.has(key)) {
      uniqueEntries.add(key);
      const currentSum = sumByRound.get(round_number) || 0;
      sumByRound.set(round_number, currentSum + healing_dealt);
    }
  });

  // Prepare the final output, subtracting the healing of the previous round from the current one
  const result = [] as { round_number: number; healing_dealt: number }[];
  let previousRoundHealing = 0; // Track healing from the previous round
  Array.from(sumByRound.keys())
    .sort((a, b) => a - b) // Ensure rounds are in ascending order
    .forEach((round_number) => {
      const currentRoundHealing = sumByRound.get(round_number)!; // Non-null assertion since we know it exists
      const healingDifference = currentRoundHealing - previousRoundHealing;
      result.push({
        round_number,
        healing_dealt: healingDifference,
      });
      previousRoundHealing = currentRoundHealing; // Update the previous round healing for the next iteration
    });

  return result;
}

export async function PlayerCharts({ id, playerName }: Props) {
  const teams = await prisma.matchStart.findFirst({
    where: {
      MapDataId: id,
    },
    select: {
      team_1_name: true,
      team_2_name: true,
    },
  });

  const team1Name = teams?.team_1_name ?? "Team 1";

  const playerDamageByRound = await prisma.playerStat.findMany({
    where: {
      MapDataId: id,
      player_name: playerName,
    },
    select: {
      hero_damage_dealt: true,
      round_number: true,
      player_hero: true,
    },
  });

  const dmgSumByRound = sumDamageByRound(playerDamageByRound);

  const playerHealingByRound = await prisma.playerStat.findMany({
    where: {
      MapDataId: id,
      player_name: playerName,
    },
    select: {
      healing_dealt: true,
      round_number: true,
      player_hero: true,
    },
  });

  const healingSumByRound = sumHealingByRound(playerHealingByRound);

  const playerTeamName = await prisma.playerStat.findFirst({
    where: {
      MapDataId: id,
      player_name: playerName,
    },
    select: {
      player_team: true,
    },
  });

  const playerTeam =
    playerTeamName?.player_team === team1Name ? "Team1" : "Team2";

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>Hero Damage By Round Chart</CardTitle>
        </CardHeader>
        <CardContent className="pl-2">
          <DamageByRoundChart
            playerDamageByRound={dmgSumByRound}
            playerName={playerName}
            playerTeam={playerTeam}
          />
        </CardContent>
        <CardFooter>
          <p className="text-sm text-gray-500">
            This chart shows the hero damage done by round for the selected
            player. The x-axis represents the round, and the y-axis represents
            the damage done. Note that the damage is NOT cumulative, so the
            damage done in round 2 does not include the damage done in round 1.
          </p>
        </CardFooter>
      </Card>
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>Healing By Round Chart</CardTitle>
        </CardHeader>
        <CardContent className="pl-2">
          <HealingByRoundChart
            playerHealingByRound={healingSumByRound}
            playerName={playerName}
            playerTeam={playerTeam}
          />
        </CardContent>
        <CardFooter>
          <p className="text-sm text-gray-500">
            This chart shows the healing done by round for the selected player.
            The x-axis represents the round, and the y-axis represents the
            healing done. Note that the healing is NOT cumulative, so the
            healing done in round 2 does not include the healing done in round
            1.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
