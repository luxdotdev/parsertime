"use client";

import { Button } from "@/components/ui/button";
import { TODO } from "@/types/utils";
import { Kill } from "@prisma/client";

type Fight = {
  kills: Kill[];
  start: number;
  end: number;
};

export function KillfeedExport({ fights }: { fights: Fight[] }) {
  const flattenedData = fights.flatMap((fight) =>
    fight.kills.map((kill) => ({
      fight_number: fights.indexOf(fight) + 1,
      fight_start: fight.start,
      fight_end: fight.end,
      event_type: kill.event_type,
      match_time: kill.match_time,
      attacker_team: kill.attacker_team,
      attacker_name: kill.attacker_name,
      attacker_hero: kill.attacker_hero,
      victim_team: kill.victim_team,
      victim_name: kill.victim_name,
      victim_hero: kill.victim_hero,
      event_ability: kill.event_ability,
      event_damage: kill.event_damage,
      is_critical_hit: kill.is_critical_hit,
      is_environmental: kill.is_environmental,
    }))
  );

  function generateCSV(flattenedData: TODO[]): string {
    // Generate the headers
    const headers = Object.keys(flattenedData[0]).join(",");

    // Generate the rows
    const rows = flattenedData.map((obj) =>
      Object.values(obj)
        .map((value) => (value === null ? "" : value?.toString()))
        .join(",")
    );

    // Combine headers and rows
    return [headers, ...rows].join("\n");
  }

  function handleClick() {
    const csv = generateCSV(flattenedData);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "killfeed.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <Button variant="outline" onClick={handleClick}>
      Export as CSV
    </Button>
  );
}
