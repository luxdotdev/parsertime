"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users } from "lucide-react";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

type ScoutForTeamPickerProps = {
  userTeams: { id: number; name: string }[];
  currentTeamId: number | null;
};

export function ScoutForTeamPicker({
  userTeams,
  currentTeamId,
}: ScoutForTeamPickerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "none") {
        params.delete("scoutFor");
      } else {
        params.set("scoutFor", value);
      }
      const qs = params.toString();
      router.push(`${pathname}${qs ? `?${qs}` : ""}` as Route);
    },
    [router, pathname, searchParams]
  );

  if (userTeams.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <Users
        className="text-muted-foreground h-4 w-4 shrink-0"
        aria-hidden="true"
      />
      <label
        htmlFor="scout-for-team"
        className="text-muted-foreground shrink-0 text-sm"
      >
        Scouting for:
      </label>
      <Select
        value={currentTeamId?.toString() ?? "none"}
        onValueChange={handleChange}
      >
        <SelectTrigger size="sm" id="scout-for-team">
          <SelectValue placeholder="Select your team" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No team selected</SelectItem>
          {userTeams.map((team) => (
            <SelectItem key={team.id} value={team.id.toString()}>
              {team.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
