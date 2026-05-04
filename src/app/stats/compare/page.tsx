"use client";

import { ComparisonView } from "@/components/stats/compare/comparison-view";
import type { Timeframe } from "@/components/stats/player/range-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Winrate } from "@/data/scrim";
import type { Kill, PlayerStat, Scrim } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

type PlayerStatsResponse = {
  success: boolean;
  data?: {
    playerName: string;
    scrims: Record<Timeframe, Scrim[]>;
    stats: PlayerStat[];
    kills: Kill[];
    mapWinrates: Winrate;
    deaths: Kill[];
    permissions: {
      "stats-timeframe-1": boolean;
      "stats-timeframe-2": boolean;
      "stats-timeframe-3": boolean;
    };
  };
  error?: string;
};

async function fetchPlayerStats(
  playerName: string
): Promise<PlayerStatsResponse> {
  const response = await fetch(
    `/api/player/stats?playerName=${encodeURIComponent(playerName)}`
  );
  if (!response.ok) {
    throw new Error("Failed to fetch player stats");
  }
  const data = (await response.json()) as PlayerStatsResponse;

  if (data.success && data.data) {
    const convertedScrims = Object.fromEntries(
      Object.entries(data.data.scrims).map(([timeframe, scrims]) => [
        timeframe,
        scrims.map((scrim) => ({
          ...scrim,
          date: new Date(scrim.date),
          createdAt: new Date(scrim.createdAt),
          updatedAt: new Date(scrim.updatedAt),
        })),
      ])
    ) as Record<Timeframe, Scrim[]>;

    const convertedMapWinrates = data.data.mapWinrates.map((winrate) => ({
      ...winrate,
      date: new Date(winrate.date),
    }));

    return {
      ...data,
      data: {
        ...data.data,
        scrims: convertedScrims,
        mapWinrates: convertedMapWinrates,
      },
    };
  }

  return data;
}

export default function ComparePage() {
  const t = useTranslations("statsPage.compareStats");
  const [player1Input, setPlayer1Input] = useState("");
  const [player2Input, setPlayer2Input] = useState("");
  const [player1Name, setPlayer1Name] = useState<string | null>(null);
  const [player2Name, setPlayer2Name] = useState<string | null>(null);

  const player1Query = useQuery({
    queryKey: ["playerStats", player1Name],
    queryFn: () => fetchPlayerStats(player1Name!),
    enabled: !!player1Name,
    staleTime: 5 * 60 * 1000,
  });

  const player2Query = useQuery({
    queryKey: ["playerStats", player2Name],
    queryFn: () => fetchPlayerStats(player2Name!),
    enabled: !!player2Name,
    staleTime: 5 * 60 * 1000,
  });

  function handleCompare(e: React.FormEvent) {
    e.preventDefault();
    if (player1Input.trim()) {
      setPlayer1Name(player1Input.trim());
    }
    if (player2Input.trim()) {
      setPlayer2Name(player2Input.trim());
    }
  }

  function handleReset() {
    setPlayer1Input("");
    setPlayer2Input("");
    setPlayer1Name(null);
    setPlayer2Name(null);
  }

  const bothPlayersLoaded =
    player1Query.data?.success && player2Query.data?.success;
  const isLoading = player1Query.isLoading || player2Query.isLoading;
  const isError = player1Query.isError || player2Query.isError;

  return (
    <div className="px-6 pt-8 pb-16 sm:px-10">
      <header className="border-border flex flex-wrap items-end justify-between gap-x-10 gap-y-4 border-b pb-6">
        <div>
          <p className="text-muted-foreground font-mono text-xs tracking-[0.18em] uppercase">
            Stats · Player comparison
          </p>
          <h1 className="mt-3 text-4xl leading-none font-semibold tracking-tight">
            {t("title")}
          </h1>
        </div>
        {(player1Name ?? player2Name) ? (
          <Button type="button" variant="outline" onClick={handleReset}>
            {t("reset")}
          </Button>
        ) : null}
      </header>

      <form
        onSubmit={handleCompare}
        className="border-border mt-8 flex flex-wrap items-end gap-x-6 gap-y-4 border-b pb-8"
      >
        <div className="min-w-[14rem] flex-1 space-y-2">
          <label
            htmlFor="player1"
            className="text-muted-foreground font-mono text-[10px] tracking-[0.18em] uppercase"
          >
            {t("player1")}
          </label>
          <Input
            id="player1"
            placeholder={t("player1Placeholder")}
            value={player1Input}
            onChange={(e) => setPlayer1Input(e.target.value)}
          />
        </div>
        <div className="min-w-[14rem] flex-1 space-y-2">
          <label
            htmlFor="player2"
            className="text-muted-foreground font-mono text-[10px] tracking-[0.18em] uppercase"
          >
            {t("player2")}
          </label>
          <Input
            id="player2"
            placeholder={t("player2Placeholder")}
            value={player2Input}
            onChange={(e) => setPlayer2Input(e.target.value)}
          />
        </div>
        <Button
          type="submit"
          disabled={!player1Input.trim() || !player2Input.trim()}
        >
          {t("compare")}
        </Button>
      </form>

      {isLoading && (
        <div className="text-muted-foreground mt-12 flex items-center justify-center gap-2 py-16 text-sm">
          <Loader2 className="size-4 animate-spin" />
          <span>{t("loading")}</span>
        </div>
      )}

      {isError && (
        <div className="mt-12 py-16 text-center">
          <p className="text-destructive text-base font-semibold">
            {t("errorLoading")}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {player1Query.isError && t("errorPlayer1")}
            {player1Query.isError && player2Query.isError ? t("errorBoth") : ""}
            {player2Query.isError && t("errorPlayer2")}
          </p>
        </div>
      )}

      {bothPlayersLoaded &&
        player1Query.data?.data &&
        player2Query.data?.data && (
          <div className="mt-10">
            <ComparisonView
              player1Data={player1Query.data.data}
              player2Data={player2Query.data.data}
            />
          </div>
        )}

      {!player1Name && !player2Name && !isLoading && (
        <p className="text-muted-foreground mt-12 py-16 text-center text-sm">
          {t("enterPlayersPrompt")}
        </p>
      )}
    </div>
  );
}
