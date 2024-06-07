"use client";

import { CardContent, CardFooter } from "@/components/ui/card";
import { format } from "@/lib/utils";
import { Kill } from "@prisma/client";
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
} from "recharts";
import {
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
  if (active && payload && payload.length) {
    return (
      <div className="z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2">
        <h3 className="text-base font-bold">{label}</h3>
        <p className="text-sm">
          <span className="text-red-500">
            {format(payload[0].value as number)}
          </span>{" "}
          final blows
        </p>
      </div>
    );
  }

  return null;
}

function formatMethod(method: string) {
  if (method === "0") return "Primary";
  if (method === "Primary Fire") return "Primary";
  if (method === "Secondary Fire") return "Secondary";
  return method;
}

export function KillMethodChart({ data }: Props) {
  const killData = data.map((kill) => ({
    method: formatMethod(kill.event_ability),
    pv: 1,
  }));

  // sum the kill data
  const killDataMap = new Map<string, number>();
  killData.forEach((kill) => {
    killDataMap.set(kill.method, (killDataMap.get(kill.method) || 0) + 1);
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
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
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
        <p className="text-sm text-muted-foreground">
          Calculated from{" "}
          <span className="text-foreground">{format(data.length)}</span> final
          blows
        </p>
      </CardFooter>
    </>
  );
}
