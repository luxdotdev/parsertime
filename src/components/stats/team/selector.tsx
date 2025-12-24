"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Team } from "@prisma/client";
import type { Route } from "next";
import { useRouter } from "next/navigation";

export function TeamSelector({ teams }: { teams: Team[] }) {
  const router = useRouter();

  return (
    <Select
      onValueChange={(value) => router.push(`/stats/team/${value}` as Route)}
    >
      <SelectTrigger className="w-full max-w-md md:max-w-lg">
        <SelectValue placeholder="Select a team" />
      </SelectTrigger>
      <SelectContent>
        {teams.map((team) => (
          <SelectItem key={team.id} value={team.id.toString()}>
            {team.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
