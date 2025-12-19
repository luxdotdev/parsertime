"use client";

import { ComparisonView } from "@/components/stats/compare/comparison-view";
import type { Timeframe } from "@/components/stats/player/range-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Winrate } from "@/data/scrim-dto";
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
    // Convert date strings back to Date objects for scrims
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

    // Convert date strings in mapWinrates
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

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-6 lg:p-8">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">{t("title")}</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("enterPlayerNames")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCompare} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="player1">{t("player1")}</Label>
                <Input
                  id="player1"
                  placeholder={t("player1Placeholder")}
                  value={player1Input}
                  onChange={(e) => setPlayer1Input(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="player2">{t("player2")}</Label>
                <Input
                  id="player2"
                  placeholder={t("player2Placeholder")}
                  value={player2Input}
                  onChange={(e) => setPlayer2Input(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={!player1Input.trim() || !player2Input.trim()}
              >
                {t("compare")}
              </Button>
              {(player1Name ?? player2Name) && (
                <Button type="button" variant="outline" onClick={handleReset}>
                  {t("reset")}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {(player1Query.isLoading || player2Query.isLoading) && (
        <Card>
          <CardContent className="flex h-[200px] items-center justify-center">
            <div className="flex items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>{t("loading")}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {(player1Query.isError || player2Query.isError) && (
        <Card>
          <CardContent className="flex h-[200px] items-center justify-center">
            <div className="text-center text-red-500">
              <p className="font-bold">{t("errorLoading")}</p>
              <p className="text-sm">
                {player1Query.isError && t("errorPlayer1")}
                {player1Query.isError && player2Query.isError
                  ? t("errorBoth")
                  : ""}
                {player2Query.isError && t("errorPlayer2")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {bothPlayersLoaded &&
        player1Query.data?.data &&
        player2Query.data?.data && (
          <ComparisonView
            player1Data={player1Query.data.data}
            player2Data={player2Query.data.data}
          />
        )}

      {!player1Name && !player2Name && (
        <Card>
          <CardContent className="flex h-[200px] items-center justify-center">
            <p className="text-muted-foreground">{t("enterPlayersPrompt")}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
