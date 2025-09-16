"use client";

import { CardContent, CardFooter } from "@/components/ui/card";
import { format } from "@/lib/utils";
import type { Kill } from "@prisma/client";
import { useTranslations } from "next-intl";
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
} from "recharts";
import type {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";

type Data = {
  method: string;
  pv: number;
  max: number;
}[];

type Props = {
  data: Kill[];
};

function CustomTooltip({
  active,
  payload,
  label,
}: TooltipProps<ValueType, NameType>) {
  const t = useTranslations("statsPage.playerStats.finalBlowsByMethod");

  if (active && payload?.length) {
    return (
      <div className="bg-primary text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 overflow-hidden rounded-md px-3 py-1.5 text-xs">
        <h3 className="text-base font-bold">{label}</h3>
        <p className="text-sm">
          <span className="text-red-500">
            {format(payload[0].value as number)}
          </span>{" "}
          {t("finalBlows")}
        </p>
      </div>
    );
  }

  return null;
}

export function KillMethodChart({ data }: Props) {
  const t = useTranslations("statsPage.playerStats.finalBlowsByMethod");

  function formatMethod(method: string) {
    if (method === "0") return t("primary");
    if (method === "Primary Fire") return t("primary");
    if (method === "Secondary Fire") return t("secondary");
    return method;
  }

  const killData = data.map((kill) => ({
    method: formatMethod(kill.event_ability),
    pv: 1,
  }));

  // sum the kill data
  const killDataMap = new Map<string, number>();
  killData.forEach((kill) => {
    killDataMap.set(kill.method, (killDataMap.get(kill.method) ?? 0) + 1);
  });

  const processedData: Data = Array.from(killDataMap.entries()).map(
    ([method, pv]) => ({
      method,
      pv,
      max: data.length,
    })
  );

  return (
    <>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart
            width={500}
            height={250}
            margin={{
              top: 10,
              right: 40,
              left: 30,
              bottom: 10,
            }}
            data={processedData}
          >
            <PolarGrid />
            <PolarAngleAxis dataKey="method" />
            <Radar
              type="monotone"
              dataKey="pv"
              stroke="#ef4444"
              fill="#ef4444"
              fillOpacity={0.6}
            />
            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
      <CardFooter>
        <p className="text-muted-foreground text-sm">
          {t.rich("footer", {
            span: (chunks) => <span className="text-foreground">{chunks}</span>,
            format: format(data.length),
          })}
        </p>
      </CardFooter>
    </>
  );
}
