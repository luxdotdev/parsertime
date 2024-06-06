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
} from "recharts";

type Data = {
  method: string;
  pv: number;
  max: number;
}[];

type Props = {
  data: Kill[];
};

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
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
      <CardFooter>
        <p className="text-sm text-gray-500">
          Calculated from{" "}
          <span className="text-foreground">{format(data.length)}</span> kills
        </p>
      </CardFooter>
    </>
  );
}
