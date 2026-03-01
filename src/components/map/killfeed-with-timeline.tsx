"use client";

import { KillfeedControls } from "@/components/map/killfeed-controls";
import { KillfeedExport } from "@/components/map/killfeed-export";
import { KillfeedTable } from "@/components/map/killfeed-table";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DEFAULT_KILLFEED_OPTIONS,
  type FightUltimateData,
  type KillfeedDisplayOptions,
} from "@/data/killfeed-dto";
import type { Kill } from "@prisma/client";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

type Fight = {
  kills: Kill[];
  start: number;
  end: number;
};

type KillfeedWithTimelineProps = {
  fights: Fight[];
  ultimateData: FightUltimateData[];
  team1: string;
  team2: string;
  team1Color: string;
  team2Color: string;
};

const STORAGE_KEY = "parsertime:killfeed-options";

export function KillfeedWithTimeline({
  fights,
  ultimateData,
  team1,
  team2,
  team1Color,
  team2Color,
}: KillfeedWithTimelineProps) {
  const t = useTranslations("mapPage.killfeed");
  const [options, setOptions] = useState<KillfeedDisplayOptions>(
    DEFAULT_KILLFEED_OPTIONS
  );

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<KillfeedDisplayOptions>;
        setOptions({ ...DEFAULT_KILLFEED_OPTIONS, ...parsed });
      }
    } catch {
      // localStorage unavailable or corrupted, use defaults
    }
  }, []);

  const handleOptionsChange = useCallback(
    (newOptions: KillfeedDisplayOptions) => {
      setOptions(newOptions);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newOptions));
      } catch {
        // localStorage unavailable
      }
    },
    []
  );

  const fightUltSpans = fights.map((_, i) => {
    const fightData = ultimateData.find((d) => d.fightIndex === i);
    return fightData?.spans ?? [];
  });

  return (
    <Card className="col-span-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t("title")}</CardTitle>
        <KillfeedControls
          options={options}
          onOptionsChange={handleOptionsChange}
        />
      </CardHeader>
      <CardContent className="pl-2">
        <KillfeedTable
          fights={fights}
          team1={team1}
          team2={team2}
          team1Color={team1Color}
          team2Color={team2Color}
          fightUltSpans={fightUltSpans}
          options={options}
        />
      </CardContent>
      <CardFooter className="float-right">
        <KillfeedExport fights={fights} />
      </CardFooter>
    </Card>
  );
}
