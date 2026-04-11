"use client";

import { Card, CardFooter, CardHeader } from "@/components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Link } from "@/components/ui/link";
import type { Team } from "@prisma/client";
import { ChartBarIcon, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Route } from "next";
import Image from "next/image";
import { useMemo, useState } from "react";
import { useDebounce } from "use-debounce";

export function UserTeamsList({ teams }: { teams: Team[] }) {
  const t = useTranslations("teamPage");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch] = useDebounce(searchInput, 200);

  const filteredTeams = useMemo(() => {
    const sorted = [...teams].sort((a, b) => (a.id > b.id ? 1 : -1));
    if (!debouncedSearch) return sorted;
    const lower = debouncedSearch.toLowerCase();
    return sorted.filter((team) => team.name.toLowerCase().includes(lower));
  }, [teams, debouncedSearch]);

  return (
    <div className="space-y-4">
      <InputGroup className="w-full max-w-sm">
        <InputGroupInput
          type="search"
          placeholder={t("search.placeholder")}
          aria-label={t("search.placeholder")}
          name="team-search"
          autoComplete="off"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <InputGroupAddon>
          <Search aria-hidden="true" />
        </InputGroupAddon>
      </InputGroup>

      {filteredTeams.length > 0 ? (
        <Card className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredTeams.map((team) => (
            <div key={team.id} className="p-2">
              <Card className="relative min-h-[144px] md:w-60 xl:w-80">
                <Link href={`/team/${team.id}` as Route}>
                  <Image
                    src={
                      team.image ?? `https://avatar.vercel.sh/${team.name}.png`
                    }
                    alt={
                      team.name
                        ? t("altText.custom", { team: team.name })
                        : t("altText.default")
                    }
                    width={100}
                    height={100}
                    className="float-right rounded-full p-4"
                  />
                  <CardHeader>
                    <h3 className="z-10 text-3xl font-semibold tracking-tight">
                      {team.name}
                    </h3>
                  </CardHeader>
                </Link>
                <Link
                  href={`/stats/team/${team.id}` as Route}
                  className="hover:underline"
                >
                  <CardFooter className="flex items-center gap-2">
                    <ChartBarIcon className="h-4 w-4" />
                    {t("viewStats")} &rarr;
                  </CardFooter>
                </Link>
              </Card>
            </div>
          ))}
        </Card>
      ) : debouncedSearch ? (
        <Card className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground text-lg font-medium">
            {t("search.noTeamsFound")}
          </p>
          <p className="text-muted-foreground text-sm">
            {t("search.tryAdjustingFilters")}
          </p>
        </Card>
      ) : null}
    </div>
  );
}
